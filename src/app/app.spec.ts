import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { PortfolioStore } from './data/portfolio.store';
import { provideFixturePortfolio } from './data/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideFixturePortfolio()],
    }).compileComponents();
    await TestBed.inject(PortfolioStore).load();
  });

  it('renders a skip link, primary nav, main landmark and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('a[href="#main"]')?.textContent).toContain('Skip to content');
    expect(el.querySelector('nav[aria-label="Primary"]')).toBeTruthy();
    expect(el.querySelector('main#main')).toBeTruthy();
    expect(el.querySelector('footer')).toBeTruthy();
  });

  it('tells the visitor when sample data is shown (no GitHub token at build time)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent).toContain(
      'sample GitHub data',
    );
  });
});
