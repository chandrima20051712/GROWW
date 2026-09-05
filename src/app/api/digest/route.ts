import { NextResponse } from 'next/server';
import { getUserClient, getBearerToken } from '@/lib/supabaseServer';
import { cacheGet } from '@/lib/cache';
import { isMeaningfulChange } from '@/lib/scoring';
import type { SymbolSnapshot, ChangeCard } from '@/lib/types';

// This is the "what changed since I last checked" endpoint. It compares the
// currently cached state of each watched symbol against this user's last
// stored snapshot, and only returns cards for changes that (a) are new since
// their last visit and (b) clear the meaningful-change threshold. It then
// advances their snapshot, so the next visit diffs from here forward.
export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const supabase = getUserClient(token);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: watchlist } = await supabase.from('watchlists').select('symbol').eq('user_id', user.id);
  const symbols = Array.from(new Set((watchlist ?? []).map((w) => w.symbol)));

  const { data: lastSnapshots } = await supabase.from('snapshots').select('*').eq('user_id', user.id);
  const lastBySymbol = new Map((lastSnapshots ?? []).map((s) => [s.symbol, s]));

  const cards: ChangeCard[] = [];
  const upserts: Record<string, unknown>[] = [];

  for (const symbol of symbols) {
    const current = await cacheGet<SymbolSnapshot>(`symbol:${symbol}`);
    if (!current) continue;

    const last = lastBySymbol.get(symbol);
    const isNewSinceLastVisit = !last || last.as_of !== current.asOf;

    if (isNewSinceLastVisit && isMeaningfulChange(current)) {
      cards.push({
        symbol,
        headline: `${symbol} ${current.dayChangePct >= 0 ? '+' : ''}${current.dayChangePct}%`,
        attentionScore: current.attentionScore,
        dayChangePct: current.dayChangePct,
        detail: buildDetail(current),
        asOf: current.asOf,
      });
    }

    upserts.push({
      user_id: user.id,
      symbol,
      price: current.price,
      volume: current.volume,
      score_components: current,
      as_of: current.asOf,
      seen_at: new Date().toISOString(),
    });
  }

  cards.sort((a, b) => b.attentionScore - a.attentionScore);

  if (upserts.length) {
    await supabase.from('snapshots').upsert(upserts, { onConflict: 'user_id,symbol' });
  }

  return NextResponse.json({ cards });
}

function buildDetail(s: SymbolSnapshot): string {
  const parts: string[] = [];
  if (Math.abs(s.zScore) >= 1.5) parts.push(`${s.zScore.toFixed(1)}σ move vs. its own recent volatility`);
  if (s.volumeRatio >= 2) parts.push(`${s.volumeRatio.toFixed(1)}x average volume`);
  if (s.hasCatalyst) parts.push('recent news attached');
  if (s.nearKeyLevel !== 'none') {
    parts.push(s.nearKeyLevel === '52w_high' ? 'near its 52-week high' : 'near its 52-week low');
  }
  if (!parts.length) parts.push('notable move relative to its peers');
  return parts.join(' — ');
}
