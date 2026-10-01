import { describe, expect, it } from 'vitest';
import type { RawRepo } from './github';
import { buildPortfolio, toLanguages } from './normalize';
import { parseManifest, resolveCover } from './manifest';

const repo = (name: string, overrides: Partial<RawRepo> = {}): RawRepo => ({
  name,
  description: null,
  url: `https://github.com/me/${name}`,
  homepageUrl: null,
  stargazerCount: 0,
  pushedAt: '2026-05-01T10:00:00Z',
  isArchived: false,
  isFork: false,
  isPrivate: false,
  openGraphImageUrl: 'https://opengraph.githubassets.com/x',
  usesCustomOpenGraphImage: false,
  primaryLanguage: null,
  languages: { totalSize: 0, edges: [] },
  repositoryTopics: { nodes: [] },
  readmeUpper: null,
  readmeMixed: null,
  readmeLower: null,
  manifest: null,
  ...overrides,
});

const build = (repos: RawRepo[], pinned: RawRepo[] = [], extra: object = {}) =>
  buildPortfolio({
    login: 'me',
    raw: { pinned, repos },
    source: 'fixture',
    now: new Date('2026-10-01T00:00:00Z'),
    ...extra,
  });

describe('buildPortfolio', () => {
  it('features pinned repos first (in pin order), then the rest by most recent push', async () => {
    const a = repo('a', { pushedAt: '2026-01-01T00:00:00Z' });
    const b = repo('b', { pushedAt: '2026-09-01T00:00:00Z' });
    const c = repo('c', { pushedAt: '2026-05-01T00:00:00Z' });
    const { index } = await build([a, b, c], [c, a]);
    expect(index.projects.map((p) => [p.slug, p.featured])).toEqual([
      ['c', true],
      ['a', true],
      ['b', false],
    ]);
  });

  it('uses the fallback featured list only when nothing is pinned, and says so', async () => {
    const { index, warnings } = await build([repo('x'), repo('y')], [], { featuredFallback: ['y'] });
    expect(index.projects.find((p) => p.slug === 'y')?.featured).toBe(true);
    expect(index.projects.find((p) => p.slug === 'x')?.featured).toBe(false);
    expect(warnings.join(' ')).toMatch(/No repositories are pinned/);

    const pinned = await build([repo('x'), repo('y')], [repo('x')], { featuredFallback: ['y'] });
    expect(pinned.index.projects.find((p) => p.slug === 'y')?.featured).toBe(false);
  });

  it('excludes forks, private repos, the profile repo and manifest-hidden repos', async () => {
    const hidden = repo('hidden', { manifest: { text: '{"hidden": true}' } });
    const { index } = await build(
      [repo('keep'), repo('forked', { isFork: true }), repo('secret', { isPrivate: true }), repo('me'), hidden],
      [],
    );
    expect(index.projects.map((p) => p.slug)).toEqual(['keep']);
  });

  it('applies the manifest over GitHub data and falls back otherwise', async () => {
    const manifest = JSON.stringify({
      title: 'Nice Title',
      summary: 'Manifest summary',
      stack: ['Go'],
      highlights: ['one'],
      liveUrl: 'https://live.example.com',
      cover: 'docs/cover.png',
    });
    const { index } = await build([
      repo('m', { manifest: { text: manifest }, description: 'GitHub description' }),
      repo('plain', {
        description: '**Bold** description',
        homepageUrl: 'https://plain.example.com',
        languages: {
          totalSize: 100,
          edges: [{ size: 75, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 25, node: { name: 'CSS', color: null } }],
        },
      }),
    ]);
    const m = index.projects.find((p) => p.slug === 'm')!;
    expect(m).toMatchObject({ title: 'Nice Title', summary: 'Manifest summary', stack: ['Go'], highlights: ['one'], liveUrl: 'https://live.example.com' });
    expect(m.cover).toBe('https://raw.githubusercontent.com/me/m/HEAD/docs/cover.png');
    const plain = index.projects.find((p) => p.slug === 'plain')!;
    expect(plain.summary).toBe('Bold description');
    expect(plain.liveUrl).toBe('https://plain.example.com');
    expect(plain.stack).toEqual(['TypeScript', 'CSS']);
    expect(plain.languages).toEqual([
      { name: 'TypeScript', color: '#3178c6', percent: 75 },
      { name: 'CSS', color: null, percent: 25 },
    ]);
  });

  it('renders READMEs, honours readme: "hide", and falls back to the first paragraph for the summary', async () => {
    const md = '# P\n\nA reasonably long first paragraph describing the project well.\n\n## Usage\n\nrun it';
    const withReadme = repo('with', { readmeUpper: { text: md } });
    const { index, details } = await build(
      [
        withReadme,
        repo('archived', { readmeUpper: { text: md } }),
        repo('hidden-readme', { readmeUpper: { text: md }, manifest: { text: '{"readme":"hide"}' } }),
        repo('none'),
      ],
      [withReadme],
    );
    expect(details.map((d) => d.slug).sort()).toEqual(['archived', 'with']);
    expect(index.projects.find((p) => p.slug === 'with')).toMatchObject({
      hasReadme: true,
      summary: 'A reasonably long first paragraph describing the project well.',
    });
    // Not featured: the README paragraph is not trusted as a summary.
    expect(index.projects.find((p) => p.slug === 'archived')).toMatchObject({ hasReadme: true, summary: '' });
    expect(index.projects.find((p) => p.slug === 'hidden-readme')?.hasReadme).toBe(false);
    expect(index.projects.find((p) => p.slug === 'none')?.hasReadme).toBe(false);
  });

  it('warns about and ignores an invalid manifest without failing the build', async () => {
    const { index, warnings } = await build([
      repo('bad-json', { manifest: { text: '{nope' } }),
      repo('bad-shape', { manifest: { text: '{"stack": "not-an-array"}' } }),
    ]);
    expect(index.projects).toHaveLength(2);
    expect(warnings.some((w) => w.startsWith('bad-json'))).toBe(true);
    expect(warnings.some((w) => w.startsWith('bad-shape'))).toBe(true);
  });
});

describe('toLanguages', () => {
  it('returns an empty list when GitHub reports no code', () => {
    expect(toLanguages(repo('empty'))).toEqual([]);
  });
});

describe('manifest helpers', () => {
  it('keeps absolute cover URLs and resolves relative ones against the repo', () => {
    expect(resolveCover('https://x.y/c.png', 'me', 'r')).toBe('https://x.y/c.png');
    expect(resolveCover('./c.png', 'me', 'r')).toBe('https://raw.githubusercontent.com/me/r/HEAD/c.png');
  });

  it('returns null for empty input', () => {
    expect(parseManifest('  ', 'r', () => undefined)).toBeNull();
    expect(parseManifest(null, 'r', () => undefined)).toBeNull();
  });
});
