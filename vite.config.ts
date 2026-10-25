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

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    lucidePlugin(),
    react(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
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
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    fileParallelism: false,
    testTimeout: 25000,
  },
});
