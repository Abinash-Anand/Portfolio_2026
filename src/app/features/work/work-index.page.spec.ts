import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PortfolioStore } from '../../data/portfolio.store';
import { makeProject, provideFixturePortfolio } from '../../data/testing';
import { WorkIndexPage } from './work-index.page';

describe('WorkIndexPage', () => {
  const ts = { name: 'TypeScript', color: '#3178c6', percent: 100 };
  const java = { name: 'Java', color: '#b07219', percent: 100 };

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideFixturePortfolio([
          makeProject({ slug: 'feat-ts', title: 'Featured TS', featured: true, languages: [ts] }),
          makeProject({
            slug: 'feat-java',
            title: 'Featured Java',
            featured: true,
            languages: [java],
          }),
          makeProject({ slug: 'old-ts', title: 'Old TS', languages: [ts] }),
          makeProject({ slug: 'old-java', title: 'Old Java', languages: [java] }),
        ]),
      ],
    });
    await TestBed.inject(PortfolioStore).load();
    const fixture = TestBed.createComponent(WorkIndexPage);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const titles = (el: HTMLElement): string[] =>
    [...el.querySelectorAll('h3, li > a')].map((n) => n.textContent?.trim() ?? '');

  it('lists featured projects as cards and the rest in the archive', async () => {
    const { el } = await render();
    expect(titles(el)).toEqual(
      expect.arrayContaining(['Featured TS', 'Featured Java', 'Old TS', 'Old Java']),
    );
    expect(el.querySelectorAll('app-project-card')).toHaveLength(2);
  });

  it('filters by language with aria-pressed buttons, and toggles the filter off again', async () => {
    const { fixture, el } = await render();
    const button = [...el.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Java',
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(titles(el)).toEqual(expect.arrayContaining(['Featured Java', 'Old Java']));
    expect(titles(el)).not.toContain('Old TS');

    button.click();
    await fixture.whenStable();
    expect(titles(el)).toContain('Old TS');
  });
});
