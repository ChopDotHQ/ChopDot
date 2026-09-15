import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));

const approvedOn='2026-09-15';
const j27Path='journeys/27-account-preferences/v1-candidate.html';
const j27Sha='64b730ee19a8713826868af6ca4b39b33d0c48c128b2fce2e90c7beec1dfa560';
const evidenceHead='3ddb9f517526f2b7a9e417a5143ff1b2f54580be';
const candidateTree='4a0c2b8f0f449f9b6193b48697e388f1a9c2d091';
const qaRun='34912299281';
const artifactId='10374564676';
const artifactSha='c3a2d9b955bda1e641c70efd9cff1da10617f4284628397290753b02b99a5e9a';
const reviewRequest='5672772172';
const reviewReceipt='5672987078';
const approvalRecord='registry/approvals/27-v1.json';
const factoryGeneration='v1.1';
const qaPath='journeys/27-account-preferences/review-v1/VISUAL_QA.md';

if(!exists(j27Path)||!exists(approvalRecord)||!exists(qaPath)) throw Error('Missing approved J27 bytes, approval record, or QA pointer');
if(digest(j27Path)!==j27Sha) throw Error('Approved J27 HTML bytes changed');
const approval=load(approvalRecord);
if(approval.journey!=='27'||approval.reviewed_source_head!==evidenceHead||approval.candidate_tree!==candidateTree||approval.prototype_sha256!==j27Sha||approval.independent_review_comment_id!==reviewReceipt||approval.review_request_comment_id!==reviewRequest||approval.exact_qa_run!==qaRun||approval.review_artifact_id!==artifactId||approval.review_artifact_sha256!==artifactSha||approval.approval!=='design-approved'||approval.approval_basis!=='standing-human-approval-policy'||approval.standing_approval_derived!==true||approval.freeze_eligible!==true||approval.html_change_authorized!==false||approval.review_evidence?.all_five_review_lenses_clear!==true||approval.review_evidence?.visual_clearance!==true||approval.review_evidence?.caller_reachability_proved!==67) throw Error('J27 standing approval evidence changed or incomplete');

