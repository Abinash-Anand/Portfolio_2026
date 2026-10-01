import type { ActivityCalendar } from '../../src/app/data/models';
import type { RawContributions } from './github';

/**
 * GitHub's contribution calendar as a compact calendar: counts per day in week-major order. GitHub's first and last
 * weeks can be partial, so each week is laid out by its weekday and the missing days are `null`.
 */
export function normalizeActivity(raw: RawContributions | null): ActivityCalendar | null {
  if (!raw || raw.weeks.length === 0) return null;

  const days: (number | null)[] = [];
  let from: string | null = null;

  for (const week of raw.weeks) {
    const cells: (number | null)[] = new Array<number | null>(7).fill(null);
    for (const day of week.contributionDays) {
      if (day.weekday < 0 || day.weekday > 6) throw new Error(`Unexpected weekday ${day.weekday}`);
      cells[day.weekday] = day.contributionCount;
    }
    if (from === null) {
      const first = week.contributionDays[0];
      if (first) from = shiftDate(first.date, -first.weekday);
    }
    days.push(...cells);
  }
  if (from === null) return null;
  return { total: raw.totalContributions, from, days };
}

/** `date` (YYYY-MM-DD) moved by a number of days, computed in UTC so no time zone or daylight saving can interfere. */
export function shiftDate(date: string, offsetDays: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + offsetDays);
  return moved.toISOString().slice(0, 10);
}
