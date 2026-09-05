import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseServer';
import { getQuote, getRecentNews, type NewsItem } from '@/lib/finnhub';
import { getHistory } from '@/lib/history';
import { computeScore } from '@/lib/scoring';
import { cacheGet, cacheSet } from '@/lib/cache';
import type { SymbolSnapshot } from '@/lib/types';

const BENCHMARK_SYMBOL = 'SPY';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { data: rows, error } = await supabase.from('watchlists').select('symbol');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const watched = Array.from(new Set((rows ?? []).map((r) => r.symbol)));
  const symbols = [BENCHMARK_SYMBOL, ...watched.filter((s) => s !== BENCHMARK_SYMBOL)];

  let benchmarkReturnPct = 0;
  const results: { symbol: string; ok: boolean; historySource?: string; error?: string }[] = [];

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const history = await getHistory(symbol);

      let news: NewsItem[] = [];
      try {
        news = symbol === BENCHMARK_SYMBOL ? [] : await getRecentNews(symbol, 2);
      } catch {
        news = [];
      }

      if (symbol === BENCHMARK_SYMBOL) {
        benchmarkReturnPct =
          quote.previousClose > 0
            ? ((quote.current - quote.previousClose) / quote.previousClose) * 100
            : 0;
      }

      const latestVolume = history.recent.length
        ? history.recent[history.recent.length - 1].volume
        : 0;

      const score = computeScore({
        symbol,
        currentPrice: quote.current,
        previousClose: quote.previousClose,
        currentVolume: latestVolume,
        history: history.recent,
        benchmarkReturnPct,
        weekHigh52: history.yearHigh ?? 0,
        weekLow52: history.yearLow ?? 0,
        hasRecentNews: news.length > 0,
      });

      const snapshot: SymbolSnapshot = {
        symbol,
        price: quote.current,
        previousClose: quote.previousClose,
        volume: latestVolume,
        dayChangePct: score.dayChangePct,
        zScore: score.zScore,
        volumeRatio: score.volumeRatio,
        relativePerformancePct: score.relativePerformancePct,
        nearKeyLevel: score.nearKeyLevel,
        hasCatalyst: score.hasCatalyst,
        attentionScore: score.attentionScore,
        asOf: new Date().toISOString(),
        stale: false,
        news,
      };

      await cacheSet(`symbol:${symbol}`, snapshot, 300);

      await supabase.from('price_history').insert({
        symbol,
        bucket_ts: new Date().toISOString(),
        close: quote.current,
        volume: latestVolume,
      });

      results.push({ symbol, ok: true, historySource: history.source });
    } catch (err) {
      const stale = await cacheGet<SymbolSnapshot>(`symbol:${symbol}`);
      if (stale) await cacheSet(`symbol:${symbol}`, { ...stale, stale: true }, 300);
      results.push({ symbol, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ refreshed: results.length, results });
}