import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const a=load('registry/approvals/14-v1.json');
assert.equal(a.prototype_sha256,'5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d');
assert.equal(digest(a.prototype_path),a.prototype_sha256,'Reviewed Journey 14 HTML changed');
assert.equal(a.html_change_authorized,false);assert.equal(a.deferred_note.change_now,false);
assert(Object.values(a.approved_policy).every(v=>v===true),'Approved receive/share policies changed');
const locks=load('registry/golden-artifact-locks.json');
for(const l of locks)assert.equal(digest(l.path),l.sha256,`Golden changed: ${l.path}`);
if(process.argv.includes('--preflight')){
  assert(fs.readFileSync(path.join(root,'journeys/14-receive-money/source/decision-history.md'),'utf8').includes('J14-D02'),'Journey 14 approval decision missing');
  console.log('J14 preflight: reviewed bytes, approval policy and every existing Golden lock verified.');
  process.exit(0);
}
const manifest='registry/j15-candidate.json';
const active=fs.existsSync(path.join(root,manifest))?load(manifest):null;
const js=load('registry/journeys.json'),p=load('registry/progress.json'),j=js.find(x=>x.id==='14');assert(j);
if(active){
  assert.equal(active.journey,'15');
  for(const key of ['prototype_path','spec_path','qa_path'])assert(fs.existsSync(path.join(root,active[key])),`Missing ${key}`);
  assert.equal(digest(active.prototype_path),active.prototype_sha256,'Journey 15 candidate changed');
}
if(process.argv.includes('--check')){
  assert.equal(j.status,'golden');assert.equal(j.approval,'design-approved');assert.equal(j.golden_number,14);assert.equal(j.prototype_sha256,a.prototype_sha256);
  assert.equal(p.golden_count,14);assert.equal(js.filter(x=>x.status==='golden').length,14);assert.equal(locks.length,14);
  assert.equal(locks.find(x=>x.journey==='14')?.sha256,a.prototype_sha256);
  assert.equal(p.current_journey,active?.journey??null);assert.equal(p.remaining_overall,14);assert.equal(p.paused_after_freeze,!active);assert.equal(p.last_approved_journey,'14');
  for(const name of ['active-candidate','support-candidate','next-support-candidate'])assert.deepEqual(load(`registry/${name}.json`),active);
  assert.equal(js.filter(x=>x.status==='current').length,active?1:0);
  if(active){assert.equal(js.find(x=>x.id==='15').status,'current');assert.equal(js.find(x=>x.id==='15').approval,'review-pending');}
  assert(fs.readFileSync(path.join(root,'journeys/14-receive-money/spec.md'),'utf8').includes('J14-D02'));
  console.log('J14 GOLDEN FREEZE GATE PASSED: Golden #14; all 14 HTML files unchanged; TYPO-01 deferred.');
  process.exit(0);
}
Object.assign(j,{status:'golden',approval:a.approval,version:a.version,golden_number:14,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256});
for(const x of js)if(x.status==='current'&&x.id!=='14'){x.status='not-started';x.approval='not-reviewed';}
if(active){
  const n=js.find(x=>x.id==='15');assert(n&&n.status!=='golden');
  Object.assign(n,{status:'current',approval:'review-pending',version:active.version,prototype_path:active.prototype_path,prototype_sha256:active.prototype_sha256,spec_path:active.spec_path,qa_path:active.qa_path});
}
if(!locks.some(x=>x.journey==='14'))locks.push({journey:'14',path:a.prototype_path,sha256:a.prototype_sha256});
assert.equal(locks.length,14);
Object.assign(p,{schema_version:11,updated_on:a.approved_on,golden_count:14,remaining_overall:14,current_journey:active?.journey??null,paused_after_freeze:!active,last_approved_journey:'14',last_approved_version:'v1',last_approved_sha256:a.prototype_sha256,next_action:active?'Review Journey 15 V1; explicit approval required before freeze.':'Journey 14 frozen. Next: Journey 15 Settlement History.'});
write('registry/journeys.json',js);write('registry/progress.json',p);write('registry/golden-artifact-locks.json',locks);
for(const name of ['active-candidate','support-candidate','next-support-candidate'])write(`registry/${name}.json`,active);
write('registry/checkpoints/2026-09-06-j14-v1-golden.json',{...a,status:'golden',golden_count:14,html_preserved:true,existing_goldens_changed:false,decision_history_preserved:true,gate_requirement:'exact-resulting-head'});
write('journeys/14-receive-money/golden-validation.json',{ok:true,status:'golden',golden_number:14,prototype_sha256:digest(a.prototype_path),html_unchanged:true,approved_policy:a.approved_policy,all_golden_locks_pass:true,decision_history:'J14-D01 and J14-D02',typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01','09','13','14'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=js.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 14 V1 is Golden #14. Private one-recipient sharing, owner-only link control, deliberate external copy, exact destination context and recovery-before-retry are approved. Reviewed HTML is unchanged.\n\nAll earlier journey policies remain unchanged.\n\n'+(active?'Current candidate: Journey 15 — Settlement History V1. Not Golden.':'Next: Journey 15 — Settlement History. Not started in this freeze.')+'\n\nTYPO-01: shared typography/readability remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 14 Golden; 14 remaining.\n\nJourney 14 V1 is Golden #14. All approved HTML is checksum-locked.\n\n'+(active?`## Review now\n\nJourney 15 — Settlement History V1. Not Golden.\n\nOpen \`${active.prototype_path}\`; read \`${active.spec_path}\` and \`${active.qa_path}\`.\n`:'## Next\n\nJourney 15 — Settlement History. This freeze does not start it.\n')+'\n## Preserve\n\nJourney 14 sharing policies, all earlier Golden behavior, and the decision-history records remain approved. TYPO-01 shared typography/readability stays deferred.\n\n## Gate and continuity\n\nRun `npm run gate`. Preflight verifies locked bytes before replay. Historical QA records remain historical; final approval overlays restore current state. If `registry/j15-candidate.json` exists, the freeze preserves that review candidate. Require a successful exact-head run with no generated changes left.\n');
console.log('Recorded Journey 14 Golden #14 without writing HTML.');
