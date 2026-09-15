import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-15';
const j28Path='journeys/28-failure-recovery/v1-candidate.html';
const j28Sha='7ef254016da0755860fd0ede62840e7668d40406fdac850aad8c5e0ac4d12dfc';
const evidenceHead='8a8c9f4513b7d94b47a683a00d3a3881b94bdb16';
const candidateTree='5ddbe943d5f5f1e8044b1c3d131e509fb636a6d8';
const qaRun='34924953198';
const artifactId='10380150777';
const artifactSha='d246646617d04269600bcc36d200d45314e85a084446a3be269445373f2ca0f2';
const reviewRequest='5674455110';
const reviewReceipt='5674670892';
const approvalRecord='registry/approvals/28-v1.json';
const qaPath='journeys/28-failure-recovery/review-v1/VISUAL_QA.md';

if(!exists(j28Path)||!exists(approvalRecord)||!exists(qaPath)) throw Error('Missing approved J28 bytes, approval record, or QA pointer');
if(digest(j28Path)!==j28Sha) throw Error('Approved J28 HTML bytes changed');
const approval=load(approvalRecord);
if(approval.journey!=='28'||approval.reviewed_source_head!==evidenceHead||approval.candidate_tree!==candidateTree||approval.prototype_sha256!==j28Sha||approval.independent_review_comment_id!==reviewReceipt||approval.review_request_comment_id!==reviewRequest||approval.exact_qa_run!==qaRun||approval.review_artifact_id!==artifactId||approval.review_artifact_sha256!==artifactSha||approval.approval!=='design-approved'||approval.approval_basis!=='standing-human-approval-policy'||approval.standing_approval_derived!==true||approval.freeze_eligible!==true||approval.html_change_authorized!==false||approval.review_evidence?.all_five_review_lenses_clear!==true||approval.review_evidence?.visual_clearance!==true||approval.review_evidence?.caller_reachability_proved!==38) throw Error('J28 standing approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j28=journeys.find(j=>j.id==='28');
if(!j28) throw Error('Missing Journey 28');
const firstFreeze=progress.golden_count===27&&progress.current_journey==='28'&&progress.last_approved_journey==='27';
const alreadyFrozen=progress.golden_count>=28&&progress.last_approved_journey==='28';
if(!firstFreeze&&!alreadyFrozen) throw Error(`Unexpected authority before J28 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j28,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/28-failure-recovery/spec.md',prototype_path:j28Path,prototype_sha256:j28Sha,qa_path:qaPath,golden_number:28,approved_on:approvedOn});
const lock={journey:'28',path:j28Path,sha256:j28Sha};
const lockIndex=locks.findIndex(l=>l.journey==='28');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='28').length!==1) throw Error('Expected exactly one J28 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J28 freeze: ${l.path}`);

Object.assign(approval,{golden_number:28,approval:'design-approved',approved_on:approvedOn,prototype_path:j28Path,prototype_sha256:j28Sha,freeze_eligible:true,freeze_completed:true,frozen_on:approvedOn,next_journey:null});
write(approvalRecord,approval);
write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstFreeze){
  Object.assign(progress,{schema_version:Number(progress.schema_version||27)+1,updated_on:approvedOn,registered_journeys:28,golden_count:28,current_journey:null,remaining_overall:0,paused_after_freeze:true,last_approved_journey:'28',last_approved_version:'v1',last_approved_sha256:j28Sha,next_action:'Journey 28 Golden freeze is materialized. Hold production implementation until exact resulting-state verification completes; after validation, the registered UX journey-production phase is complete and the authorized post-journey strategy gate owns the next phase.',typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'28',name:j28.name,version:'v1',approval:'design-approved',stage:'golden-pending-verification',prototype_built:true,prototype_path:j28Path,prototype_sha256:j28Sha,spec_path:'journeys/28-failure-recovery/spec.md',decision_history_path:'journeys/28-failure-recovery/source/decision-history.md',state_inventory_path:'journeys/28-failure-recovery/STATE_INVENTORY.md',edge_cases_path:'journeys/28-failure-recovery/EDGE_CASES.md',qa_path:qaPath,golden_count_before:27,golden_number:28,human_approval_required:false,human_approval_basis:'standing-human-approval-policy',standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',caller_reachability_required:true,factory_generation:'v1.1',freeze_completed:true,canonical_exact_head_verified:false,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j28-start.json',{journey:'28',name:j28.name,status:'golden-pending-verification',approval:'design-approved',version:'v1',stage:'golden-pending-verification',prototype_built:true,prototype_path:j28Path,prototype_sha256:j28Sha,golden_number:28,approval_record:approvalRecord,independent_review_comment_id:reviewReceipt,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',caller_reachability_required:true,factory_generation:'v1.1',typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-15-j28-v1-golden-closeout.json',{checkpoint:'2026-09-15-j28-v1-golden-closeout',j28:{status:'golden-pending-verification',version:'v1',golden_number:28,prototype_path:j28Path,prototype_sha256:j28Sha,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,approval_basis:'standing-human-approval-policy',approval_record:approvalRecord,html_change_authorized:false},golden_count:28,remaining_overall:0,journey_production_complete_pending_verification:true,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-15-j28-v1-golden-closeout',purpose:'Materialize standing-approved Journey 28 Things Go Wrong / Recovery V1 as Golden #28 without changing approved HTML, then close the registered UX journey-production phase only after resulting-state verification.',canonical_exact_head_verified:false,canonical_exact_head_note:'The final 28-Golden state becomes authoritative only after Prototype workbench, CI, Coverage, Smoke and E2E all pass on the resulting canonical head and exact-head binding is recorded.',journey_28:{version:'v1',golden_number:28,approval:'design-approved',prototype_path:j28Path,prototype_sha256:j28Sha,approval_record:approvalRecord,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass-risk-based',independent_review_comment_id:reviewReceipt,human_approval:true,human_approval_basis:'standing-human-approval-policy',standing_approval_applicable:true,html_change_authorized:false},golden_count:28,golden_lock_count:28,golden_manifest:'registry/goldens.manifest.json',current_journey:'28',all_registered_journeys_golden:true,journey_production_complete_pending_verification:true,all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J28 approved bytes/checksum and all prior Golden locks must remain exact; resulting 28-Golden state must pass Prototype/CI/Coverage/Smoke/E2E and exact-head verification before the UX journey-production phase is declared complete.',prototype_only:true});
  write('registry/ux-phase-complete.json',{registered_journeys:28,golden_count:28,last_journey:'28',status:'pending-exact-head-verification',production_implementation_authorized:false,next_phase:'post-journey-strategy-gate',typography_note:'TYPO-01 deferred'});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 28 — Things Go Wrong / Recovery V1 is Golden #28. Exact approved HTML SHA-256: `'+j28Sha+'`; the approved HTML was not changed during freeze.\n\nAll 28 registered UX journeys are now frozen as Goldens pending final exact resulting-state verification. Production implementation remains held until the authorized post-journey strategy gate completes.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then relevant Golden contracts.\n\n## Current authority\n\n28 registered journeys; 28 standing-approved/frozen Goldens; 0 remaining registered UX journeys.\n\nJourney 28 — Things Go Wrong / Recovery V1 is Golden #28 at exact approved artifact SHA-256 `'+j28Sha+'`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.\n\nThe final 28-Golden state is **pending exact resulting-state verification**. Do not begin production implementation until exact-head verification is true and the authorized post-journey strategy gate completes.\n\n## Preserve\n\nAll 28 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}

console.log(`J28 GOLDEN CLOSEOUT MATERIALIZED: Golden #28 ${j28Sha}; first=${firstFreeze}`);