const journeys=load('registry/journeys.json');
const locks=load('registry/golden-artifact-locks.json');
const progress=load('registry/progress.json');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Existing Golden changed: ${l.path}`);
const j27Index=journeys.findIndex(j=>j.id==='27');
if(j27Index<0) throw Error('Missing Journey 27');
const j27=journeys[j27Index],j28=journeys[j27Index+1];
if(!j28||j28.id!=='28') throw Error('Canonical registry no longer places Journey 28 after Journey 27');
const j28Dir=`journeys/28-${j28.slug}`;
const j28Spec=`${j28Dir}/spec.md`;
const j28History=`${j28Dir}/source/decision-history.md`;
const j28States=`${j28Dir}/STATE_INVENTORY.md`;
const j28Edges=`${j28Dir}/EDGE_CASES.md`;
const firstTransition=progress.golden_count===26&&progress.current_journey==='27'&&progress.last_approved_journey==='26';
const alreadyTransitioned=progress.golden_count>=27&&Number(progress.last_approved_journey)>=27;
if(!firstTransition&&!alreadyTransitioned) throw Error(`Unexpected authority before J27 freeze: goldens=${progress.golden_count} current=${progress.current_journey} last=${progress.last_approved_journey}`);

Object.assign(j27,{status:'golden',approval:'design-approved',version:'v1',spec_path:'journeys/27-account-preferences/spec.md',prototype_path:j27Path,prototype_sha256:j27Sha,qa_path:qaPath,golden_number:27,approved_on:approvedOn});
if(firstTransition) Object.assign(j28,{status:'current',approval:'not-reviewed',version:'v1',spec_path:j28Spec});
else if(progress.current_journey==='28') j28.status='current';

const lock={journey:'27',path:j27Path,sha256:j27Sha};
const lockIndex=locks.findIndex(l=>l.journey==='27');
if(lockIndex<0) locks.push(lock); else locks[lockIndex]=lock;
if(locks.filter(l=>l.journey==='27').length!==1) throw Error('Expected exactly one J27 Golden lock');
for(const l of locks) if(digest(l.path)!==l.sha256) throw Error(`Golden mismatch after J27 freeze: ${l.path}`);

Object.assign(approval,{golden_number:27,approval:'design-approved',approved_on:approvedOn,prototype_path:j27Path,prototype_sha256:j27Sha,freeze_eligible:true,freeze_completed:true,frozen_on:approvedOn,next_journey:'28'});
write(approvalRecord,approval);

if(!exists(j28Spec)) write(j28Spec,`# Journey 28 — ${j28.name} V1\n\nStatus: **current definition stage** after Journey 27 Golden freeze. Prototype not built yet.\n\n## Goal\n\n${j28.goal}\n\n## Entry\n\n${j28.entry}\n\n## Exit\n\n${j28.exit}\n\n## Authority\n\nJourney 28 is the registered cross-cutting recovery closeout. Builder must define the shared failure, conflict, stale/unknown-result, cancellation, retry, reconciliation and explicit-stop patterns that remain material across the validated Golden set. It must not silently redesign prior Golden product meaning. Every material state must be caller-reachable or explicitly classified as an owner/system boundary.\n`);
if(!exists(j28History)) write(j28History,`## Decision history\n\n**Coverage:** Journey 28 initialization only; no candidate UX decisions are approved or inferred.\n\n### J28-D01 — Initialize the registered cross-cutting recovery journey\n\n**Decision:** Journey 28 becomes current only after Journey 27 is checksum-locked as Golden #27 and the resulting canonical state is verified.\n\n**Why:** The final registered journey must reconcile failure/recovery patterns against the validated Golden set without reopening approved product meaning.\n\n**Alternatives:** Starting J28 candidate work before the J27 transition verifies is not authorized.\n\n**Tradeoffs:** Closeout waits for exact verification, preserving sequential authority and auditability.\n\n**Revisit when:** A Builder proposes the first J28 candidate or the canonical registry is explicitly revised.\n\n**Approval / version:** Process initialization only; J28 V1 remains unapproved.\n\n**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).\n`);
if(!exists(j28States)) write(j28States,`# Journey 28 — ${j28.name} V1 State Inventory\n\nDefinition-stage seed. No candidate states are approved yet. Builder must inventory only material cross-cutting failure/recovery states that remain necessary across the validated Golden set, including stale/conflict/unknown-result/offline/partial/cancellation/retry/reconciliation/explicit-stop boundaries. Every material candidate state must be proven reachable from truthful callers or explicitly classified as an owner/system boundary.\n`);
if(!exists(j28Edges)) write(j28Edges,`# Journey 28 — ${j28.name} V1 Edge Cases\n\nDefinition-stage seed. Builder must reconcile duplicate/retry/idempotency, offline and partial outcomes, stale authority, conflicting state, cancellation, unknown execution results, same-operation reconciliation and safe explicit-stop behavior without weakening or silently changing prior Golden contracts.\n`);

write('registry/journeys.json',journeys);
write('registry/golden-artifact-locks.json',locks);

