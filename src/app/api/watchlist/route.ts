import { NextResponse } from 'next/server';
import { getUserClient, getBearerToken } from '@/lib/supabaseServer';
import { cacheGet } from '@/lib/cache';
import type { SymbolSnapshot } from '@/lib/types';

// Returns the signed-in user's watchlist, enriched with whatever the shared
// cron job most recently cached for each symbol. Never calls Finnhub
// directly — that's the whole point of the shared cache.
export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const supabase = getUserClient(token);

  const { data: items, error } = await supabase
    .from('watchlists')
    .select('*')
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (items ?? []).map(async (item) => {
      const quote = await cacheGet<SymbolSnapshot>(`symbol:${item.symbol}`);
      return { ...item, quote };
    })
  );

  return NextResponse.json({ items: enriched });
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const supabase = getUserClient(token);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? '').toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: user.id, symbol, notes: body.notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const supabase = getUserClient(token);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('watchlists').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
