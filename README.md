# GROWW — a market bulletin, not a ticker

A watchlist that doesn't just show you prices — it tells you what actually
changed since you last checked, and why it's worth your attention.

See `smart-watchlist-spec.md` (in the parent conversation) for the full
design rationale. Short version:

- **Attention score, not raw % change.** Each symbol is scored on: how
  unusual today's move is relative to *its own* volatility (z-score), volume
  vs. its own average, whether there's actual news attached, relative
  performance vs. SPY, and 52-week high/low proximity. A flat 2% threshold
  treats a utility stock and a biotech the same — this doesn't.
- **Diff-based "what's changed" feed.** Every visit snapshots what you saw;
  the next visit only surfaces symbols that changed meaningfully since then.
- **Shared polling, not per-user polling.** A single cron job polls the
  union of symbols across every user's watchlist once, caches the result,
  and all reads hit that cache. This is what lets it scale past a handful of
  users without hammering the market-data API or your database.
- **Never fake real-time.** Every price is timestamped "as of," and if a
  data fetch fails, the UI shows the last-known-good value flagged as
  delayed rather than erroring or showing something wrong.

## Stack

- Next.js 14 (App Router) + Tailwind — frontend and API routes together
- Supabase (Postgres + magic-link auth) — persistence across devices
- Upstash Redis (optional) — shared symbol cache; falls back to in-memory
  for local dev if not configured
- Finnhub free tier — quotes, daily candles, company news, 52-week range
- Vercel Cron — triggers the shared refresh job on a schedule

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to supabase.com, create a new project.
2. In the SQL Editor, run everything in `supabase/schema.sql`.
3. In Project Settings → API, copy the Project URL, `anon` public key, and
   `service_role` secret key.
4. In Authentication → Providers, email/magic-link auth is on by default —
   nothing else to configure for local dev.

### 3. Get a Finnhub API key

Free tier at finnhub.io — sign up, copy the API key from your dashboard.

### 4. (Optional) Set up Upstash Redis

Free tier at upstash.com — create a Redis database, copy the REST URL and
REST token. Skip this for local dev; the app will use an in-memory cache
instead (just note it won't be shared across multiple server instances).

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values from steps 2–4. Set `CRON_SECRET` to any random string.

### 6. Run it locally

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with
your email (check your inbox for the magic link), then add a symbol.

### 7. Populate real data

The dashboard only shows data that the cron job has already fetched and
cached. Trigger it manually once you've added a symbol:

```bash
curl -H "Authorization: Bearer <your CRON_SECRET>" http://localhost:3000/api/cron/refresh
```

Refresh the dashboard afterward and you should see live prices and scores.

## Deploying

1. Push this folder to a GitHub repo.
2. Import it into Vercel.
3. Add all the same environment variables from `.env.local` in the Vercel
   project settings (Environment Variables).
4. `vercel.json` already defines a cron schedule (every 5 minutes) hitting
   `/api/cron/refresh`. Vercel automatically sends
   `Authorization: Bearer <CRON_SECRET>` to scheduled functions when
   `CRON_SECRET` is set as an env var, so no extra wiring is needed.
5. Deploy. Note: the Hobby plan limits cron frequency — check your plan's
   minimum interval and adjust the schedule in `vercel.json` if needed.

## Where this is intentionally simple (v1 scope)

- No websockets/tick-level real-time — 5-minute polling during market hours
  is enough for the "what changed" use case and far cheaper to run.
- No custom auth — Supabase magic-link handles it.
- Benchmark for relative performance is hardcoded to SPY rather than a full
  sector/peer mapping — a reasonable default that's easy to extend later.

## Where the complexity is intentional

- The scoring engine (`src/lib/scoring.ts`) — this is the actual product.
- The snapshot/diff pipeline (`src/app/api/digest/route.ts`) — this is what
  makes "what changed" work instead of just showing current state.
- The shared-cache fan-out (`src/lib/cache.ts` + the cron job) — this is
  what lets the system scale to many users/watchlists without the naive
  per-user-polling approach falling over.
