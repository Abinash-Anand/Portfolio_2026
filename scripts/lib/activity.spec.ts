import { normalizeActivity, shiftDate } from './activity';
import type { RawContributions } from './github';
import { ActivityCalendarSchema } from './schema';

const day = (date: string, contributionCount: number, weekday: number) => ({
  date,
  contributionCount,
  weekday,
});

describe('shiftDate', () => {
  it('moves a date by whole days, across month and year ends, without time-zone drift', () => {
    expect(shiftDate('2026-10-01', -3)).toBe('2026-09-28');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-03-29', 1)).toBe('2026-03-30'); // a daylight-saving change in Europe
    expect(shiftDate('2026-10-01', 0)).toBe('2026-10-01');
  });
});

describe('normalizeActivity', () => {
  // 2026-10-01 is a Thursday (weekday 4): the first week is partial, the last week too.
  const raw: RawContributions = {
    totalContributions: 9,
    weeks: [
      {
        contributionDays: [
          day('2026-10-01', 2, 4),
          day('2026-10-02', 0, 5),
          day('2026-10-03', 1, 6),
        ],
      },
      {
        contributionDays: [
          day('2026-10-04', 0, 0),
          day('2026-10-05', 3, 1),
          day('2026-10-06', 3, 2),
        ],
      },
    ],
  };

  it('lays each week out by weekday, with null for days outside the range', () => {
    const calendar = normalizeActivity(raw)!;
    expect(calendar.days).toEqual([
      null,
      null,
      null,
      null,
      2,
      0,
      1,
      0,
      3,
      3,
      null,
      null,
      null,
      null,
    ]);
  });

  it('starts at the Sunday of the first week, and keeps the total GitHub reported', () => {
    const calendar = normalizeActivity(raw)!;
    expect(calendar.from).toBe('2026-09-27');
    expect(calendar.total).toBe(9);
  });

  it('produces output the build schema accepts', () => {
    expect(ActivityCalendarSchema.safeParse(normalizeActivity(raw)).success).toBe(true);
  });

  it('is null when there is no data', () => {
    expect(normalizeActivity(null)).toBeNull();
    expect(normalizeActivity({ totalContributions: 0, weeks: [] })).toBeNull();
  });
});

describe('ActivityCalendarSchema', () => {
  it('rejects data that is not whole weeks, has bad dates or negative counts', () => {
    expect(
      ActivityCalendarSchema.safeParse({ total: 1, from: '2026-10-04', days: [1, 0, 0] }).success,
    ).toBe(false);
    expect(
      ActivityCalendarSchema.safeParse({ total: 1, from: 'yesterday', days: new Array(7).fill(0) })
        .success,
    ).toBe(false);
    expect(
      ActivityCalendarSchema.safeParse({
        total: 1,
        from: '2026-10-04',
        days: [-1, 0, 0, 0, 0, 0, 0],
      }).success,
    ).toBe(false);
  });
});
