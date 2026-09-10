import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');

const approvedOn='2026-09-10';
const j19Path='journeys/19-insights/review-v1.1/v1.1-candidate.html';
const j19Sha='c67973e0efc1068d006d57c4d5690b6c49218bd63f24cb62ab587fbf5b9862da';
const j19Qa='journeys/19-insights/review-v1.1/QA_SUMMARY.json';
const j19VisualQa='journeys/19-insights/review-v1.1/VISUAL_QA.md';
const j20Spec='journeys/20-payment-methods/spec.md';
const j20History='journeys/20-payment-methods/source/decision-history.md';

if(!fs.existsSync(path.join(root,j19Path))||digest(j19Path)!==j19Sha) throw Error('Approved J19 V1.1 artifact changed');
const qa=load(j19Qa);
if(!qa.ok||qa.candidate_sha256!==j19Sha||qa.browser_layouts!==54||qa.passed_browser_layouts!==54||qa.product_clicks!==278||qa.passed_product_clicks!==278||qa.model_assertions!==43||qa.model_scenarios!==18||qa.shell_consistency!==true||qa.external_network_requests!==0||(qa.page_errors?.length??0)!==0||(qa.console_errors?.length??0)!==0) throw Error('J19 V1.1 QA evidence changed');
if(!fs.existsSync(path.join(root,j20Spec))||!fs.existsSync(path.join(root,j20History))) throw Error('Journey 20 definition must exist before it becomes current');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
if(locks.length!==18) throw Error(`Expected 18 pre-J19 Golden locks, got ${locks.length}`);

const j19=journeys.find(j=>j.id==='19');
const j20=journeys.find(j=>j.id==='20');
if(!j19||!j20) throw Error('Missing Journey 19 or Journey 20');
if(j19.status!=='current'||j19.version!=='v1'||j19.prototype_sha256!=='b539cdbea4c3ced0de2663e922b4ccbc6bcc30975e8211c24aaf02cf14357260') throw Error('Expected reconstructed J19 V1 current state before V1.1 freeze');
if(j20.status!=='not-started') throw Error('Journey 20 started before J19 freeze');

const approval={
  journey:'19',
  name:'Insights',
  version:'v1.1',
  golden_number:19,
  approval:'design-approved',
  approved_on:approvedOn,
  reviewed_source:'Journey 19 V1.1 fresh browser/render review candidate',
  prototype_path:j19Path,
  prototype_sha256:j19Sha,
  qa_summary_path:j19Qa,
  visual_qa_path:j19VisualQa,
  previous_candidate_path:'journeys/19-insights/v1-candidate.html',
  previous_candidate_sha256:'b539cdbea4c3ced0de2663e922b4ccbc6bcc30975e8211c24aaf02cf14357260',
  previous_candidate_preserved:true,
  html_change_authorized:false,
  approved_policy:{
    patterns_not_transactions:true,
    read_only:true,
    like_for_like_currency_and_complete_periods:true,
    exact_assets_separate:true,
    current_authorized_scope_only:true,
    latest_accepted_record_wins:true,
    corrections_replace_old_versions:true,
    duplicates_do_not_double_count:true,
    incomplete_windows_suppress_delta:true,
    minimum_evidence_required:true,
    no_people_scoring:true,
    settlement_descriptive_only:true,
    offline_cache_explicitly_stale:true,
    canonical_shell_preserved:true,
    adjacent_journey_ownership_preserved:true
  },
  review_evidence:{states:27,browser_layouts:'54/54',product_clicks:'278/278',model_assertions:'43/43',model_scenarios:18,page_errors:0,console_errors:0,external_runtime_network_requests:0},
  next_journey:'20',
  deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'}
};
write('registry/approvals/19-v1.1.json',approval);

const goldenOrder=['02','03','04','08','05','06','07','10','11','12','01','09','13','14','15','16','17','18','19'];
for(const [index,id] of goldenOrder.entries()){
  const j=journeys.find(x=>x.id===id);if(!j) throw Error(`Missing Golden journey ${id}`);j.golden_number=index+1;
}
Object.assign(j19,{status:'golden',approval:'design-approved',entry_mode:'feature',version:'v1.1',prototype_path:j19Path,prototype_sha256:j19Sha,spec_path:'journeys/19-insights/spec.md',qa_path:j19VisualQa,golden_number:19,approved_on:approvedOn});
Object.assign(j20,{status:'current',approval:'not-reviewed',entry_mode:'feature',version:'v1',spec_path:j20Spec});
delete j20.prototype_path;delete j20.prototype_sha256;delete j20.qa_path;delete j20.golden_number;delete j20.approved_on;

