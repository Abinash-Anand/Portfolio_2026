import type { PortfolioIndex, ProjectDetail } from './models';

/**
 * Port: where portfolio data comes from. Components and the store depend on this abstraction,
 * never on JSON files or GitHub. Adapters: BuildTimeJsonRepository (default), fixture (tests),
 * and a runtime-fetch adapter if instant updates without a rebuild are ever needed.
 */
export abstract class PortfolioRepository {
  abstract getIndex(): Promise<PortfolioIndex>;
  /** The rendered README for a project, or null when it has none. */
  abstract getProjectDetail(slug: string): Promise<ProjectDetail | null>;
}
