import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-15';
const j26Path='journeys/26-group-lifecycle/v1-candidate.html';
const j26Sha='4d93b1b3458aead8d412256f65d0e4c2c2de1b273abc0af58bd89cb56783da28';
const evidenceHead='19b3e3f3c4bfe2c6a8e8412126ef0e38522e705d';
const candidateTree='31ac2d6dae4cf492b7e725dc5f44cd8826490250';
const qaRun='34883066922';
const artifactId='10364375461';
const artifactSha='ef86ff6998ceffd49b91671c039bd14f14a97adc4750585137ea9de157fe134c';
const reviewRequest='5669088701';
const reviewReceipt='5671314248';
const approvalRecord='registry/approvals/26-v1.json';
const factoryGeneration='v1.1';
const qaPath='journeys/26-group-lifecycle/review-v1/VISUAL_QA.md';

if(!exists(j26Path)||!exists(approvalRecord)||!exists(qaPath)) throw Error('Missing approved J26 bytes, approval record, or QA pointer');
if(digest(j26Path)!==j26Sha) throw Error('Approved J26 HTML bytes changed');
const approval=load(approvalRecord);
if(approval.journey!=='26'||approval.reviewed_source_head!==evidenceHead||approval.candidate_tree!==candidateTree||approval.prototype_sha256!==j26Sha||approval.independent_review_comment_id!==reviewReceipt||approval.review_request_comment_id!==reviewRequest||approval.exact_qa_run!==qaRun||approval.review_artifact_id!==artifactId||approval.review_artifact_sha256!==artifactSha||approval.approval!=='design-approved'||approval.approval_basis!=='standing-human-approval-policy'||approval.standing_approval_derived!==true||approval.freeze_eligible!==true||approval.html_change_authorized!==false||approval.review_evidence?.all_five_review_lenses_clear!==true||approval.review_evidence?.visual_clearance!==true||approval.review_evidence?.caller_reachability_proved!==166) throw Error('J26 standing approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j26Index=journeys.findIndex(j=>j.id==='26');
if(j26Index<0) throw Error('Missing Journey 26');
const j26=journeys[j26Index],j27=journeys[j26Index+1];
if(!j27||j27.id!=='27') throw Error('Canonical registry no longer places Journey 27 after Journey 26');
const j27Dir=`journeys/27-${j27.slug}`;
const j27Spec=`${j27Dir}/spec.md`;
const j27History=`${j27Dir}/source/decision-history.md`;
const j27States=`${j27Dir}/STATE_INVENTORY.md`;
const j27Edges=`${j27Dir}/EDGE_CASES.md`;
const firstTransition=progress.golden_count===25&&progress.current_journey==='26'&&progress.last_approved_journey==='26';
const alreadyTransitioned=progress.golden_count>=26&&Number(progress.last_approved_journey)>=26;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J26 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j26,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/26-group-lifecycle/spec.md',prototype_path:j26Path,prototype_sha256:j26Sha,qa_path:qaPath,golden_number:26,approved_on:approvedOn});
if(firstTransition) Object.assign(j27,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j27Spec});
else if(progress.current_journey==='27') j27.status='current';

