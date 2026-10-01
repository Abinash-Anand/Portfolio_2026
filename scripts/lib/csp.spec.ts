import { readFileSync } from 'node:fs';
import { cspFrom, inlineScripts, scriptHash, unlistedScripts } from './csp';

const html = (body: string) => `<html><head>${body}</head></html>`;

describe('inlineScripts', () => {
  it('finds inline scripts, and ignores external scripts and JSON data blocks', () => {
    const page = html(
      `<script>var a = 1;</script><script src="main.js" type="module"></script><script id="ng-state" type="application/json">{"x":1}</script>`,
    );
    expect(inlineScripts(page)).toEqual(['var a = 1;']);
  });

  it('ignores structured data (JSON-LD), which the browser never runs, but not an inline module', () => {
    const page = html(
      `<script id="seo-jsonld" type="application/ld+json">{"@type":"Person"}</script><script type="module">import 'x';</script>`,
    );
    expect(inlineScripts(page)).toEqual(["import 'x';"]);
  });
});

describe('unlistedScripts', () => {
  const page = html('<script>var a = 1;</script>');

  it('is empty when the policy allows the script by its hash', () => {
    const csp = `default-src 'self'; script-src 'self' ${scriptHash('var a = 1;')}`;
    expect(unlistedScripts(page, csp)).toEqual([]);
  });

  it('reports a script whose hash is not in the policy', () => {
    expect(unlistedScripts(page, `script-src 'self'`)).toEqual([scriptHash('var a = 1;')]);
    expect(unlistedScripts(page, `default-src 'self'`)).toHaveLength(1);
  });

  it('matches only the script-src directive, not other directives that happen to contain the hash', () => {
    const csp = `style-src ${scriptHash('var a = 1;')}; script-src 'self'`;
    expect(unlistedScripts(page, csp)).toHaveLength(1);
  });
});

describe('the policy in vercel.json', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const csp = cspFrom(vercel);

  it('exists and is strict about scripts: no unsafe-inline, no eval, nothing but self and the one hash', () => {
    expect(csp).not.toBeNull();
    const scripts = /script-src ([^;]*)/.exec(csp!)![1]!;
    expect(scripts).not.toContain('unsafe-inline');
    expect(scripts).not.toContain('unsafe-eval');
    expect(scripts.split(/\s+/).filter((token) => !token.startsWith("'sha256-"))).toEqual([
      "'self'",
    ]);
  });

  it('allows the inline script that index.html really contains', () => {
    expect(unlistedScripts(readFileSync('src/index.html', 'utf8'), csp!)).toEqual([]);
  });

  it('forbids framing, plugins and foreign base URLs, and upgrades insecure requests', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});

describe('cspFrom', () => {
  it('returns null when no rule sets a policy', () => {
    expect(cspFrom({})).toBeNull();
    expect(
      cspFrom({ headers: [{ source: '/', headers: [{ key: 'X-A', value: 'b' }] }] }),
    ).toBeNull();
  });
});
