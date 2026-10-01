import { z } from 'zod';

/**
 * The only module that knows GitHub's API shape. Everything downstream works on our domain models.
 * The raw response is validated too, so an API change fails the build with a clear message.
 */

export const PORTFOLIO_QUERY = /* GraphQL */ `
  fragment RepoFields on Repository {
    name
    description
    url
    homepageUrl
    stargazerCount
    pushedAt
    isArchived
    isFork
    isPrivate
    openGraphImageUrl
    usesCustomOpenGraphImage
    primaryLanguage { name color }
    languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
      totalSize
      edges { size node { name color } }
    }
    repositoryTopics(first: 12) { nodes { topic { name } } }
    readmeUpper: object(expression: "HEAD:README.md") { ... on Blob { text } }
    readmeMixed: object(expression: "HEAD:Readme.md") { ... on Blob { text } }
    readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
    manifest: object(expression: "HEAD:portfolio.json") { ... on Blob { text } }
  }

  query Portfolio($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes { ... on Repository { ...RepoFields } }
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        isFork: false
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes { ...RepoFields }
      }
    }
  }
`;

const blob = z.object({ text: z.string() }).nullable();
const lang = z.object({ name: z.string(), color: z.string().nullable() });

export const RawRepoSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  homepageUrl: z.string().nullable(),
  stargazerCount: z.number(),
  pushedAt: z.string(),
  isArchived: z.boolean(),
  isFork: z.boolean(),
  isPrivate: z.boolean(),
  openGraphImageUrl: z.string(),
  usesCustomOpenGraphImage: z.boolean(),
  primaryLanguage: lang.nullable(),
  languages: z.object({
    totalSize: z.number(),
    edges: z.array(z.object({ size: z.number(), node: lang })),
  }),
  repositoryTopics: z.object({ nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })) }),
  readmeUpper: blob,
  readmeMixed: blob,
  readmeLower: blob,
  manifest: blob,
});

export const RawPortfolioSchema = z.object({
  user: z.object({
    pinnedItems: z.object({ nodes: z.array(z.looseObject({})) }),
    repositories: z.object({ nodes: z.array(RawRepoSchema) }),
  }),
});

export type RawRepo = z.infer<typeof RawRepoSchema>;

export interface RawPortfolio {
  readonly pinned: readonly RawRepo[];
  readonly repos: readonly RawRepo[];
}

/** Validates a raw GraphQL `data` payload (from the API or the recorded fixture). */
export function parseRawPortfolio(data: unknown): RawPortfolio {
  const parsed = RawPortfolioSchema.parse(data);
  // Pinned nodes that are not repositories come back as empty objects; keep only valid repos.
  const pinned = parsed.user.pinnedItems.nodes
    .map((node) => RawRepoSchema.safeParse(node))
    .flatMap((result) => (result.success ? [result.data] : []));
  return { pinned, repos: parsed.user.repositories.nodes };
}

export async function fetchRawPortfolio(login: string, token: string): Promise<RawPortfolio> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-sync',
    },
    body: JSON.stringify({ query: PORTFOLIO_QUERY, variables: { login } }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: HTTP ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as { data?: unknown; errors?: { message: string }[] };
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return parseRawPortfolio(body.data);
}

/** First README found, case variants included. */
export function readmeOf(repo: RawRepo): string | null {
  return (repo.readmeUpper ?? repo.readmeMixed ?? repo.readmeLower)?.text ?? null;
}
