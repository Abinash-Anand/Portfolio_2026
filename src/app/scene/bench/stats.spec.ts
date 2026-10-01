import {
  estimateRefreshHz,
  growth,
  meanFps,
  overBudgetRatio,
  percentile,
  summarize,
} from './stats';

describe('benchmark statistics', () => {
  const tenToOne = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('picks percentiles by nearest rank, and tolerates an empty list', () => {
    expect(percentile(tenToOne, 50)).toBe(5);
    expect(percentile(tenToOne, 95)).toBe(10);
    expect(percentile(tenToOne, 0)).toBe(1);
    expect(percentile([], 50)).toBe(0);
  });

  it('summarises unsorted values without mutating the input', () => {
    const values = [30, 10, 20, 50, 40];
    const summary = summarize(values);
    expect(summary).toEqual({ n: 5, mean: 30, p50: 30, p95: 50, p99: 50, max: 50 });
    expect(values).toEqual([30, 10, 20, 50, 40]);
  });

  it('summarises nothing as zeros rather than NaN', () => {
    expect(summarize([])).toEqual({ n: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 });
  });

  it('measures the share of frames over a budget', () => {
    expect(overBudgetRatio([10, 20, 30, 40], 25)).toBe(0.5);
    expect(overBudgetRatio([], 25)).toBe(0);
    expect(overBudgetRatio([5, 5], 25)).toBe(0);
  });

  it('computes frames per second from frame times', () => {
    expect(meanFps([20, 20, 20, 20])).toBe(50);
    expect(meanFps([])).toBe(0);
  });

  it('estimates the display refresh rate from the quick frames, not the slow ones', () => {
    expect(estimateRefreshHz([8.3, 8.4, 8.3, 25, 8.3, 41])).toBe(120);
    expect(estimateRefreshHz([16.7, 16.6, 33.4, 16.7, 50])).toBe(60);
    expect(estimateRefreshHz([])).toBe(60);
  });

  it('reports growth as a ratio between the first and last sample', () => {
    expect(growth([10, 12, 15])).toBe(1.5);
    expect(growth([5])).toBe(1);
    expect(growth([0, 5])).toBe(1);
  });
});
