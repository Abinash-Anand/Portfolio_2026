import type { Provider } from '@angular/core';
import type { ActivityCalendar, PortfolioIndex, Project, ProjectDetail } from './models';
import { PortfolioRepository } from './portfolio.repository';

/** Test helpers: an in-memory repository so specs never depend on generated files. */
export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: 'sample',
    title: 'Sample',
    summary: 'A sample project.',
    role: null,
    stack: ['TypeScript'],
    highlights: [],
    languages: [{ name: 'TypeScript', color: '#3178c6', percent: 100 }],
    topics: [],
    stars: 0,
    pushedAt: '2026-05-01T10:00:00.000Z',
    repoUrl: 'https://github.com/me/sample',
    liveUrl: null,
    cover: null,
    featured: false,
    order: 1000,
    hasReadme: false,
    ...overrides,
  };
}

export class FixtureRepository extends PortfolioRepository {
  constructor(
    private readonly index: PortfolioIndex,
    private readonly details: Readonly<Record<string, ProjectDetail>> = {},
  ) {
    super();
  }
  getIndex(): Promise<PortfolioIndex> {
    return Promise.resolve(this.index);
  }
  getProjectDetail(slug: string): Promise<ProjectDetail | null> {
    return Promise.resolve(this.details[slug] ?? null);
  }
}

export function provideFixturePortfolio(
  projects: readonly Project[] = [makeProject()],
  details: Readonly<Record<string, ProjectDetail>> = {},
  activity: ActivityCalendar | null = null,
): Provider {
  const index: PortfolioIndex = {
    generatedAt: '2026-10-01T00:00:00.000Z',
    source: 'fixture',
    login: 'me',
    projects,
    activity,
  };
  return { provide: PortfolioRepository, useValue: new FixtureRepository(index, details) };
}
