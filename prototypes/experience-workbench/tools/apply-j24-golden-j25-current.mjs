import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-14';
const j24Path='journeys/24-export-portability/v1-candidate.html';
const j24Sha='03d1c2094251dc3ec683108c484bdc84e6f7db08b1c40ce042535a2d186a9b82';
const evidenceHead='186564690c4bd41308cc4bbf6609263ebf225f42';
const candidateTree='c45010b4b6739924000ac86e6986836797c78a7a';
const qaRun='34835604357';
const artifactId='10343014765';
const artifactSha='7b5173c48a8f8b3588b6d2af55f8cc093a4b3d4e48010a36f42a7f2974749531';
const reviewRequest='5662926793';
const reviewReceipt='5663139837';
const approvalComment='5663800809';
const approvalCheckpoint='registry/checkpoints/2026-09-14-j24-v1-human-approved.json';

if(!exists(j24Path)||!exists(approvalCheckpoint)) throw Error('Missing approved J24 bytes or human approval checkpoint');
if(digest(j24Path)!==j24Sha) throw Error('Approved J24 HTML bytes changed');
const human=load(approvalCheckpoint);
if(human.journey!=='24'||human.reviewed_source_head!==evidenceHead||human.candidate_tree!==candidateTree||human.prototype_sha256!==j24Sha||human.review_status!=='GOLDEN-READY'||human.review_request_comment_id!==reviewRequest||human.independent_review_comment_id!==reviewReceipt||human.exact_qa_run!==qaRun||human.evidence_artifact!==artifactId||human.evidence_artifact_sha256!==artifactSha||human.human_approval!=='approved'||human.approval_comment_id!==approvalComment||human.approval_applies_to_exact_bytes_only!==true||human.direct_visual_review!=='pass'||human.html_change_authorized!==false||human.protected_branch_merge_authorized!==false||human.production_deployment_authorized!==false||human.products_devnet_deployment_authorized!==false||human.financial_transaction_authorized!==false) throw Error('J24 exact human approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j24Index=journeys.findIndex(j=>j.id==='24');
if(j24Index<0) throw Error('Missing Journey 24');
const j24=journeys[j24Index],j25=journeys[j24Index+1];
if(!j25||j25.id!=='25') throw Error('Canonical registry no longer places Journey 25 after Journey 24');
const j25Dir=`journeys/25-${j25.slug}`;
const j25Spec=`${j25Dir}/spec.md`;
const j25History=`${j25Dir}/source/decision-history.md`;
const j25States=`${j25Dir}/STATE_INVENTORY.md`;
const j25Edges=`${j25Dir}/EDGE_CASES.md`;
const firstTransition=progress.golden_count===23&&progress.current_journey==='24'&&progress.last_approved_journey==='23';
const alreadyTransitioned=progress.golden_count>=24&&Number(progress.last_approved_journey)>=24;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J24 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j24,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/24-export-portability/spec.md',prototype_path:j24Path,prototype_sha256:j24Sha,golden_number:24,approved_on:approvedOn});
if(firstTransition) Object.assign(j25,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j25Spec});
else if(progress.current_journey==='25') j25.status='current';

const lock={journey:'24',path:j24Path,sha256:j24Sha};
const lockIndex=locks.findIndex(l=>l.journey==='24');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='24').length!==1) throw Error('Expected exactly one J24 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J24 freeze: ${l.path}`);

write('registry/approvals/24-v1.json',{
  journey:'24',name:'Export / Portability',version:'v1',golden_number:24,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 24 Export / Portability V1 exact independently GOLDEN-READY evidence plus explicit human approval on issue #38 comment 5663800809',
  reviewed_source_head:evidenceHead,candidate_tree:candidateTree,candidate_branch:'ux/experience-workbench-j24-v1-candidate',review_request_comment_id:reviewRequest,independent_review_comment_id:reviewReceipt,
  exact_qa_run:qaRun,review_artifact_id:artifactId,review_artifact_sha256:artifactSha,ci_run:'34835604360',coverage_run:'34835604373',smoke_run:'34835604355',e2e_run:'34835604292',
  prototype_path:j24Path,prototype_sha256:j24Sha,html_change_authorized:false,human_approval_surface:'issue #38',human_approval_comment_id:approvalComment,
  review_evidence:{registered_states:45,owner_boundary_renders:3,screenshots:108,interaction_checks:138,interaction_checks_passed:138,page_errors:0,console_errors:0,external_runtime_network_requests:0,direct_visual_renders_inspected:108,visual_clearance:true,human_approval:true,caller_reachability_required:true,synthetic_no_live_execution:true},
  approved_policy:{account_and_group_scope_explicit:true,preview_before_artifact_effect:true,secrets_and_signing_material_excluded:true,broad_raw_receiving_details_excluded:true,identity_ambiguity_preserved:true,payment_and_wallet_records_history_only:true,package_creation_distinct_from_delivery:true,unknown_outcomes_reconcile_before_retry:true,checksum_claims_byte_integrity_only:true},
  next_journey:'25',deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},prototype_only:true
});

