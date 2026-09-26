# ChatGPT Work Factory — Worker Registry

**Current phase:** Product Schema V1 finalization  
**Effective:** 2026-09-26; no-idle operating revision 2  
**Process authority:** user restart request, followed by: “We need to make sure we don’t repeat idle time mistakes.”  
**Coordination:** issue #50 and `docs/PRODUCT_SCHEMA_V1_ASSEMBLY.json` on `ops/chatgpt-work-factory-v1`.

This registry changes work coordination, not approved product meaning. The old Phase C1 roster remains in Git at `5fae995def5eee931aea9e658f75d04407ea7c98:docs/CHATGPT_FACTORY_WORKER_REGISTRY.md`. Do not revive historical C1/journey generations.

## Goal and exact baseline

Finish the composable Product Schema V1; do not start Gate B, production or another architecture stage. Initial candidate: `research/product-schema-v1@bc7473c8eebd1511b9a92fe3c1e25e2670c29b46`, tree `a5d02c43d8665097269e556e38ae09016c60f887`. Product authority remains `ux/experience-workbench@4ba456e6595330e4ca8e21366e0d827f17e10881` plus the pinned approved overlays/decisions. Read live authorized state rather than treating these initial identifiers as perpetual truth.

Generated closure PASS and green CI are inputs, not independent review or human approval.

## Active finalization roster — unchanged four workers

| Worker | Automation ID | Cadence | Responsibility |
|---|---|---|---|
| Schema Builder | `6aa2d91db2ac8191b810ad770b5bedd1` | hourly `:15` | Sole authorized schema repair writer; also owns read-only test-execution support while review is pending |
| Schema Reviewer | `6aa2d925780481919872270c2a39369b` | hourly `:35` | Independent reconstruction, witness, extraction, supersession and blast-radius review |
| Schema Security | `6aa7bf45969c8191b3939a2de0813595` | hourly `:45` | Independent money, identity, authority, settlement and recovery review |
| Schema Supervisor | `6aa7aedbf3288191a45ecab70d12ed3a` | hourly `:55` | Sole assembly-state owner; consumes evidence, assigns unblockers, consolidates repairs, verifies exact-head acceptance |

No additional workers or faster-than-hourly schedule. Scheduled starts are recovery opportunities, not a limit of one tiny action per invocation. Continue the authorized unit through evidence and handoff whenever the runtime permits. These are ChatGPT runs, not Claude sessions. Other automations remain unchanged.

## Eligibility — no REVIEW_PENDING dead zone

`REVIEW_REQUIRED` and `REVIEW_PENDING` are both actionable for an unfinished Reviewer/Security checkpoint on the exact authorized candidate. An unchanged candidate SHA does not mean an unfinished review is complete. No-op only after the role's assigned unit is complete, a recorded dependency is genuinely pending, another live writer owns the lease, or a human-only hold applies.

Every productive invocation ends with one of:

- a completed exact-head receipt;
- a resumable checkpoint with newly completed case IDs/evidence, explicit remaining cases, next action and owner;
- a concrete blocker with the attempted command/tool error, missing capability, smallest resolution and next owner.

A one-sentence topic note, another baseline rerun without a changed purpose, a refreshed timestamp, or “still pending” is not measurable progress. Never convert partial coverage into CLEAR to meet a deadline.

## Evidence is the handoff; comments are its mirror

Durable role evidence and issue receipts are alternative discovery surfaces, not two mandatory serial approval gates. The Supervisor must inspect the role evidence directories even if issue #50 is missing a comment. A valid exact-head evidence file is consumable immediately at the next Supervisor activation; missing mirrored prose cannot justify another idle cycle.

An actionable receipt identifies role, candidate SHA/tree, finding or case IDs, evidence scope, commands/exit statuses, what was not executed, verdict and next action. A partial file is consumed as partial, never promoted into full review clearance. The Supervisor can mirror it with explicit attribution; it cannot invent the reviewer's verdict.

Each Reviewer/Security run saves evidence and attempts the concise issue handoff in the same invocation. If comment publication fails, persist its body and the actual error beside the evidence, so the Supervisor can finish the mirror. Do not wait for the other reviewer merely to publish a known finding or execution blocker.

## Current unblocker — TEST-SUPPORT-001

**Owner:** existing Schema Builder. **Priority:** next eligible activation while no schema repair is authorized. **Mode:** read-only to the candidate. This work order is authorized by the no-idle process correction; it does not require a final review or schema repair authorization.

Initial exact input is `bc7473c8eebd1511b9a92fe3c1e25e2670c29b46` plus `docs/schema-v1-evidence/<head>/security/SEC-SCHEMA-001-result.json`. That result explicitly says the full regenerated mutant workflow was NOT EXECUTED. The Reviewer has only a partial `reviewer/checkpoint.txt`. The schema branch stays unchanged while this support work executes.

Deliver a reusable disposable-checkout test harness for the documented SEC-SCHEMA-001 context-law/preservation mutations and positive control. Label reconstructed cases as reconstructed; the result JSON is not the original executable harness. Establish a clean baseline, regenerate all outputs after each applicable mutation, and run the full current workflow verification chain. Keep trusted detectors fixed. Report semantic, seal-only and full-chain outcomes separately, including NOT_EXECUTED when applicable. Do not change an invariant to make an attack pass or claim a seal-only catch is a full-suite escape.

