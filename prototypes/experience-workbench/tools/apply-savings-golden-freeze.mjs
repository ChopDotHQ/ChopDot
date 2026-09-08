import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const a16=load('registry/approvals/16-v1.2.json');
const a17=load('registry/approvals/17-v1.4.json');
const old16=load('registry/approvals/16-v1.json');
const old17=load('registry/approvals/17-v1.1.json');
const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
const manifest=load('registry/review-candidates/savings-j16-v1.2-j17-v1.4.json');

for(const prior of [old16,old17]){
  if(!exists(prior.prototype_path)||digest(prior.prototype_path)!==prior.prototype_sha256) throw new Error(`Previous Golden artifact changed: J${prior.journey}`);
}
for(const lock of locks){
  if(!exists(lock.path)||digest(lock.path)!==lock.sha256) throw new Error(`Pre-freeze Golden lock changed: ${lock.path}`);
}
for(const approved of [a16,a17]){
  if(approved.approval!=='design-approved'||approved.html_change_authorized!==false) throw new Error(`Invalid approval discipline for J${approved.journey}`);
  if(!exists(approved.prototype_path)||digest(approved.prototype_path)!==approved.prototype_sha256) throw new Error(`Approved candidate bytes changed: J${approved.journey}`);
}
if(a16.prototype_sha256!=='dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de') throw new Error('Unexpected J16 V1.2 hash');
if(a17.prototype_sha256!=='a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915') throw new Error('Unexpected J17 V1.4 hash');

const setGolden=(approval,slug,qaPath)=>{
  const j=journeys.find(x=>x.id===approval.journey);if(!j) throw new Error(`Missing journey ${approval.journey}`);
  Object.assign(j,{status:'golden',approval:'design-approved',version:approval.version,golden_number:approval.golden_number,approved_on:approval.approved_on,prototype_path:approval.prototype_path,prototype_sha256:approval.prototype_sha256,spec_path:`journeys/${slug}/spec.md`,qa_path:qaPath});
  const next={journey:approval.journey,path:approval.prototype_path,sha256:approval.prototype_sha256};
  const index=locks.findIndex(x=>x.journey===approval.journey);
  if(index<0) locks.push(next); else locks[index]=next;
};
setGolden(a16,'16-savings-group','journeys/16-savings-group/review-v1.2/results/VISUAL_QA.md');
setGolden(a17,'17-savings-contribute-withdraw','journeys/17-savings-contribute-withdraw/review-v1.4/results/VISUAL_QA.md');

const j18=journeys.find(j=>j.id==='18'),j19=journeys.find(j=>j.id==='19');
if(!j18||j18.status!=='current'||j18.approval!=='review-pending') throw new Error('Journey 18 must remain current/review-pending');
if(!j19||j19.status!=='not-started'||j19.approval!=='not-reviewed') throw new Error('Journey 19 must remain not-started');
if(journeys.filter(j=>j.status==='golden').length!==17) throw new Error('Golden count must remain 17');
if(locks.length!==17) throw new Error(`Golden lock count must remain 17, got ${locks.length}`);
for(const lock of locks) if(digest(lock.path)!==lock.sha256) throw new Error(`Post-freeze Golden checksum mismatch: ${lock.path}`);

