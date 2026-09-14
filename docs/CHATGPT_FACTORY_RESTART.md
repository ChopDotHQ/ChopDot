# ChatGPT Work Factory — Restart Contract

**Purpose:** let a new ChatGPT thread or replacement agent resume ChopDot from durable GitHub truth without reconstructing old conversations.

**Rule:** do not ask the old thread what is current. Read GitHub.

## Restart read order

1. Canonical UX authority on `ux/experience-workbench`:
   - `prototypes/experience-workbench/registry/progress.json`
   - `registry/active-candidate.json`
   - `registry/exact-head-gate.json`
   - `registry/journeys.json`
   - Golden locks / manifest / approvals
2. Current journey contract resolved from the registry:
   - `spec.md`
   - `STATE_INVENTORY.md`
   - `EDGE_CASES.md`
   - `source/decision-history.md`
3. Workbench law:
   - `DESIGN_CONTRACT.md`
   - `REVIEW_PROTOCOL.md`
   - `shared/improvements.md`
4. Newest material issue #38 handoffs only:
   - Builder REVIEW REQUEST
   - Reviewer REVIEW RECEIPT
   - explicit human approval
   - Supervisor validation/freeze/blocker
5. Exact current candidate branch/head and exact Actions/evidence.
6. Factory doctrine on `ops/chatgpt-work-factory-v1`:
   - `CHATGPT_WORK_FACTORY.md`
   - `CHATGPT_FACTORY_EVOLUTION.md`
   - `CHATGPT_FACTORY_DECISION_LOG.md`
   - `CHATGPT_FACTORY_WORKER_REGISTRY.md`
   - `CHATGPT_CAPABILITY_RADAR.md`
7. Latest relevant issue #40 Factory Observer / Platform Watch / Capability Radar finding.
8. **List live scheduled workers and reconcile them against `CHATGPT_FACTORY_WORKER_REGISTRY.md` before changing any automation.** A mismatch is factory drift, not permission to create another worker.

## Authority order

When sources disagree, use this order:

1. live product law, canonical UX registry, approvals and Golden locks;
2. exact current Git head plus exact CI/evidence;
3. newest non-superseded sealed handoff bound to those bytes;
4. issue #38 operational mirror;
5. factory docs / issue #40 process guidance;
6. saved conversation context and summaries;
7. historical chat links and old prompts.

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
- `HUMAN_APPROVED_FREEZE_ELIGIBLE`
- `TRANSITION_VERIFY_PENDING`
- `VALIDATED_NEXT_JOURNEY_ELIGIBLE`
- `GENUINE_EXTERNAL_OR_AUTHORITY_BLOCKER`

Then follow the generic state machine in `CHATGPT_FACTORY_EVOLUTION.md`. Do not create a journey-specific orchestration path merely because a handoff is urgent.

## Anti-regression checks

A new thread must not:

- trust a journey number embedded in an old prompt;
- infer factory generation from journey number;
- change worker topology from memory instead of reconciling live automation state against the worker registry;
- create a new recurring worker before proving no active worker already has the same trigger/authority/output;
- exceed the declared factory active-task target without first repurposing/disabling capacity;
- create competing candidate writers;
- treat duplicate equivalent reviewers as throughput;
- start next-journey product bytes while transition verification is pending;
- treat direct-loaded/renderable states as proof of caller reachability when reachability is required;
- edit approved Golden HTML in place;
- infer human approval;
- treat green CI as independent UX/product review;
- treat historical centralized experiments as current runtime architecture;
- make an external tool a critical dependency without a measured adoption decision;
- treat a scheduled invocation as a small mandatory work chunk;
- accept idle clock wait when a valid next-stage handoff already exists.

## New-thread bootstrap prompt

A future thread can start with:

> Continue the ChopDot autonomous product factory from live GitHub truth. Use `docs/CHATGPT_FACTORY_RESTART.md` on `ops/chatgpt-work-factory-v1` as the bootstrap route. Tell me the current journey/stage, exact next owner/action, whether any time is being wasted, and whether the live worker roster matches `CHATGPT_FACTORY_WORKER_REGISTRY.md`. Do not trust old chat state over GitHub or change worker topology from memory.

## What must be durable before a thread ends

Before abandoning a long thread, verify:

- current journey/stage is correct in canonical registry;
- latest candidate/review/approval/freeze handoff is in GitHub;
- reusable factory lessons are in `CHATGPT_FACTORY_DECISION_LOG.md`;
- factory-rule changes are in the factory docs;
- product decisions are in journey history or ADR/product law;
- issue #38/#40 contain the material current handoffs/findings;
- live scheduled workers match `CHATGPT_FACTORY_WORKER_REGISTRY.md`;
- no important decision exists only in the departing thread.

If those are true, the thread may disappear without losing operating continuity.
