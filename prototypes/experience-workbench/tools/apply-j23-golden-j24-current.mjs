import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-14';
const j23Path='journeys/23-import/v1-candidate.html';
const j23QaPath='journeys/23-import/review-v1/VISUAL_QA.md';
const j23Sha='3a6f88274ff59bd7d513d5bbcee57a235465f1d33345df37a0b84ed51a2f6f9d';
const evidenceHead='bbafa198f28f19e4b7b668474ed2a9fdac28451f';
const definitionHead='c072728234b2f475cf90c0a8846f6e2e355fa9a3';
const qaRun='34799157705';
const artifactId='10330638400';
const artifactSha='06aae3111d5f9f37c19d3c176067f0450e8b30c6863ba4c2d2c7b03f967c2baf';
const reviewRequest='5658205510';
const reviewReceipt='5658531776';
const approvalComment='5661163397';
const approvalCheckpoint='registry/checkpoints/2026-09-14-j23-v1-human-approved.json';

if(!exists(j23Path)||!exists(j23QaPath)||!exists(approvalCheckpoint)) throw Error('Missing approved J23 bytes, canonical QA evidence, or human approval checkpoint');
if(digest(j23Path)!==j23Sha) throw Error('Approved J23 HTML bytes changed');
const human=load(approvalCheckpoint);
if(human.journey!=='23'||human.reviewed_source_head!==evidenceHead||human.definition_head!==definitionHead||human.prototype_sha256!==j23Sha||human.review_status!=='GOLDEN-READY'||human.review_request_comment_id!==reviewRequest||human.independent_review_comment_id!==reviewReceipt||human.exact_qa_run!==qaRun||human.evidence_artifact!==artifactId||human.evidence_artifact_sha256!==artifactSha||human.human_approval!=='approved'||human.approval_comment_id!==approvalComment||human.approval_applies_to_exact_bytes_only!==true||human.direct_visual_review!=='pass'||human.html_change_authorized!==false||human.protected_branch_merge_authorized!==false||human.production_deployment_authorized!==false||human.products_devnet_deployment_authorized!==false||human.financial_transaction_authorized!==false) throw Error('J23 exact human approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j23Index=journeys.findIndex(j=>j.id==='23');
if(j23Index<0) throw Error('Missing Journey 23');
const j23=journeys[j23Index],j24=journeys[j23Index+1];
if(!j24||j24.id!=='24') throw Error('Canonical registry no longer places Journey 24 after Journey 23');
const j24Dir=`journeys/24-${j24.slug}`;
const j24Spec=`${j24Dir}/spec.md`;
const j24History=`${j24Dir}/source/decision-history.md`;
const j24States=`${j24Dir}/STATE_INVENTORY.md`;
const j24Edges=`${j24Dir}/EDGE_CASES.md`;
const firstTransition=progress.golden_count===22&&progress.current_journey==='23'&&progress.last_approved_journey==='22';
const alreadyTransitioned=progress.golden_count>=23&&Number(progress.last_approved_journey)>=23;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J23 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j23,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/23-import/spec.md',prototype_path:j23Path,prototype_sha256:j23Sha,qa_path:j23QaPath,golden_number:23,approved_on:approvedOn});
if(firstTransition) Object.assign(j24,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j24Spec});
else if(progress.current_journey==='24') j24.status='current';

const lock={journey:'23',path:j23Path,sha256:j23Sha};
const lockIndex=locks.findIndex(l=>l.journey==='23');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='23').length!==1) throw Error('Expected exactly one J23 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J23 freeze: ${l.path}`);

write('registry/approvals/23-v1.json',{
  journey:'23',name:'Import Data / Group',version:'v1',golden_number:23,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 23 Import Data / Group V1 exact independently GOLDEN-READY evidence plus explicit human approval on issue #38 comment 5661163397',
  reviewed_source_head:evidenceHead,definition_head:definitionHead,candidate_branch:'ux/experience-workbench-j23-v1-candidate',review_request_comment_id:reviewRequest,independent_review_comment_id:reviewReceipt,
  exact_qa_run:qaRun,review_artifact_id:artifactId,review_artifact_sha256:artifactSha,ci_run:'34799157704',coverage_run:'34799157714',smoke_run:'34799157725',e2e_run:'34799157718',
  prototype_path:j23Path,prototype_sha256:j23Sha,visual_qa_path:j23QaPath,html_change_authorized:false,human_approval_surface:'issue #38',human_approval_comment_id:approvalComment,
  review_evidence:{registered_states:39,owner_boundary_renders:3,screenshots:118,interaction_checks:150,interaction_checks_passed:150,page_errors:0,console_errors:0,external_runtime_network_requests:0,deterministic_failures:0,visual_clearance:true,human_approval:true,synthetic_no_live_execution:true},
  approved_policy:{preview_before_write:true,one_new_group_per_import:true,no_existing_group_auto_merge:true,no_name_only_identity_linking:true,no_silent_money_guessing:true,imported_payment_rows_history_only:true,unknown_outcomes_reconcile_before_retry:true,owner_boundaries_preserved:true},
  next_journey:'24',deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},prototype_only:true
});

