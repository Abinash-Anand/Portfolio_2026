import type {
  Language,
  PortfolioIndex,
  PortfolioSource,
  Project,
  ProjectDetail,
} from '../../src/app/data/models';
import { readmeOf, type RawPortfolio, type RawRepo } from './github';
import { parseManifest, resolveCover } from './manifest';
import { PortfolioIndexSchema, ProjectDetailSchema } from './schema';
import { firstParagraph, isBoilerplate, plainText, renderReadme } from './readme';

export interface BuildInput {
  readonly login: string;
  readonly raw: RawPortfolio;
  readonly source: PortfolioSource;
  readonly now: Date;
  /** Repository names never shown as projects (for example the profile README repo). */
  readonly excluded?: readonly string[];
  /** Featured, in order, ONLY when no repository is pinned on GitHub. Pinning always wins. */
  readonly featuredFallback?: readonly string[];
}

export interface BuildOutput {
  readonly index: PortfolioIndex;
  readonly details: readonly ProjectDetail[];
  readonly warnings: readonly string[];
}

const SLUG = /^[A-Za-z0-9._-]+$/;
const NON_FEATURED_ORDER = 1000;

export function toLanguages(repo: RawRepo): Language[] {
  const total = repo.languages.totalSize;
  if (total <= 0) return [];
  return repo.languages.edges.map((edge) => ({
    name: edge.node.name,
    color: edge.node.color && /^#[0-9a-fA-F]{6}$/.test(edge.node.color) ? edge.node.color : null,
    percent: Math.round((edge.size / total) * 1000) / 10,
  }));
}

/** The repository description as plain text, or null if it is empty or generic boilerplate. */
function descriptionOf(repo: RawRepo): string | null {
  const text = repo.description ? plainText(repo.description) : '';
  return text && !isBoilerplate(text) ? text : null;
}

function isHttpUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Raw GitHub data to domain models, with strict validation of the result. */
export async function buildPortfolio(input: BuildInput): Promise<BuildOutput> {
  const warnings: string[] = [];
  const warn = (message: string): void => {
    warnings.push(message);
  };
  const excluded = new Set([input.login.toLowerCase(), ...(input.excluded ?? []).map((n) => n.toLowerCase())]);

  const usingFallback = input.raw.pinned.length === 0 && (input.featuredFallback?.length ?? 0) > 0;
  const featuredNames = usingFallback ? [...(input.featuredFallback ?? [])] : input.raw.pinned.map((r) => r.name);
  if (usingFallback) {
    warn(`No repositories are pinned on GitHub; featuring the fallback list (${featuredNames.join(', ')}). Pin repos to override it.`);
  }
  const pinnedOrder = new Map(featuredNames.map((name, index) => [name, index] as const));
  const seen = new Set<string>();
  const repos = [...input.raw.pinned, ...input.raw.repos].filter((repo) => {
    if (seen.has(repo.name)) return false;
    seen.add(repo.name);
    if (repo.isFork || repo.isPrivate || excluded.has(repo.name.toLowerCase())) return false;
    if (!SLUG.test(repo.name)) {
      warn(`${repo.name}: not a URL-safe slug; skipped`);
      return false;
    }
    return true;
  });

  const projects: Project[] = [];
  const details: ProjectDetail[] = [];

  for (const repo of repos) {
    const manifest = parseManifest(repo.manifest?.text, repo.name, warn);
    if (manifest?.hidden) continue;

    const markdown = readmeOf(repo);
    const hasReadme = manifest?.readme !== 'hide' && !!markdown?.trim();
    const languages = toLanguages(repo);
    const title = manifest?.title ?? repo.name;
    const pinnedIndex = pinnedOrder.get(repo.name);

    const cover = manifest?.cover
      ? resolveCover(manifest.cover, input.login, repo.name)
      : repo.usesCustomOpenGraphImage
        ? repo.openGraphImageUrl
        : null;

    projects.push({
      slug: repo.name,
      title,
      // A README-derived summary is only trusted for featured projects (which get reviewed);
      // archive entries show a real description or nothing, never template boilerplate.
      summary:
        manifest?.summary ??
        descriptionOf(repo) ??
        (pinnedIndex !== undefined && markdown ? firstParagraph(markdown) : ''),
      role: manifest?.role ?? null,
      stack: manifest?.stack ?? languages.slice(0, 4).map((l) => l.name),
      highlights: manifest?.highlights ?? [],
      languages,
      topics: repo.repositoryTopics.nodes.map((n) => n.topic.name),
      stars: repo.stargazerCount,
      pushedAt: new Date(repo.pushedAt).toISOString(),
      repoUrl: repo.url,
      liveUrl: manifest?.liveUrl ?? (isHttpUrl(repo.homepageUrl) ? repo.homepageUrl : null),
      cover,
      featured: pinnedIndex !== undefined,
      order: manifest?.order ?? pinnedIndex ?? NON_FEATURED_ORDER,
      hasReadme,
    });

    if (hasReadme && markdown) {
      const rendered = await renderReadme(markdown, {
        login: input.login,
        repo: repo.name,
        titles: [repo.name, title],
      });
      details.push({ slug: repo.name, readmeHtml: rendered.html, toc: rendered.toc });
    }
  }

  // Featured first (by order), then everything else by most recent push.
  projects.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.featured) return a.order - b.order || a.slug.localeCompare(b.slug);
    return b.pushedAt.localeCompare(a.pushedAt);
  });

  const index = PortfolioIndexSchema.parse({
    generatedAt: input.now.toISOString(),
    source: input.source,
    login: input.login,
    projects,
  });
  const validDetails = details.map((detail) => ProjectDetailSchema.parse(detail));
  return { index, details: validDetails, warnings };
}
