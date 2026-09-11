import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-11';
const j22Path='journeys/22-qr-flows/v1-candidate.html';
const j22QaPath='journeys/22-qr-flows/review-v1/VISUAL_QA.md';
const j22Sha='3bbab5328a71d42866006c6f48088c06759fd0a3a922ee4a91e6fcd7bb75fe23';
const evidenceHead='a1f60b0255e3f72054e0bf500b5cb559c213679d';
const reviewedParent='7a0cc0c3ec0da62a414c878058a104379697a687';
const qaRun='34625659266';
const artifactId='10273727742';
const artifactSha='787eafecec922b415c417be8fce6a42956b0a6271b760555fb67ed2436ed1760';
const approvalCheckpoint='registry/checkpoints/2026-09-11-j22-v1-human-approved.json';
const j23Dir='journeys/23-import';
const j23Spec=`${j23Dir}/spec.md`;
const j23History=`${j23Dir}/source/decision-history.md`;
const j23States=`${j23Dir}/STATE_INVENTORY.md`;
const j23Edges=`${j23Dir}/EDGE_CASES.md`;

if(!exists(j22Path)||!exists(j22QaPath)||!exists(approvalCheckpoint)) throw Error('Missing approved J22 bytes, canonical QA evidence, or human approval checkpoint');
if(digest(j22Path)!==j22Sha) throw Error('Approved J22 HTML bytes changed');
const human=load(approvalCheckpoint);
if(human.journey!=='22'||human.reviewed_source_head!==evidenceHead||human.reviewed_parent!==reviewedParent||human.prototype_sha256!==j22Sha||human.review_status!=='GOLDEN-READY'||human.independent_review_comment_id!=='5638120649'||human.exact_qa_run!==qaRun||human.evidence_artifact!==artifactId||human.evidence_artifact_sha256!==artifactSha||human.human_approval!=='approved'||human.approval_comment_id!=='5639819516'||human.approval_applies_to_exact_bytes_only!==true||human.html_change_authorized!==false||human.protected_branch_merge_authorized!==false||human.production_deployment_authorized!==false||human.products_devnet_deployment_authorized!==false||human.financial_transaction_authorized!==false) throw Error('J22 exact human approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j22Index=journeys.findIndex(j=>j.id==='22');
if(j22Index<0) throw Error('Missing Journey 22');
const j22=journeys[j22Index],j23=journeys[j22Index+1];
if(!j23||j23.id!=='23'||j23.slug!=='import'||j23.name!=='Import Data / Group') throw Error('Canonical registry order no longer places Journey 23 Import Data / Group after Journey 22');
const firstTransition=progress.golden_count===21&&progress.current_journey==='22'&&progress.last_approved_journey==='21';
const alreadyTransitioned=progress.golden_count>=22&&Number(progress.last_approved_journey)>=22;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J22 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j22,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/22-qr-flows/spec.md',prototype_path:j22Path,prototype_sha256:j22Sha,qa_path:j22QaPath,golden_number:22,approved_on:approvedOn});
if(firstTransition) Object.assign(j23,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j23Spec});
else if(progress.current_journey==='23') j23.status='current';

const lock={journey:'22',path:j22Path,sha256:j22Sha};
const lockIndex=locks.findIndex(l=>l.journey==='22');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='22').length!==1) throw Error('Expected exactly one J22 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J22 freeze: ${l.path}`);

write('registry/approvals/22-v1.json',{
  journey:'22',name:'QR Flows',version:'v1',golden_number:22,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 22 QR Flows V1 exact independently GOLDEN-READY evidence plus explicit human approval on issue #38 comment 5639819516',
  reviewed_source_head:evidenceHead,reviewed_parent:reviewedParent,candidate_branch:'ux/experience-workbench-j22-v1-candidate',
  exact_qa_run:qaRun,review_artifact_id:artifactId,review_artifact_sha256:artifactSha,ci_run:'34625659287',coverage_run:'34625659274',smoke_run:'34625659271',e2e_run:'34625659262',
  prototype_path:j22Path,prototype_sha256:j22Sha,visual_qa_path:j22QaPath,html_change_authorized:false,human_approval_surface:'issue #38',human_approval_comment_id:'5639819516',independent_review_comment_id:'5638120649',
  review_evidence:{registered_states:39,rendered_states_and_boundaries:45,screenshots:90,interaction_paths:56,interaction_paths_passed:56,page_errors:0,console_errors:0,external_runtime_network_requests:0,visual_clearance:true,human_approval:true,synthetic_no_live_execution:true},
  approved_policy:{qr_transport_not_domain_authority:true,no_join_or_payment_execution:true,no_raw_receiving_detail_disclosure:true,no_saved_destination_or_wallet_authority:true,owner_journeys_revalidate_handoffs:true,settlement_context_not_substituted:true,unsafe_payloads_inert:true},
  next_journey:'23',deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},prototype_only:true
});

