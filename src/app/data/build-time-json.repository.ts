import { Injectable } from '@angular/core';
import { PROJECT_LOADERS } from '../../generated/project-loaders';
import type { PortfolioIndex, ProjectDetail } from './models';
import { PortfolioRepository } from './portfolio.repository';

/**
 * Default adapter: reads the JSON written by scripts/sync-github.ts at build time.
 * The index is one lazy chunk; each project README is its own chunk (see project-loaders.ts).
 */
@Injectable()
export class BuildTimeJsonRepository extends PortfolioRepository {
  async getIndex(): Promise<PortfolioIndex> {
    const module = await import('../../generated/index.json');
    // Shape is validated by the sync script's schema at build time, so the cast is safe.
    return module.default as unknown as PortfolioIndex;
  }

  getProjectDetail(slug: string): Promise<ProjectDetail | null> {
    const load = PROJECT_LOADERS[slug];
    return load ? load() : Promise.resolve(null);
  }
}
