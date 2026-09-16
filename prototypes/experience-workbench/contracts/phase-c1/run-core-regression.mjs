import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [targetName] = process.argv.slice(2);
const approvedTargets = new Set([
  'verify.mjs',
  'verify-restore-integrity.mjs',
  'verify-live-materialization-authority.mjs'
]);
if (!targetName || !approvedTargets.has(targetName)) {
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
let transformed = source.replace(marker, "from './_authoritative-external-effect-state.mjs'");
if (transformed === source || transformed.includes(marker)) {
  throw new Error(`${targetName} core-regression transform was incomplete`);
}

// Older restore/live authority fixtures model an already-accepted proof seam and
// predate the revision-8 external namespace fields. Add one deterministic rail-neutral
// verified namespace only to those generated regression fixtures; production code
// still fails closed when adapter_id / rail_identity are absent.
if (targetName === 'verify-restore-integrity.mjs' || targetName === 'verify-live-materialization-authority.mjs') {
  const fixtureMarker = '  authoritative_parent_effect_ref: parent\n});';
  const fixtureReplacement = "  authoritative_parent_effect_ref: parent,\n  adapter_id: 'adapter_fixture',\n  rail_identity: 'fixture_rail'\n});";
  if (!transformed.includes(fixtureMarker)) {
    throw new Error(`${targetName} verified-namespace fixture marker missing`);
  }
  transformed = transformed.replace(fixtureMarker, fixtureReplacement);
}

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
