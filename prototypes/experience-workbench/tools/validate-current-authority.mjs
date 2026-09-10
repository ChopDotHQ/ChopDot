import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=p=>JSON.parse(read(p));
const digest=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');

const progress=load('registry/progress.json');
const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const active=load('registry/active-candidate.json');
const exact=load('registry/exact-head-gate.json');
const manifest=load('registry/goldens.manifest.json');

assert.equal(journeys.length,28);
const golden=journeys.filter(j=>j.status==='golden'&&j.approval==='design-approved');
assert.equal(progress.registered_journeys,28);
assert.equal(progress.golden_count,golden.length);
assert.equal(progress.remaining_overall,28-golden.length);
assert.equal(locks.length,golden.length);
assert.equal(manifest.golden_count,golden.length);
assert.equal(manifest.entries?.length,golden.length);
for(const lock of locks) assert.equal(digest(lock.path),lock.sha256,`Golden checksum changed: ${lock.path}`);

const current=journeys.filter(j=>j.status==='current');
assert.equal(current.length,1,'Exactly one current journey required');
assert.equal(progress.current_journey,current[0].id);
assert.equal(active.journey,current[0].id,'Active/current authority mismatch');
assert.equal(exact.current_journey,current[0].id,'Exact-head/current authority mismatch');
assert.equal(exact.golden_count,golden.length);
assert.equal(exact.golden_lock_count,golden.length);

const lastGolden=[...golden].sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).at(-1);
assert(lastGolden,'At least one Golden required');
assert.equal(Number(lastGolden.golden_number),golden.length,'Golden numbering must be contiguous');
assert.equal(progress.last_approved_journey,lastGolden.id);
assert.equal(progress.last_approved_version,lastGolden.version);
assert.equal(progress.last_approved_sha256,lastGolden.prototype_sha256);
const approvalPath=`registry/approvals/${lastGolden.id}-${lastGolden.version}.json`;
assert(fs.existsSync(path.join(root,approvalPath)),`Missing latest approval record ${approvalPath}`);
const approval=load(approvalPath);
assert.equal(approval.approval,'design-approved');
assert.equal(approval.prototype_sha256,lastGolden.prototype_sha256);
assert.equal(approval.html_change_authorized,false);

if(active.stage==='definition'){
  assert.equal(active.approval,'not-reviewed');
  assert.equal(active.prototype_built,false);
  assert(fs.existsSync(path.join(root,active.spec_path)),'Current definition spec missing');
  assert(fs.existsSync(path.join(root,active.decision_history_path)),'Current decision history missing');
  assert(fs.existsSync(path.join(root,active.state_inventory_path)),'Current state inventory missing');
  assert(fs.existsSync(path.join(root,active.edge_cases_path)),'Current edge cases missing');
}else if((active.review_status??'').toUpperCase()==='REVIEWABLE'){
  assert.equal(active.mechanical_review,'pass');
  assert.equal(active.semantic_review,'pass');
  assert(active.prototype_path&&active.prototype_sha256,'Reviewable candidate must identify exact artifact');
  assert.equal(digest(active.prototype_path),active.prototype_sha256);
}

const start=read('START_HERE.md');
assert(start.includes(`Journey ${current[0].id} — ${current[0].name}`),'START_HERE must name current journey');
const goldens=read('GOLDEN_SCREENS.md');
assert(goldens.includes(`${lastGolden.golden_number}. ${lastGolden.name} — ${lastGolden.version} · Design Approved`),'Golden index must name latest approval');
for(const p of ['DESIGN_CONTRACT.md','REVIEW_PROTOCOL.md','shared/improvements.md']) assert(fs.existsSync(path.join(root,p)),`Missing process contract ${p}`);

console.log(`CURRENT AUTHORITY GATE PASSED: ${golden.length} Goldens; Journey ${current[0].id} ${current[0].name} current; latest approval ${lastGolden.id} ${lastGolden.version}.`);