Probe actual tools once, use an available local/disposable runtime where possible, and use an existing authorized read-only GitHub Actions runner only if its action/schema actually supports the task. An unchanged baseline rerun does not execute mutations. No credentials, new service, paid compute, new workflow permission, production code or schema candidate write is authorized by this support order.

Allowed durable support writes: only `docs/schema-v1-evidence/<head>/test-support/` on the ops branch plus issue #50. Read-only reviewer work continues on the same immutable SHA. Builder-authored support code/results are not independent acceptance: Reviewer/Security inspect and consume them independently. Schema repair still requires a separate exact-head Supervisor authorization and single-writer lease.

If execution requires a capability not actually available, save the harness and exact invocation plus one concrete capability blocker. Supervisor must assign a feasible existing runner or surface the specific external handoff; do not keep rediscovering the same missing runtime each hour. No automatic privilege expansion or new workers.

Supervisor records this support work order and outcome in assembly state on its next invocation; pending synchronization of that record does not make this explicit support assignment disappear. Stop/reconcile the order if the authorized candidate has changed, the order is already complete, or a newer explicit instruction supersedes it.

## Ownership, leases and checkpoints

Only Supervisor writes the assembly state using current blob SHA/CAS. Only Builder repairs candidate schema after `REPAIR_AUTHORIZED` names exact base, demonstrated finding IDs, allowed paths and acceptance tests. Only one active write lease; re-fetch before writes, stop on CAS loss or unexpected ref movement. Leases protect active writes/tests, not CI or approval waiting: transition to `waiting_ci` with no holder, or `idle/completed`, before ending.

Reviewer/Security mutate only disposable copies. Their durable writes remain in their own ops evidence paths plus #50. They never repair or approve their own changes. The support lane does not write their evidence. Baseline snapshots stay immutable, and final successor clearance must come from both independent roles on the same exact head.

Preserve the frozen Goldens/C1, runtime code, product decisions, strict read-only verification and full evidence denominators. An unexplained seal update or deleted test is not a fix. Claims must distinguish source-backed evidence, actual execution and inference.

## Supervisor decisions — no vague waiting

At each activation choose a concrete safe next action, not merely restate REVIEW_PENDING. Inspect current support/results and all role evidence, consume/mirror usable handoffs immediately, and identify the remaining case or capability preventing authorization. Sufficiently evidenced schema findings may be consolidated for bounded repair without waiting for duplicate paperwork; active review snapshots and the single-writer boundary remain protected. A partial report can authorize test/reproduction support, not final acceptance.

For each open work item record: candidate head, owner, status, last material evidence fingerprint/time, completed and remaining cases, next action, blocking dependency, and eligible activations since last material progress. Count real case/evidence changes, not heartbeat timestamps. Consume the next transition in the same invocation when it belongs to the current role and all prerequisites hold; never impersonate another independent role.

First completed eligible activation with no new evidence: name and assign the blocker. Second completed eligible activation with the same evidence/blocker: escalate once and either switch to a proven existing execution path or mark the task explicitly BLOCKED pending the named external action. Do not leave all roles cyclically waiting. These are activation-based targets, not promises of exact start time or instantaneous cross-role dispatch.

A genuinely queued/running CI job is productive waiting only when bound to a concrete run ID and expected result. Completed failed CI is actionable, not continued waiting. Repeated identical tool failure is a blocked capability, not background progress.

## Acceptance, finalization and stopping

Normal sequence remains independent review → demonstrated bounded repairs → complete verification → independent successor review → exact-head human freeze approval → resulting-state verification → COMPLETE. Test support can run in parallel without changing the review target.

Need both independent Reviewer and Security clearance for the same exact head, no newer blocker, deterministic pinned outputs, and successful Product Schema V1, CI, Coverage, Smoke (Targeted) and E2E Cypress. Preserve limitations: authority-only states are not full executable mappings; 21 required-state rows cover only J05/J06/J08; duplicate evidence is not new behavior. Hashes and finite mutant counts are not universal semantic proof.

Final exact freeze still requires a later human approval; old J26–J28 standing approval does not apply. No automatic Gate B/Product Integrator/production activation. New product semantics, Golden edits, protected merges, force pushes, deployment, spending, signing, secrets and private competitive publication remain forbidden.

At approval handoff or genuinely human-only blocker pause the dependent workers and retain the Supervisor as a silent approval watcher. Internal test-tooling/support work is not automatically a human-only blocker. At COMPLETE/revocation stop all four schema roles. Notify only material blockers/stalls, decisions, exact freeze readiness and completion; no unchanged-status spam. Delivery settings are separate from this policy.

## Roster changes

Read live automation state and canonical phase before changes, reuse existing roles, and record changes here. This revision changes eligibility/handoff rules and assigns support work; worker count, recurring cadence and final approval gates are unchanged. Verification of the configuration is not a claim that the next scheduled work has already executed.
