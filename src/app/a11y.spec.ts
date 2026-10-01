import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { makeProject, provideFixturePortfolio } from './data/testing';
import { PortfolioStore } from './data/portfolio.store';
import { HomePage } from './features/home/home.page';
import { ImpressumPage } from './features/legal/impressum.page';
import { PrivacyPage } from './features/legal/privacy.page';
import { NotFoundPage } from './features/not-found/not-found.page';
import { ResumePage } from './features/resume/resume.page';
import { SectionPage } from './features/resume/section.page';
import { WorkIndexPage } from './features/work/work-index.page';

/**
 * Accessibility regression tests (PRODUCT.md F11, DESIGN.md section 13): every page is rendered and checked against
 * the WCAG 2.2 AA rules in axe-core. jsdom has no layout or colors, so color contrast is covered separately (the
 * design tokens are tested for AA, and the pages were audited with axe in a real browser); and the page-level
 * landmark rules are off because each page is rendered on its own, without the site shell around it.
 */
const RULES = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

async function violationsOf(element: Element): Promise<string[]> {
  const host = document.createElement('main');
  host.append(element.cloneNode(true));
  document.body.append(host);
  try {
    const result = await axe.run(host, RULES);
    return result.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes
          .map((node) => node.target.join(' '))
          .slice(0, 3)
          .join(', ')})`,
    );
  } finally {
    host.remove();
  }
}

async function render(page: Type<unknown>, inputs: Record<string, unknown> = {}): Promise<Element> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideFixturePortfolio([
        makeProject({ slug: 'a', title: 'Project A', featured: true, summary: 'Alpha.' }),
        makeProject({ slug: 'b', title: 'Project B', summary: 'Beta.' }),
      ]),
    ],
  });
  await TestBed.inject(PortfolioStore).load();
  const fixture = TestBed.createComponent(page);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as Element;
}

describe('accessibility (axe, WCAG 2.2 AA)', () => {
  const pages: [string, Type<unknown>, Record<string, unknown>?][] = [
    ['home', HomePage],
    ['work index', WorkIndexPage],
    ['resume', ResumePage],
    ['about', SectionPage, { section: 'about' }],
    ['experience', SectionPage, { section: 'experience' }],
    ['skills', SectionPage, { section: 'skills' }],
    ['education', SectionPage, { section: 'education' }],
    ['privacy', PrivacyPage],
    ['impressum', ImpressumPage],
    ['not found', NotFoundPage],
  ];

  it.each(pages)('%s has no violations', async (_name, page, inputs) => {
    expect(await violationsOf(await render(page, inputs))).toEqual([]);
  });

  it('would notice a real problem (the check itself works)', async () => {
    const broken = document.createElement('div');
    broken.innerHTML = '<img src="x.png"><button></button>';
    const found = await violationsOf(broken);
    expect(found.some((line) => line.startsWith('image-alt'))).toBe(true);
    expect(found.some((line) => line.startsWith('button-name'))).toBe(true);
  });
});