if(!exists(j23Spec)) write(j23Spec,`# Journey 23 — Import Data / Group V1\n\nStatus: **current definition stage** after Journey 22 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j23.goal}\n\n## Entry\n\n${j23.entry}\n\n## Exit\n\n${j23.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. It does not approve an import format, parser, migration, merge, storage write, group creation, deduplication, conflict policy, or recovery behavior. Builder must define states, source trust, validation, preview/confirmation, duplicate/conflict handling, cancellation and recovery before creating a candidate; independent Reviewer evidence and explicit human approval are required before any future freeze.\n`);
if(!exists(j23History)) write(j23History,`## Decision history\n\n**Coverage:** Journey 23 initialization only; no candidate UX decisions are approved or inferred.\n\n### J23-D01 — Initialize Journey 23 from the canonical registry\n\n**Decision:** Journey 23 becomes the current definition-stage journey only after Journey 22 is checksum-locked as Golden #22.\n\n**Why:** Preserve sequential authority and prevent import implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting import implementation before the J22 freeze is not authorized.\n\n**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J23 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J23 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j23States)) write(j23States,`# Journey 23 — Import Data / Group V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate source selection, parsing/validation, preview, duplicate/conflict handling, confirmation, progress, completion, cancellation, partial/failed import, retry and recovery before review.\n`);
if(!exists(j23Edges)) write(j23Edges,`# Journey 23 — Import Data / Group V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve malformed/unsupported input, untrusted or ambiguous source data, duplicates, conflicting identities/groups/currencies, oversized or partial input, offline/interrupted execution, cancellation, retry/idempotency and safe rollback/recovery before review.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||20)+1,updated_on:approvedOn,registered_journeys:28,golden_count:22,current_journey:'23',remaining_overall:6,paused_after_freeze:false,last_approved_journey:'22',last_approved_version:'v1',last_approved_sha256:j22Sha,next_action:'Journey 23 Import Data / Group V1 is current at definition stage. Builder may define only from the canonical J23 bundle, then build when the established process permits; Reviewer remains no-op until exact candidate evidence exists.',typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'23',name:'Import Data / Group',version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j23Spec,decision_history_path:j23History,state_inventory_path:j23States,edge_cases_path:j23Edges,golden_count_before:22,human_approval_required:true,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j23-start.json',{journey:'23',name:'Import Data / Group',status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j23.goal,entry:j23.entry,exit:j23.exit,next:j23.next,spec_path:j23Spec,decision_history_path:j23History,state_inventory_path:j23States,edge_cases_path:j23Edges,prototype_built:false,golden_count_before:22,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-11-j22-v1-golden-j23-start.json',{checkpoint:'2026-09-11-j22-v1-golden-j23-start',j22:{status:'golden',version:'v1',golden_number:22,prototype_path:j22Path,prototype_sha256:j22Sha,qa_path:j22QaPath,reviewed_source_head:evidenceHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:'5638120649',human_approval_comment_id:'5639819516',html_change_authorized:false},j23:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j23Spec,decision_history_path:j23History},golden_count:22,remaining_overall:6,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-11-j22-v1-golden-j23-current',purpose:'Materialize explicitly approved Journey 22 QR Flows V1 as Golden #22 without changing approved HTML, then advance only to registered Journey 23 Import Data / Group definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes canonical only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_22:{version:'v1',golden_number:22,approval:'design-approved',prototype_path:j22Path,prototype_sha256:j22Sha,qa_path:j22QaPath,approval_record:'registry/approvals/22-v1.json',reviewed_source_head:evidenceHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',human_approval:true,human_approval_comment_id:'5639819516',html_change_authorized:false},journey_23:{version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j23Spec},golden_count:22,golden_lock_count:22,golden_manifest:'registry/goldens.manifest.json',current_journey:'23',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J22 approved bytes/checksum and all prior Golden locks must remain exact; resulting 22-Golden/J23-current state must pass the full gate before the generated-state commit lands.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 22 — QR Flows V1 is Golden #22. Exact approved HTML SHA-256: `'+j22Sha+'`; the approved HTML was not changed during freeze.\n\nCurrent journey: Journey 23 — Import Data / Group V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 22 Goldens; 6 remaining.\n\nJourney 22 — QR Flows V1 is Golden #22. Exact approved artifact SHA-256: `'+j22Sha+'`. Human approval is issue #38 comment `5639819516`; HTML changes after approval are not authorized.\n\nJourney 23 — Import Data / Group V1 is **current at definition stage**. No J23 candidate or human approval exists.\n\n## Preserve\n\nAll 22 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
}

console.log(`J22 GOLDEN TRANSITION MATERIALIZED: Golden #22 ${j22Sha}; current Journey 23; first=${firstTransition}`);
