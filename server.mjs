import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

// Lazy-loaded API handlers (TypeScript via tsx). Keep in step with the files under api/ that Vercel deploys.
const handlerCache = new Map();
const HANDLER_FILES = {
  auth: './api/auth/[action].ts',
  admin: './api/admin/[action].ts',
  rsvp: './api/rsvp/[action].ts',
  events: './api/events.ts',
  gemini: './api/gemini.ts',
  health: './api/health.ts',
  'client-error': './api/client-error.ts',
};

async function getHandler(name) {
  if (!handlerCache.has(name)) {
    const mod = await import(HANDLER_FILES[name]);
    handlerCache.set(name, mod.default);
  }
  return handlerCache.get(name);
}

const IS_PROD = process.env.NODE_ENV === 'production';
const CSP =
  "default-src 'self'; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest']);

function log(level, msg, fields = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields }));
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';

  // Health checks must answer over plain HTTP too (load balancers probe internally).
  const isHealth = (req.url || '').startsWith('/api/health');

  // Force HTTPS in production behind a proxy (Render sets x-forwarded-proto).
  if (IS_PROD && !isHealth && proto === 'http' && !/^(localhost|127\.)/.test(String(host))) {
    res.statusCode = 308;
    res.setHeader('Location', `https://${host}${req.url}`);
    return res.end();
  }

  // Global security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP);
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  res.on('finish', () => {
    if ((req.url || '').startsWith('/assets/') && res.statusCode < 400) return; // keep logs readable
    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      method: req.method,
      path: (req.url || '').split('?')[0],
      status: res.statusCode,
      ms: Date.now() - started,
    });
  });

  let url;
  try {
    url = new URL(req.url, `${proto}://${host}`);
  } catch {
    url = new URL(req.url, `http://localhost:${PORT}`);
  }

  const pathname = url.pathname;

  // 1. API Routing
  if (pathname.startsWith('/api/')) {
    try {
      const queryObj = {};
      for (const [k, v] of url.searchParams.entries()) {
        queryObj[k] = v;
      }
      req.query = queryObj;

      const multi = /^\/api\/(auth|admin|rsvp)\/([^/]+)\/?$/.exec(pathname);
      if (multi) {
        req.query.action = multi[2];
        return await (await getHandler(multi[1]))(req, res);
      }
      const single = /^\/api\/(events|gemini|health|client-error)\/?$/.exec(pathname);
      if (single) {
        return await (await getHandler(single[1]))(req, res);
      }

      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'API endpoint not found', code: 'not_found' }));
    } catch (err) {
      log('error', 'api_error', { path: pathname, error: String(err), stack: err?.stack?.split('\n').slice(0, 5).join(' | ') });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal server error', code: 'server_error' }));
      }
      return;
    }
  }

  // 2. Static Assets from dist/
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.statusCode = 400;
    return res.end('Bad request');
  }
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  let isFile = false;
  try {
    const stats = fs.statSync(filePath);
    isFile = stats.isFile();
  } catch {
    isFile = false;
  }

  // SPA fallback: return index.html for unknown frontend routes
  if (!isFile) {
    filePath = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Application is building or dist/ not found. Run "npm run build" first.');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (safePath.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (filePath.endsWith('index.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Vary', 'Accept-Encoding');
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => res.destroy());
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    res.setHeader('Content-Encoding', 'gzip');
    stream.pipe(zlib.createGzip({ level: 6 })).pipe(res);
  } else {
    stream.pipe(res);
  }
});

// Graceful shutdown so deploys / restarts finish in-flight requests instead of dropping them.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log('info', 'shutting_down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
process.on('unhandledRejection', (reason) => log('error', 'unhandled_rejection', { reason: String(reason) }));

server.listen(PORT, '0.0.0.0', () => {
  log('info', 'server_started', { port: PORT, production: IS_PROD });
});