const lock={journey:'26',path:j26Path,sha256:j26Sha};
const lockIndex=locks.findIndex(l=>l.journey==='26');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='26').length!==1) throw Error('Expected exactly one J26 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J26 freeze: ${l.path}`);

Object.assign(approval,{golden_number:26,approval:'design-approved',approved_on:approvedOn,prototype_path:j26Path,prototype_sha256:j26Sha,freeze_eligible:true,freeze_completed:true,frozen_on:approvedOn,next_journey:'27'});
write(approvalRecord,approval);

if(!exists(j27Spec)) write(j27Spec,`# Journey 27 — ${j27.name} V1\n\nStatus: **current definition stage** after Journey 26 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j27.goal}\n\n## Entry\n\n${j27.entry}\n\n## Exit\n\n${j27.exit}\n\n## Authority\n\nThis is a definition seed from the canonical registry only. Builder must define identity/preferences/security/deletion scope, state ownership, caller reachability, failure/retry/unknown outcomes, and recovery before creating a candidate. No account mutation or deletion behavior is approved by this seed.\n`);
if(!exists(j27History)) write(j27History,`## Decision history\n\n**Coverage:** Journey 27 initialization only; no candidate UX decisions are approved or inferred.\n\n### J27-D01 — Initialize Journey 27 from the canonical registry\n\n**Decision:** Journey 27 becomes the current definition-stage journey only after Journey 26 is checksum-locked as Golden #26 and the resulting canonical state is verified.\n\n**Why:** Preserve sequential authority and prevent account/preferences implementation from outrunning the approved Golden chain.\n\n**Alternatives:** Starting Journey 27 implementation before the J26 freeze is not authorized.\n\n**Tradeoffs:** Definition work waits for exact verification, but authority remains auditable and deterministic.\n\n**Revisit when:** A Builder proposes the first J27 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J27 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j27States)) write(j27States,`# Journey 27 — ${j27.name} V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must enumerate account identity, notification/appearance/security preferences, sign-out and deletion, permission/freshness distinctions, empty/loading/offline/failure/cancellation/partial/unknown outcomes, confirmation, reconciliation, safe retry and recovery before review. Every material candidate state must later be proven reachable from a truthful caller path or explicitly classified as an owner/system boundary.\n`);
if(!exists(j27Edges)) write(j27Edges,`# Journey 27 — ${j27.name} V1 Edge Cases\n\nDefinition-stage seed. No candidate edge behavior is approved yet. Builder must resolve stale identity/session state, conflicting preference changes, security-sensitive mutations, account deletion prerequisites, duplicate/retry/idempotency, cancellation, offline/partial/unknown outcomes, sign-out boundaries and safe recovery before review.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||25)+1,updated_on:approvedOn,registered_journeys:28,golden_count:26,current_journey:'27',remaining_overall:2,paused_after_freeze:false,last_approved_journey:'26',last_approved_version:'v1',last_approved_sha256:j26Sha,next_action:`Journey 27 ${j27.name} V1 is staged at definition pending exact resulting-state verification of the J26 Golden transition. Builder must not write J27 candidate bytes until canonical_exact_head_verified is true.`,typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'27',name:j27.name,version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j27Spec,decision_history_path:j27History,state_inventory_path:j27States,edge_cases_path:j27Edges,golden_count_before:26,human_approval_required:false,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',standing_approval_applicable_on_golden_ready:true,caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j27-start.json',{journey:'27',name:j27.name,status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j27.goal,entry:j27.entry,exit:j27.exit,next:j27.next,spec_path:j27Spec,decision_history_path:j27History,state_inventory_path:j27States,edge_cases_path:j27Edges,prototype_built:false,golden_count_before:26,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-15-j26-v1-golden-j27-start.json',{checkpoint:'2026-09-15-j26-v1-golden-j27-start',j26:{status:'golden',version:'v1',golden_number:26,prototype_path:j26Path,prototype_sha256:j26Sha,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,approval_basis:'standing-human-approval-policy',approval_record:approvalRecord,html_change_authorized:false},j27:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j27Spec,decision_history_path:j27History,caller_reachability_required:true,factory_generation:factoryGeneration},golden_count:26,remaining_overall:2,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-15-j26-v1-golden-j27-current',purpose:'Materialize standing-approved Journey 26 Group Lifecycle V1 as Golden #26 without changing approved HTML, then advance only to registered Journey 27 definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes authoritative only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_26:{version:'v1',golden_number:26,approval:'design-approved',prototype_path:j26Path,prototype_sha256:j26Sha,approval_record:approvalRecord,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass',independent_review_comment_id:reviewReceipt,human_approval:true,human_approval_basis:'standing-human-approval-policy',standing_approval_applicable:true,html_change_authorized:false},journey_27:{version:'v1',name:j27.name,approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j27Spec,caller_reachability_required:true,factory_generation:factoryGeneration,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md'},golden_count:26,golden_lock_count:26,golden_manifest:'registry/goldens.manifest.json',current_journey:'27',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J26 approved bytes/checksum and all prior Golden locks must remain exact; resulting 26-Golden/J27-current state must pass Prototype/CI/Coverage/Smoke/E2E and exact-head verification before J27 becomes Builder-authoritative.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 26 — Group Lifecycle V1 is Golden #26. Exact approved HTML SHA-256: `'+j26Sha+'`; the approved HTML was not changed during freeze.\n\nJourney 27 — '+j27.name+' V1 is staged at definition pending exact transition verification.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 26 Goldens; 2 remaining.\n\nJourney 26 — Group Lifecycle V1 is Golden #26. Exact approved artifact SHA-256: `'+j26Sha+'`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.\n\nJourney 27 — '+j27.name+' V1 is **staged at definition pending exact-head verification**. Canonical factory generation remains `'+factoryGeneration+'`; caller-reachability coverage is required for every material state. Standing approval may apply only after an exact unchanged J27 candidate later reaches independent GOLDEN-READY.\n\n## Preserve\n\nAll 26 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
  write(approvalRecord,approval);
}

console.log(`J26 GOLDEN TRANSITION MATERIALIZED: Golden #26 ${j26Sha}; current Journey 27 ${j27.name}; first=${firstTransition}`);
