import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { PortfolioStore } from './data/portfolio.store';
import { makeProject, provideFixturePortfolio } from './data/testing';

describe('routes', () => {
  let router: Router;
  let harness: RouterTestingHarness;
  const text = (): string => (harness.routeNativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideFixturePortfolio(
          [
            makeProject({
              slug: 'sample',
              title: 'Sample Project',
              summary: 'About the sample.',
              hasReadme: true,
            }),
            makeProject({ slug: 'Eber-app', title: 'Eber app' }),
            makeProject({ slug: 'ParkRabbit', title: 'ParkRabbit' }),
          ],
          {
            sample: {
              slug: 'sample',
              readmeHtml: '<h2 id="usage">Usage</h2><p>Run it.</p>',
              toc: [{ id: 'usage', text: 'Usage', depth: 2 }],
            },
          },
        ),
      ],
    });
    await TestBed.inject(PortfolioStore).load();
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it.each([
    ['/project/ParkRabbit', '/work/ParkRabbit'],
    ['/project/ParkRabbit/architecture', '/work/ParkRabbit'],
    ['/project/eber', '/work/Eber-app'],
    ['/projects', '/work'],
  ])('redirects %s to %s', async (from, to) => {
    await harness.navigateByUrl(from);
    expect(router.url).toBe(to);
  });

  it('resolves a project and renders its README on /work/:slug', async () => {
    await harness.navigateByUrl('/work/sample');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Sample Project',
    );
    expect(text()).toContain('Run it.');
    expect(text()).toContain('Usage');
  });

  it('redirects an unknown project to the not-found page', async () => {
    await harness.navigateByUrl('/work/does-not-exist');
    expect(router.url).toBe('/not-found');
    expect(text()).toContain('Page not found');
  });

  it('renders the not-found page for unknown URLs', async () => {
    await harness.navigateByUrl('/nope/nothing');
    expect(text()).toContain('Page not found');
  });

  it.each([
    ['/about', 'About'],
    ['/experience', 'Experience'],
    ['/skills', 'Skills'],
    ['/education', 'Education'],
  ])('serves the %s endpoint as a 2D page', async (url, heading) => {
    await harness.navigateByUrl(url);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(heading);
  });

  it('serves the full resume', async () => {
    await harness.navigateByUrl('/resume');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Abinash Anand');
  });
});
