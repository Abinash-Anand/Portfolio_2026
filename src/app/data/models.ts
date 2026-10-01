/**
 * Domain models. Plain, immutable shapes shared by the build-time sync script (scripts/) and the app.
 * Nothing here knows about GitHub's API shape: that is the sync script's anti-corruption layer.
 */

export interface Language {
  readonly name: string;
  /** Hex color from GitHub, or null when unknown. */
  readonly color: string | null;
  /** Share of the repository's code, 0 to 100, one decimal. */
  readonly percent: number;
}

export interface TocItem {
  readonly id: string;
  readonly text: string;
  readonly depth: 2 | 3;
}

export interface Project {
  /** GitHub repository name; also the URL slug (`/work/:slug`). */
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly role: string | null;
  readonly stack: readonly string[];
  readonly highlights: readonly string[];
  readonly languages: readonly Language[];
  readonly topics: readonly string[];
  readonly stars: number;
  /** ISO 8601 timestamp of the last push. */
  readonly pushedAt: string;
  readonly repoUrl: string;
  readonly liveUrl: string | null;
  readonly cover: string | null;
  /** True for repos pinned on the GitHub profile. */
  readonly featured: boolean;
  /** Sort key within featured projects (lower first). */
  readonly order: number;
  /** True when a rendered README exists and is shown on the detail page. */
  readonly hasReadme: boolean;
}

export type PortfolioSource = 'github' | 'fixture';

/**
 * One year of GitHub activity: contributions per day, in week-major order (7 per week, Sunday first), `null` for
 * days outside the range (the start of the first week and the end of the last one).
 */
export interface ActivityCalendar {
  readonly total: number;
  /** Date (YYYY-MM-DD) of the first day of the first week, which is a Sunday. */
  readonly from: string;
  readonly days: readonly (number | null)[];
}

export interface PortfolioIndex {
  /** ISO 8601 timestamp of the sync. */
  readonly generatedAt: string;
  /** `fixture` means sample data was used because no GitHub token was configured. */
  readonly source: PortfolioSource;
  readonly login: string;
  readonly projects: readonly Project[];
  /** Present only when the sync had a token that can read it; the activity section is hidden without it. */
  readonly activity: ActivityCalendar | null;
}

export interface ProjectDetail {
  readonly slug: string;
  /** README rendered and sanitised at build time. Only render through the `safe-html` pipe. */
  readonly readmeHtml: string;
  readonly toc: readonly TocItem[];
}

/** What a project page needs: the project plus its rendered README, if any. */
export interface ProjectPageData {
  readonly project: Project;
  readonly detail: ProjectDetail | null;
}
