// The core of the product. Turns raw price/volume/news data into a single
// "does this deserve attention" score, instead of a flat % threshold.

import type { DailyBar } from './finnhub';

export interface ScoreInput {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  currentVolume: number;
  /** Recent daily bars, oldest first, NOT including today. Used to compute
   * this symbol's own volatility and average volume as a baseline. */
  history: DailyBar[];
  /** Same-day return of a benchmark (e.g. SPY), for relative performance. */
  benchmarkReturnPct: number;
  weekHigh52: number;
  weekLow52: number;
  hasRecentNews: boolean;
}

export interface ScoreComponents {
  dayChangePct: number;
  /** How many standard deviations today's move is from this symbol's own
   * recent volatility. A better signal than raw % change because it's
   * normalized per-stock. */
  zScore: number;
  /** Today's volume vs. its own 20-ish day average. */
  volumeRatio: number;
  /** How much this symbol out/under-performed the benchmark today. */
  relativePerformancePct: number;
  nearKeyLevel: 'none' | '52w_high' | '52w_low';
  hasCatalyst: boolean;
  /** Composite 0-100 score combining all of the above. */
  attentionScore: number;
}

export function computeScore(input: ScoreInput): ScoreComponents {
  const dayChangePct =
    input.previousClose > 0
      ? ((input.currentPrice - input.previousClose) / input.previousClose) * 100
      : 0;

  const dailyReturns: number[] = [];
  for (let i = 1; i < input.history.length; i++) {
    const prev = input.history[i - 1].close;
    const cur = input.history[i].close;
    if (prev > 0) dailyReturns.push(((cur - prev) / prev) * 100);
  }

  const mean = dailyReturns.length
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const variance = dailyReturns.length
    ? dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const zScore = stdDev > 0 ? (dayChangePct - mean) / stdDev : 0;

  const avgVolume = input.history.length
    ? input.history.reduce((a, b) => a + b.volume, 0) / input.history.length
    : input.currentVolume;
  const volumeRatio = avgVolume > 0 ? input.currentVolume / avgVolume : 1;

  const relativePerformancePct = dayChangePct - input.benchmarkReturnPct;

  let nearKeyLevel: ScoreComponents['nearKeyLevel'] = 'none';
  if (input.weekHigh52 > 0 && input.currentPrice >= input.weekHigh52 * 0.995) {
    nearKeyLevel = '52w_high';
  } else if (input.weekLow52 > 0 && input.currentPrice <= input.weekLow52 * 1.005) {
    nearKeyLevel = '52w_low';
  }

  // Weighted composite, capped 0-100. Weights reflect that a statistically
  // unusual move backed by volume and a real catalyst matters most; a bare
  // key-level touch matters least on its own.
  const zComponent = Math.min(Math.abs(zScore) / 3, 1) * 40;
  const volComponent = Math.min(Math.max(volumeRatio - 1, 0) / 2, 1) * 20;
  const catalystComponent = input.hasRecentNews ? 20 : 0;
  const relComponent = Math.min(Math.abs(relativePerformancePct) / 5, 1) * 10;
  const levelComponent = nearKeyLevel !== 'none' ? 10 : 0;

  const attentionScore = Math.round(
    zComponent + volComponent + catalystComponent + relComponent + levelComponent
  );

  return {
    dayChangePct: Number(dayChangePct.toFixed(2)),
    zScore: Number(zScore.toFixed(2)),
    volumeRatio: Number(volumeRatio.toFixed(2)),
    relativePerformancePct: Number(relativePerformancePct.toFixed(2)),
    nearKeyLevel,
    hasCatalyst: input.hasRecentNews,
    attentionScore,
  };
}

/** Threshold above which a change is worth surfacing in the "what changed" feed. */
export function isMeaningfulChange(
  score: Pick<ScoreComponents, 'attentionScore'>,
  threshold = 25
): boolean {
  return score.attentionScore >= threshold;
}
