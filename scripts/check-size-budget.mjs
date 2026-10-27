import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distAssetsDir = path.resolve(__dirname, '../dist/assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('Error: dist/assets directory not found. Please run build first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
const mainJsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
const mainCssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));

if (!mainJsFile) {
  console.error('Error: Main bundle chunk (index-*.js) not found in dist/assets.');
  process.exit(1);
}

// Performance Budgets (Step 1 & Step 6 requirements: initial JS <= 60% of baseline gzip)
// Baseline was 140.41 kB gzip. 60% is 84.24 kB gzip. We enforce an even stricter budget of 50 kB gzip.
const BUDGETS = {
  MAIN_JS_RAW_MAX_KB: 150,
  MAIN_JS_GZIP_MAX_KB: 50,
  MAIN_CSS_RAW_MAX_KB: 65,
  MAIN_CSS_GZIP_MAX_KB: 20,
};

let budgetFailed = false;

function checkFile(filename, rawLimitKb, gzipLimitKb, label) {
  const filePath = path.join(distAssetsDir, filename);
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const rawKb = (rawBytes / 1024).toFixed(2);

  const gzipBytes = zlib.gzipSync(content).length;
  const gzipKb = (gzipBytes / 1024).toFixed(2);

  console.log(`\n📦 ${label}: ${filename}`);
  console.log(`   - Raw size:  ${rawKb} kB (Limit: ${rawLimitKb} kB)`);
  console.log(`   - Gzip size: ${gzipKb} kB (Limit: ${gzipLimitKb} kB)`);

  if (Number(rawKb) > rawLimitKb) {
    console.error(`   ❌ VIOLATION: ${label} raw size ${rawKb} kB exceeds budget of ${rawLimitKb} kB!`);
    budgetFailed = true;
  }
  if (Number(gzipKb) > gzipLimitKb) {
    console.error(`   ❌ VIOLATION: ${label} gzip size ${gzipKb} kB exceeds budget of ${gzipLimitKb} kB!`);
    budgetFailed = true;
  }
  if (Number(rawKb) <= rawLimitKb && Number(gzipKb) <= gzipLimitKb) {
    console.log(`   ✅ PASSED: Within performance budget.`);
  }
}

console.log('========================================');
console.log('🔍 Performance Size Budget Verification');
console.log('========================================');

checkFile(mainJsFile, BUDGETS.MAIN_JS_RAW_MAX_KB, BUDGETS.MAIN_JS_GZIP_MAX_KB, 'Main JS Chunk');

if (mainCssFile) {
  checkFile(mainCssFile, BUDGETS.MAIN_CSS_RAW_MAX_KB, BUDGETS.MAIN_CSS_GZIP_MAX_KB, 'Main CSS Bundle');
}

if (budgetFailed) {
  console.error('\n❌ Bundle size budget checks failed! Please optimize chunk splitting.\n');
  process.exit(1);
} else {
  console.log('\n🎉 All bundle chunks are strictly within performance budgets!\n');
  process.exit(0);
}
