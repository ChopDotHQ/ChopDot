import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-11';
const j21Path='journeys/21-wallet-crypto/v1-candidate.html';
const j21QaPath='journeys/21-wallet-crypto/review-v1/VISUAL_QA.md';
const j21Sha='28cd4588c80e982cac72a744175e71dc9b2fd338c902d612b1e16a07c669c3b6';
const evidenceHead='02f578af1924c2ac10c9c914ba7c0e9760a5c9bb';
const qaRun='34582530711';
const artifactId='10192244431';
const artifactSha='b30ac6530fe987a11af13fda3291d6ad1fae9917c4151a2c8e483ebbafb8be2c';
const approvalCheckpoint='registry/checkpoints/2026-09-11-j21-v1-human-approved.json';
const j22Dir='journeys/22-qr-flows';
const j22Spec=`${j22Dir}/spec.md`;
const j22History=`${j22Dir}/source/decision-history.md`;
const j22States=`${j22Dir}/STATE_INVENTORY.md`;
const j22Edges=`${j22Dir}/EDGE_CASES.md`;

if(!exists(j21Path)||!exists(j21QaPath)||!exists(approvalCheckpoint)) throw Error('Missing approved J21 bytes, canonical QA evidence, or approval checkpoint');
if(digest(j21Path)!==j21Sha) throw Error('Approved J21 HTML bytes changed');
const human=load(approvalCheckpoint);
if(human.journey!=='21'||human.reviewed_source_head!==evidenceHead||human.prototype_sha256!==j21Sha||human.review_status!=='GOLDEN-READY'||human.exact_qa_run!==qaRun||human.evidence_artifact!==artifactId||human.evidence_artifact_sha256!==artifactSha||human.human_approval!=='approved'||human.approval_comment_id!=='5634082954'||human.approval_applies_to_exact_bytes_only!==true||human.html_change_authorized!==false||human.protected_branch_merge_authorized!==false||human.deployment_authorized!==false) throw Error('J21 exact human approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j21=journeys.find(j=>j.id==='21'),j22=journeys.find(j=>j.id==='22');
if(!j21||!j22) throw Error('Missing Journey 21 or registered Journey 22');
const firstTransition=progress.golden_count===20&&progress.current_journey==='21'&&progress.last_approved_journey==='20';
const alreadyTransitioned=progress.golden_count>=21&&Number(progress.last_approved_journey)>=21;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J21 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j21,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/21-wallet-crypto/spec.md',prototype_path:j21Path,prototype_sha256:j21Sha,qa_path:j21QaPath,golden_number:21,approved_on:approvedOn});
if(firstTransition) Object.assign(j22,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j22Spec});
else j22.status='current';

