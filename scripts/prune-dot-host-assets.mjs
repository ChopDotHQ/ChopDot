import { rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const output = path.join(process.cwd(), 'dist-dot-host');
const removed = [];

async function walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith('.map') || entry.name === '.DS_Store') {
      await rm(target);
      removed.push(path.relative(output, target));
    }
  }
}

await stat(output);
await walk(output);
console.log(`Dot-host assets pruned (${removed.length} files removed).`);
