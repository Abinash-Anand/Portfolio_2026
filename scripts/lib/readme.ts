import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { toString } from 'hast-util-to-string';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import type { TocItem } from '../../src/app/data/models';

/**
 * README (Markdown) to sanitised HTML at build time. Nothing here ships to the browser.
 *
 * Order matters:
 *   parse -> raw HTML -> resolve relative URLs -> SANITISE -> slugs -> demote headings -> highlight -> finalise links
 * Sanitising happens before highlighting and slugging, so the only markup we add after it is our own.
 */

export interface RenderedReadme {
  readonly html: string;
  readonly toc: readonly TocItem[];
}

export interface RenderContext {
  readonly login: string;
  readonly repo: string;
  /** Page title and repo name, to drop a duplicate leading H1. */
  readonly titles: readonly string[];
}

const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isAbsolute = (url: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

/** Relative image and link URLs in a README point into the repository; make them absolute. */
function resolveRelativeUrls(ctx: RenderContext) {
  const raw = `https://raw.githubusercontent.com/${ctx.login}/${ctx.repo}/HEAD/`;
  const blob = `https://github.com/${ctx.login}/${ctx.repo}/blob/HEAD/`;
  const clean = (path: string): string => path.replace(/^\.?\//, '');
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (node.tagName === 'img' && typeof props['src'] === 'string' && !isAbsolute(props['src'])) {
        props['src'] = raw + clean(props['src']);
      }
      if (node.tagName === 'a' && typeof props['href'] === 'string') {
        const href = props['href'];
        if (!href.startsWith('#') && !isAbsolute(href)) props['href'] = blob + clean(href);
      }
    });
  };
}

/** Demote every heading one level (the page owns the single H1) and drop a leading H1 that repeats the title. */
function shapeHeadings(ctx: RenderContext) {
  const known = new Set(ctx.titles.map(normalise));
  return () => (tree: Root) => {
    let seenHeading = false;
    const toRemove: { parent: Root | Element; index: number }[] = [];
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      if (!seenHeading) {
        seenHeading = true;
        if (
          node.tagName === 'h1' &&
          known.has(normalise(toString(node))) &&
          parent &&
          index !== undefined
        ) {
          toRemove.push({ parent: parent as Root | Element, index });
          return;
        }
      }
      const level = Number(node.tagName.slice(1));
      node.tagName = `h${Math.min(level + 1, 6)}`;
    });
    for (const { parent, index } of toRemove.reverse()) parent.children.splice(index, 1);
  };
}

/** External links open safely in a new tab; images load lazily. Runs after sanitising. */
function finaliseLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (
        node.tagName === 'a' &&
        typeof props['href'] === 'string' &&
        /^https?:\/\//i.test(props['href'])
      ) {
        props['target'] = '_blank';
        props['rel'] = ['noopener', 'noreferrer'];
      }
      if (node.tagName === 'img') {
        props['loading'] = 'lazy';
        props['decoding'] = 'async';
      }
    });
  };
}

function collectToc() {
  const items: TocItem[] = [];
  const plugin = () => (tree: Root) => {
    items.length = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties['id'];
      const text = toString(node).trim();
      if (typeof id === 'string' && text) {
        items.push({ id, text, depth: node.tagName === 'h2' ? 2 : 3 });
      }
    });
  };
  return { plugin, items };
}

export async function renderReadme(markdown: string, ctx: RenderContext): Promise<RenderedReadme> {
  const toc = collectToc();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(resolveRelativeUrls(ctx))
    .use(rehypeSanitize, {
      ...defaultSchema,
      // Keep GitHub-style code language hints so the highlighter can see them.
      attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.['code'] ?? []), ['className', /^language-./]],
      },
    })
    .use(rehypeSlug)
    .use(shapeHeadings(ctx))
    .use(rehypeShiki, { theme: 'github-dark-default', fallbackLanguage: 'text', lazy: true })
    .use(finaliseLinks)
    .use(toc.plugin)
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), toc: [...toc.items] };
}

/** Generic README boilerplate that says nothing about the project. */
const BOILERPLATE = [
  /this template provides a minimal setup/i,
  /getting started with create react app/i,
  /this project was generated (with|using)/i,
  /created with stackblitz/i,
  /official plugins are available/i,
  /expanding the eslint configuration/i,
  /react compiler/i,
  /@vitejs\/plugin/i,
  /local development server/i,
  /\bng serve\b/i,
];

export function isBoilerplate(text: string): boolean {
  return BOILERPLATE.some((pattern) => pattern.test(text));
}

/** Plain text from a little inline Markdown (emphasis, code, links, images, tags). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|`)/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Short plain-text summary from the first real paragraph, used when no description or manifest exists. */
export function firstParagraph(markdown: string, maxLength = 220): string {
  for (const block of markdown.split(/\r?\n\s*\r?\n/)) {
    const raw = block.trim();
    // Skip headings, badge rows, images, code fences, tables and list-only blocks.
    if (!raw || /^(#|\[!\[|!\[|```|~~~|\||<)/.test(raw)) continue;
    const text = plainText(raw.replace(/^\s*[-*+]\s+/gm, ''));
    if (isBoilerplate(text)) continue;
    if (text.length < 25 || text.split(' ').length < 5 || !/[a-z]/i.test(text)) continue;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
  }
  return '';
}
