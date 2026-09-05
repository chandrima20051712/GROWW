const BASE_URL = 'https://www.alphavantage.co/query';

function apiKey(): string {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) throw new Error('ALPHAVANTAGE_API_KEY is not configured');
  return key;
}

export interface DailyBar {
  date: string;
  close: number;
  volume: number;
}

export async function getDailyHistory(symbol: string): Promise<DailyBar[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set('function', 'TIME_SERIES_DAILY');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('outputsize', 'full');
  url.searchParams.set('apikey', apiKey());

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Alpha Vantage request failed with ${res.status}`);
  const data = await res.json();

  const series = data['Time Series (Daily)'];
  if (!series) {
    throw new Error(data['Note'] || data['Information'] || 'Alpha Vantage returned no data');
  }

  return Object.entries(series)
    .map(([date, values]: [string, any]) => ({
      date,
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}