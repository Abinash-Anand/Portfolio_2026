/**
 * Serves the production build the way Vercel will (the rules in vercel.json, a real 404 page), for checking the
 * result locally, in smoke tests and in the Lighthouse run in CI.
 *
 *   npm run serve:dist [-- --port 4300]
 */
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { headersFor, redirectFor, rewriteFor, type VercelConfig } from './lib/vercel-routes';

const root = join(process.cwd(), 'dist', 'Portfolio_2026', 'browser');
const portIndex = process.argv.indexOf('--port');
const port = portIndex > -1 ? Number(process.argv[portIndex + 1]) : 4300;

const COMPRESSIBLE = /text|javascript|json|xml|svg/;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const config = JSON.parse(
    await readFile(join(process.cwd(), 'vercel.json'), 'utf8'),
  ) as VercelConfig;

  createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = decodeURIComponent(url.pathname);

    // Vercel's `trailingSlash: false`: /work/ goes to /work.
    if (config.trailingSlash === false && path.length > 1 && path.endsWith('/')) {
      response.writeHead(308, { Location: path.slice(0, -1) + url.search }).end();
      return;
    }
    const redirect = redirectFor(config, path);
    if (redirect) {
      response.writeHead(redirect.status, { Location: redirect.location }).end();
      return;
    }

    const safe = normalize(path).replace(/^([/\\])+/, '');
    let file: string | null = null;
    let status = 200;
    for (const candidate of [join(root, safe), join(root, safe, 'index.html')]) {
      if (await isFile(candidate)) {
        file = candidate;
        break;
      }
    }
    if (!file) {
      const rewrite = rewriteFor(config, path);
      if (rewrite) file = join(root, rewrite);
    }
    if (!file || !(await isFile(file))) {
      file = join(root, '404.html');
      status = 404;
    }

    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    let body: Buffer = await readFile(file);
    const headers: Record<string, string> = {
      'Content-Type': type,
      ...headersFor(config, path),
      Vary: 'Accept-Encoding',
    };

    // Vercel compresses text responses (brotli, else gzip); do the same so sizes and timings are realistic.
    const accepts = String(request.headers['accept-encoding'] ?? '');
    if (COMPRESSIBLE.test(type) && body.length > 1024) {
      if (accepts.includes('br')) {
        body = brotliCompressSync(body);
        headers['Content-Encoding'] = 'br';
      } else if (accepts.includes('gzip')) {
        body = gzipSync(body);
        headers['Content-Encoding'] = 'gzip';
      }
    }
    response.writeHead(status, headers);
    response.end(body);
  }).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
