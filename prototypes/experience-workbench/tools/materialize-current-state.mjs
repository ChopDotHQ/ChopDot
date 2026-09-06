import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const materializeEncoded=(source,target)=>{
  const sourcePath=path.join(root,source),targetPath=path.join(root,target);
  if(!fs.existsSync(sourcePath)) return;
  const encoded=fs.readFileSync(sourcePath,'utf8').trim();
  const bytes=zlib.brotliDecompressSync(Buffer.from(encoded,'base64'));
  fs.mkdirSync(path.dirname(targetPath),{recursive:true});
  if(!fs.existsSync(targetPath)||!fs.readFileSync(targetPath).equals(bytes)) fs.writeFileSync(targetPath,bytes);
};
materializeEncoded('registry/source-artifacts/j15-v1.html.br.b64','journeys/15-settlement-history/v1-recovered.html');
materializeEncoded('registry/source-artifacts/j16-v1.html.br.b64','journeys/16-savings-group/v1-recovered.html');
materializeEncoded('registry/source-artifacts/j17-v1.html.br.b64','journeys/17-savings-contribute-withdraw/v1-candidate.html');
const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const a15=load('registry/approvals/15-v1.json'),a16=load('registry/approvals/16-v1.json');
for(const a of [a15,a16]){
  if(digest(a.prototype_path)!==a.prototype_sha256) throw new Error(`Approval checksum mismatch for J${a.journey}`);
  if(!a.recovered_from_review_evidence) throw new Error(`J${a.journey} recovery provenance missing`);
}
for(const l of locks) if(digest(l.path)!==l.sha256) throw new Error(`Existing Golden changed: ${l.path}`);
const setGolden=a=>{
  const j=journeys.find(x=>x.id===a.journey); if(!j) throw new Error(`Missing journey ${a.journey}`);
  Object.assign(j,{status:'golden',approval:'design-approved',version:a.version,golden_number:a.golden_number,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256,spec_path:`journeys/${a.journey==='15'?'15-settlement-history':'16-savings-group'}/spec.md`,qa_path:`journeys/${a.journey==='15'?'15-settlement-history':'16-savings-group'}/VISUAL_QA.md`});
  if(!locks.some(l=>l.journey===a.journey)) locks.push({journey:a.journey,path:a.prototype_path,sha256:a.prototype_sha256,recovered_from_review_evidence:true});
};
setGolden(a15); setGolden(a16);
const manifestPath='registry/j17-candidate.json';
const candidate=fs.existsSync(path.join(root,manifestPath))?load(manifestPath):null;
for(const j of journeys){if(j.status==='current'){j.status='not-started';j.approval='not-reviewed';}}
if(candidate){
  if(candidate.journey!=='17') throw new Error('Only Journey 17 may be current here.');
  if(digest(candidate.prototype_path)!==candidate.prototype_sha256) throw new Error('J17 candidate checksum mismatch');
  const j=journeys.find(x=>x.id==='17');
  Object.assign(j,{status:'current',approval:'review-pending',version:candidate.version,prototype_path:candidate.prototype_path,prototype_sha256:candidate.prototype_sha256,spec_path:candidate.spec_path,qa_path:candidate.qa_path});
}
const goldenCount=journeys.filter(j=>j.status==='golden').length;
if(goldenCount!==16) throw new Error(`Expected 16 Goldens, got ${goldenCount}`);
if(locks.length!==16) throw new Error(`Expected 16 Golden locks, got ${locks.length}`);
write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);
const progress={schema_version:12,updated_on:'2026-09-07',registered_journeys:28,golden_count:16,current_journey:candidate?'17':null,remaining_overall:12,remaining_core_including_entry:[],remaining_in_app_money_loop:[],map_source:'registry/journeys.json',generated_map:'journey-map.html',validation_command:'npm run gate',payment_contract_version:'1.2',storage_contract_version:'1.0',paused_after_freeze:!candidate,last_approved_journey:'16',last_approved_version:'v1',last_approved_sha256:a16.prototype_sha256,next_action:candidate?'Review Journey 17 V1; explicit approval required before freeze.':'Journey 16 frozen. Next: Journey 17 Contribute / Withdraw Savings.',typography_note:'TYPO-01 deferred'};
write('registry/progress.json',progress);
for(const name of ['active-candidate','support-candidate','next-support-candidate'])write(`registry/${name}.json`,candidate);
write('registry/checkpoints/2026-09-07-j15-v1-golden-recovery.json',{...a15,status:'golden',golden_count:15,existing_goldens_changed:false});
write('registry/checkpoints/2026-09-07-j16-v1-golden-recovery.json',{...a16,status:'golden',golden_count:16,existing_goldens_changed:false});
write('journeys/15-settlement-history/golden-validation.json',{ok:true,status:'golden',golden_number:15,prototype_sha256:a15.prototype_sha256,recovered_from_review_evidence:true,html_locked:true,typography:'TYPO-01 deferred'});
write('journeys/16-savings-group/golden-validation.json',{ok:true,status:'golden',golden_number:16,prototype_sha256:a16.prototype_sha256,recovered_from_review_evidence:true,html_locked:true,typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01','09','13','14','15','16'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=journeys.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourneys 15 and 16 were recovered into durable GitHub artifacts from retained review evidence after their temporary review HTML was not committed. Their recovery checksums are now locked; no byte-identity claim is made about the missing temporary files.\n\n'+(candidate?'Current candidate: Journey 17 — Contribute / Withdraw Savings V1. Not Golden.\n':'Next: Journey 17 — Contribute / Withdraw Savings.\n')+'\nTYPO-01 remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 16 Golden; 12 remaining.\n\nJourney 16 — Savings Group V1 is Golden #16. The durable recovery artifact is checksum-locked and preserves the reviewed visual hierarchy and approved savings rules. Journey 15 was recovered and locked the same way because its temporary review HTML was also missing from the branch.\n\n'+(candidate?`## Review now\n\nJourney 17 — Contribute / Withdraw Savings V1. Open \`${candidate.prototype_path}\` and read \`${candidate.spec_path}\` plus \`${candidate.qa_path}\`.\n`:'## Next\n\nJourney 17 — Contribute / Withdraw Savings.\n')+'\n## Preserve\n\nAll 16 Golden artifact checksums must pass. Do not claim the J15/J16 recovery artifacts are the lost temporary bytes. TYPO-01 remains deferred.\n');
console.log(`CURRENT STATE MATERIALIZED: 16 Golden; current=${candidate?.journey??'none'}`);
