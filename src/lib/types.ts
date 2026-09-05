export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  notes: string | null;
  added_at: string;
}

export interface SymbolSnapshot {
  symbol: string;
  price: number;
  previousClose: number;
  volume: number;
  dayChangePct: number;
  zScore: number;
  volumeRatio: number;
  relativePerformancePct: number;
  nearKeyLevel: 'none' | '52w_high' | '52w_low';
  hasCatalyst: boolean;
  attentionScore: number;
  asOf: string;
  stale: boolean;
  news: { headline: string; url: string; source: string; datetime: number }[];
}

export interface ChangeCard {
  symbol: string;
  headline: string;
  attentionScore: number;
  dayChangePct: number;
  detail: string;
  asOf: string;
}
