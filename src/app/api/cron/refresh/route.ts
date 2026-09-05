import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseServer';
import { refreshSymbols } from '@/lib/refreshSymbols';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { data: rows, error } = await supabase.from('watchlists').select('symbol');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const symbols = Array.from(new Set((rows ?? []).map((r) => r.symbol)));
  const results = await refreshSymbols(symbols);

  return NextResponse.json({ refreshed: results.length, results });
}