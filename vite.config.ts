import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function lucidePlugin() {
  const iconMap = new Map<string, string>();
  try {
    const lucideMjs = fs.readFileSync(
      path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.mjs'),
      'utf8'
    );
    for (const line of lucideMjs.split('\n')) {
      const m = line.match(/export \{([^}]+)\} from '(\.\/icons\/[^']+)';/);
      if (m) {
        const target = m[2].replace('./icons/', 'lucide-react/dist/esm/icons/');
        const names = m[1].split(',').map((s) => s.trim());
        for (const name of names) {
          const def = name.match(/^default as (.+)$/);
          if (def) {
            iconMap.set(def[1], target);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse lucide-react.mjs', e);
  }

  return {
    name: 'optimize-lucide-imports',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('node_modules') || !code.includes('lucide-react')) {
        return null;
      }
      const lucideImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/g;
      return code.replace(lucideImportRegex, (_match, importsStr: string) => {
        const specs = importsStr.split(',').map((s) => s.trim()).filter(Boolean);
        const replacements: string[] = [];
        for (const spec of specs) {
          const parts = spec.split(/\s+as\s+/);
          const importedName = parts[0].trim();
          const localName = (parts[1] || importedName).trim();
          const target = iconMap.get(importedName);
          if (target) {
            replacements.push(`import ${localName} from '${target}';`);
          } else {
            replacements.push(`import { ${spec} } from 'lucide-react';`);
          }
        }
        return replacements.join('\n');
      });
    },
  };
}

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          const url = new URL(req.url, 'http://localhost');
          const pathname = url.pathname;

          const queryObj: Record<string, string> = {};
          for (const [key, val] of url.searchParams.entries()) {
            queryObj[key] = val;
          }
          (req as unknown as { query: Record<string, string> }).query = queryObj;

          if (pathname.startsWith('/api/auth/')) {
            const action = pathname.slice('/api/auth/'.length).split('/')[0];
            queryObj.action = action;
            const mod = await server.ssrLoadModule('/api/auth/[action].ts');
            return await mod.default(req, res);
          }
          if (pathname === '/api/events') {
            const mod = await server.ssrLoadModule('/api/events.ts');
            return await mod.default(req, res);
          }
          if (pathname === '/api/gemini') {
            const mod = await server.ssrLoadModule('/api/gemini.ts');
            return await mod.default(req, res);
          }
          next();
        } catch (err) {
          console.error('API dev server error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error in dev API' }));
          }
        }
      });
    },
  };
}

const isAnalyze = process.env.ANALYZE === 'true';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    apiDevPlugin(),
    lucidePlugin(),
    react(),
    ...(isAnalyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
  ],
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide';
          }
          if (id.includes('src/services/fallbackPlanner') || id.includes('src/services/decisionEngine')) {
            return 'event-engine';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 75000,
    hookTimeout: 45000,
    fileParallelism: false,
  },
});
