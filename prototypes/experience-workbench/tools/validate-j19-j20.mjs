import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=p=>JSON.parse(read(p));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));
const approvedSha='c67973e0efc1068d006d57c4d5690b6c49218bd63f24cb62ab587fbf5b9862da';
const approvedPath='journeys/19-insights/review-v1.1/v1.1-candidate.html';

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
const approval=load('registry/approvals/19-v1.1.json');
const qa=load('journeys/19-insights/review-v1.1/QA_SUMMARY.json');
const j19=journeys.find(j=>j.id==='19');
const j20=journeys.find(j=>j.id==='20');
const j21=journeys.find(j=>j.id==='21');

assert(j19&&j20&&j21,'Journeys 19-21 required');
assert.equal(j19.status,'golden');
assert.equal(j19.approval,'design-approved');
assert.equal(j19.version,'v1.1');
assert.equal(j19.golden_number,19);
assert.equal(j19.approved_on,'2026-09-10');
assert.equal(j19.prototype_path,approvedPath);
assert.equal(j19.prototype_sha256,approvedSha);
assert.equal(j19.qa_path,'journeys/19-insights/review-v1.1/VISUAL_QA.md');
assert.equal(digest(approvedPath),approvedSha,'J19 approved HTML changed');

assert.equal(approval.journey,'19');
assert.equal(approval.version,'v1.1');
assert.equal(approval.golden_number,19);
assert.equal(approval.approval,'design-approved');
assert.equal(approval.approved_on,'2026-09-10');
assert.equal(approval.prototype_path,approvedPath);
assert.equal(approval.prototype_sha256,approvedSha);
assert.equal(approval.html_change_authorized,false);
assert.equal(approval.previous_candidate_preserved,true);

assert.equal(qa.ok,true);
assert.equal(qa.candidate_sha256,approvedSha);
assert.equal(qa.states,27);
assert.equal(qa.browser_layouts,54);
assert.equal(qa.passed_browser_layouts,54);
assert.equal(qa.product_clicks,278);
assert.equal(qa.passed_product_clicks,278);
assert.equal(qa.model_assertions,43);
assert.equal(qa.model_scenarios,18);
assert.equal(qa.shell_consistency,true);
assert.equal(qa.external_network_requests,0);
assert.equal(qa.page_errors.length,0);
assert.equal(qa.console_errors.length,0);

assert.equal(locks.length,19,'Exactly 19 Golden locks required');
assert.equal(new Set(locks.map(l=>l.journey)).size,19,'Duplicate Golden lock journey');
for(const lock of locks) assert.equal(digest(lock.path),lock.sha256,`Golden artifact changed: ${lock.path}`);
const j19Lock=locks.find(l=>l.journey==='19');
assert(j19Lock,'J19 Golden lock missing');
assert.equal(j19Lock.path,approvedPath);
assert.equal(j19Lock.sha256,approvedSha);

assert.equal(progress.registered_journeys,28);
assert.equal(progress.golden_count,19);
assert.equal(progress.current_journey,'20');
assert.equal(progress.remaining_overall,9);
assert.equal(progress.paused_after_freeze,false);
assert.equal(progress.last_approved_journey,'19');
assert.equal(progress.last_approved_version,'v1.1');
assert.equal(progress.last_approved_sha256,approvedSha);

assert.equal(j20.status,'current');
assert.equal(j20.approval,'not-reviewed');
assert.equal(j20.version,'v1');
assert.equal(j20.entry_mode,'feature');
assert.equal(j20.spec_path,'journeys/20-payment-methods/spec.md');
assert(!j20.prototype_path&&!j20.prototype_sha256&&!j20.qa_path,'J20 must remain definition-only at this closeout checkpoint');
assert.equal(j21.status,'not-started','Journey 21 must remain untouched');

for(const p of ['journeys/20-payment-methods/README.md','journeys/20-payment-methods/spec.md','journeys/20-payment-methods/source/decision-history.md','journeys/20-payment-methods/STATE_INVENTORY.md','journeys/20-payment-methods/EDGE_CASES.md','registry/j20-start.json','registry/checkpoints/2026-09-10-j19-v1.1-golden-j20-start.json','journeys/19-insights/GOLDEN_APPROVAL.md','journeys/19-insights/golden-validation.json']) assert(exists(p),`Missing ${p}`);

const j19History=read('journeys/19-insights/source/decision-history.md');
assert(j19History.includes('### J19-D04 — Repair continuity drift and approve V1.1 as Golden #19'),'J19 approval decision missing');
const j20History=read('journeys/20-payment-methods/source/decision-history.md');
for(const id of ['J20-D01','J20-D02','J20-D03']) assert(j20History.includes(`### ${id}`),`Missing ${id}`);

const start=read('START_HERE.md');
assert(start.includes('28 registered journeys; 19 Goldens; 9 remaining.'));
assert(start.includes('Journey 19 — Insights V1.1 is Golden #19'));
assert(start.includes('Journey 20 — Payment Methods V1 is at definition stage'));
const goldens=read('GOLDEN_SCREENS.md');
assert(goldens.includes('19. Insights — v1.1 · Design Approved'));
assert(goldens.includes('Current journey: Journey 20 — Payment Methods V1 definition.'));

console.log('J19/J20 GATE PASSED: J19 V1.1 Golden #19; 19 locks exact; J20 definition current; J21 not started.');
