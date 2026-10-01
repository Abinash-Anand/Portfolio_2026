/**
 * Applies the routing rules of vercel.json (redirects, rewrites, headers) the way Vercel does for a static site, so
 * the production build can be served and checked locally, in smoke tests and in the Lighthouse run in CI.
 * Only the pattern syntax this project uses is supported: `(.*)`, `:name`, `:name*` and plain regex groups.
 */

export interface VercelConfig {
  readonly trailingSlash?: boolean;
  readonly redirects?: readonly { source: string; destination: string; permanent?: boolean }[];
  readonly rewrites?: readonly { source: string; destination: string }[];
  readonly headers?: readonly {
    source: string;
    headers: readonly { key: string; value: string }[];
  }[];
}

interface Compiled {
  readonly regex: RegExp;
  readonly names: readonly string[];
}

/** `/project/:id/:section` becomes a regex plus the parameter names in order. */
export function compilePattern(source: string): Compiled {
  const names: string[] = [];
  let pattern = source.replace(/\/:([A-Za-z0-9_]+)\*/g, (_match, name: string) => {
    names.push(name);
    return '(?:/(.*))?';
  });
  pattern = pattern.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    names.push(name);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${pattern}$`), names };
}

function substitute(destination: string, names: readonly string[], match: RegExpExecArray): string {
  let result = destination;
  names.forEach((name, i) => {
    result = result.replace(new RegExp(`:${name}(?![A-Za-z0-9_])`, 'g'), match[i + 1] ?? '');
  });
  return result;
}

export interface RedirectResult {
  readonly status: 301 | 302 | 307 | 308;
  readonly location: string;
}

/** The redirect that applies to a path, if any (first match wins, like Vercel). */
export function redirectFor(config: VercelConfig, path: string): RedirectResult | null {
  for (const rule of config.redirects ?? []) {
    const { regex, names } = compilePattern(rule.source);
    const match = regex.exec(path);
    if (match) {
      return {
        status: rule.permanent === false ? 307 : 308,
        location: substitute(rule.destination, names, match),
      };
    }
  }
  return null;
}

/** The file a path is rewritten to, if a rewrite matches. */
export function rewriteFor(config: VercelConfig, path: string): string | null {
  for (const rule of config.rewrites ?? []) {
    const { regex, names } = compilePattern(rule.source);
    const match = regex.exec(path);
    if (match) return substitute(rule.destination, names, match);
  }
  return null;
}

/** All headers whose rules match a path; later rules override earlier ones for the same header. */
export function headersFor(config: VercelConfig, path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rule of config.headers ?? []) {
    if (!compilePattern(rule.source).regex.test(path)) continue;
    for (const { key, value } of rule.headers) result[key] = value;
  }
  return result;
}
