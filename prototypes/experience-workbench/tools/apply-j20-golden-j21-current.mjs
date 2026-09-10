import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');

const approvedOn='2026-09-10';
const j20Path='journeys/20-payment-methods/review-v1/v1-candidate.html';
const j20Sha='02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab';
const j20Qa='journeys/20-payment-methods/review-v1/QA_SUMMARY.json';
const j20VisualQa='journeys/20-payment-methods/review-v1/VISUAL_QA.md';
const approvalEvidencePath='registry/checkpoints/2026-09-10-j20-v1-human-approved.json';
const j21Spec='journeys/21-wallet-crypto/spec.md';
const j21History='journeys/21-wallet-crypto/source/decision-history.md';
const j21States='journeys/21-wallet-crypto/STATE_INVENTORY.md';
const j21Edges='journeys/21-wallet-crypto/EDGE_CASES.md';

for(const p of [j20Path,j20Qa,j20VisualQa,approvalEvidencePath,j21Spec,j21History,j21States,j21Edges]) if(!fs.existsSync(path.join(root,p))) throw Error(`Missing required freeze/next-journey evidence: ${p}`);
if(digest(j20Path)!==j20Sha) throw Error('Approved J20 V1 artifact changed');
const qa=load(j20Qa);
if(!qa.ok||qa.candidate_sha256!==j20Sha||qa.states!==59||qa.browser_layouts!==118||qa.passed_browser_layouts!==118||qa.product_clicks!==598||qa.passed_product_clicks!==598||qa.model_assertions!==81||qa.model_scenarios!==12||qa.shell_consistency!==true||qa.external_network_requests!==0||(qa.page_errors?.length??0)!==0||(qa.console_errors?.length??0)!==0||qa.overview_raw_destination_leak!==false||qa.secret_like_input_present!==false) throw Error('J20 V1 QA evidence changed');
const approvalEvidence=load(approvalEvidencePath);
if(approvalEvidence.prototype_sha256!==j20Sha||approvalEvidence.review_bundle_head!=='74082c72cc52935a5eda41b42279b72f2cb0213f'||approvalEvidence.direct_visual_review!=='pass'||approvalEvidence.review_classification!=='GOLDEN-READY'||approvalEvidence.human_approval!=='approved'||approvalEvidence.html_change_authorized!==false) throw Error('J20 visual/human approval evidence is incomplete or changed');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j20=journeys.find(j=>j.id==='20');
const j21=journeys.find(j=>j.id==='21');
if(!j20||!j21) throw Error('Missing Journey 20 or Journey 21');

const firstTransition=progress.golden_count===19&&progress.current_journey==='20';
const alreadyTransitioned=progress.golden_count>=20&&progress.last_approved_journey==='20';
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected current authority before J20 freeze: goldens=${progress.golden_count} current=${progress.current_journey}`);
if(firstTransition&&j20.status!=='current') throw Error('Journey 20 must be current before first freeze transition');

Object.assign(j20,{status:'golden',approval:'design-approved',entry_mode:'feature',version:'v1',prototype_path:j20Path,prototype_sha256:j20Sha,spec_path:'journeys/20-payment-methods/spec.md',qa_path:j20VisualQa,golden_number:20,approved_on:approvedOn});
if(firstTransition||progress.current_journey==='21') Object.assign(j21,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j21Spec});

const existing=locks.findIndex(l=>l.journey==='20');
const lock={journey:'20',path:j20Path,sha256:j20Sha};
if(existing<0) locks.push(lock); else locks[existing]=lock;
if(locks.filter(l=>l.journey==='20').length!==1) throw Error('Expected exactly one J20 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J20 freeze: ${l.path}`);

