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
for(const id of ['15','16']){
  const a=load(`registry/approvals/${id}-v1.json`);
  if(!a.recovered_from_review_evidence) errors.push(`J${id} recovery provenance missing`);
  if(digest(a.prototype_path)!==a.prototype_sha256) errors.push(`J${id} approval checksum mismatch`);
  const spec=fs.readFileSync(path.join(root,`journeys/${id==='15'?'15-settlement-history':'16-savings-group'}/spec.md`),'utf8');
  if(!spec.includes('## Decision history')) errors.push(`J${id} decision history missing`);
}
const a17=load('registry/approvals/17-v1.1.json');
if(a17.golden_number!==17||a17.approval!=='design-approved'||a17.html_change_authorized!==false) errors.push('J17 approval metadata invalid');
if(digest(a17.prototype_path)!==a17.prototype_sha256) errors.push('J17 approval checksum mismatch');
if(locks.find(l=>l.journey==='17')?.sha256!==a17.prototype_sha256) errors.push('J17 Golden lock mismatch');
const s17=fs.readFileSync(path.join(root,'journeys/17-savings-contribute-withdraw/spec.md'),'utf8');
if(!s17.includes('J17-D05')||!s17.includes('Golden #17')) errors.push('J17 approval decision history missing');
const current=journeys.filter(j=>j.status==='current');
if(progress.current_journey===null){
  if(current.length!==0||progress.paused_after_freeze!==true) errors.push('Paused state inconsistent');
}else{
  if(current.length!==1||current[0].id!==progress.current_journey) errors.push('Current journey inconsistent');
  if(progress.current_journey!=='18') errors.push('Only Journey 18 may be current after Golden #17');
  if(progress.current_journey==='18'){
    const c=load('registry/j18-candidate.json');
    if(c.journey!=='18'||c.version!=='v1'||c.approval!=='review-pending') errors.push('J18 candidate manifest invalid');
    if(c.prototype_sha256!=='fafb9cc74680b59f6589979115060895b6469e9ae760c59e35971be3e31f4a3a'||c.prototype_sha256!==digest(c.prototype_path)) errors.push('J18 candidate checksum mismatch');
    const v=load('journeys/18-activity-notifications/validation.json');
    if(!v.ok||v.candidate_sha256!==c.prototype_sha256) errors.push('J18 validation mismatch');
    for(const [key,value] of Object.entries({states:36,model_assertions:156,model_scenarios:30,browser_layouts:72,product_clicks:384,mapped_actions:192})) if(v[key]!==value) errors.push(`J18 ${key} expected ${value}, got ${v[key]}`);
    if(!v.all_layouts_pass||!v.all_clicks_pass||!v.self_contained||v.external_network_requests!==0||v.page_errors.length||v.console_errors.length) errors.push('J18 standalone/browser safeguards incomplete');
    const browser=load('journeys/18-activity-notifications/visual-qa/browser-qa.json');
    const observed={artifact_sha256:browser.artifact_sha256,layout_checks:browser.layout_checks,product_clicks:browser.product_clicks,clicks:browser.clicks,external_network_requests:browser.external_network_requests,page_errors:browser.page_errors?.length,console_errors:browser.console_errors?.length,keys:Object.keys(browser).sort()};
    if(browser.artifact_sha256!==c.prototype_sha256||browser.layout_checks!==72||browser.product_clicks!==384||browser.external_network_requests!==0||browser.page_errors.length||browser.console_errors.length) errors.push('J18 browser evidence mismatch: '+JSON.stringify(observed));
    const model=load('journeys/18-activity-notifications/visual-qa/model-qa.json');
    if(!model.ok||model.assertions!==156||model.scenarios!==30) errors.push('J18 model evidence mismatch');
    const screens=load('journeys/18-activity-notifications/SCREEN_STATE_MAPPING.json'),actions=load('journeys/18-activity-notifications/UI_EVENT_MAPPING.json');
    if(screens.length!==36||new Set(screens.map(s=>s.screen)).size!==36) errors.push('J18 screen mapping incomplete');
    if(actions.length!==192) errors.push('J18 action mapping incomplete');
    for(const f of [c.spec_path,c.qa_path,'journeys/18-activity-notifications/STATE_AND_AUTHORITY.md','journeys/18-activity-notifications/GIVEN_WHEN_THEN.md','journeys/18-activity-notifications/UI_TO_DOMAIN_EVENTS.md','journeys/18-activity-notifications/STATE_INVENTORY.md','journeys/18-activity-notifications/source/decision-history.md']) if(!fs.existsSync(path.join(root,f))) errors.push(`Missing J18 file ${f}`);
  }
}
if(progress.remaining_overall!==11) errors.push('Remaining count must be 11');
if(progress.last_approved_journey!=='17'||progress.last_approved_version!=='v1.1'||progress.last_approved_sha256!==a17.prototype_sha256) errors.push('J17 progress checkpoint mismatch');
if(progress.typography_note!=='TYPO-01 deferred') errors.push('TYPO-01 must remain deferred');
if(errors.length){console.error('CURRENT WORKBENCH GATE FAILED');for(const e of errors)console.error('-',e);process.exit(1);}
console.log(`CURRENT WORKBENCH GATE PASSED: 28 journeys, 17 Golden, current ${progress.current_journey??'none'}, ${locks.length} locks.`);