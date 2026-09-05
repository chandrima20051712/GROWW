import { NextResponse } from 'next/server';
import { getUserClient, getBearerToken } from '@/lib/supabaseServer';
import { refreshSymbols } from '@/lib/refreshSymbols';
import { cacheGet, cacheSet } from '@/lib/cache';

const COOLDOWN_SECONDS = 30;

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const supabase = getUserClient(token);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const cooldownKey = `refresh-cooldown:${user.id}`;
  const onCooldown = await cacheGet<boolean>(cooldownKey);
  if (onCooldown) {
    return NextResponse.json(
      { error: 'Please wait a bit before refreshing again.' },
      { status: 429 }
    );
  }
  await cacheSet(cooldownKey, true, COOLDOWN_SECONDS);

  const { data: watchlist } = await supabase.from('watchlists').select('symbol').eq('user_id', user.id);
  const symbols = (watchlist ?? []).map((w) => w.symbol);

  if (!symbols.length) {
    return NextResponse.json({ refreshed: 0, results: [] });
  }

  const results = await refreshSymbols(symbols);
  return NextResponse.json({ refreshed: results.length, results });
}