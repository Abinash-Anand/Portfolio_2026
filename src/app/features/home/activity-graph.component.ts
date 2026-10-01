import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActivityCalendar } from '../../data/models';

export interface ActivityCell {
  readonly x: number;
  readonly y: number;
  readonly level: 0 | 1 | 2 | 3 | 4;
}

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEVEL_FILL = [
  'fill-raised',
  'fill-emerald/25',
  'fill-emerald/50',
  'fill-emerald/75',
  'fill-emerald',
] as const;

/** 0 for no activity, then 1 to 4 by how the day compares with the busiest day of the year (quartiles of the peak). */
export function activityLevel(count: number, max: number): ActivityCell['level'] {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as ActivityCell['level'];
}

/** The calendar as positioned cells: one column per week, one row per weekday, days outside the range left out. */
export function activityCells(calendar: ActivityCalendar): ActivityCell[] {
  const max = Math.max(0, ...calendar.days.map((day) => day ?? 0));
  const cells: ActivityCell[] = [];
  calendar.days.forEach((count, index) => {
    if (count === null) return;
    cells.push({
      x: Math.floor(index / 7) * STEP,
      y: (index % 7) * STEP,
      level: activityLevel(count, max),
    });
  });
  return cells;
}

/**
 * A year of GitHub activity as a heatmap. Pure SVG (no chart library), read as one image by assistive technology:
 * a grid of 370 tiny cells is noise to a screen reader, so the summary sentence carries the meaning.
 */
@Component({
  selector: 'app-activity-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="h-auto w-full max-w-4xl"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (cell of cells(); track $index) {
        <rect
          [attr.x]="cell.x"
          [attr.y]="cell.y"
          width="11"
          height="11"
          rx="2"
          [class]="fill[cell.level]"
        />
      }
    </svg>
  `,
})
export class ActivityGraph {
  readonly calendar = input.required<ActivityCalendar>();

  protected readonly fill = LEVEL_FILL;
  protected readonly height = 7 * STEP - GAP;
  protected readonly cells = computed(() => activityCells(this.calendar()));
  protected readonly width = computed(
    () => Math.ceil(this.calendar().days.length / 7) * STEP - GAP,
  );
  protected readonly label = computed(
    () => `${this.calendar().total} contributions on GitHub in the last year`,
  );
}
