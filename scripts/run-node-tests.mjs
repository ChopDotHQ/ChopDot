import {spawn} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.name.endsWith('.test.ts')) files.push(path.relative(root, target));
  }
  return files;
}

const inputs = [];
for (const directory of ['src', 'tests', 'server']) {
  inputs.push(...await walk(path.join(root, directory)).catch(() => []));
}
inputs.sort();
if (!inputs.length) throw new Error('No Node test files were found.');

const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...inputs], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Node test suite ended by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
