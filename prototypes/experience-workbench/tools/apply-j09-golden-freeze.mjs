import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const approval=load('registry/approvals/09-v1.json');
assert.equal(approval.prototype_sha256,'715077633a17cf37ef587988c0aee7f4906403a030d8e0d17d1b0c46aa6cb37d');
assert.equal(digest(approval.prototype_path),approval.prototype_sha256,'Approved Journey 09 HTML changed');
assert.equal(approval.html_change_authorized,false);
assert.equal(approval.deferred_note.change_now,false);
assert.equal(approval.approved_policy.removal_authority,'current-group-owner-only');
assert.equal(approval.approved_policy.removal_condition,'no-open-items-for-this-person-in-this-group');
assert(approval.approved_policy.past_records_preserved&&approval.approved_policy.other_memberships_preserved);
const locks=load('registry/golden-artifact-locks.json');
for(const lock of locks)assert.equal(digest(lock.path),lock.sha256,`Golden changed: ${lock.path}`);
if(process.argv.includes('--preflight')){console.log('Preflight: every existing Golden and reviewed J09 unchanged before materialization.');process.exit(0);}
const nextPath='registry/next-support-candidate.json';
const next=fs.existsSync(path.join(root,nextPath))?load(nextPath):null;
const js=load('registry/journeys.json'),progress=load('registry/progress.json');
const j=js.find(x=>x.id==='09');assert(j);
if(process.argv.includes('--check')){
 assert.equal(j.status,'golden');assert.equal(j.golden_number,12);assert.equal(j.approval,'design-approved');
 assert.equal(j.prototype_sha256,approval.prototype_sha256);assert.equal(progress.golden_count,12);
 assert.equal(js.filter(x=>x.status==='golden').length,12);assert.equal(locks.length,12);
 assert.equal(locks.find(x=>x.journey==='09')?.sha256,approval.prototype_sha256);
 assert.equal(progress.current_journey,next?.journey??null);assert.equal(progress.paused_after_freeze,!next);
 assert.equal(progress.remaining_overall,16);assert.equal(progress.last_approved_journey,'09');
 assert.equal(load('registry/active-candidate.json')?.journey??null,next?.journey??null);
 assert.equal(load('registry/support-candidate.json')?.journey??null,next?.journey??null);
 assert.equal(js.filter(x=>x.status==='current').length,next?1:0);
 if(next){assert.equal(next.journey,'13');assert.equal(js.find(x=>x.id===next.journey).approval,'review-pending');assert.equal(digest(next.prototype_path),next.prototype_sha256);}
 console.log('J09 GOLDEN FREEZE GATE PASSED: Golden #12; owner-only/no-open-items policy; all 12 approved HTML files unchanged; TYPO-01 deferred.');process.exit(0);
}
Object.assign(j,{status:'golden',approval:'design-approved',golden_number:12,approved_on:approval.approved_on,prototype_sha256:approval.prototype_sha256});
for(const x of js)if(x.status==='current'){x.status='not-started';x.approval='not-reviewed';}
if(next){
 assert.equal(next.journey,'13','Continue in the established order');const n=js.find(x=>x.id===next.journey);assert(n&&n.status!=='golden');
 for(const key of ['prototype_path','spec_path','qa_path'])assert(fs.existsSync(path.join(root,next[key])),`Missing ${key}`);
 assert.equal(digest(next.prototype_path),next.prototype_sha256);
 Object.assign(n,{status:'current',approval:'review-pending',version:next.version,prototype_path:next.prototype_path,prototype_sha256:next.prototype_sha256,spec_path:next.spec_path,qa_path:next.qa_path});
}
if(!locks.some(x=>x.journey==='09'))locks.push({journey:'09',path:approval.prototype_path,sha256:approval.prototype_sha256});
assert.equal(js.filter(x=>x.status==='golden').length,12);
Object.assign(progress,{schema_version:9,updated_on:'2026-09-06',golden_count:12,remaining_overall:16,current_journey:next?.journey??null,paused_after_freeze:!next,last_approved_journey:'09',last_approved_version:'v1',last_approved_sha256:approval.prototype_sha256,next_action:next?'Review Journey 13 V1. Explicit approval required before freeze.':'Journey 09 is frozen. Next unfinished supporting journey: 13 Request Money.'});
write('registry/journeys.json',js);write('registry/progress.json',progress);write('registry/golden-artifact-locks.json',locks);
write('registry/active-candidate.json',next);write('registry/support-candidate.json',next);
write('registry/checkpoints/2026-09-06-j09-v1-golden.json',{...approval,status:'golden',golden_count:12,html_preserved:true,existing_goldens_changed:false,gate_requirement:'exact-resulting-head'});
write('journeys/09-manage-people/golden-validation.json',{ok:true,status:'golden',golden_number:12,prototype_sha256:digest(approval.prototype_path),html_unchanged:true,approved_policy:approval.approved_policy,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01','09'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=js.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 09 V1 is Golden #12. Owner-only removal requires no open items in the selected group; past records and other memberships remain intact. Reviewed HTML is unchanged.\n\nJourney 01 remains email-code first, with wallet sign-in as the alternative.\n\n'+(next?'Current candidate: Journey 13 — Request Money V1. Not Golden.':'Next: Journey 13 — Request Money.')+'\n\nTYPO-01: shared typography/readability remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 12 Golden; 16 remaining.\n\nJourney 09 V1 is Golden #12. The reviewed HTML is checksum-locked; past records and other memberships survive group-specific removal. Journey 01 remains email-code first, wallet alternative.\n\n'+(next?`## Review now\n\nJourney 13 — Request Money V1. Not Golden.\n\nOpen \`${next.prototype_path}\`; read \`${next.spec_path}\` and \`${next.qa_path}\`.\n`:'## Next\n\nJourney 13 — Request Money. This freeze does not start it.\n')+'\n## Preserve\n\nAll 12 approved HTML files are checksum-locked. TYPO-01 shared typography/readability is deferred.\n\n## Gate and continuity\n\nRun `npm run gate`. Preflight checks the locked bytes before historical materialization. Historical review validators run before the final J09 approval overlay. registry/next-support-candidate.json declares the next candidate; the final overlay restores canonical progress, active-candidate and support-candidate. Do not infer approval from historical QA text or the retained candidate filename.\n\nThe final branch head must have a successful workbench gate with no generated changes left.\n');
console.log('Recorded Journey 09 as Golden #12 without writing approved HTML.');
