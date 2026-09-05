import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const a=load('registry/approvals/13-v1.json');
assert.equal(a.prototype_sha256,'a22664499c4056d95a6cdeb45df85d43fd2055713e80ae8f69020469aa9bb707');
assert.equal(digest(a.prototype_path),a.prototype_sha256,'Reviewed Journey 13 HTML changed');
assert.equal(a.html_change_authorized,false);assert.equal(a.deferred_note.change_now,false);
assert(Object.values(a.approved_policy).every(v=>v===true),'Approved request policies changed');
const locks=load('registry/golden-artifact-locks.json');
for(const l of locks)assert.equal(digest(l.path),l.sha256,`Golden changed: ${l.path}`);
if(process.argv.includes('--preflight')){
 // Historical review-stage checks must allow a later, explicitly approved lock.
 // All byte-level checks remain in place. Final registry state is checked below.
 const edits=[
  ['tools/validate-j09-people.mjs',"locks.length===11||locks.length===12","locks.length===11||locks.length===12||locks.length===13"],
  ['tools/apply-j09-golden-freeze.mjs',"assert.equal(locks.length,12);","assert(locks.length===12||locks.length===13);"],
  ['tools/validate-j13-request.mjs',"assert.equal(locks.length,12);assert(!locks.some(l=>l.journey==='13'));","assert(locks.length===12||locks.length===13);if(locks.length===13){assert.equal(json('registry/approvals/13-v1.json').prototype_sha256,sha);assert.equal(locks.find(l=>l.journey==='13')?.sha256,sha);}"]
 ];
 for(const [file,oldText,newText] of edits){const text=fs.readFileSync(path.join(root,file),'utf8');if(!text.includes(newText)){assert(text.includes(oldText),`Unexpected historical validator: ${file}`);write(file,text.replace(oldText,newText));}}
 console.log('J13 preflight: reviewed bytes and every Golden lock verified.');process.exit(0);
}
const manifest='registry/j14-candidate.json';
const active=fs.existsSync(path.join(root,manifest))?load(manifest):null;
const js=load('registry/journeys.json'),p=load('registry/progress.json'),j=js.find(x=>x.id==='13');assert(j);
if(active){assert.equal(active.journey,'14');for(const key of ['prototype_path','spec_path','qa_path'])assert(fs.existsSync(path.join(root,active[key])),`Missing ${key}`);assert.equal(digest(active.prototype_path),active.prototype_sha256);}
if(process.argv.includes('--check')){
 assert.equal(j.status,'golden');assert.equal(j.approval,'design-approved');assert.equal(j.golden_number,13);assert.equal(j.prototype_sha256,a.prototype_sha256);
 assert.equal(p.golden_count,13);assert.equal(js.filter(x=>x.status==='golden').length,13);assert.equal(locks.length,13);
 assert.equal(locks.find(x=>x.journey==='13')?.sha256,a.prototype_sha256);
 assert.equal(p.current_journey,active?.journey??null);assert.equal(p.remaining_overall,15);assert.equal(p.paused_after_freeze,!active);assert.equal(p.last_approved_journey,'13');
 for(const name of ['active-candidate','support-candidate','next-support-candidate'])assert.deepEqual(load(`registry/${name}.json`),active);
 assert.equal(js.filter(x=>x.status==='current').length,active?1:0);
 if(active){assert.equal(js.find(x=>x.id==='14').status,'current');assert.equal(js.find(x=>x.id==='14').approval,'review-pending');}
 console.log('J13 GOLDEN FREEZE GATE PASSED: Golden #13; all 13 HTML files unchanged; TYPO-01 deferred.');process.exit(0);
}
Object.assign(j,{status:'golden',approval:a.approval,version:a.version,golden_number:13,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256});
for(const x of js)if(x.status==='current'){x.status='not-started';x.approval='not-reviewed';}
if(active){const n=js.find(x=>x.id==='14');assert(n&&n.status!=='golden');Object.assign(n,{status:'current',approval:'review-pending',version:active.version,prototype_path:active.prototype_path,prototype_sha256:active.prototype_sha256,spec_path:active.spec_path,qa_path:active.qa_path});}
if(!locks.some(x=>x.journey==='13'))locks.push({journey:'13',path:a.prototype_path,sha256:a.prototype_sha256});
assert.equal(locks.length,13);
Object.assign(p,{schema_version:10,updated_on:a.approved_on,golden_count:13,remaining_overall:15,current_journey:active?.journey??null,paused_after_freeze:!active,last_approved_journey:'13',last_approved_version:'v1',last_approved_sha256:a.prototype_sha256,next_action:active?'Review Journey 14 V1; explicit approval required before freeze.':'Journey 13 frozen. Next: Journey 14 Receive / Share Payment Details.'});
write('registry/journeys.json',js);write('registry/progress.json',p);write('registry/golden-artifact-locks.json',locks);
for(const name of ['active-candidate','support-candidate','next-support-candidate'])write(`registry/${name}.json`,active);
write('registry/checkpoints/2026-09-06-j13-v1-golden.json',{...a,status:'golden',golden_count:13,html_preserved:true,existing_goldens_changed:false,gate_requirement:'exact-resulting-head'});
write('journeys/13-request-money/golden-validation.json',{ok:true,status:'golden',golden_number:13,prototype_sha256:digest(a.prototype_path),html_unchanged:true,approved_policy:a.approved_policy,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01','09','13'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=js.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 13 V1 is Golden #13. Private requests, overlapping-source protection and withdrawal policies are approved. Reviewed HTML is unchanged.\n\nJourney 01 remains email-code first; Journey 09 removal policy is unchanged.\n\n'+(active?'Current candidate: Journey 14 — Receive / Share Payment Details V1. Not Golden.':'Next: Journey 14 — Receive / Share Payment Details. Not started in this freeze.')+'\n\nTYPO-01: shared typography/readability remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 13 Golden; 15 remaining.\n\nJourney 13 V1 is Golden #13. All approved HTML is checksum-locked.\n\n'+(active?`## Review now\n\nJourney 14 — Receive / Share Payment Details V1. Not Golden.\n\nOpen \`${active.prototype_path}\`; read \`${active.spec_path}\` and \`${active.qa_path}\`.\n`:'## Next\n\nJourney 14 — Receive / Share Payment Details. This freeze does not start it.\n')+'\n## Preserve\n\nEmail-code remains the default sign-in. Group removal and private-request policies remain approved. TYPO-01 shared typography/readability stays deferred.\n\n## Gate and continuity\n\nRun `npm run gate`. Preflight verifies locked bytes before replay. Historical QA records remain historical; final approval overlays restore current state. registry/j14-candidate.json declares the next candidate. Final freeze checks validate every Golden lock and current progress. Require a successful exact-head run with no generated changes left.\n');
console.log('Recorded Journey 13 Golden #13 without writing HTML.');
