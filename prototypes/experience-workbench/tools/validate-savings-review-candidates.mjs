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
const manifest=load('registry/review-candidates/savings-j16-v1.2-j17-v1.4.json');
assert.equal(manifest.status,'review-pending');
const expected={
  j16:['journeys/16-savings-group/v1.2-review-candidate.html','dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de'],
  j17:['journeys/17-savings-contribute-withdraw/v1.4-review-candidate.html','a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915']
};
for(const [key,[candidatePath,sha]] of Object.entries(expected)){
  assert.equal(manifest[key].path,candidatePath);assert.equal(manifest[key].sha256,sha);assert.equal(fileDigest(candidatePath),sha,`${key} reviewed candidate changed`);
}
// Regeneration source bundle must itself reproduce the exact reviewed bytes.
const sourceDir=path.join(root,manifest.regeneration_bundle);const names=fs.readdirSync(sourceDir).filter(n=>/^\d{3}\.part$/.test(n)).sort();assert(names.length);
const compressed=Buffer.from(names.map(n=>fs.readFileSync(path.join(sourceDir,n),'utf8').trim()).join(''),'base64');
assert.equal(digest(compressed),manifest.regeneration_bundle_sha256,'Savings review bundle bytes changed');
const bundle=JSON.parse(zlib.brotliDecompressSync(compressed).toString('utf8'));assert.equal(Object.keys(bundle.files).length,manifest.regeneration_bundle_files);
for(const [key,[candidatePath,sha]] of Object.entries(expected)) assert.equal(digest(Buffer.from(bundle.files[candidatePath],'utf8')),sha,`${key} bundle candidate changed`);
// Every existing Golden remains byte-locked; review candidates are not Golden locks.
const locks=load('registry/golden-artifact-locks.json');assert.equal(locks.length,17,'Golden lock count changed');
for(const lock of locks) assert.equal(fileDigest(lock.path),lock.sha256,`Existing Golden changed: ${lock.path}`);
assert(!locks.some(l=>Object.values(expected).some(([p])=>p===l.path)),'Review candidate was incorrectly Golden-locked');
const journeys=load('registry/journeys.json');
const j16=journeys.find(j=>j.id==='16'),j17=journeys.find(j=>j.id==='17'),j18=journeys.find(j=>j.id==='18'),j19=journeys.find(j=>j.id==='19');
assert(j16&&j17&&j18&&j19);assert.equal(j16.status,'golden');assert.equal(j17.status,'golden');assert.equal(j18.status,'current');assert.notEqual(j19.status,'current');
assert.notEqual(j16.prototype_path,expected.j16[0]);assert.notEqual(j17.prototype_path,expected.j17[0]);
// QA is tied to exact bytes. ChatGPT native reload remained open locally; independent Codex evidence is separate.
const j16qa=load('journeys/16-savings-group/review-v1.2/results/FRESH_VISUAL_QA.json');assert(j16qa.ok);assert.equal(j16qa.candidate_hashes['j16-v1.2'],expected.j16[1]);assert.deepEqual(j16qa.page_errors,[]);assert.deepEqual(j16qa.console_errors,[]);
const j17qa=load('journeys/17-savings-contribute-withdraw/review-v1.4/results/FRESH_QA.json');assert(j17qa.ok);assert.equal(j17qa.candidate_sha256,expected.j17[1]);assert.equal(j17qa.layout_checks,42);assert.deepEqual(j17qa.page_errors,[]);assert(j17qa.interaction_regressions.every(x=>x.passed));
const parity=load('journeys/17-savings-contribute-withdraw/review-v1.4/results/VISUAL_PARITY.json');assert(parity.ok&&parity.all_pixel_identical);
const codex=load('journeys/17-savings-contribute-withdraw/review-v1.4/CODEX_NATIVE_RELOAD_VERIFICATION.json');assert.equal(codex.candidate_sha256,expected.j17[1]);assert.equal(codex.verifier,'Codex');assert.equal(codex.focused_checks,16);assert.equal(codex.all_passed,true);assert.deepEqual(codex.load_modes,['native file','localhost']);assert.deepEqual(codex.viewports,['393x852','430x890']);
for(const p of [
 'journeys/16-savings-group/review-v1.2/scripts/build_candidates.py','journeys/16-savings-group/review-v1.2/scripts/run_visual_qa.py','journeys/16-savings-group/review-v1.2/source/j16-v1.1-continuity-candidate.html',
 'journeys/17-savings-contribute-withdraw/review-v1.4/source/build_j17_v1.4.py','journeys/17-savings-contribute-withdraw/review-v1.4/tests/run_j17_v1.4_qa.py','journeys/17-savings-contribute-withdraw/review-v1.4/tests/check_visual_parity.py','journeys/17-savings-contribute-withdraw/review-v1.4/preserved/chopdot-j17-v1.3-visual-candidate.html'
]) assert(fs.existsSync(path.join(root,p)),`Missing Savings publication support file: ${p}`);
assert.equal(manifest.typography,'TYPO-01 deferred');
console.log('SAVINGS REVIEW GATE PASSED: exact J16 V1.2 + J17 V1.4 review bytes reproduce; 17 Goldens unchanged; J18 remains current; Codex native reload evidence stays independent.');