if(!exists(j24Spec)) write(j24Spec,`# Journey 24 — ${j24.name} V1\n\nStatus: **current definition stage** after Journey 23 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j24.goal}\n\n## Entry\n\n${j24.entry}\n\n## Exit\n\n${j24.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. It does not approve an export format, portability package, destination, disclosure scope, authentication rule, sharing mechanism, write, or external delivery. Builder must define states, data scope, preview/confirmation, privacy boundaries, cancellation, failure, retry and recovery before creating a candidate; independent Reviewer evidence and explicit human approval are required before any future freeze.\n`);
if(!exists(j24History)) write(j24History,`## Decision history\n\n**Coverage:** Journey 24 initialization only; no candidate UX decisions are approved or inferred.\n\n### J24-D01 — Initialize Journey 24 from the canonical registry\n\n**Decision:** Journey 24 becomes the current definition-stage journey only after Journey 23 is checksum-locked as Golden #23.\n\n**Why:** Preserve sequential authority and prevent portability/export implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting Journey 24 implementation before the J23 freeze is not authorized.\n\n**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J24 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J24 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j24States)) write(j24States,`# Journey 24 — ${j24.name} V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate entry/source scope, data selection, preview, confirmation, progress, completion, cancellation, partial/failed operation, retry, stale/unknown outcomes and recovery before review.\n`);
if(!exists(j24Edges)) write(j24Edges,`# Journey 24 — ${j24.name} V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve empty/oversized/unsupported data, sensitive/private fields, stale or conflicting state, offline/interrupted execution, duplicate/retry/idempotency behavior, external-destination uncertainty, cancellation and safe recovery before review.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||22)+1,updated_on:approvedOn,registered_journeys:28,golden_count:23,current_journey:'24',remaining_overall:5,paused_after_freeze:false,last_approved_journey:'23',last_approved_version:'v1',last_approved_sha256:j23Sha,next_action:`Journey 24 ${j24.name} V1 is current at definition stage. Builder may define and build under the established review protocol; Reviewer remains no-op until exact candidate evidence exists.`,typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'24',name:j24.name,version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j24Spec,decision_history_path:j24History,state_inventory_path:j24States,edge_cases_path:j24Edges,golden_count_before:23,human_approval_required:true,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j24-start.json',{journey:'24',name:j24.name,status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j24.goal,entry:j24.entry,exit:j24.exit,next:j24.next,spec_path:j24Spec,decision_history_path:j24History,state_inventory_path:j24States,edge_cases_path:j24Edges,prototype_built:false,golden_count_before:23,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-14-j23-v1-golden-j24-start.json',{checkpoint:'2026-09-14-j23-v1-golden-j24-start',j23:{status:'golden',version:'v1',golden_number:23,prototype_path:j23Path,prototype_sha256:j23Sha,qa_path:j23QaPath,reviewed_source_head:evidenceHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,human_approval_comment_id:approvalComment,html_change_authorized:false},j24:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j24Spec,decision_history_path:j24History},golden_count:23,remaining_overall:5,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-14-j23-v1-golden-j24-current',purpose:'Materialize explicitly approved Journey 23 Import Data / Group V1 as Golden #23 without changing approved HTML, then advance only to registered Journey 24 definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes canonical only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_23:{version:'v1',golden_number:23,approval:'design-approved',prototype_path:j23Path,prototype_sha256:j23Sha,qa_path:j23QaPath,approval_record:'registry/approvals/23-v1.json',reviewed_source_head:evidenceHead,definition_head:definitionHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',human_approval:true,human_approval_comment_id:approvalComment,html_change_authorized:false},journey_24:{version:'v1',name:j24.name,approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j24Spec},golden_count:23,golden_lock_count:23,golden_manifest:'registry/goldens.manifest.json',current_journey:'24',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J23 approved bytes/checksum and all prior Golden locks must remain exact; resulting 23-Golden/J24-current state must pass the full gate before the generated-state commit lands.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 23 — Import Data / Group V1 is Golden #23. Exact approved HTML SHA-256: `'+j23Sha+'`; the approved HTML was not changed during freeze.\n\nCurrent journey: Journey 24 — '+j24.name+' V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 23 Goldens; 5 remaining.\n\nJourney 23 — Import Data / Group V1 is Golden #23. Exact approved artifact SHA-256: `'+j23Sha+'`. Human approval is issue #38 comment `'+approvalComment+'`; HTML changes after approval are not authorized.\n\nJourney 24 — '+j24.name+' V1 is **current at definition stage**. No J24 candidate or human approval exists.\n\n## Preserve\n\nAll 23 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
}

console.log(`J23 GOLDEN TRANSITION MATERIALIZED: Golden #23 ${j23Sha}; current Journey 24 ${j24.name}; first=${firstTransition}`);
