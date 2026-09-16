import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [targetName] = process.argv.slice(2);
if (!targetName || !['verify.mjs', 'verify-restore-integrity.mjs'].includes(targetName)) {
  throw new Error('expected an approved Phase C1 core regression verifier name');
}

const here = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(here, targetName);
const generatedName = `.generated-core-${targetName}`;
const generatedPath = path.join(here, generatedName);
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = "from './materialization-state.mjs'";
if (!source.includes(marker)) {
  throw new Error(`${targetName} no longer imports the canonical materialization module as expected`);
}
const transformed = source.replace(marker, "from './_materialization-state-core.mjs'");
if (transformed === source || transformed.includes(marker)) {
  throw new Error(`${targetName} core-regression transform was incomplete`);
}

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
