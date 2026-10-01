import { TestBed } from '@angular/core/testing';
import type { ActivityCalendar } from '../../data/models';
import { ActivityGraph, activityCells, activityLevel } from './activity-graph.component';

const calendar = (days: (number | null)[], total = 10): ActivityCalendar => ({
  total,
  from: '2026-09-27',
  days,
});

describe('activityLevel', () => {
  it('is 0 for a quiet day and 1 to 4 relative to the busiest day', () => {
    expect(activityLevel(0, 8)).toBe(0);
    expect(activityLevel(1, 8)).toBe(1);
    expect(activityLevel(2, 8)).toBe(1);
    expect(activityLevel(3, 8)).toBe(2);
    expect(activityLevel(5, 8)).toBe(3);
    expect(activityLevel(8, 8)).toBe(4);
  });

  it('never divides by a zero peak', () => {
    expect(activityLevel(0, 0)).toBe(0);
  });
});

describe('activityCells', () => {
  it('puts each week in a column and each weekday in a row, skipping days outside the range', () => {
    const cells = activityCells(calendar([null, 1, 0, 0, 0, 0, 4, 2, 0, 0, 0, 0, 0, null]));
    expect(cells).toHaveLength(12);
    expect(cells[0]).toMatchObject({ x: 0, y: 14, level: 1 }); // Monday of the first week
    expect(cells.at(-1)).toMatchObject({ x: 14, y: 70, level: 0 }); // Friday of the second week
  });
});

describe('ActivityGraph', () => {
  it('is a single labelled image, one cell per day in range', () => {
    const fixture = TestBed.createComponent(ActivityGraph);
    fixture.componentRef.setInput('calendar', calendar([null, 1, 0, 0, 0, 0, 4]));
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('10 contributions on GitHub in the last year');
    expect(svg.querySelectorAll('rect')).toHaveLength(6);
  });
});
