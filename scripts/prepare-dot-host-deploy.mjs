#!/usr/bin/env node
/**
 * Post-build hygiene for dist-dot-host before pad deploy.
 * Removes junk that should never ship to Bulletin.
 */
import { readdir, rm, stat, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'dist-dot-host');

async function dirSizeBytes(root) {
  let total = 0;
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const info = await stat(full);
        total += info.size;
      }
    }
  }
  await walk(root);
  return total;
}

async function removeIfExists(target) {
  try {
    await rm(target, { recursive: true, force: true });
    console.log(`  removed ${path.relative(repoRoot, target)}`);
  } catch (error) {
    console.warn(`  skip ${path.relative(repoRoot, target)}: ${error.message}`);
  }
}

async function removeDsStore(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await removeDsStore(full);
    } else if (entry.name === '.DS_Store') {
      await rm(full, { force: true });
      console.log(`  removed ${path.relative(repoRoot, full)}`);
    }
  }
}

const before = await dirSizeBytes(outDir);
console.log(`dist-dot-host before: ${(before / 1024 / 1024).toFixed(2)} MB`);

await removeDsStore(outDir);
for (const rel of ['dev', 'public/dev']) {
  await removeIfExists(path.join(outDir, rel));
}

const dotLabHtml = path.join(outDir, 'dot-lab.html');
const indexHtml = path.join(outDir, 'index.html');
try {
  await stat(dotLabHtml);
  await rm(indexHtml, { force: true });
  await rename(dotLabHtml, indexHtml);
  console.log('  renamed dot-lab.html → index.html');
} catch {
  // index.html already present from a prior build shape
}

const after = await dirSizeBytes(outDir);
console.log(`dist-dot-host after:  ${(after / 1024 / 1024).toFixed(2)} MB`);
console.log(`saved: ${((before - after) / 1024).toFixed(1)} KB`);
