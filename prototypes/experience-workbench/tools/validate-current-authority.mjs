import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const load = p => JSON.parse(read(p));

const progress = load('registry/progress.json');
const active = load('registry/active-candidate.json');
const exact = load('registry/exact-head-gate.json');
const manifest = load('registry/goldens.manifest.json');

assert.equal(progress.registered_journeys, 28);
assert.equal(progress.golden_count, 19);
assert.equal(progress.current_journey, '20');
assert.equal(progress.remaining_overall, 9);
assert.match(progress.next_action, /direct visual/i, 'Current next action must reflect the J20 visual-review gate');

assert.equal(active.journey, '20');
assert.equal(active.version, 'v1');
assert.equal(active.approval, 'reviewable');
assert.equal(active.review_status, 'REVIEWABLE');
assert.equal(active.candidate_branch, 'ux/experience-workbench-j20-v1-candidate');
assert.equal(active.reviewed_source_head, '87acfc3d4bf7ffca0c814d8440915b19893fa4c1');
assert.equal(active.review_bundle_head, '74082c72cc52935a5eda41b42279b72f2cb0213f');
assert.equal(active.prototype_sha256, '02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab');
assert.equal(active.mechanical_review, 'pass');
assert.equal(active.semantic_review, 'pass');
assert.equal(active.visual_clearance, false);
assert.equal(active.human_approval_required, true);

assert.equal(exact.golden_count, 19);
assert.equal(exact.current_journey, '20');
assert.equal(exact.journey_20?.approval, 'reviewable');
assert.equal(exact.journey_20?.review_bundle_head, active.review_bundle_head);
assert.equal(exact.journey_20?.prototype_sha256, active.prototype_sha256);
assert.equal(exact.journey_20?.visual_clearance, false);
assert.equal(exact.journey_20?.human_approval, false);

assert.equal(manifest.golden_count, 19);
assert.equal(manifest.entries?.length, 19);

const start = read('START_HERE.md');
assert(start.includes('Journey 20 — Payment Methods V1'));
assert(start.includes('REVIEWABLE'));
assert(start.includes('Do not freeze Journey 20'));

const goldens = read('GOLDEN_SCREENS.md');
assert(goldens.includes('19. Insights — v1.1 · Design Approved'));
assert(goldens.includes('Journey 20 — Payment Methods V1'));
assert(goldens.includes('REVIEWABLE'));
assert(!goldens.includes('No review candidate exists yet.'));

for (const p of ['DESIGN_CONTRACT.md', 'REVIEW_PROTOCOL.md', 'shared/improvements.md']) {
  assert(fs.existsSync(path.join(root, p)), `Missing process contract ${p}`);
}

console.log('CURRENT AUTHORITY GATE PASSED: J19 Golden #19; J20 exact candidate REVIEWABLE; visual + human approval still required.');
