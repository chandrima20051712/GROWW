// Thin wrapper around Finnhub's free-tier REST API. Every function throws on
// failure so the caller (the cron job) can decide what "stale" means rather
// than silently returning wrong data.

const BASE_URL = 'https://finnhub.io/api/v1';

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY is not configured');
  return key;
}

async function finnhubFetch(path: string, params: Record<string, string>) {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('token', apiKey());

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Finnhub ${path} failed with ${res.status}`);
  return res.json();
}

export interface Quote {
  current: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const data = await finnhubFetch('/quote', { symbol });
  return {
    current: data.c,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t,
  };
}

export interface DailyBar {
  date: string;
  close: number;
  volume: number;
}

export async function getDailyCandles(symbol: string, days = 30): Promise<DailyBar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const data = await finnhubFetch('/stock/candle', {
    symbol,
    resolution: 'D',
    from: String(from),
    to: String(to),
  });
  if (data.s !== 'ok' || !Array.isArray(data.t)) return [];
  return data.t.map((t: number, i: number) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    close: data.c[i],
    volume: data.v[i],
  }));
}

export interface NewsItem {
  headline: string;
  url: string;
  source: string;
  datetime: number;
}

export async function getRecentNews(symbol: string, days = 2): Promise<NewsItem[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const data = await finnhubFetch('/company-news', { symbol, from, to });
  if (!Array.isArray(data)) return [];
  return data.slice(0, 5).map((n: any) => ({
    headline: n.headline,
    url: n.url,
    source: n.source,
    datetime: n.datetime,
  }));
}

export async function get52WeekRange(symbol: string): Promise<{ high: number | null; low: number | null }> {
  const data = await finnhubFetch('/stock/metric', { symbol, metric: 'price' });
  return {
    high: data?.metric?.['52WeekHigh'] ?? null,
    low: data?.metric?.['52WeekLow'] ?? null,
  };
}
