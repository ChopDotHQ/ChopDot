import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=p=>JSON.parse(read(p));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const a=load('registry/approvals/01-v1.json');
assert.equal(hash(a.prototype_path),a.prototype_sha256,'Reviewed Journey 01 HTML changed');
assert.equal(a.default_sign_in,'email-code');assert.equal(a.alternative_sign_in,'wallet');assert.equal(a.deferred_note.change_now,false);
const nextPath='registry/support-candidate.json';
const active=fs.existsSync(path.join(root,nextPath))?load(nextPath):null;
const js=load('registry/journeys.json'),p=load('registry/progress.json');
const lockPath='registry/golden-artifact-locks.json';
const locks=load(lockPath);for(const l of locks)assert.equal(hash(l.path),l.sha256,`Golden changed: ${l.path}`);
const j=js.find(x=>x.id==='01');assert(j);
if(process.argv.includes('--check')){
 assert.equal(j.status,'golden');assert.equal(j.golden_number,11);assert.equal(j.prototype_sha256,a.prototype_sha256);
 assert.equal(js.find(x=>x.id==='12').status,'golden');assert.equal(p.golden_count,11);
 assert.equal(p.current_journey,active?.journey??null);assert.equal(p.paused_after_freeze,!active);
 assert.equal(locks.find(x=>x.journey==='01')?.sha256,a.prototype_sha256);
 assert.equal(p.remaining_core_including_entry.length,0);assert.equal(p.remaining_in_app_money_loop.length,0);
 if(active){assert.equal(js.find(x=>x.id===active.journey).status,'current');assert.equal(hash(active.prototype_path),active.prototype_sha256);}
 console.log('J01 GOLDEN FREEZE GATE PASSED: Golden #11 unchanged; email-code default; wallet alternative; all locks pass.');process.exit(0);
}
Object.assign(j,{status:'golden',approval:a.approval,version:a.version,golden_number:11,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256});
for(const x of js)if(x.status==='current'&&x.id!==active?.journey){x.status='not-started';x.approval='not-reviewed';}
if(active){
 const next=js.find(x=>x.id===active.journey);assert(next&&next.status!=='golden','Do not reopen a Golden');
 for(const field of ['prototype_path','spec_path','qa_path'])assert(fs.existsSync(path.join(root,active[field])),`Missing ${field}`);
 assert.equal(hash(active.prototype_path),active.prototype_sha256);
 Object.assign(next,{status:'current',approval:'review-pending',version:active.version,prototype_path:active.prototype_path,prototype_sha256:active.prototype_sha256,spec_path:active.spec_path,qa_path:active.qa_path});
}
if(!locks.some(l=>l.journey==='01'))locks.push({journey:'01',path:a.prototype_path,sha256:a.prototype_sha256});
write(lockPath,locks);
Object.assign(p,{schema_version:8,golden_count:11,remaining_overall:17,current_journey:active?.journey??null,paused_after_freeze:!active,remaining_core_including_entry:[],remaining_in_app_money_loop:[],last_approved_journey:'01',last_approved_version:'v1',last_approved_sha256:a.prototype_sha256,next_action:active?`Review Journey ${active.journey} ${active.version}. Explicit approval required before freeze.`:'Journey 01 frozen. Next unfinished supporting journey: 09 Manage People.'});
write('registry/journeys.json',js);write('registry/progress.json',p);write('registry/active-candidate.json',active);
write('registry/checkpoints/2026-09-05-j01-v1-golden.json',{...a,status:'golden',golden_count:11,html_preserved:true,gate_requirement:'exact-resulting-head',existing_goldens_changed:false});
write('journeys/01-enter-chopdot/golden-validation.json',{ok:true,prototype_sha256:hash(a.prototype_path),html_unchanged:true,status:'golden',golden_number:11,default_sign_in:'email-code',alternative_sign_in:'wallet',all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=js.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 01 V1 is Golden #11: email-code default, wallet alternative. Reviewed HTML is unchanged.\n\n'+(active?`Current candidate: Journey ${active.journey} — ${active.name} ${active.version}. Not Golden.\n`:'Next: Journey 09 — Manage People. Not started in this freeze.\n')+'\nTYPO-01: shared typography/readability remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 11 Golden; 17 remaining. The core entry and in-app money loop are design-approved.\n\nJourney 01 V1 is Golden #11. Email-code is the default; wallet sign-in is an alternative.\n\n'+(active?`## Review now\n\nJourney ${active.journey} — ${active.name} ${active.version}.\n\nOpen \`${active.prototype_path}\`; read \`${active.spec_path}\` and \`${active.qa_path}\`.\n`:'## Next\n\nJourney 09 — Manage People. This freeze does not start it.\n')+'\n## Preserve\n\nAll approved HTML is checksum-locked. TYPO-01 shared typography/readability is deferred; do not change it during individual journeys.\n\n## Gate\n\nRun `npm run gate`. Historical bundles replay before approval overlays restore final Golden statuses and the explicit support candidate in registry/support-candidate.json. Final gate checks must pass on the exact branch head.\n');
console.log('Recorded Journey 01 Golden #11; no HTML written; support progress '+(active?.journey??'paused'));
