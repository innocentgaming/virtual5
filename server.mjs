import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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

// Lazy cache for API handlers
let authHandler = null;
let eventsHandler = null;
let geminiHandler = null;

async function getAuthHandler() {
  if (!authHandler) {
    const mod = await import('./api/auth/[action].ts');
    authHandler = mod.default;
  }
  return authHandler;
}

async function getEventsHandler() {
  if (!eventsHandler) {
    const mod = await import('./api/events.ts');
    eventsHandler = mod.default;
  }
  return eventsHandler;
}

async function getGeminiHandler() {
  if (!geminiHandler) {
    const mod = await import('./api/gemini.ts');
    geminiHandler = mod.default;
  }
  return geminiHandler;
}

const server = http.createServer(async (req, res) => {
  // Global security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
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

      if (pathname.startsWith('/api/auth/')) {
        const action = pathname.slice('/api/auth/'.length).split('/')[0];
        req.query.action = action;
        const handler = await getAuthHandler();
        return await handler(req, res);
      }

      if (pathname === '/api/events') {
        const handler = await getEventsHandler();
        return await handler(req, res);
      }

      if (pathname === '/api/gemini') {
        const handler = await getGeminiHandler();
        return await handler(req, res);
      }

      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'API endpoint not found', code: 'not_found' }));
    } catch (err) {
      console.error('[server] API error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal server error', code: 'server_error' }));
      }
      return;
    }
  }

  // 2. Static Assets from dist/
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
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
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[EventWise AI] Server running on http://0.0.0.0:${PORT}`);
});