Object.assign(progress,{schema_version:14,updated_on:'2026-09-08',golden_count:17,current_journey:'18',remaining_overall:11,paused_after_freeze:false,last_approved_journey:'17',last_approved_version:'v1.4',last_approved_sha256:a17.prototype_sha256,next_action:'Return to Journey 18 V1 review; explicit approval required before freeze.',typography_note:'TYPO-01 deferred'});
Object.assign(manifest,{status:'design-approved',publication_scope:'updated Golden versions; previous Golden artifacts and approval history preserved; Journey 18 remains current; Journey 19 not started',approved_on:'2026-09-08',materialized:true,golden_freeze:true});
manifest.j16={...manifest.j16,approval:'design-approved',approval_path:'registry/approvals/16-v1.2.json',golden_number:16,previous_approval:'registry/approvals/16-v1.json',previous_golden_path:old16.prototype_path,previous_golden_sha256:old16.prototype_sha256};
manifest.j17={...manifest.j17,approval:'design-approved',approval_path:'registry/approvals/17-v1.4.json',golden_number:17,previous_approval:'registry/approvals/17-v1.1.json',previous_golden_path:old17.prototype_path,previous_golden_sha256:old17.prototype_sha256};
manifest.golden_policy='J16 V1.2 and J17 V1.4 are the current Golden versions; all 17 current Golden locks must pass; previous J16/J17 Golden files and approval records remain preserved.';

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);
write('registry/progress.json',progress);
write('registry/review-candidates/savings-j16-v1.2-j17-v1.4.json',manifest);
write('registry/checkpoints/2026-09-08-j16-v1.2-j17-v1.4-golden.json',{
  checkpoint:'2026-09-08-j16-v1.2-j17-v1.4-golden',
  status:'golden-freeze',
  approved_on:'2026-09-08',
  j16:{version:'v1.2',golden_number:16,prototype_path:a16.prototype_path,prototype_sha256:a16.prototype_sha256,previous_approval:'registry/approvals/16-v1.json',previous_golden_path:old16.prototype_path,previous_golden_sha256:old16.prototype_sha256},
  j17:{version:'v1.4',golden_number:17,prototype_path:a17.prototype_path,prototype_sha256:a17.prototype_sha256,previous_approval:'registry/approvals/17-v1.1.json',previous_golden_path:old17.prototype_path,previous_golden_sha256:old17.prototype_sha256,codex_native_reload_verification:a17.codex_native_reload_verification},
  golden_count:17,current_journey:'18',journey_19_status:'not-started',existing_goldens_changed:false,html_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'exact-resulting-head'
});
write('journeys/16-savings-group/golden-validation.json',{ok:true,status:'golden',golden_number:16,version:'v1.2',prototype_sha256:a16.prototype_sha256,html_unchanged:true,previous_golden_preserved:true,previous_golden_sha256:old16.prototype_sha256,approved_policy:a16.approved_policy,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
write('journeys/17-savings-contribute-withdraw/golden-validation.json',{ok:true,status:'golden',golden_number:17,version:'v1.4',prototype_sha256:a17.prototype_sha256,html_unchanged:true,previous_golden_preserved:true,previous_golden_sha256:old17.prototype_sha256,codex_native_reload_verification:a17.codex_native_reload_verification,approved_policy:a17.approved_policy,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});

const order=['02','03','04','08','05','06','07','10','11','12','01','09','13','14','15','16','17'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=journeys.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 16 V1.2 is the updated Golden #16 and Journey 17 V1.4 is the updated Golden #17. Their approved HTML bytes are checksum-locked exactly.\n\nThe previous J16 V1 and J17 V1.1 Golden artifacts and approval records remain preserved as history.\n\nCurrent candidate: Journey 18 — Activity & Notifications V1. Not Golden.\n\nJourney 19 remains not started. TYPO-01 remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 17 current Goldens; 11 remaining.\n\nJourney 16 — Savings Group V1.2 is the updated Golden #16. Journey 17 — Contribute / Withdraw Savings V1.4 is the updated Golden #17. Both approved standalone HTML files are checksum-locked exactly; their prior Golden artifacts and approvals remain preserved.\n\n## Review now\n\nJourney 18 — Activity & Notifications V1 remains current and review-pending. Journey 19 is not started.\n\n## Preserve\n\nAll 17 current Golden artifact checksums must pass. TYPO-01 remains deferred.\n');
write('registry/review-candidates/SAVINGS_RESUME.md','# Savings Golden freeze — J16 V1.2 / J17 V1.4\n\nStatus: Design Approved. J16 V1.2 remains at `journeys/16-savings-group/v1.2-review-candidate.html` with SHA-256 `dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de`. J17 V1.4 remains at `journeys/17-savings-contribute-withdraw/v1.4-review-candidate.html` with SHA-256 `a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915`.\n\nPrevious J16 V1 and J17 V1.1 Golden files and approval records are preserved. Codex native reload evidence remains separate under Journey 17 review-v1.4.\n\nJourney 18 remains current. Journey 19 remains not started. TYPO-01 remains deferred.\n');
console.log('SAVINGS GOLDEN FREEZE APPLIED: J16 V1.2 + J17 V1.4; 17 current Golden locks; J18 current; J19 not started.');
