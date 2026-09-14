import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-14';
const j25Path='journeys/25-storage-recovery/v1-candidate.html';
const j25Sha='785fd02267b1e47e1bde8513a6c91373ee1ce8dd85b35812201f0af92c77ca3f';
const evidenceHead='94957bce82c8fa551016113280a3d44815897319';
const candidateTree='e8a547824c907fb0506600bf1e9a90dec66a14b2';
const qaRun='34854881557';
const artifactId='10351834318';
const artifactSha='d8d6dcd4340dc46594d4ff592c6731069a54c73859ddc7c0791039623e72e5f5';
const reviewRequest='5665599985';
const reviewReceipt='5665898618';
const approvalComment='5666505408';
const approvalCheckpoint='registry/checkpoints/2026-09-14-j25-v1-human-approved.json';
const factoryGeneration='v1.1';

if(!exists(j25Path)||!exists(approvalCheckpoint)) throw Error('Missing approved J25 bytes or human approval checkpoint');
if(digest(j25Path)!==j25Sha) throw Error('Approved J25 HTML bytes changed');
const human=load(approvalCheckpoint);
if(human.journey!=='25'||human.reviewed_source_head!==evidenceHead||human.candidate_tree!==candidateTree||human.prototype_sha256!==j25Sha||human.review_status!=='GOLDEN-READY'||human.review_request_comment_id!==reviewRequest||human.independent_review_comment_id!==reviewReceipt||human.exact_qa_run!==qaRun||human.evidence_artifact!==artifactId||human.evidence_artifact_sha256!==artifactSha||human.human_approval!=='approved'||human.approval_comment_id!==approvalComment||human.approval_applies_to_exact_bytes_only!==true||human.direct_visual_review!=='pass'||human.html_change_authorized!==false||human.protected_branch_merge_authorized!==false||human.production_deployment_authorized!==false||human.products_devnet_deployment_authorized!==false||human.financial_transaction_authorized!==false) throw Error('J25 exact human approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j25Index=journeys.findIndex(j=>j.id==='25');
if(j25Index<0) throw Error('Missing Journey 25');
const j25=journeys[j25Index],j26=journeys[j25Index+1];
if(!j26||j26.id!=='26') throw Error('Canonical registry no longer places Journey 26 after Journey 25');
const j26Dir=`journeys/26-${j26.slug}`;
const j26Spec=`${j26Dir}/spec.md`;
const j26History=`${j26Dir}/source/decision-history.md`;
const j26States=`${j26Dir}/STATE_INVENTORY.md`;
const j26Edges=`${j26Dir}/EDGE_CASES.md`;
const firstTransition=progress.golden_count===24&&progress.current_journey==='25'&&progress.last_approved_journey==='24';
const alreadyTransitioned=progress.golden_count>=25&&Number(progress.last_approved_journey)>=25;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J25 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j25,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/25-storage-recovery/spec.md',prototype_path:j25Path,prototype_sha256:j25Sha,golden_number:25,approved_on:approvedOn});
if(firstTransition) Object.assign(j26,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j26Spec});
else if(progress.current_journey==='26') j26.status='current';

const lock={journey:'25',path:j25Path,sha256:j25Sha};
const lockIndex=locks.findIndex(l=>l.journey==='25');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='25').length!==1) throw Error('Expected exactly one J25 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J25 freeze: ${l.path}`);

write('registry/approvals/25-v1.json',{
  journey:'25',name:'Storage / Backup / Recovery',version:'v1',golden_number:25,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 25 Storage / Backup / Recovery V1 exact independently GOLDEN-READY evidence plus explicit human approval on issue #38 comment 5666505408',
  reviewed_source_head:evidenceHead,candidate_tree:candidateTree,candidate_branch:'ux/experience-workbench-j25-v1-candidate',review_request_comment_id:reviewRequest,independent_review_comment_id:reviewReceipt,
  exact_qa_run:qaRun,review_artifact_id:artifactId,review_artifact_sha256:artifactSha,ci_run:'34854881769',coverage_run:'34854881688',smoke_run:'34854881715',e2e_run:'34854881812',
  prototype_path:j25Path,prototype_sha256:j25Sha,html_change_authorized:false,human_approval_surface:'issue #38',human_approval_comment_id:approvalComment,
  review_evidence:{registered_states:65,owner_boundary_renders:6,screenshots:142,interaction_checks:124,interaction_checks_passed:124,page_errors:0,console_errors:0,external_runtime_network_requests:0,direct_visual_renders_inspected:142,visual_clearance:true,human_approval:true,caller_reachability_required:true,caller_reachability_proved:71,synthetic_no_live_execution:true},
  approved_policy:{local_working_copy_distinct_from_backup:true,preview_before_restore_mutation:true,secrets_and_executable_authority_excluded:true,external_provider_ownership_explicit:true,identity_ambiguity_preserved:true,unknown_outcomes_reconcile_before_retry:true,checksum_claims_byte_integrity_only:true,newer_current_facts_preserved:true,no_live_storage_or_provider_claim:true},
  next_journey:'26',deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},prototype_only:true
});