if(firstTransition){
  Object.assign(progress,{schema_version:Number(progress.schema_version||26)+1,updated_on:approvedOn,registered_journeys:28,golden_count:27,current_journey:'28',remaining_overall:1,paused_after_freeze:false,last_approved_journey:'27',last_approved_version:'v1',last_approved_sha256:j27Sha,next_action:`Journey 28 ${j28.name} V1 is staged at definition pending exact resulting-state verification of the J27 Golden transition. Builder must not write J28 candidate bytes until canonical_exact_head_verified is true.`,typography_note:'TYPO-01 deferred'});
  write('registry/progress.json',progress);
  write('registry/active-candidate.json',{journey:'28',name:j28.name,version:'v1',approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j28Spec,decision_history_path:j28History,state_inventory_path:j28States,edge_cases_path:j28Edges,golden_count_before:27,human_approval_required:false,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',standing_approval_applicable_on_golden_ready:true,caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred',prototype_only:true});
  write('registry/j28-start.json',{journey:'28',name:j28.name,status:'current',approval:'not-reviewed',version:'v1',stage:'definition',goal:j28.goal,entry:j28.entry,exit:j28.exit,next:j28.next,spec_path:j28Spec,decision_history_path:j28History,state_inventory_path:j28States,edge_cases_path:j28Edges,prototype_built:false,golden_count_before:27,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md',caller_reachability_required:true,factory_generation:factoryGeneration,typography_note:'TYPO-01 deferred'});
  write('registry/checkpoints/2026-09-15-j27-v1-golden-j28-start.json',{checkpoint:'2026-09-15-j27-v1-golden-j28-start',j27:{status:'golden',version:'v1',golden_number:27,prototype_path:j27Path,prototype_sha256:j27Sha,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,independent_review_comment_id:reviewReceipt,approval_basis:'standing-human-approval-policy',approval_record:approvalRecord,html_change_authorized:false},j28:{status:'current',version:'v1',stage:'definition',prototype_built:false,spec_path:j28Spec,decision_history_path:j28History,caller_reachability_required:true,factory_generation:factoryGeneration},golden_count:27,remaining_overall:1,typography_note:'TYPO-01 deferred'});
  write('registry/exact-head-gate.json',{checkpoint:'2026-09-15-j27-v1-golden-j28-current',purpose:'Materialize standing-approved Journey 27 Account & Preferences V1 as Golden #27 without changing approved HTML, then advance only to registered Journey 28 definition.',canonical_exact_head_verified:false,canonical_exact_head_note:'This transition becomes authoritative only through the Prototype workbench gate generated-state commit after all resulting-state validations pass.',journey_27:{version:'v1',golden_number:27,approval:'design-approved',prototype_path:j27Path,prototype_sha256:j27Sha,approval_record:approvalRecord,reviewed_source_head:evidenceHead,candidate_tree:candidateTree,exact_qa_run:qaRun,evidence_artifact:artifactId,evidence_artifact_sha256:artifactSha,direct_visual_review:'pass-risk-based',independent_review_comment_id:reviewReceipt,human_approval:true,human_approval_basis:'standing-human-approval-policy',standing_approval_applicable:true,html_change_authorized:false},journey_28:{version:'v1',name:j28.name,approval:'not-reviewed',stage:'definition',prototype_built:false,spec_path:j28Spec,caller_reachability_required:true,factory_generation:factoryGeneration,standing_approval_policy:'docs/CHATGPT_FACTORY_APPROVAL_POLICY.md'},golden_count:27,golden_lock_count:27,golden_manifest:'registry/goldens.manifest.json',current_journey:'28',all_prior_golden_artifacts_preserved:true,typography_note:'TYPO-01 deferred',gate_requirement:'J27 approved bytes/checksum and all prior Golden locks must remain exact; resulting 27-Golden/J28-current state must pass Prototype/CI/Coverage/Smoke/E2E and exact-head verification before J28 becomes Builder-authoritative.',prototype_only:true});
  write('GOLDEN_SCREENS.md','# ChopDot Golden Screens & Journeys\n\n'+journeys.filter(j=>j.status==='golden').sort((a,b)=>Number(a.golden_number)-Number(b.golden_number)).map(j=>`${j.golden_number}. ${j.name} — ${j.version} · Design Approved`).join('\n')+'\n\nJourney 27 — Account & Preferences V1 is Golden #27. Exact approved HTML SHA-256: `'+j27Sha+'`; the approved HTML was not changed during freeze.\n\nJourney 28 — '+j28.name+' V1 is staged at definition pending exact transition verification.\n\nTYPO-01 remains deferred.\n');
  write('START_HERE.md','# ChopDot Experience Workbench — Start Here\n\nAlways read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.\n\n## Shared process\n\nRead `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.\n\n## Current authority\n\n28 registered journeys; 27 Goldens; 1 remaining.\n\nJourney 27 — Account & Preferences V1 is Golden #27. Exact approved artifact SHA-256: `'+j27Sha+'`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.\n\nJourney 28 — '+j28.name+' V1 is **staged at definition pending exact-head verification**. Canonical factory generation remains `'+factoryGeneration+'`; caller-reachability coverage is required for every material state. Standing approval may apply only after an exact unchanged J28 candidate later reaches independent GOLDEN-READY.\n\n## Preserve\n\nAll 27 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.\n');
}else{
  write('registry/journeys.json',journeys);
  write('registry/golden-artifact-locks.json',locks);
  write(approvalRecord,approval);
}

console.log(`J27 GOLDEN TRANSITION MATERIALIZED: Golden #27 ${j27Sha}; current Journey 28 ${j28.name}; first=${firstTransition}`);
