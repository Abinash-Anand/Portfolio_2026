/** Plain statistics for the Spike 0 benchmark. Pure functions, so they are unit-tested and run anywhere. */

export interface Summary {
  readonly n: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
}

const EMPTY: Summary = { n: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 };

/** Nearest-rank percentile of an ascending-sorted list (p in 0..100). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))]!;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function summarize(values: readonly number[]): Summary {
  if (values.length === 0) return EMPTY;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);
  return {
    n: sorted.length,
    mean: round(total / sorted.length),
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    max: round(sorted[sorted.length - 1]!),
  };
}

/** Share of frames that took longer than `budgetMs` (0..1). */
export function overBudgetRatio(values: readonly number[], budgetMs: number): number {
  if (values.length === 0) return 0;
  return round(values.filter((v) => v > budgetMs).length / values.length);
}

/** Average frames per second over a recording. */
export function meanFps(deltas: readonly number[]): number {
  const total = deltas.reduce((sum, d) => sum + d, 0);
  return total > 0 ? round((deltas.length * 1000) / total) : 0;
}

/** Estimates the display refresh rate from recorded frame deltas (the median, snapped to common rates). */
export function estimateRefreshHz(deltas: readonly number[]): number {
  if (deltas.length === 0) return 60;
  const sorted = [...deltas].sort((a, b) => a - b);
  const hz = 1000 / percentile(sorted, 25); // the quick frames reveal the display, not the load
  const common = [30, 60, 90, 120, 144, 165, 240];
  return common.reduce((best, c) => (Math.abs(c - hz) < Math.abs(best - hz) ? c : best), 60);
}

/** Growth between the first and last of a series, as a ratio (1 = flat). */
export function growth(series: readonly number[]): number {
  if (series.length < 2 || series[0] === 0) return 1;
  return round(series[series.length - 1]! / series[0]!);
}
