import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const a=load('registry/approvals/12-v1.1.json');
assert.equal(digest(a.prototype_path),a.prototype_sha256,'Approved Journey 12 HTML must remain byte-for-byte unchanged');
assert.equal(digest('journeys/11-settle-up/v1.1-golden-candidate.html'),'d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d');
const activePath='registry/active-candidate.json';
const active=fs.existsSync(path.join(root,activePath))?load(activePath):null;
const js=load('registry/journeys.json'),p=load('registry/progress.json');
const j=js.find(x=>x.id===a.journey);
assert(j,'Missing approved journey');
const checkpointPath='registry/checkpoints/2026-09-05-j12-v1.1-golden.json';
const lockPath='registry/golden-artifact-locks.json';
if(process.argv.includes('--check')){
  assert.equal(j.status,'golden');assert.equal(j.approval,'design-approved');assert.equal(j.golden_number,10);
  assert.equal(j.prototype_sha256,a.prototype_sha256);assert.equal(j.prototype_path,a.prototype_path);
  assert.equal(p.golden_count,js.filter(x=>x.status==='golden').length);
  assert.equal(p.current_journey,active?.journey??null);assert.equal(p.paused_after_freeze,!active);
  assert.equal(load(checkpointPath).prototype_sha256,a.prototype_sha256);
  assert.equal(a.deferred_note.change_now,false);
  for(const lock of load(lockPath))assert.equal(digest(lock.path),lock.sha256,`Golden changed: ${lock.path}`);
  if(active){assert.equal(js.find(x=>x.id===active.journey)?.status,'current');assert.equal(digest(active.prototype_path),active.prototype_sha256);}
  console.log('GOLDEN FREEZE GATE PASSED: Journey 12 Golden #10; all locked HTML unchanged; current journey '+(active?.journey??'none'));
  process.exit(0);
}
Object.assign(j,{status:'golden',approval:a.approval,version:a.version,golden_number:a.golden_number,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256});
// Only an explicit later-candidate manifest may advance progress. Historical replay cannot reset it.
for(const x of js)if(x.status==='current'&&x.id!==active?.journey){x.status='not-started';x.approval='not-reviewed';}
if(active){
  const next=js.find(x=>x.id===active.journey);assert(next&&next.status!=='golden','Cannot reopen an approved journey');
  for(const field of ['prototype_path','spec_path','qa_path'])assert(fs.existsSync(path.join(root,active[field])),`Missing ${field}`);
  assert.equal(digest(active.prototype_path),active.prototype_sha256,'Candidate manifest checksum');
  Object.assign(next,{status:'current',approval:'review-pending',version:active.version,prototype_path:active.prototype_path,prototype_sha256:active.prototype_sha256,spec_path:active.spec_path,qa_path:active.qa_path});
}
const gold=js.filter(x=>x.status==='golden');
Object.assign(p,{schema_version:7,updated_on:a.approved_on,golden_count:gold.length,remaining_overall:js.length-gold.length,current_journey:active?.journey??null,paused_after_freeze:!active,remaining_in_app_money_loop:[],remaining_core_including_entry:js.find(x=>x.id==='01').status==='golden'?[]:['01'],last_approved_journey:'12',last_approved_version:a.version,last_approved_sha256:a.prototype_sha256,next_action:active?`Review Journey ${active.journey} ${active.version}; explicit approval required before freeze.`:'Journey 12 frozen. Next in the core-loop sequence: Journey 01 Enter ChopDot.'});
write('registry/journeys.json',js);write('registry/progress.json',p);
write(checkpointPath,{...a,status:'golden',golden_count:10,html_preserved:true,existing_goldens_changed:false,gate_requirement:'exact-resulting-head',in_app_money_loop:'design-approved',next_journey:'01'});
if(!fs.existsSync(path.join(root,lockPath)))write(lockPath,gold.map(x=>({journey:x.id,path:x.prototype_path,sha256:digest(x.prototype_path)})));
for(const lock of load(lockPath))assert.equal(digest(lock.path),lock.sha256,`Golden changed: ${lock.path}`);
const order=['02','03','04','08','05','06','07','10','11','12'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=js.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\n## Golden #10\n\nJourney 12 V1.1 approved 2026-09-05. Original reviewed HTML path retained, unchanged.\n\nSHA-256: `'+a.prototype_sha256+'`\n\n'+(active?`## Current candidate\n\nJourney ${active.journey} — ${active.name} ${active.version}. Review pending; not Golden.\n`:'Journey 01 — Enter ChopDot is next. Not started in this freeze.\n')+'\n## Deferred\n\nTYPO-01: Small progress-label readability, later shared typography pass. No changes now.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 journeys; '+gold.length+' Golden; '+(js.length-gold.length)+' remaining.\n\nJourney 12 V1.1 is Golden #10. The complete in-app money loop is design-approved.\n\n'+(active?`## Current review\n\nJourney ${active.journey} — ${active.name} ${active.version}.\n\nOpen \`${active.prototype_path}\`. Read \`${active.spec_path}\`, then \`${active.qa_path}\`.\n`:'## Next\n\nJourney 01 — Enter ChopDot. Finish entry before supporting journeys.\n')+'\n## Preserve\n\nApproved HTML is checksum-locked in registry/golden-artifact-locks.json. Never edit approved screens as part of later journeys.\n\nTYPO-01: Small progress-label readability is deferred to a shared typography pass. No font changes now.\n\n## Gate\n\n`npm run gate` replays historical bundles, restores explicit approvals/current candidate, regenerates maps, and validates the final state. A later candidate is declared in registry/active-candidate.json; old freeze tasks must not erase it.\n');
console.log('Recorded Golden #10 without writing any HTML; next progress '+(active?.journey??'paused'));
