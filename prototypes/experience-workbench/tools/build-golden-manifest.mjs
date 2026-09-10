import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const journeysPath = path.join(root, 'registry/journeys.json');
const locksPath = path.join(root, 'registry/golden-artifact-locks.json');
const outputPath = path.join(root, 'registry/goldens.manifest.json');

const journeys = JSON.parse(fs.readFileSync(journeysPath, 'utf8'));
const locks = JSON.parse(fs.readFileSync(locksPath, 'utf8'));
const goldenJourneys = journeys
  .filter((journey) => journey.status === 'golden' && journey.approval === 'design-approved')
  .sort((a, b) => Number(a.golden_number) - Number(b.golden_number));

if (goldenJourneys.length !== locks.length) {
  throw new Error(`Golden count mismatch: journeys=${goldenJourneys.length} locks=${locks.length}`);
}

const lockByJourney = new Map();
for (const lock of locks) {
  if (lockByJourney.has(lock.journey)) throw new Error(`Duplicate Golden lock for journey ${lock.journey}`);
  lockByJourney.set(lock.journey, lock);
}

const entries = goldenJourneys.map((journey, index) => {
  const expectedGoldenNumber = index + 1;
  if (Number(journey.golden_number) !== expectedGoldenNumber) {
    throw new Error(`Golden numbering gap at journey ${journey.id}: expected ${expectedGoldenNumber}, got ${journey.golden_number}`);
  }

  const lock = lockByJourney.get(journey.id);
  if (!lock) throw new Error(`Missing Golden artifact lock for journey ${journey.id}`);
  if (lock.path !== journey.prototype_path) {
    throw new Error(`Golden path mismatch for journey ${journey.id}: registry=${journey.prototype_path} lock=${lock.path}`);
  }
  if (journey.prototype_sha256 && journey.prototype_sha256 !== lock.sha256) {
    throw new Error(`Golden checksum mismatch for journey ${journey.id}`);
  }

  return {
    golden_number: Number(journey.golden_number),
    journey: journey.id,
    name: journey.name,
    version: journey.version,
    prototype_path: lock.path,
    sha256: lock.sha256,
    approval: 'design-approved',
    immutable: true
  };
});

for (const lock of locks) {
  if (!goldenJourneys.some((journey) => journey.id === lock.journey)) {
    throw new Error(`Orphan Golden artifact lock for journey ${lock.journey}`);
  }
}

const manifest = {
  schema_version: 1,
  generated_from: {
    journey_authority: 'registry/journeys.json',
    checksum_authority: 'registry/golden-artifact-locks.json'
  },
  golden_count: entries.length,
  entries
};

const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath)) throw new Error('Missing generated registry/goldens.manifest.json');
  const current = fs.readFileSync(outputPath, 'utf8');
  if (current !== rendered) throw new Error('registry/goldens.manifest.json is stale; run node tools/build-golden-manifest.mjs');
  console.log(`Golden manifest OK: ${entries.length} locked artifacts`);
} else {
  fs.writeFileSync(outputPath, rendered);
  console.log(`Wrote registry/goldens.manifest.json with ${entries.length} locked artifacts`);
}