const lock={journey:'21',path:j21Path,sha256:j21Sha};
const lockIndex=locks.findIndex(l=>l.journey==='21');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='21').length!==1) throw Error('Expected exactly one J21 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J21 freeze: ${l.path}`);

write('registry/approvals/21-v1.json',{
  journey:'21',name:'Wallet & Crypto',version:'v1',golden_number:21,approval:'design-approved',approved_on:approvedOn,
  reviewed_source:'Journey 21 Wallet & Crypto V1 exact independently cleared evidence plus explicit human approval on issue #38 comment 5634082954',
  reviewed_source_head:evidenceHead,product_candidate_parent:'33d8bc7be1dd266117623baaf6bc36c76f4bcb6f',candidate_branch:'ux/experience-workbench-j21-v1-candidate',
  exact_qa_run:qaRun,review_artifact_id:artifactId,review_artifact_sha256:artifactSha,e2e_run:'34582530761',
  prototype_path:j21Path,prototype_sha256:j21Sha,visual_qa_path:j21QaPath,html_change_authorized:false,human_approval_surface:'issue #38',human_approval_comment_id:'5634082954',
  review_evidence:{states:47,screenshots:94,interaction_paths:34,page_errors:0,console_errors:0,external_runtime_network_requests:0,visual_clearance:true,human_approval:true,synthetic_no_real_wallet:true},
  approved_policy:{wallet_execution_downstream_of_product_authority:true,connected_wallet_not_saved_receiving_destination:true,connected_wallet_not_public_profile_field:true,exact_account_network_revalidated_at_signing:true,signature_submission_finality_distinct_recoverable_states:true},
  next_journey:'22',deferred_note:{id:'TYPO-01',status:'deferred',change_now:false,note:'Shared typography/readability remains deferred.'},prototype_only:true
});

if(!exists(j22Spec)) write(j22Spec,`# Journey 22 — QR Flows V1\n\nStatus: **current definition stage** after Journey 21 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j22.goal}\n\n## Entry\n\n${j22.entry}\n\n## Exit\n\n${j22.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. It does not approve QR UX, payment authority, identity resolution, joining, receiving, or payment execution. Builder must define states and edge cases before creating a candidate; Reviewer evidence and explicit human approval are required before any future freeze.\n`);
if(!exists(j22History)) write(j22History,`## Decision history\n\n**Coverage:** Journey 22 initialization only; no candidate UX decisions are approved or inferred.\n\n### J22-D01 — Initialize Journey 22 from the canonical registry\n\n**Decision:** Journey 22 becomes the current definition-stage journey only after Journey 21 is checksum-locked as Golden #21.\n\n**Why:** Preserve sequential authority and prevent candidate implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting QR implementation before the J21 freeze was not authorized.\n\n**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J22 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J22 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j22States)) write(j22States,`# Journey 22 — QR Flows V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate scan, identify, join, receive and pay states plus loading, permission, invalid/expired QR, offline, cancellation, retry and recovery behavior before review.\n`);
if(!exists(j22Edges)) write(j22Edges,`# Journey 22 — QR Flows V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve authority and recovery for malformed/expired QR, wrong target, wrong account/group/payment context, camera denial, offline/network failure, duplicate scans, unsafe external payloads, cancellation and post-action return paths.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:18,updated_on:approvedOn,registered_journeys:28,golden_count:21,current_journey:'22',remaining_overall:7,paused_after_freeze:false,last_approved_journey:'21',last_approved_version:'v1',last_approved_sha256:j21Sha,next_action:'Journey 22 QR Flows V1 is current at definition stage. Builder may define and build only from the canonical J22 bundle; Reviewer remains no-op until exact candidate evidence exists.',typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'22',name:'QR Flows',version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j22Spec,decision_history_path:j22History,state_inventory_path:j22States,edge_cases_path:j22Edges,golden_count_before:21,human_approval_required:true,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j22-start.json',{journey:'22',name:'QR Flows',status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j22.goal,entry:j22.entry,exit:j22.exit,next:j22.next,spec_path:j22Spec,decision_history_path:j22History,state_inventory_path:j22States,edge_cases_path:j22Edges,prototype_built:false,golden_count_before:21,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-11-j21-v1-golden-j22-start.json',{checkpoint:'2026-09-11-j21-v1-golden-j22-start',j21:{status:'golden',version:'v1',golden_number:21,prototype_path:j21Path,prototype_sha256:j21Sha,qa_path:j21QaPath,reviewed_source_head:evidenceHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,human_approval_comment_id:'5634082954',html_change_authorized:false},j22:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j22Spec,decision_history_path:j22History},golden_count:21,remaining_overall:7,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-11-j21-v1-golden-j22-current',purpose:'Materialize explicitly approved Journey 21 Wallet & Crypto V1 as Golden #21 without changing approved HTML, then advance only to registered Journey 22 QR Flows definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes canonical only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_21:{version:'v1',golden_number:21,approval:'design-approved',prototype_path:j21Path,prototype_sha256:j21Sha,qa_path:j21QaPath,approval_record:'registry/approvals/21-v1.json',reviewed_source_head:evidenceHead,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',human_approval:true,human_approval_comment_id:'5634082954',html_change_authorized:false},journey_22:{version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j22Spec},golden_count:21,golden_lock_count:21,golden_manifest:'registry/goldens.manifest.json',current_journey:'22',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J21 approved bytes/checksum and all prior Golden locks must remain exact; resulting 21-Golden/J22-current state must pass the full gate before the generated-state commit lands.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 21 — Wallet & Crypto V1 is Golden #21. Exact approved HTML SHA-256: `'+j21Sha+'`; the approved HTML was not changed during freeze.\n\nCurrent journey: Journey 22 — QR Flows V1 definition. No review candidate exists yet.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 21 Goldens; 7 remaining.\n\nJourney 21 — Wallet & Crypto V1 is Golden #21. Exact approved artifact SHA-256: `'+j21Sha+'`. Human approval is issue #38 comment `5634082954`; HTML changes after approval are not authorized.\n\nJourney 22 — QR Flows V1 is **current at definition stage**. No J22 candidate or human approval exists.\n\n## Preserve\n\nAll 21 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  // Historical replay reconstructs registries. Reapply exact frozen authority without clobbering live J22 candidate overlays.
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
}

console.log(`J21 GOLDEN TRANSITION MATERIALIZED: Golden #21 ${j21Sha}; current Journey 22; first=${firstTransition}`);
