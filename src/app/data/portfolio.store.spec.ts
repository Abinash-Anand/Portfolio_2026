import { TestBed } from '@angular/core/testing';
import { PortfolioRepository } from './portfolio.repository';
import { PortfolioStore } from './portfolio.store';
import { makeProject, provideFixturePortfolio } from './testing';

describe('PortfolioStore', () => {
  const ts = { name: 'TypeScript', color: '#3178c6', percent: 80 };
  const py = { name: 'Python', color: '#3572a5', percent: 80 };

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideFixturePortfolio([
          makeProject({ slug: 'a', featured: true, languages: [ts] }),
          makeProject({ slug: 'b', featured: true, languages: [ts, py] }),
          makeProject({ slug: 'c', featured: false, languages: [py] }),
        ]),
      ],
    });
    return TestBed.inject(PortfolioStore);
  }

  it('loads once, and callers that arrive during the load wait for it', async () => {
    const store = setup();
    const repository = TestBed.inject(PortfolioRepository);
    const getIndex = vi.spyOn(repository, 'getIndex');

    await Promise.all([store.load(), store.load()]);
    await store.load();

    expect(getIndex).toHaveBeenCalledTimes(1);
    expect(store.loaded()).toBe(true);
  });

  it('is empty until loaded, then exposes read-only views', async () => {
    const store = setup();
    expect(store.loaded()).toBe(false);
    expect(store.projects()).toEqual([]);

    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.source()).toBe('fixture');
    expect(store.featured().map((p) => p.slug)).toEqual(['a', 'b']);
    expect(store.archive().map((p) => p.slug)).toEqual(['c']);
  });

  it('looks projects up by slug', async () => {
    const store = setup();
    await store.load();
    expect(store.project('b')?.slug).toBe('b');
    expect(store.project('missing')).toBeUndefined();
  });

  it('lists languages most common first', async () => {
    const store = setup();
    await store.load();
    // TypeScript and Python are each used twice; ties sort by name.
    expect(store.languages()).toEqual(['Python', 'TypeScript']);
  });

  it('loads only once', async () => {
    const store = setup();
    await store.load();
    const first = store.projects();
    await store.load();
    expect(store.projects()).toBe(first);
  });
});
