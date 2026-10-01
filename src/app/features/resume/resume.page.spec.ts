import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RESUME } from '../../content/resume';
import { PortfolioStore } from '../../data/portfolio.store';
import { makeProject, provideFixturePortfolio } from '../../data/testing';
import { ResumePage } from './resume.page';

describe('ResumePage', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideFixturePortfolio([makeProject({ slug: 'ParkRabbit', title: 'ParkRabbit' })]),
      ],
    });
    await TestBed.inject(PortfolioStore).load();
    const fixture = TestBed.createComponent(ResumePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders every resume section with one h1 and labelled h2 sections', async () => {
    const el = await render();
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Summary',
      'Skills',
      'Experience',
      'Projects',
      'Education',
    ]);
    for (const entry of RESUME.experience) expect(el.textContent).toContain(entry.organisation);
  });

  it('links a CV project to its work page only when that page exists', async () => {
    const el = await render();
    const links = [...el.querySelectorAll<HTMLAnchorElement>('a[href^="/work/"]')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(['/work/ParkRabbit']); // SynthGraph is not in this fixture, so no link
  });

  it('offers the CV download', async () => {
    const el = await render();
    expect(el.querySelector('a[download]')?.getAttribute('href')).toContain('.pdf');
  });

  it('never shows a phone number (the repository and site are public)', async () => {
    const el = await render();
    expect(el.textContent).not.toMatch(/\+?\d[\d\s().-]{8,}\d/);
  });
});