const approval={
  journey:'20',name:'Payment Methods',version:'v1',golden_number:20,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 20 V1 exact review bundle with independent direct rendered-PNG inspection and explicit human approval',
  review_bundle_head:'74082c72cc52935a5eda41b42279b72f2cb0213f',reviewed_source_head:'87acfc3d4bf7ffca0c814d8440915b19893fa4c1',dedicated_review_run:'34502893911',review_artifact_id:'10162658173',
  prototype_path:j20Path,prototype_sha256:j20Sha,qa_summary_path:j20Qa,visual_qa_path:j20VisualQa,
  html_change_authorized:false,
  review_evidence:{states:59,browser_layouts:'118/118',product_clicks:'598/598',model_assertions:'81/81',model_scenarios:12,page_errors:0,console_errors:0,external_runtime_network_requests:0,direct_visual_review:'118/118 screenshots inspected',visual_clearance:true,human_approval:true},
  approved_policy:{saved_destination_not_payment_authority:true,owner_only_configuration:true,contextual_visibility_not_directory_disclosure:true,compatibility_scoped_preference:true,exact_destination_versioning:true,removal_not_payment_cancellation:true,no_wallet_or_provider_secrets:true,recovery_before_retry:true,method_specific_validation:true,no_cross_asset_conversion:true},
  next_journey:'21',
  deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},
  prototype_only:true
};
write('registry/approvals/20-v1.json',approval);

