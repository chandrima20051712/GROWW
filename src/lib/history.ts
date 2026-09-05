import { getDailyCandles as getFinnhubCandles, type DailyBar } from './finnhub';
import { getDailyHistory as getAlphaVantageHistory } from './alphavantage';
import { cacheGet, cacheSet } from './cache';

export interface HistoryResult {
  recent: DailyBar[];
  yearHigh: number | null;
  yearLow: number | null;
  source: 'finnhub' | 'alphavantage' | 'none';
}

const HISTORY_CACHE_TTL_SECONDS = 20 * 60 * 60;

export async function getHistory(symbol: string): Promise<HistoryResult> {
  try {
    const bars = await getFinnhubCandles(symbol, 30);
    if (bars.length) {
      return { recent: bars, yearHigh: null, yearLow: null, source: 'finnhub' };
    }
  } catch {
    // fall through to Alpha Vantage
  }

  const cacheKey = `history:${symbol}`;
  const cached = await cacheGet<DailyBar[]>(cacheKey);
  if (cached) return deriveFromFullHistory(cached);

  try {
    const full = await getAlphaVantageHistory(symbol);
    await cacheSet(cacheKey, full, HISTORY_CACHE_TTL_SECONDS);
    return deriveFromFullHistory(full);
  } catch {
    return { recent: [], yearHigh: null, yearLow: null, source: 'none' };
  }
}

function deriveFromFullHistory(full: DailyBar[]): HistoryResult {
  const recent = full.slice(-30);
  const lastYear = full.slice(-252);
  const closes = lastYear.map((b) => b.close);
  return {
    recent,
    yearHigh: closes.length ? Math.max(...closes) : null,
    yearLow: closes.length ? Math.min(...closes) : null,
    source: 'alphavantage',
  };
}