const existing=locks.findIndex(l=>l.journey==='19');
const lock={journey:'19',path:j19Path,sha256:j19Sha};
if(existing<0) locks.push(lock); else locks[existing]=lock;
if(locks.length!==19) throw Error(`Expected 19 Golden locks after J19 freeze, got ${locks.length}`);
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J19 freeze: ${l.path}`);

Object.assign(progress,{
  schema_version:16,
  updated_on:approvedOn,
  registered_journeys:28,
  golden_count:19,
  current_journey:'20',
  remaining_overall:9,
  paused_after_freeze:false,
  last_approved_journey:'19',
  last_approved_version:'v1.1',
  last_approved_sha256:j19Sha,
  next_action:'Journey 20 Payment Methods is current at definition stage. Build only after reading its spec, decision history, state inventory, edge cases and adjacent Golden boundaries.',
  typography_note:'TYPO-01 deferred'
});

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);
write('registry/progress.json',progress);
write('registry/j19-candidate.json',{journey:'19',name:'Insights',status:'golden',approval:'design-approved',version:'v1.1',golden_number:19,approved_on:approvedOn,prototype_path:j19Path,prototype_sha256:j19Sha,qa_path:j19VisualQa,previous_candidate_path:approval.previous_candidate_path,previous_candidate_sha256:approval.previous_candidate_sha256,previous_candidate_preserved:true,typography_note:'TYPO-01 deferred'});
write('registry/j20-start.json',{journey:'20',name:'Payment Methods',status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j20.goal,entry:j20.entry,exit:j20.exit,next:j20.next,spec_path:j20Spec,decision_history_path:j20History,state_inventory_path:'journeys/20-payment-methods/STATE_INVENTORY.md',edge_cases_path:'journeys/20-payment-methods/EDGE_CASES.md',prototype_built:false,golden_count_before:19,typography_note:'TYPO-01 deferred'});
write('registry/checkpoints/2026-09-10-j19-v1.1-golden-j20-start.json',{checkpoint:'2026-09-10-j19-v1.1-golden-j20-start',j19:{status:'golden',version:'v1.1',golden_number:19,prototype_path:j19Path,prototype_sha256:j19Sha,qa_summary_path:j19Qa,previous_candidate_preserved:true},j20:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j20Spec,decision_history_path:j20History},golden_count:19,remaining_overall:9,typography_note:'TYPO-01 deferred',journey_21_status:'not-started'});
write('journeys/19-insights/golden-validation.json',{ok:true,status:'golden',golden_number:19,version:'v1.1',approved_on:approvedOn,prototype_path:j19Path,prototype_sha256:j19Sha,html_unchanged_after_approval:true,qa_summary_path:j19Qa,all_golden_locks_pass:true,typography:'TYPO-01 deferred'});
write('journeys/19-insights/GOLDEN_APPROVAL.md',`# Journey 19 — Golden Approval\n\nJourney 19 Insights V1.1 is Design Approved as Golden #19 on ${approvedOn}.\n\nApproved artifact: \`${j19Path}\`\n\nSHA-256: \`${j19Sha}\`\n\nThe reviewed HTML is checksum-locked. The earlier V1 candidate remains preserved for provenance. V1.1 corrected the canonical global shell and scope-picker chevron found during fresh reproducibility review; no further HTML change was authorized after approval.\n\nTYPO-01 remains deferred.\n`);

const historyPath='journeys/19-insights/source/decision-history.md';
let history=fs.readFileSync(path.join(root,historyPath),'utf8');
if(!history.includes('### J19-D04')) history += `\n### J19-D04 — Repair continuity drift and approve V1.1 as Golden #19\n\n**Decision:** Preserve the V1 candidate, correct only the fresh-review defects in a separately reviewed V1.1 candidate, restore the canonical Pots / People / raised Add / Activity / You shell, restore the missing scope-picker chevron, add the People boundary preview required by that shell, and approve the resulting exact artifact as Golden #19.\n\n**Why:** Fresh reproducibility review found that V1 had drifted from the frozen global navigation and had a collapsed scope-picker SVG at both target sizes. V1.1 then passed the complete fresh browser, interaction, model and shell-consistency checks and was explicitly approved for freeze.\n\n**Alternatives:** Freezing V1 despite the drift, silently mutating V1 in place, or expanding the review into a broader Insights redesign were rejected. The approved correction remained narrow and preserved the existing Insights information hierarchy.\n\n**Tradeoffs:** V1.1 adds one standalone People boundary preview and changes the global shell presentation to match existing Goldens, increasing the screen/action count while leaving Insights semantics unchanged. The original V1 artifact remains as provenance rather than being rewritten.\n\n**Revisit when:** A future global-navigation redesign is explicitly approved across the product, new research warrants a substantive Insights V2, or evidence shows the current boundary handoffs are materially confusing.\n\n**Approval / version:** v1.1 — design-approved as Golden #19 on ${approvedOn}. HTML SHA-256 \`${j19Sha}\`; HTML changes after approval are not authorized. TYPO-01 remains deferred.\n\n**Sources:** [V1.1 visual QA](../review-v1.1/VISUAL_QA.md); [V1.1 QA summary](../review-v1.1/QA_SUMMARY.json); [Journey 19 approval record](../../../registry/approvals/19-v1.1.json); [Golden approval note](../GOLDEN_APPROVAL.md).\n`;
write(historyPath,history);

write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+goldenOrder.map((id,i)=>{const j=journeys.find(x=>x.id===id);return `${i+1}. ${j.name} — ${j.version} · Design Approved`;}).join('\n')+'\n\nJourney 19 — Insights V1.1 is Golden #19. Its reviewed standalone HTML is checksum-locked exactly.\n\nCurrent journey: Journey 20 — Payment Methods V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\n28 registered journeys; 19 Goldens; 9 remaining.\n\nJourney 19 — Insights V1.1 is Golden #19. Its approved artifact is checksum-locked exactly.\n\n## Current\n\nJourney 20 — Payment Methods V1 is at definition stage. Read `journeys/20-payment-methods/spec.md`, `source/decision-history.md`, `STATE_INVENTORY.md`, and `EDGE_CASES.md` before building its candidate.\n\n## Preserve\n\nAll 19 Golden artifact checksums must pass. Journey 21 remains not started. TYPO-01 remains deferred.\n');

console.log('J19 V1.1 GOLDEN #19 APPLIED; J20 DEFINITION CURRENT.');
