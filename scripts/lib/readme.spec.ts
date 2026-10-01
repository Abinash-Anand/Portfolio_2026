import { describe, expect, it } from 'vitest';
import { firstParagraph, plainText, renderReadme } from './readme';

const ctx = { login: 'me', repo: 'proj', titles: ['proj', 'My Project'] };

describe('renderReadme', () => {
  it('drops a leading H1 that repeats the title and demotes the other headings', async () => {
    const { html, toc } = await renderReadme('# My Project\n\n## Setup\n\n### Docker\n\ntext', ctx);
    expect(html).not.toContain('<h1');
    expect(html).toContain('<h3 id="setup">Setup</h3>');
    expect(html).toContain('<h4 id="docker">Docker</h4>');
    // "## Setup" is demoted to h3 and listed; "### Docker" becomes h4 and is not listed.
    expect(toc).toEqual([{ id: 'setup', text: 'Setup', depth: 3 }]);
  });

  it('keeps a leading H1 that is NOT the title, demoted to H2, and lists it in the TOC', async () => {
    const { html, toc } = await renderReadme('# Assignment brief\n\nBody', ctx);
    expect(html).toContain('<h2 id="assignment-brief">Assignment brief</h2>');
    expect(toc).toEqual([{ id: 'assignment-brief', text: 'Assignment brief', depth: 2 }]);
  });

  it('sanitises scripts, event handlers and javascript: links', async () => {
    const md =
      'Hello <script>alert(1)</script> <img src="x" onerror="alert(1)"> [bad](javascript:alert(1))';
    const { html } = await renderReadme(md, ctx);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  it('makes relative image and link URLs absolute and leaves anchors alone', async () => {
    const { html } = await renderReadme(
      '![shot](docs/shot.png) [guide](./GUIDE.md) [top](#top)',
      ctx,
    );
    expect(html).toContain('src="https://raw.githubusercontent.com/me/proj/HEAD/docs/shot.png"');
    expect(html).toContain('href="https://github.com/me/proj/blob/HEAD/GUIDE.md"');
    expect(html).toContain('href="#top"');
  });

  it('opens external links safely and lazy-loads images', async () => {
    const { html } = await renderReadme(
      '[site](https://example.com) ![a](https://example.com/a.png)',
      ctx,
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('loading="lazy"');
  });

  it('highlights fenced code with a language', async () => {
    const { html } = await renderReadme('```bash\ndocker compose up\n```', ctx);
    expect(html).toContain('class="shiki');
    expect(html).toContain('<span style=');
  });
});

describe('firstParagraph', () => {
  it('skips headings and badge rows and returns the first real sentence', () => {
    const md =
      '# Title\n\n[![CI](a.svg)](b)\n[![MIT](c.svg)](d)\n\n**A data lineage system for synthetic training data.**\n\nMore.';
    expect(firstParagraph(md)).toBe('A data lineage system for synthetic training data.');
  });

  it('skips known boilerplate', () => {
    const md =
      '# App\n\nThis template provides a minimal setup to get React working in Vite with HMR.\n\nReal description of what this application does for users.';
    expect(firstParagraph(md)).toBe('Real description of what this application does for users.');
  });

  it('returns an empty string when there is nothing meaningful and truncates long text', () => {
    expect(firstParagraph('# Only a heading')).toBe('');
    expect(firstParagraph('word '.repeat(100)).endsWith('…')).toBe(true);
  });
});

describe('plainText', () => {
  it('removes emphasis, code ticks and link syntax', () => {
    expect(plainText('**Bold** and `code` and [a link](http://x.y)')).toBe(
      'Bold and code and a link',
    );
  });
});
