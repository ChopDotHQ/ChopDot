# ChatGPT Work Factory — Worker Registry

**Current phase:** Product Schema V1 finalization  
**Effective:** 2026-09-26  
**Authority for this process change:** user request to restart the scheduled assembly line to finish Product Schema V1; coordination issue **#50**.  
**Current task state:** `docs/PRODUCT_SCHEMA_V1_ASSEMBLY.json` on `ops/chatgpt-work-factory-v1`.

This current-phase roster supersedes the old Phase C1 hold-watcher topology. It changes scheduled work ownership, not approved product meaning. The complete prior phase registry is preserved in Git at `5fae995def5eee931aea9e658f75d04407ea7c98:docs/CHATGPT_FACTORY_WORKER_REGISTRY.md` (blob `405bd65ef3ed88ccb2f017dd06de88a6a4ec7f48`). Do not reactivate historical journey/Phase C1 jobs merely because they appear in that version.

## Goal and starting point

Finish the composable **Product Schema V1**, not Gate B or production implementation. Start with independent review of:

`research/product-schema-v1@bc7473c8eebd1511b9a92fe3c1e25e2670c29b46`

The initial stage is `REVIEW_REQUIRED`. The frozen 28-Golden/C1 product authority remains `ux/experience-workbench@4ba456e6595330e4ca8e21366e0d827f17e10881`. The generated closure PASS and green CI are inputs to review, not substitutes for it.

## Active finalization roster — four reused workers

| Worker | Existing automation ID | Cadence | Exclusive responsibility |
|---|---|---|---|
| ChopDot Schema Builder | `6aa2d91db2ac8191b810ad770b5bedd1` | hourly `:15` | One schema candidate writer, only on exact authorized repair |
| ChopDot Schema Reviewer | `6aa2d925780481919872270c2a39369b` | hourly `:35` | Independent reconstruction, witness, extraction, supersession, mutation-proof and blast-radius review |
| ChopDot Schema Security | `6aa7bf45969c8191b3939a2de0813595` | hourly `:45` | Independent financial/identity/authority/recovery/PositionScope safety attack |
| ChopDot Schema Supervisor | `6aa7aedbf3288191a45ecab70d12ed3a` | hourly `:55` | One coordinator; exact-head state transitions, consolidated repair scope, CI reconciliation, human freeze-approval packet |

These are repurposed primary Contract Builder/Reviewer/Supervisor and Security Attacker tasks. They are not additional agents and are not Claude executions. Schedules start or resume sustained work; they do not cap work to one tiny commit. Each worker gets at most one hourly activation. A role whose exact input is unchanged or whose prerequisite is missing silently no-ops.

The three prior Contract Repair Pickup / Contract Review Backup / Contract Supervisor Backup tasks are off for this phase. No duplicate pickup mesh and no separate Control Tower or production mapper are needed for this finish-only lane. Previously held journey-specific, preview, platform and production-integration tasks remain held. Do not re-enable them without a new user mandate.

The weekly Capability Radar remains unchanged and cannot change schema authority. Unrelated automations, including Catalyst Link Watch, are untouched. Expected active roster at this transition: four schema workers plus one existing ChopDot capability watcher; one unrelated active catalyst task. Capacity is a ceiling, not a target.

## Mandatory ownership / freshness rules

- Every run reads issue #50, its latest material receipts, the assembly state, live schema head, frozen product head, and exact current verification evidence. Do not consume old #38 Phase C1 REVISE events as schema repair authority.
- Only the Supervisor writes `PRODUCT_SCHEMA_V1_ASSEMBLY.json`, using the current blob SHA and a re-fetch before a transition.
- Only the Builder changes candidate schema/code. It needs `REPAIR_AUTHORIZED`, an exact parent SHA and a successful compare-and-swap claim on `docs/BUILDER_LEASE.json` before writing. A short active lease is for writing, never for waiting for CI. Mark `waiting_ci` with no holder when waiting; a changed candidate or CAS loss stops the write.
- Reviewer and Security inspect throwaway worktrees. They may persist reproducer scripts and evidence only in their own `docs/schema-v1-evidence/<candidate-sha>/<role>/` paths on this ops branch, plus issue #50. They never repair or approve their own candidate.
- A receipt names exact head/tree, command results, reproducer/evidence, finding IDs and verdict. If candidate bytes changed, mark the old receipt stale and review the successor. Never transfer an old green result to new bytes.
- An unexpected head change without an authorized Builder handoff or explicit human instruction is a provenance hold, not permission to accept arbitrary new code.
- All mutations must be tested after regeneration. Distinguish semantic rejection from snapshot/freeze-seal rejection, invalid fixture and unexecuted test. Missing execution capability is an explicit blocker.
- Preserve reported limitations: authority-only states are not executable semantics; the 21 required-state rows are not all-journey state coverage; duplicate evidence is not extra product behavior.

## Finalization state machine

`REVIEW_REQUIRED → independent Reviewer + Security receipts → REPAIR_AUTHORIZED (only for demonstrated findings) → one Builder successor → CI_PENDING → REVIEW_REQUIRED → AWAITING_HUMAN_FREEZE_APPROVAL → exact approved freeze → resulting-state verification → COMPLETE`

Human-only ambiguity or tool failure routes to `BLOCKED`, with a precise next action. No new architecture stage, product design, provider choice, Gate B build or production implementation is implied.

The Supervisor consolidates all still-applicable findings for one bounded repair instead of sending isolated one-line fixes through repeated cycles. Mechanical schema/test failures may be self-repaired within that authorization. Out-of-scope runtime/test failures must be diagnosed and escalated, not silently ignored or repaired under schema authority.

## Acceptance and approval

Issue #50 contains the detailed retest families and acceptance contract. The Supervisor needs independent Reviewer and Security clearance of the same exact head, no superseding blocker, deterministic pinned outputs, and completed-success Product Schema V1, CI, Coverage, Smoke (Targeted), and E2E Cypress on that head.

The prior standing approval policy was for J26–J28. It does **not** authorize a Product Schema V1 freeze. The Supervisor prepares one exact-head approval request; it does not tag, freeze, merge or declare human acceptance before that approval. A later exact approval permits only schema-baseline finalization with unchanged reviewed bytes and resulting-state verification. Gate B and Product Integrator still remain held.

## Stop / no-idle behavior

- Unchanged evidence: no repeated status comments or notifications.
- Partial review: save a resumable evidence/checkpoint, not a fake CLEAR.
- Two full eligible cycles without measurable progress: one actionable stall/blocker report. Do not create more workers or weaken tests.
- Approval handoff or human-only blocker: pause Builder/Reviewer/Security; keep the Supervisor as a silent approval/revocation watcher.
- Verified completion or revocation: disable all four schema roles. Leave unrelated tasks unchanged.
- Notify the user only for a real decision, material blocker/stall, exact-head approval readiness, or verified completion. Task notification delivery settings are separate from this operational instruction.

## Roster changes

For future topology changes, inspect the live task roster and canonical phase first, compare it with this registry, reuse an existing task before creating one, and record the change here. Verify resulting enabled state/prompts/cadence from automation responses or a supported live inspection. Never infer that a phase transition authorizes production, a protected merge, deployment, spending, signing or secrets access.
