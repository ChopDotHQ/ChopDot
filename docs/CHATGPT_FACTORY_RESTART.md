# ChatGPT Work Factory — Restart Contract

**Purpose:** let a new ChatGPT thread or replacement agent resume ChopDot from durable GitHub truth without reconstructing old conversations.

**Rule:** do not ask the old thread what is current. Read GitHub.

## Post-J28 restart shortcut

If the registered UX journey-production phase is already complete, read `docs/POST_J28_CONTINUITY_HANDOFF.md` first. It is the public-safe index for the post-J28 product decisions, Phase C1 selective contract work, production-readiness preflight, ChainSecurity-informed adversarial model, mandatory J01–J28 security/implementation crosswalk, private-artifact routing, and production-start gates.

That handoff is a routing snapshot, not authority. After reading it, always re-resolve the live canonical head, issue #38, issue #43, exact candidate/review state and live automation roster before acting.

## Restart read order

0. If post-J28, `docs/POST_J28_CONTINUITY_HANDOFF.md`.
1. Canonical UX authority on `ux/experience-workbench`:
   - `prototypes/experience-workbench/registry/progress.json`
   - `registry/active-candidate.json`
   - `registry/exact-head-gate.json`
   - `registry/journeys.json`
   - Golden locks / manifest / approvals
