import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PortfolioStore } from '../../data/portfolio.store';
import { makeProject, provideFixturePortfolio } from '../../data/testing';
import type { ActivityCalendar } from '../../data/models';
import { HomePage } from './home.page';

const ACTIVITY: ActivityCalendar = { total: 42, from: '2026-09-27', days: [0, 1, 2, 3, 0, 0, 5] };

async function render(activity: ActivityCalendar | null): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideFixturePortfolio([makeProject({ featured: true })], {}, activity),
    ],
  });
  await TestBed.inject(PortfolioStore).load();
  const fixture = TestBed.createComponent(HomePage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HomePage activity section', () => {
  it('shows the GitHub activity when the build had it', async () => {
    const page = await render(ACTIVITY);
    expect(page.querySelector('#home-activity')?.textContent).toContain('Activity');
    expect(page.textContent).toContain('42 contributions on GitHub in the last year');
    expect(page.querySelector('app-activity-graph svg')).not.toBeNull();
  });

  it('leaves the section out entirely when there is no data', async () => {
    const page = await render(null);
    expect(page.querySelector('#home-activity')).toBeNull();
    expect(page.querySelector('app-activity-graph')).toBeNull();
  });
});
