import fs from 'node:fs/promises';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(packageRoot, 'src', 'templates');
const targetDir = path.join(packageRoot, 'dist', 'templates');

await fs.mkdir(targetDir, { recursive: true });

for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
  if (!entry.isFile()) {
    continue;
  }

  await fs.copyFile(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
}
