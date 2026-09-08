import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=p=>JSON.parse(read(p));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fileDigest=p=>digest(fs.readFileSync(path.join(root,p)));

const current16=load('registry/approvals/16-v1.2.json');
const current17=load('registry/approvals/17-v1.4.json');
const previous16=load('registry/approvals/16-v1.json');
const previous17=load('registry/approvals/17-v1.1.json');
const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
const manifest=load('registry/review-candidates/savings-j16-v1.2-j17-v1.4.json');

assert.equal(current16.prototype_sha256,'dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de');
assert.equal(current17.prototype_sha256,'a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915');
for(const approval of [current16,current17]){
  assert.equal(approval.approval,'design-approved');
  assert.equal(approval.html_change_authorized,false);
  assert.equal(fileDigest(approval.prototype_path),approval.prototype_sha256,`Approved HTML drifted for J${approval.journey}`);
}
for(const approval of [previous16,previous17]) assert.equal(fileDigest(approval.prototype_path),approval.prototype_sha256,`Previous Golden drifted for J${approval.journey}`);
assert.equal(previous16.recovered_from_review_evidence,true);

assert.equal(locks.length,17);
for(const lock of locks) assert.equal(fileDigest(lock.path),lock.sha256,`Golden lock failed: ${lock.path}`);
assert.deepEqual(locks.find(x=>x.journey==='16'),{journey:'16',path:current16.prototype_path,sha256:current16.prototype_sha256});
assert.deepEqual(locks.find(x=>x.journey==='17'),{journey:'17',path:current17.prototype_path,sha256:current17.prototype_sha256});

const j16=journeys.find(j=>j.id==='16'),j17=journeys.find(j=>j.id==='17'),j18=journeys.find(j=>j.id==='18'),j19=journeys.find(j=>j.id==='19');
assert(j16&&j17&&j18&&j19);
for(const [j,a] of [[j16,current16],[j17,current17]]){
  assert.equal(j.status,'golden');assert.equal(j.approval,'design-approved');assert.equal(j.version,a.version);assert.equal(j.prototype_path,a.prototype_path);assert.equal(j.prototype_sha256,a.prototype_sha256);assert.equal(j.golden_number,a.golden_number);assert.equal(j.approved_on,'2026-09-08');
}
assert.equal(j18.status,'current');assert.equal(j18.approval,'review-pending');assert.equal(j18.version,'v1');
assert.equal(j19.status,'not-started');assert.equal(j19.approval,'not-reviewed');
assert.equal(journeys.filter(j=>j.status==='golden').length,17);

assert.equal(progress.golden_count,17);assert.equal(progress.current_journey,'18');assert.equal(progress.remaining_overall,11);assert.equal(progress.last_approved_journey,'17');assert.equal(progress.last_approved_version,'v1.4');assert.equal(progress.last_approved_sha256,current17.prototype_sha256);assert.equal(progress.typography_note,'TYPO-01 deferred');

assert.equal(manifest.status,'design-approved');assert.equal(manifest.golden_freeze,true);assert.equal(manifest.materialized,true);assert.equal(manifest.j16.approval_path,'registry/approvals/16-v1.2.json');assert.equal(manifest.j17.approval_path,'registry/approvals/17-v1.4.json');
const sourceDir=path.join(root,manifest.regeneration_bundle);const names=fs.readdirSync(sourceDir).filter(n=>/^\d{3}\.part$/.test(n)).sort();assert.equal(names.length,7);
const compressed=Buffer.from(names.map(n=>fs.readFileSync(path.join(sourceDir,n),'utf8').trim()).join(''),'base64');
assert.equal(digest(compressed),manifest.regeneration_bundle_sha256,'Savings regeneration bundle changed');
const bundle=JSON.parse(zlib.brotliDecompressSync(compressed).toString('utf8'));assert.equal(Object.keys(bundle.files).length,manifest.regeneration_bundle_files);
assert.equal(digest(Buffer.from(bundle.files[current16.prototype_path],'utf8')),current16.prototype_sha256,'J16 regeneration does not reproduce approved bytes');
assert.equal(digest(Buffer.from(bundle.files[current17.prototype_path],'utf8')),current17.prototype_sha256,'J17 regeneration does not reproduce approved bytes');

const codex=load(current17.codex_native_reload_verification);assert.equal(codex.verifier,'Codex');assert.equal(codex.candidate_sha256,current17.prototype_sha256);assert.equal(codex.focused_checks,16);assert.equal(codex.all_passed,true);assert.deepEqual(codex.load_modes,['native file','localhost']);assert.deepEqual(codex.viewports,['393x852','430x890']);
const j17qa=load('journeys/17-savings-contribute-withdraw/review-v1.4/results/FRESH_QA.json');assert(j17qa.ok);assert.equal(j17qa.candidate_sha256,current17.prototype_sha256);assert(j17qa.interaction_regressions.every(x=>x.passed));
const j16qa=load('journeys/16-savings-group/review-v1.2/results/FRESH_VISUAL_QA.json');assert(j16qa.ok);assert.equal(j16qa.candidate_hashes['j16-v1.2'],current16.prototype_sha256);
const parity=load('journeys/17-savings-contribute-withdraw/review-v1.4/results/VISUAL_PARITY.json');assert(parity.ok&&parity.all_pixel_identical);

const checkpoint=load('registry/checkpoints/2026-09-08-j16-v1.2-j17-v1.4-golden.json');assert.equal(checkpoint.status,'golden-freeze');assert.equal(checkpoint.j16.prototype_sha256,current16.prototype_sha256);assert.equal(checkpoint.j17.prototype_sha256,current17.prototype_sha256);assert.equal(checkpoint.current_journey,'18');assert.equal(checkpoint.journey_19_status,'not-started');
assert(fs.existsSync(path.join(root,'registry/approvals/16-v1.json'))&&fs.existsSync(path.join(root,'registry/approvals/17-v1.1.json')),'Previous approval history missing');
assert(fs.existsSync(path.join(root,previous16.prototype_path))&&fs.existsSync(path.join(root,previous17.prototype_path)),'Previous Golden artifacts missing');
assert.equal(manifest.typography,'TYPO-01 deferred');
console.log('SAVINGS GOLDEN FREEZE GATE PASSED: J16 V1.2 + J17 V1.4 exact bytes locked; previous Goldens/history preserved; J18 current; J19 not started.');
