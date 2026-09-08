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
if(gold.length!==17||progress.golden_count!==17) errors.push('Golden count must be 17');
if(locks.length!==17) errors.push('Golden lock count must be 17');
for(const l of locks){if(!fs.existsSync(path.join(root,l.path))) errors.push(`Missing Golden artifact ${l.path}`);else if(digest(l.path)!==l.sha256) errors.push(`Golden checksum mismatch ${l.path}`);}

const a15=load('registry/approvals/15-v1.json'),old16=load('registry/approvals/16-v1.json'),a16=load('registry/approvals/16-v1.2.json'),old17=load('registry/approvals/17-v1.1.json'),a17=load('registry/approvals/17-v1.4.json');
if(!a15.recovered_from_review_evidence||!old16.recovered_from_review_evidence) errors.push('J15/J16 recovery provenance missing');
for(const a of [a15,old16,old17,a16,a17]) if(digest(a.prototype_path)!==a.prototype_sha256) errors.push(`Approval checksum mismatch for J${a.journey} ${a.version}`);
if(a16.golden_number!==16||a16.approval!=='design-approved'||a16.html_change_authorized!==false) errors.push('J16 V1.2 approval metadata invalid');
if(a17.golden_number!==17||a17.approval!=='design-approved'||a17.html_change_authorized!==false) errors.push('J17 V1.4 approval metadata invalid');
if(locks.find(l=>l.journey==='16')?.sha256!==a16.prototype_sha256||locks.find(l=>l.journey==='16')?.path!==a16.prototype_path) errors.push('J16 V1.2 Golden lock mismatch');
if(locks.find(l=>l.journey==='17')?.sha256!==a17.prototype_sha256||locks.find(l=>l.journey==='17')?.path!==a17.prototype_path) errors.push('J17 V1.4 Golden lock mismatch');
const j16=journeys.find(j=>j.id==='16'),j17=journeys.find(j=>j.id==='17');
if(!j16||j16.status!=='golden'||j16.version!=='v1.2'||j16.prototype_sha256!==a16.prototype_sha256) errors.push('J16 current Golden registry mismatch');
if(!j17||j17.status!=='golden'||j17.version!=='v1.4'||j17.prototype_sha256!==a17.prototype_sha256) errors.push('J17 current Golden registry mismatch');
const s16=fs.readFileSync(path.join(root,'journeys/16-savings-group/spec.md'),'utf8'),s17=fs.readFileSync(path.join(root,'journeys/17-savings-contribute-withdraw/spec.md'),'utf8');
if(!s16.includes('J16-D04')||!s16.includes('V1.2')||!s16.includes('Golden #16')) errors.push('J16 V1.2 approval decision history missing');
if(!s17.includes('J17-D08')||!s17.includes('V1.4')||!s17.includes('Golden #17')) errors.push('J17 V1.4 approval decision history missing');
const codex=load('journeys/17-savings-contribute-withdraw/review-v1.4/CODEX_NATIVE_RELOAD_VERIFICATION.json');
if(codex.verifier!=='Codex'||!codex.all_passed||codex.focused_checks!==16||codex.candidate_sha256!==a17.prototype_sha256) errors.push('J17 independent Codex verification mismatch');

const current=journeys.filter(j=>j.status==='current');
if(progress.current_journey===null){
  if(current.length!==0||progress.paused_after_freeze!==true) errors.push('Paused state inconsistent');
}else{
  if(current.length!==1||current[0].id!==progress.current_journey) errors.push('Current journey inconsistent');
  if(progress.current_journey!=='18') errors.push('Journey 18 must remain current after Savings Golden update');
  if(progress.current_journey==='18'){
    const c=load('registry/j18-candidate.json');
    if(c.journey!=='18'||c.version!=='v1'||c.approval!=='review-pending') errors.push('J18 candidate manifest invalid');
    if(c.prototype_sha256!=='fafb9cc74680b59f6589979115060895b6469e9ae760c59e35971be3e31f4a3a'||c.prototype_sha256!==digest(c.prototype_path)) errors.push('J18 candidate checksum mismatch');
    const v=load('journeys/18-activity-notifications/validation.json');if(!v.ok||v.candidate_sha256!==c.prototype_sha256) errors.push('J18 validation mismatch');
    for(const [key,value] of Object.entries({states:36,model_assertions:156,model_scenarios:30,browser_layouts:72,product_clicks:384,mapped_actions:192})) if(v[key]!==value) errors.push(`J18 ${key} expected ${value}, got ${v[key]}`);
    if(!v.all_layouts_pass||!v.all_clicks_pass||!v.self_contained||v.external_network_requests!==0||v.page_errors.length||v.console_errors.length) errors.push('J18 standalone/browser safeguards incomplete');
    const browser=load('journeys/18-activity-notifications/visual-qa/browser-qa.json');
    if(browser.candidate_sha256!==c.prototype_sha256||browser.layout_checks!==72||browser.passed_layouts!==72||browser.layouts?.length!==72||!browser.all_layouts_pass) errors.push('J18 browser layout evidence incomplete');
    if(browser.product_clicks!==384||browser.passed_clicks!==384||browser.clicks?.length!==384||!browser.all_clicks_pass||browser.clicks.some(x=>!x.passed)) errors.push('J18 browser click evidence incomplete');
    if(browser.external_network_requests_count!==0||browser.external_network_requests?.length!==0||browser.page_error_count!==0||browser.page_errors?.length!==0||browser.console_error_count!==0||browser.console_errors?.length!==0) errors.push('J18 browser isolation/errors incomplete');
    const model=load('journeys/18-activity-notifications/visual-qa/model-qa.json');if(!model.ok||model.assertions!==156||model.scenarios!==30) errors.push('J18 model evidence mismatch');
  }
}
const j19=journeys.find(j=>j.id==='19');if(!j19||j19.status!=='not-started'||j19.approval!=='not-reviewed') errors.push('Journey 19 must remain not-started');
if(progress.remaining_overall!==11) errors.push('Remaining count must be 11');
if(progress.last_approved_journey!=='17'||progress.last_approved_version!=='v1.4'||progress.last_approved_sha256!==a17.prototype_sha256) errors.push('Updated Savings progress checkpoint mismatch');
if(progress.typography_note!=='TYPO-01 deferred') errors.push('TYPO-01 must remain deferred');
if(errors.length){console.error('CURRENT WORKBENCH GATE FAILED');for(const e of errors)console.error('-',e);process.exit(1);}
console.log(`CURRENT WORKBENCH GATE PASSED: 28 journeys, 17 Golden, J16 ${j16.version}, J17 ${j17.version}, current ${progress.current_journey}, ${locks.length} locks.`);