if(firstTransition){
  Object.assign(progress,{schema_version:17,updated_on:approvedOn,registered_journeys:28,golden_count:20,current_journey:'21',remaining_overall:8,paused_after_freeze:false,last_approved_journey:'20',last_approved_version:'v1',last_approved_sha256:j20Sha,next_action:'Journey 21 Wallet & Crypto is current at definition stage. Build only after reading its spec, decision history, state inventory, edge cases and adjacent Golden boundaries.',typography_note:'TYPO-01 deferred'});

  write('registry/active-candidate.json',{journey:'21',name:'Wallet & Crypto',version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j21Spec,decision_history_path:j21History,state_inventory_path:j21States,edge_cases_path:j21Edges,golden_count_before:20,human_approval_required:true,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j21-start.json',{journey:'21',name:'Wallet & Crypto',status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j21.goal,entry:j21.entry,exit:j21.exit,next:j21.next,spec_path:j21Spec,decision_history_path:j21History,state_inventory_path:j21States,edge_cases_path:j21Edges,prototype_built:false,golden_count_before:20,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-10-j20-v1-golden-j21-start.json',{checkpoint:'2026-09-10-j20-v1-golden-j21-start',j20:{status:'golden',version:'v1',golden_number:20,prototype_path:j20Path,prototype_sha256:j20Sha,qa_summary_path:j20Qa,direct_visual_review:'pass',human_approval:'approved',html_change_authorized:false},j21:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j21Spec,decision_history_path:j21History},golden_count:20,remaining_overall:8,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-10-j20-v1-golden-j21-current',purpose:'Materialize explicitly approved Journey 20 Payment Methods V1 as Golden #20 and advance only to Journey 21 Wallet & Crypto definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition must pass npm run gate on its resulting tree; workflow/run evidence is recorded externally after the exact transition run completes.',journey_20:{version:'v1',golden_number:20,approval:'design-approved',prototype_path:j20Path,prototype_sha256:j20Sha,approval_record:'registry/approvals/20-v1.json',review_bundle_head:'74082c72cc52935a5eda41b42279b72f2cb0213f',dedicated_review_run:'34502893911',direct_visual_review:'pass',human_approval:true,html_change_authorized:false},journey_21:{version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j21Spec},golden_count:20,golden_lock_count:20,golden_manifest:'registry/goldens.manifest.json',current_journey:'21',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J20 bytes/checksum remain exact; resulting J20 Golden/J21-current tree must pass npm run gate before the transition is treated as fully materialized.',prototype_only:true});

  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 20 — Payment Methods V1 is Golden #20. Its exact reviewed artifact is checksum-locked; the HTML was not changed during freeze.\n\nCurrent journey: Journey 21 — Wallet & Crypto V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nBefore doing journey work, read:\n\n1. `DESIGN_CONTRACT.md` — stable shared product/UX rules and context-bundle rule.\n2. `WORKFLOW.md` — Candidate → mechanical QA → independent review → human approval → Golden freeze.\n3. `REVIEW_PROTOCOL.md` — five independent review lenses and evidence requirements.\n4. `shared/improvements.md` — cross-journey issues that must not be silently fixed inside a journey.\n5. The current journey\'s spec, state inventory, edge cases, decision history, and only the relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 20 Goldens; 8 remaining.\n\nJourney 20 — Payment Methods V1 is Golden #20. Exact approved artifact SHA-256: `02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab`. Direct visual review and explicit Devinson approval were recorded before freeze; HTML changes after approval are not authorized.\n\nJourney 21 — Wallet & Crypto V1 is **current at definition stage**. Read `journeys/21-wallet-crypto/spec.md`, `source/decision-history.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, and relevant adjacent Goldens before building. No J21 review candidate exists yet.\n\n## Preserve\n\nAll 20 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated from the journey and lock registries and must not become a competing approval authority. TYPO-01 remains deferred.\n');

  const readmePath='journeys/20-payment-methods/README.md';
  let readme=fs.readFileSync(path.join(root,readmePath),'utf8');
  readme=readme.replace('Status: **current definition stage** after Journey 19 Golden freeze. Prototype not built yet.','Status: **Design Approved — Golden #20** on 2026-09-10. Exact reviewed V1 artifact is checksum-locked; HTML was unchanged during freeze.');
  write(readmePath,readme);
  const specPath='journeys/20-payment-methods/spec.md';
  let spec=fs.readFileSync(path.join(root,specPath),'utf8');
  spec=spec.replace('V1 · Definition stage · Current. Prototype only; candidate not built yet.','V1 · Design Approved · Golden #20. Prototype only; approved artifact is checksum-locked.');
  write(specPath,spec);

  const historyPath='journeys/20-payment-methods/source/decision-history.md';
  let history=fs.readFileSync(path.join(root,historyPath),'utf8');
  if(!history.includes('### J20-D04')) history += `\n### J20-D04 — Approve the exact reviewed V1 artifact as Golden #20\n\n**Decision:** Freeze the exact Journey 20 V1 review artifact as Golden #20 without modifying its HTML, after complete mechanical/semantic evidence, independent direct inspection of all 118 rendered screenshots, and explicit Devinson approval. Advance only to Journey 21 Wallet & Crypto definition.\n\n**Why:** The exact candidate passed 59-state deterministic/model/browser coverage, 118/118 layouts, 598/598 product interactions, privacy/secret checks and direct visual review. No blocking product, hierarchy, clipping, CTA, mobile-order or Golden-consistency defect remained.\n\n**Alternatives:** Freezing before direct visual inspection, mutating the reviewed HTML during freeze, or beginning Journey 21 before explicit human approval were rejected because each would bypass the workbench review/authority contract.\n\n**Tradeoffs:** The approved V1 retains non-blocking shared typography debt under TYPO-01 rather than reopening a reviewed journey. In return, the exact artifact remains reproducible and the next journey can inherit a stable payment-method boundary.\n\n**Revisit when:** New user evidence or an explicitly authorized shared-system pass justifies a separately reviewed J20 version; never edit this Golden in place.\n\n**Approval / version:** v1 — design-approved as Golden #20 on ${approvedOn}. HTML SHA-256 \`${j20Sha}\`; HTML changes after approval are not authorized.\n\n**Sources:** [J20 QA summary](../review-v1/QA_SUMMARY.json); [J20 visual QA](../review-v1/VISUAL_QA.md); [J20 human-approval checkpoint](../../../registry/checkpoints/2026-09-10-j20-v1-human-approved.json); [J20 approval record](../../../registry/approvals/20-v1.json).\n`;
  write(historyPath,history);
}

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);
write('registry/progress.json',progress);
console.log(firstTransition?'J20 V1 GOLDEN #20 APPLIED; J21 DEFINITION CURRENT.':'J20 Golden #20 state reconstructed without overwriting newer J21 authority overlays.');
