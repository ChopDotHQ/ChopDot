import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const load = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, v) => fs.writeFileSync(path.join(root, p), JSON.stringify(v, null, 2) + '\n');
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const journeys = load('registry/journeys.json');
const locks = load('registry/golden-artifact-locks.json');

// Historical replay starts from the post-J17 checkpoint even when the checked-out
// branch already contains later approved Goldens. Verify every current lock before
// touching registry metadata so replay can never hide a changed approved artifact.
for (const lock of locks) {
  if (digest(lock.path) !== lock.sha256) throw new Error(`Existing Golden changed before replay reset: ${lock.path}`);
}

const demoted = new Set();
for (const journey of journeys) {
  const goldenNumber = Number(journey.golden_number ?? 0);
  if (journey.status === 'current' || goldenNumber > 17) {
    demoted.add(journey.id);
    journey.status = 'not-started';
    journey.approval = 'not-reviewed';
    delete journey.golden_number;
    delete journey.approved_on;
    delete journey.prototype_path;
    delete journey.prototype_sha256;
    delete journey.qa_path;
  }
}

const baselineLocks = locks.filter(lock => !demoted.has(lock.journey));
if (baselineLocks.length !== 17) {
  throw new Error(`Expected 17 replay-baseline Golden locks after demotion, got ${baselineLocks.length}`);
}

write('registry/journeys.json', journeys);
write('registry/golden-artifact-locks.json', baselineLocks);
console.log(`Replay baseline reset to post-J17 authority; demoted=${[...demoted].join(',') || 'none'}`);
