# Smart Market Watchlist — Design Spec

## Thesis
Don't build a price ticker. Build a change-detection and attention-prioritization
system. The core question a user asks when they open this app isn't "what's the
price now" — it's "what happened since I last looked, and does it matter."

---

## 1. What counts as a "meaningful change"

A flat % price move is a weak signal — it means different things for different
stocks. Instead, compute an **Attention Score** per symbol from five components:

| Component | Definition | Why it matters |
|---|---|---|
| Statistical significance | z-score of today's move vs. the stock's own rolling 20–30 day volatility (std dev of daily returns) | Normalizes across low-vol vs high-vol names — 2% means something different for a utility vs a biotech |
| Volume confirmation | current volume vs. 20-day average volume (flag if ≥2x) | Distinguishes a move backed by real interest from noise |
| Catalyst presence | news/earnings/analyst action tagged and time-aligned to the price move | Gives the "why," not just the "what" |
| Relative performance | symbol's move vs. its sector/peer average over the same window | A stock down 1% while its sector is down 5% is actually outperforming |
| Key levels | 52-week high/low breaks, moving-average crossovers | Levels traders/investors already care about |

Composite score ranks what the user sees first. Raw price/volume is still
available, but it's not the primary lens.

## 2. "What's changed since last checked" — diff, don't stream

- Every user–symbol pair gets a **snapshot** on each view: price, volume,
  score components, timestamp.
- On return, diff current state vs. last-seen snapshot.
- Only changes crossing a meaningful threshold surface as a **change card**:
  e.g. "AAPL +4.2%, 2.1σ move, 3x avg volume — earnings beat 2h ago."
- This is the actual differentiator: a personalized digest/feed, not a
  scrolling dashboard.

## 3. Persistence across sessions/devices

- **Postgres** (via Supabase): users, watchlists, per-user-per-symbol
  snapshots, price history, news/events.
- **Auth**: Supabase magic-link auth — don't hand-roll this, it's not where
  the value is.
- **Price history** stored as rolled-up bars (1-min → daily aggregates) to
  keep storage bounded as watchlists and history grow.

## 4. Stale, delayed, or conflicting data

- Every price carries an explicit **"as of" timestamp** — never simulate
  real-time on a delayed feed.
- If a data provider errors or rate-limits: serve last-known-good from cache
  with a visible **stale flag**, never a silent/wrong value or a hard error.
- If two sources disagree beyond a threshold: show a **low-confidence flag**
  rather than silently picking one.

## 5. Scaling

- **Never poll per user.** Take the union of unique symbols across all
  watchlists; poll each symbol once on a shared schedule.
- Cache per-symbol data in **Redis**; all user-facing reads hit cache, not
  the external API directly.
- **Adaptive polling**: symbols watched by more users refresh more
  frequently; long-tail symbols refresh less often.
- Background worker does fetch → compute z-score/volume ratio → snapshot →
  diff. API layer only reads.

## 6. Where to keep it simple vs add complexity

**Keep simple:**
- No tick-level real-time / websockets for v1 — 60s polling during market
  hours is enough and far cheaper.
- No custom auth — use a managed provider.
- No custom time-series DB — Postgres with rollups is enough at this scale.

**Worth the complexity:**
- The scoring engine (z-score, volume ratio, relative performance).
- The snapshot/diff pipeline that powers "what changed."
- The shared-cache fan-out architecture for scaling.

---

## 7. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind, deployed on Vercel | Fast to ship, good DX |
| Backend/API | Next.js API routes (or small Node/FastAPI service) | Colocate with frontend for v1 |
| DB | Postgres via Supabase | Free tier, built-in auth, cross-device sync |
| Cache | Upstash Redis | Serverless-friendly, free tier, shared symbol cache |
| Market data | Finnhub free tier (quotes + news) | Decent free quota, has both prices and news |
| Scheduling | Vercel Cron or a small Render background worker | Runs the poll → score → snapshot → diff pipeline |

---

## 8. Data model (starting point)

```
users(id, email, created_at)
watchlists(id, user_id, symbol, added_at, notes)
symbol_cache(symbol, price, volume, day_high, day_low, as_of, source, stale bool)
price_history(symbol, bucket_ts, open, high, low, close, volume)  -- rolled up
snapshots(user_id, symbol, seen_at, price, volume, score_components jsonb)
events(symbol, ts, type, headline, source, url)
```

## 9. Why this design (for the rubric)

- **Product interpretation**: redefines "meaningful change" statistically
  instead of using an arbitrary flat threshold — shows independent thinking
  beyond the literal brief.
- **Engineering depth**: shared-cache fan-out means the system doesn't
  degrade as watchlists/users grow — a genuine scaling decision, not just a
  CRUD app.
- **Edge cases**: explicit handling of stale/delayed/conflicting data with
  visible flags rather than silent failure.
- **Originality**: diff/digest UX instead of a live ticker is the core bet —
  it's a different mental model of what a watchlist is for.
