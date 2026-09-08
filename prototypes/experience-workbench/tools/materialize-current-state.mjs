import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const readParts=relative=>{
  const dir=path.join(root,relative);
  if(!fs.existsSync(dir)) return null;
  const names=fs.readdirSync(dir).filter(n=>/^\d{3}\.part$/.test(n)).sort();
  if(!names.length) return null;
  return names.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join('');
};
const materializeEncoded=(source,target)=>{
  const sourcePath=path.join(root,source),targetPath=path.join(root,target);
  if(!fs.existsSync(sourcePath)) return;
  const bytes=zlib.brotliDecompressSync(Buffer.from(fs.readFileSync(sourcePath,'utf8').trim(),'base64'));
  fs.mkdirSync(path.dirname(targetPath),{recursive:true});
  if(!fs.existsSync(targetPath)||!fs.readFileSync(targetPath).equals(bytes)) fs.writeFileSync(targetPath,bytes);
};
const materializeEncodedParts=(sourceDir,target)=>{
  const encoded=readParts(sourceDir); if(!encoded) return;
  const bytes=zlib.brotliDecompressSync(Buffer.from(encoded,'base64'));
  const targetPath=path.join(root,target);fs.mkdirSync(path.dirname(targetPath),{recursive:true});
  if(!fs.existsSync(targetPath)||!fs.readFileSync(targetPath).equals(bytes)) fs.writeFileSync(targetPath,bytes);
};
const applyBundleParts=sourceDir=>{
  const encoded=readParts(sourceDir); if(!encoded) return;
  const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));
  if(bundle.name!=='2026-09-07-j18-v1-candidate') throw new Error('Unexpected J18 bundle');
  const journeyRoot='journeys/18-activity-notifications/';
  for(const [relative,content] of Object.entries(bundle.files)){
    const normalized=relative.startsWith(journeyRoot)?relative:journeyRoot+relative;
    if(normalized.includes('..')||!normalized.startsWith(journeyRoot)) throw new Error(`Unsafe J18 bundle path ${relative}`);
    const target=path.resolve(root,normalized);if(!target.startsWith(path.resolve(root,journeyRoot)+path.sep)) throw new Error(`Unsafe J18 target ${relative}`);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
  }
};
materializeEncoded('registry/source-artifacts/j15-v1.html.br.b64','journeys/15-settlement-history/v1-recovered.html');
materializeEncoded('registry/source-artifacts/j16-v1.html.br.b64','journeys/16-savings-group/v1-recovered.html');
materializeEncoded('registry/source-artifacts/j17-v1.1.html.br.b64','journeys/17-savings-contribute-withdraw/v1.1-candidate.html');
materializeEncodedParts('registry/source-artifacts/j18-v1.html.br.b64.parts','journeys/18-activity-notifications/v1-candidate.html');
applyBundleParts('registry/j18-candidate-bundle.br.b64.parts');
const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const a15=load('registry/approvals/15-v1.json'),a16=load('registry/approvals/16-v1.json'),a17=load('registry/approvals/17-v1.1.json');
for(const a of [a15,a16,a17]) if(digest(a.prototype_path)!==a.prototype_sha256) throw new Error(`Approval checksum mismatch for J${a.journey}`);
for(const a of [a15,a16]) if(!a.recovered_from_review_evidence) throw new Error(`J${a.journey} recovery provenance missing`);
if(a17.html_change_authorized!==false||a17.deferred_note?.change_now!==false) throw new Error('J17 approval discipline changed');
for(const l of locks) if(digest(l.path)!==l.sha256) throw new Error(`Existing Golden changed: ${l.path}`);
const dirs={'15':'15-settlement-history','16':'16-savings-group','17':'17-savings-contribute-withdraw'};
const setGolden=a=>{
  const j=journeys.find(x=>x.id===a.journey);if(!j) throw new Error(`Missing journey ${a.journey}`);
  Object.assign(j,{status:'golden',approval:'design-approved',version:a.version,golden_number:a.golden_number,approved_on:a.approved_on,prototype_path:a.prototype_path,prototype_sha256:a.prototype_sha256,spec_path:`journeys/${dirs[a.journey]}/spec.md`,qa_path:`journeys/${dirs[a.journey]}/VISUAL_QA.md`});
  if(!locks.some(l=>l.journey===a.journey)) locks.push({journey:a.journey,path:a.prototype_path,sha256:a.prototype_sha256,...(a.recovered_from_review_evidence?{recovered_from_review_evidence:true}:{})});
};
setGolden(a15);setGolden(a16);setGolden(a17);
const candidatePath='registry/j18-candidate.json';
const candidate=fs.existsSync(path.join(root,candidatePath))?load(candidatePath):null;
for(const j of journeys) if(j.status==='current'){j.status='not-started';j.approval='not-reviewed';}
if(candidate){
  if(candidate.journey!=='18') throw new Error('Only Journey 18 may be current after J17 freeze.');
  if(digest(candidate.prototype_path)!==candidate.prototype_sha256) throw new Error('J18 candidate checksum mismatch');
  const v=load('journeys/18-activity-notifications/validation.json');if(!v.ok||v.candidate_sha256!==candidate.prototype_sha256) throw new Error('J18 evidence checksum mismatch');
  const j=journeys.find(x=>x.id==='18');Object.assign(j,{status:'current',approval:'review-pending',version:candidate.version,prototype_path:candidate.prototype_path,prototype_sha256:candidate.prototype_sha256,spec_path:candidate.spec_path,qa_path:candidate.qa_path});
}
// This baseline stage deliberately reconstructs the pre-next-freeze state. If a later
// journey has already been frozen on the branch, remove only its lock here after the
// journey registry has been reset to non-Golden; later freeze stages reapply it exactly.
for(let i=locks.length-1;i>=0;i--){const j=journeys.find(x=>x.id===locks[i].journey);if(!j||j.status!=='golden')locks.splice(i,1);}
const goldenCount=journeys.filter(j=>j.status==='golden').length;
if(goldenCount!==17) throw new Error(`Expected 17 Goldens, got ${goldenCount}`);if(locks.length!==17) throw new Error(`Expected 17 Golden locks, got ${locks.length}`);
write('registry/journeys.json',journeys);write('registry/golden-artifact-locks.json',locks);
const progress={schema_version:13,updated_on:'2026-09-07',registered_journeys:28,golden_count:17,current_journey:candidate?'18':null,remaining_overall:11,remaining_core_including_entry:[],remaining_in_app_money_loop:[],map_source:'registry/journeys.json',generated_map:'journey-map.html',validation_command:'npm run gate',payment_contract_version:'1.2',storage_contract_version:'1.0',paused_after_freeze:!candidate,last_approved_journey:'17',last_approved_version:'v1.1',last_approved_sha256:a17.prototype_sha256,next_action:candidate?'Review Journey 18 V1; explicit approval required before freeze.':'Journey 17 V1.1 frozen. Next: Journey 18 Activity & Notifications.',typography_note:'TYPO-01 deferred'};
write('registry/progress.json',progress);for(const name of ['active-candidate','support-candidate','next-support-candidate'])write(`registry/${name}.json`,candidate);
write('registry/checkpoints/2026-09-07-j17-v1.1-golden.json',{...a17,status:'golden',golden_count:17,html_preserved:true,existing_goldens_changed:false,gate_requirement:'exact-resulting-head'});
write('journeys/17-savings-contribute-withdraw/golden-validation.json',{ok:true,status:'golden',golden_number:17,prototype_sha256:a17.prototype_sha256,html_unchanged:true,approved_policy:a17.approved_policy,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
const order=['02','03','04','08','05','06','07','10','11','12','01','09','13','14','15','16','17'];
write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+order.map((id,i)=>{const x=journeys.find(j=>j.id===id);return `${i+1}. ${x.name} — ${x.version} · Design Approved`;}).join('\n')+'\n\nJourney 17 V1.1 is Golden #17. The reviewed standalone HTML is byte-for-byte checksum locked.\n\nJourneys 15 and 16 remain durable recovery artifacts from retained review evidence; no byte-identity claim is made about their lost temporary files.\n\n'+(candidate?'Current candidate: Journey 18 — Activity & Notifications V1. Not Golden.\n':'Next: Journey 18 — Activity & Notifications.\n')+'\nTYPO-01 remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 17 Golden; 11 remaining.\n\nJourney 17 — Contribute / Withdraw Savings V1.1 is Golden #17. Its reviewed standalone HTML is checksum-locked exactly.\n\n'+(candidate?`## Review now\n\nJourney 18 — Activity & Notifications V1. Open \`${candidate.prototype_path}\` and read \`${candidate.spec_path}\` plus \`${candidate.qa_path}\`.\n`:'## Next\n\nJourney 18 — Activity & Notifications.\n')+'\n## Preserve\n\nAll 17 Golden artifact checksums must pass. TYPO-01 remains deferred.\n');
console.log(`CURRENT STATE MATERIALIZED: 17 Golden; current=${candidate?.journey??'none'}`);