if(!exists(j25Spec)) write(j25Spec,`# Journey 25 — ${j25.name} V1\n\nStatus: **current definition stage** after Journey 24 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j25.goal}\n\n## Entry\n\n${j25.entry}\n\n## Exit\n\n${j25.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. It does not approve a storage provider, backup format, sync model, encryption/custody mechanism, recovery authority, remote write, retention policy or deletion policy. Builder must define states, ownership boundaries, truthful caller reachability, failure/retry/unknown outcomes and recovery before creating a candidate; independent Reviewer evidence and explicit human approval are required before any future freeze.\n`);
if(!exists(j25History)) write(j25History,`## Decision history\n\n**Coverage:** Journey 25 initialization only; no candidate UX decisions are approved or inferred.\n\n### J25-D01 — Initialize Journey 25 from the canonical registry\n\n**Decision:** Journey 25 becomes the current definition-stage journey only after Journey 24 is checksum-locked as Golden #24.\n\n**Why:** Preserve sequential authority and prevent storage/recovery implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting Journey 25 implementation before the J24 freeze is not authorized.\n\n**Tradeoffs:** Definition work starts after exact verification, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J25 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J25 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j25States)) write(j25States,`# Journey 25 — ${j25.name} V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate storage/backup choices, truthful scope/ownership, preview/confirmation, progress, success, empty/offline/failure/cancellation/partial/unknown outcomes, reconciliation, safe retry and recovery before review. Every material candidate state must later be proven reachable from a truthful caller path or explicitly classified as an owner/system boundary.\n`);
if(!exists(j25Edges)) write(j25Edges,`# Journey 25 — ${j25.name} V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve unavailable or stale storage, partial/unknown writes, duplicate/retry/idempotency, version conflicts, lost access, account/device changes, encryption/custody boundaries, cancellation, restore ambiguity and safe recovery before review.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||23)+1,updated_on:approvedOn,registered_journeys:28,golden_count:24,current_journey:'25',remaining_overall:4,paused_after_freeze:false,last_approved_journey:'24',last_approved_version:'v1',last_approved_sha256:j24Sha,next_action:`Journey 25 ${j25.name} V1 is current at definition stage. Builder should execute Factory v1.1 with a compressed current-work packet and caller-reachability evidence for every material state; Reviewer remains no-op until exact candidate evidence exists.`,typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'25',name:j25.name,version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j25Spec,decision_history_path:j25History,state_inventory_path:j25States,edge_cases_path:j25Edges,golden_count_before:24,human_approval_required:true,caller_reachability_required:true,factory_generation:'v1.1',typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j25-start.json',{journey:'25',name:j25.name,status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j25.goal,entry:j25.entry,exit:j25.exit,next:j25.next,spec_path:j25Spec,decision_history_path:j25History,state_inventory_path:j25States,edge_cases_path:j25Edges,prototype_built:false,golden_count_before:24,caller_reachability_required:true,factory_generation:'v1.1',typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-14-j24-v1-golden-j25-start.json',{checkpoint:'2026-09-14-j24-v1-golden-j25-start',j24:{status:'golden',version:'v1',golden_number:24,prototype_path:j24Path,prototype_sha256:j24Sha,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,human_approval_comment_id:approvalComment,html_change_authorized:false},j25:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j25Spec,decision_history_path:j25History,caller_reachability_required:true,factory_generation:'v1.1'},golden_count:24,remaining_overall:4,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-14-j24-v1-golden-j25-current',purpose:'Materialize explicitly approved Journey 24 Export / Portability V1 as Golden #24 without changing approved HTML, then advance only to registered Journey 25 definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes canonical only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_24:{version:'v1',golden_number:24,approval:'design-approved',prototype_path:j24Path,prototype_sha256:j24Sha,approval_record:'registry/approvals/24-v1.json',reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',human_approval:true,human_approval_comment_id:approvalComment,html_change_authorized:false},journey_25:{version:'v1',name:j25.name,approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j25Spec,caller_reachability_required:true,factory_generation:'v1.1'},golden_count:24,golden_lock_count:24,golden_manifest:'registry/goldens.manifest.json',current_journey:'25',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J24 approved bytes/checksum and all prior Golden locks must remain exact; resulting 24-Golden/J25-current state must pass the full gate before the generated-state commit lands.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 24 — Export / Portability V1 is Golden #24. Exact approved HTML SHA-256: `'+j24Sha+'`; the approved HTML was not changed during freeze.\n\nCurrent journey: Journey 25 — '+j25.name+' V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 24 Goldens; 4 remaining.\n\nJourney 24 — Export / Portability V1 is Golden #24. Exact approved artifact SHA-256: `'+j24Sha+'`. Human approval is issue #38 comment `'+approvalComment+'`; HTML changes after approval are not authorized.\n\nJourney 25 — '+j25.name+' V1 is **current at definition stage**. Factory v1.1 requires a compressed current-work packet and truthful caller-reachability coverage for every material state. No J25 candidate or human approval exists.\n\n## Preserve\n\nAll 24 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
}

console.log(`J24 GOLDEN TRANSITION MATERIALIZED: Golden #24 ${j24Sha}; current Journey 25 ${j25.name}; first=${firstTransition}`);