2. Current journey / post-journey contract resolved from live authority:
   - for a registered journey: `spec.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, `source/decision-history.md`
   - for post-J28 selective integration: newest exact Phase C1 Builder/Reviewer/Supervisor handoffs in issue #38
3. Workbench law:
   - `DESIGN_CONTRACT.md`
   - `REVIEW_PROTOCOL.md`
   - `shared/improvements.md`
4. Newest material issue #38 handoffs only:
   - Builder REVIEW REQUEST
   - Reviewer REVIEW RECEIPT
   - explicit human approval or standing-approval policy application
   - Supervisor validation/freeze/blocker
5. Post-J28 production-readiness/security authority when applicable:
   - issue #43 `Production Readiness Preflight — implementation seams + adversarial security model`
   - latest Production Readiness Mapper material result
   - latest Security Attacker material result
   - J01–J28 security coverage / implementation ownership matrix state
6. Exact current candidate branch/head and exact Actions/evidence.
7. Factory doctrine on `ops/chatgpt-work-factory-v1`:
   - `CHATGPT_WORK_FACTORY.md`
   - `CHATGPT_FACTORY_EVOLUTION.md`
   - `CHATGPT_FACTORY_DECISION_LOG.md`
   - `CHATGPT_FACTORY_APPROVAL_POLICY.md`
   - `CHATGPT_FACTORY_WORKER_REGISTRY.md`
   - `CHATGPT_CAPABILITY_RADAR.md`
8. Latest relevant issue #40 Factory Observer / Platform Watch / Capability Radar finding.
9. **List live scheduled workers and reconcile them against `CHATGPT_FACTORY_WORKER_REGISTRY.md` before changing any automation.** A mismatch is factory drift, not permission to create another worker.

## Authority order

When sources disagree, use this order:

1. live product law, canonical UX registry, approvals and Golden locks;
2. exact current Git head plus exact CI/evidence;
3. newest non-superseded sealed handoff bound to those bytes;
4. explicit active human authority, including `CHATGPT_FACTORY_APPROVAL_POLICY.md` only within its stated scope and fail-closed conditions;
5. issue #38 operational mirror;
6. issue #43 post-J28 production-readiness/security preflight state where applicable;
7. factory docs / issue #40 process guidance;
8. saved conversation context and summaries;
9. historical chat links and old prompts.

Live automation state is the truth of what is actually enabled; `CHATGPT_FACTORY_WORKER_REGISTRY.md` is the declared expected topology used to detect drift.

See ADR 0004 for the broader context-authority rule.

## Determine the current state

Classify the factory into one primary node:

- `AUTHORITATIVE_DEFINITION`
- `BUILD_ACTIVE_OR_ELIGIBLE`
- `REVIEW_REQUEST_OUTSTANDING`
- `REVISE_REPAIR_ELIGIBLE`
- `REVIEWABLE_HOLD`
- `GOLDEN_READY_HUMAN_GATE`
- `GOLDEN_READY_STANDING_APPROVAL_ELIGIBLE`
- `HUMAN_APPROVED_FREEZE_ELIGIBLE`
- `TRANSITION_VERIFY_PENDING`
- `VALIDATED_NEXT_JOURNEY_ELIGIBLE`
- `POST_J28_SELECTIVE_CONTRACT_ACTIVE`
- `POST_J28_PREFLIGHT_ACTIVE`
- `POST_J28_EXACT_APPROVAL_GATE`
- `PRODUCTION_START_HUMAN_GATE`
- `GENUINE_EXTERNAL_OR_AUTHORITY_BLOCKER`

Then follow the generic state machine in `CHATGPT_FACTORY_EVOLUTION.md` plus the post-J28 gates in `POST_J28_CONTINUITY_HANDOFF.md` when applicable. Do not create a journey-specific orchestration path merely because a handoff is urgent.

When the standing approval policy is active and applicable, `GOLDEN-READY` may advance directly to exact approval-record materialization and freeze after the Supervisor revalidates the exact candidate/review/evidence. The independent Reviewer gate is never skipped. Do not extend an expired/older standing approval into post-J28 selective bytes by inference.

## Anti-regression checks

A new thread must not:

- trust a journey number embedded in an old prompt;
- infer factory generation from journey number;
- change worker topology from memory instead of reconciling live automation state against the worker registry;
- create a new recurring worker before proving no active worker already has the same trigger/authority/output;
- exceed the declared factory active-task target without first repurposing/disabling capacity;
- create competing candidate writers;
- treat duplicate equivalent reviewers as throughput;
- start next-journey or production product bytes while transition / post-J28 authority verification is pending;
- treat direct-loaded/renderable states as proof of caller reachability when reachability is required;
- edit approved Golden HTML in place;
- infer approval outside an explicit per-candidate approval or an active standing-approval policy that clearly applies to the exact candidate;
- use standing approval to bypass `REVISE`, `REVIEWABLE`, direct visual review, exact evidence, exact-byte binding or resulting-state verification;
- extend standing approval to later-added journeys or post-J28 selective bytes outside its activation-time scope;
- treat green CI as independent UX/product/security review;
- treat historical centralized experiments as current runtime architecture;
- make an external tool a critical dependency without a measured adoption decision;
- treat a scheduled invocation as a small mandatory work chunk;
- accept idle clock wait when a valid next-stage handoff already exists;
- let implementation architecture silently compensate for a material `GOLDEN / PRODUCT-CONTRACT CHANGE` security finding;
- call the post-J28 production preflight complete before all J01–J28 security dispositions and implementation-ownership rows exist;
- re-enable Product Integrator merely because Phase C1 or issue #43 produced analysis; use the explicit production-start gate in `POST_J28_CONTINUITY_HANDOFF.md`.

## New-thread bootstrap prompt

A future post-J28 thread can start with:

> Continue ChopDot from `docs/POST_J28_CONTINUITY_HANDOFF.md` on `ops/chatgpt-work-factory-v1`. Re-read live issue #38, issue #43, the canonical UX registry/head, exact Phase C1 candidate/review evidence, `CHATGPT_FACTORY_WORKER_REGISTRY.md`, and the live automation roster before acting. Tell me the current phase, exact next owner/action, J01–J28 security/implementation coverage state, any production-start blockers, and whether time is being wasted. Do not trust old chat state over GitHub and do not enable Product Integrator without the documented human gate.

For pre-J28 journey-production state, use:

> Continue the ChopDot autonomous product factory from live GitHub truth. Use `docs/CHATGPT_FACTORY_RESTART.md` on `ops/chatgpt-work-factory-v1` as the bootstrap route. Tell me the current journey/stage, exact next owner/action, whether any time is being wasted, whether the standing approval policy currently applies, and whether the live worker roster matches `CHATGPT_FACTORY_WORKER_REGISTRY.md`. Do not trust old chat state over GitHub or change worker topology from memory.

## What must be durable before a thread ends

Before abandoning a long thread, verify:

- current journey/post-journey stage is correct in canonical authority;
- latest candidate/review/approval/freeze handoff is in GitHub;
- active standing approval/revocation state is durable in GitHub;
- post-J28 product decisions are in issue #38 / durable decision docs;
- post-J28 production-readiness/security progress is in issue #43;
- J01–J28 security/implementation coverage state is durable if that gate is active;
- reusable factory lessons are in `CHATGPT_FACTORY_DECISION_LOG.md`;
- factory-rule changes are in the factory docs;
- product decisions are in journey history, post-J28 decision records or ADR/product law;
- issue #38/#40/#43 contain the material current handoffs/findings for their respective roles;
- live scheduled workers match `CHATGPT_FACTORY_WORKER_REGISTRY.md`;
- private competitive/strategy evidence remains private and only its public-safe decisions are mirrored into GitHub;
- no important decision exists only in the departing thread.

If those are true, the thread may disappear without losing operating continuity.
