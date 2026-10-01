import { z } from 'zod';
import type { PortfolioIndex, Project, ProjectDetail } from '../../src/app/data/models';

/**
 * Validation at the boundary: output that does not match fails the BUILD, not the browser.
 * Each schema is tied to its domain type so the two cannot drift apart (see the type checks below).
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const LanguageSchema = z.object({
  name: z.string().min(1),
  color: hexColor.nullable(),
  percent: z.number().min(0).max(100),
});

export const TocItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  depth: z.union([z.literal(2), z.literal(3)]),
});

export const ProjectSchema = z.object({
  slug: z.string().regex(/^[A-Za-z0-9._-]+$/),
  title: z.string().min(1),
  summary: z.string(),
  role: z.string().nullable(),
  stack: z.array(z.string()),
  highlights: z.array(z.string()),
  languages: z.array(LanguageSchema),
  topics: z.array(z.string()),
  stars: z.number().int().min(0),
  pushedAt: z.iso.datetime(),
  repoUrl: z.url(),
  liveUrl: z.url().nullable(),
  cover: z.url().nullable(),
  featured: z.boolean(),
  order: z.number(),
  hasReadme: z.boolean(),
});

export const PortfolioIndexSchema = z.object({
  generatedAt: z.iso.datetime(),
  source: z.enum(['github', 'fixture']),
  login: z.string().min(1),
  projects: z.array(ProjectSchema),
});

export const ProjectDetailSchema = z.object({
  slug: z.string().regex(/^[A-Za-z0-9._-]+$/),
  readmeHtml: z.string(),
  toc: z.array(TocItemSchema),
});

/**
 * Optional `portfolio.json` in a repository root. Every field is optional.
 * A bad manifest is ignored with a warning (it must not take the whole site down);
 * the normalised OUTPUT above is validated strictly.
 */
export const ManifestSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  summary: z.string().min(1).max(400).optional(),
  role: z.string().min(1).max(120).optional(),
  stack: z.array(z.string().min(1)).max(20).optional(),
  highlights: z.array(z.string().min(1).max(240)).max(8).optional(),
  /** Absolute URL, or a path relative to the repository root. */
  cover: z.string().min(1).optional(),
  liveUrl: z.url().optional(),
  order: z.number().optional(),
  readme: z.enum(['full', 'hide']).optional(),
  hidden: z.boolean().optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

// Compile-time drift checks: the schema output must be assignable to the domain type.
type Assert<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;
export type _ProjectInSync = Assert<Extends<z.infer<typeof ProjectSchema>, Project>>;
export type _IndexInSync = Assert<Extends<z.infer<typeof PortfolioIndexSchema>, PortfolioIndex>>;
export type _DetailInSync = Assert<Extends<z.infer<typeof ProjectDetailSchema>, ProjectDetail>>;
