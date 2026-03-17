import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'out', 'dist', 'coverage']);
const MARKERS = [/^<<<<<<< /m, /^=======\s*$/m, /^>>>>>>> /m];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    const ext = path.extname(entry.name);
    if (!ext) continue;
    if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml'].includes(ext)) continue;
    files.push(fullPath);
  }
  return files;
}

const files = walk(ROOT);
const offenders = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (MARKERS.some((re) => re.test(content))) {
    offenders.push(path.relative(ROOT, file));
  }
}

if (offenders.length > 0) {
  console.error('Merge conflict markers detected in:');
  offenders.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log('No merge conflict markers found.');