if(!exists(j26Spec)) write(j26Spec,`# Journey 26 — ${j26.name} V1\n\nStatus: **current definition stage** after Journey 25 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j26.goal}\n\n## Entry\n\n${j26.entry}\n\n## Exit\n\n${j26.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. Builder must define group-lifecycle states, destructive-action safeguards, ownership boundaries, caller reachability, failure/retry/unknown outcomes and recovery before creating a candidate. No rename/archive/leave/delete behavior is approved by this seed.\n`);
if(!exists(j26History)) write(j26History,`## Decision history\n\n**Coverage:** Journey 26 initialization only; no candidate UX decisions are approved or inferred.\n\n### J26-D01 — Initialize Journey 26 from the canonical registry\n\n**Decision:** Journey 26 becomes the current definition-stage journey only after Journey 25 is checksum-locked as Golden #25.\n\n**Why:** Preserve sequential authority and prevent group-lifecycle implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting Journey 26 implementation before the J25 freeze is not authorized.\n\n**Tradeoffs:** Definition work starts after exact verification, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J26 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J26 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j26States)) write(j26States,`# Journey 26 — ${j26.name} V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate rename/configuration/archive/leave/delete, permission and ownership distinctions, empty/loading/offline/failure/cancellation/partial/unknown outcomes, confirmation, reconciliation, safe retry and recovery before review. Every material candidate state must later be proven reachable from a truthful caller path or explicitly classified as an owner/system boundary.\n`);
if(!exists(j26Edges)) write(j26Edges,`# Journey 26 — ${j26.name} V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve permission changes, owner departure, outstanding balances, archived groups, concurrent edits, destructive deletion, duplicate/retry/idempotency, cancellation, offline/partial/unknown outcomes and safe recovery before review.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||24)+1,updated_on:approvedOn,registered_journeys:28,golden_count:25,current_journey:'26',remaining_overall:3,paused_after_freeze:false,last_approved_journey:'25',last_approved_version:'v1',last_approved_sha256:j25Sha,next_action:`Journey 26 ${j26.name} V1 is current at definition stage. Builder should execute the canonical ${factoryGeneration} factory capabilities, including caller-reachability evidence for every material state; Reviewer remains no-op until exact candidate evidence exists.`,typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'26',name:j26.name,version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j26Spec,decision_history_path:j26History,state_inventory_path:j26States,edge_cases_path:j26Edges,golden_count_before:25,human_approval_required:true,caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j26-start.json',{journey:'26',name:j26.name,status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j26.goal,entry:j26.entry,exit:j26.exit,next:j26.next,spec_path:j26Spec,decision_history_path:j26History,state_inventory_path:j26States,edge_cases_path:j26Edges,prototype_built:false,golden_count_before:25,caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-14-j25-v1-golden-j26-start.json',{checkpoint:'2026-09-14-j25-v1-golden-j26-start',j25:{status:'golden',version:'v1',golden_number:25,prototype_path:j25Path,prototype_sha256:j25Sha,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,human_approval_comment_id:approvalComment,html_change_authorized:false},j26:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j26Spec,decision_history_path:j26History,caller_reachability_required:true,factory_generation:factoryGeneration},golden_count:25,remaining_overall:3,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-14-j25-v1-golden-j26-current',purpose:'Materialize explicitly approved Journey 25 Storage / Backup / Recovery V1 as Golden #25 without changing approved HTML, then advance only to registered Journey 26 definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes canonical only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_25:{version:'v1',golden_number:25,approval:'design-approved',prototype_path:j25Path,prototype_sha256:j25Sha,approval_record:'registry/approvals/25-v1.json',reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',independent_review_comment_id:reviewReceipt,human_approval:true,human_approval_comment_id:approvalComment,html_change_authorized:false},journey_26:{version:'v1',name:j26.name,approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j26Spec,caller_reachability_required:true,factory_generation:factoryGeneration},golden_count:25,golden_lock_count:25,golden_manifest:'registry/goldens.manifest.json',current_journey:'26',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J25 approved bytes/checksum and all prior Golden locks must remain exact; resulting 25-Golden/J26-current state must pass the full gate before the generated-state commit lands.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 25 — Storage / Backup / Recovery V1 is Golden #25. Exact approved HTML SHA-256: `'+j25Sha+'`; the approved HTML was not changed during freeze.\n\nCurrent journey: Journey 26 — '+j26.name+' V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 25 Goldens; 3 remaining.\n\nJourney 25 — Storage / Backup / Recovery V1 is Golden #25. Exact approved artifact SHA-256: `'+j25Sha+'`. Human approval is issue #38 comment `'+approvalComment+'`; HTML changes after approval are not authorized.\n\nJourney 26 — '+j26.name+' V1 is **current at definition stage**. Canonical factory generation remains `'+factoryGeneration+'`; caller-reachability coverage is required for every material state. No J26 candidate or human approval exists.\n\n## Preserve\n\nAll 25 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
}

console.log(`J25 GOLDEN TRANSITION MATERIALIZED: Golden #25 ${j25Sha}; current Journey 26 ${j26.name}; first=${firstTransition}`);
