import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const journeys=load('registry/journeys.json'),progress=load('registry/progress.json'),locks=load('registry/golden-artifact-locks.json');
const errors=[];
if(journeys.length!==28) errors.push(`Expected 28 journeys, got ${journeys.length}`);
const gold=journeys.filter(j=>j.status==='golden');
if(gold.length!==16||progress.golden_count!==16) errors.push('Golden count must be 16');
if(locks.length!==16) errors.push('Golden lock count must be 16');
for(const l of locks){if(!fs.existsSync(path.join(root,l.path))) errors.push(`Missing Golden artifact ${l.path}`);else if(digest(l.path)!==l.sha256) errors.push(`Golden checksum mismatch ${l.path}`);}
for(const id of ['15','16']){
  const a=load(`registry/approvals/${id}-v1.json`);
  if(!a.recovered_from_review_evidence) errors.push(`J${id} recovery provenance missing`);
  if(digest(a.prototype_path)!==a.prototype_sha256) errors.push(`J${id} approval checksum mismatch`);
  const spec=fs.readFileSync(path.join(root,`journeys/${id==='15'?'15-settlement-history':'16-savings-group'}/spec.md`),'utf8');
  if(!spec.includes('## Decision history')) errors.push(`J${id} decision history missing`);
}
const current=journeys.filter(j=>j.status==='current');
if(progress.current_journey===null){if(current.length!==0||progress.paused_after_freeze!==true) errors.push('Paused state inconsistent');}else{
  if(current.length!==1||current[0].id!==progress.current_journey) errors.push('Current journey inconsistent');
  if(progress.current_journey==='17'){
    const c=load('registry/j17-candidate.json');
    if(c.prototype_sha256!==digest(c.prototype_path)) errors.push('J17 candidate checksum mismatch');
    const v=load('journeys/17-savings-contribute-withdraw/validation.json');
    if(!v.ok||v.candidate_sha256!==c.prototype_sha256) errors.push('J17 validation mismatch');
    if(v.model_assertions!==86||v.browser_layouts!==38||v.page_errors.length) errors.push('J17 QA evidence incomplete');
    for(const f of [c.spec_path,c.qa_path,'journeys/17-savings-contribute-withdraw/STATE_AND_AUTHORITY.md','journeys/17-savings-contribute-withdraw/GIVEN_WHEN_THEN.md','journeys/17-savings-contribute-withdraw/UI_TO_DOMAIN_EVENTS.md']) if(!fs.existsSync(path.join(root,f))) errors.push(`Missing J17 file ${f}`);
    const html=fs.readFileSync(path.join(root,c.prototype_path),'utf8');
    for(const banned of ['Polkadot wallet','% APY','guaranteed yield']) if(html.toLowerCase().includes(banned.toLowerCase())) errors.push(`Banned J17 visible claim: ${banned}`);
  }
}
if(progress.remaining_overall!==12) errors.push('Remaining count must be 12');
if(progress.typography_note!=='TYPO-01 deferred') errors.push('TYPO-01 must remain deferred');
if(errors.length){console.error('CURRENT WORKBENCH GATE FAILED');for(const e of errors)console.error('-',e);process.exit(1);}
console.log(`CURRENT WORKBENCH GATE PASSED: 28 journeys, 16 Golden, current ${progress.current_journey??'none'}, ${locks.length} locks.`);
