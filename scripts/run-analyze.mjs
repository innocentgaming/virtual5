import { execSync } from 'node:child_process';

process.env.ANALYZE = 'true';

try {
  execSync('npx vite build', {
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' },
  });
  console.log('\n📊 Bundle analysis complete! Open dist/stats.html in your browser.\n');
} catch (e) {
  process.exit(e.status || 1);
}
