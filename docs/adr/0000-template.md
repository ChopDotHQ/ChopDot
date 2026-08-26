# ADR NNNN — Decision title

**Kind:** decision
**Status:** proposed | accepted | superseded | rejected
**Owner:**
**Independent assurance owner:**
**Decision date:** YYYY-MM-DD
**Last reviewed:** YYYY-MM-DD
**Applies to:** exact root, branch, product card, subsystem, or release
**Authority:** what this decision may govern and what it may not govern
**Exact accepted source identity:** literal commit, tree, and file SHA-256
**OutcomePacketV1:** path and digest, or `not implemented`
**Supersedes / superseded by:**

This template is scaffolding. A copied template is not an accepted decision.
`PRODUCT_TRUTH.md` remains product law, and `product/cards.md` remains current
product priority. An ADR must not smuggle a product-law or priority change into
process, architecture, or implementation prose.

## Context

What changed, what is uncertain, and why is a durable decision required? Name
same-level conflicts, current behavior, affected requirement/invariant IDs, and
the exact source observations used.

Separate:

- **Facts:** directly observed and cited;
- **Inferences:** reasoned from the facts;
- **Assumptions / unknowns:** not yet proven.

## Decision

State the chosen product, authority, data, security, platform, agent-system, or
release rule. Define stable interfaces and replaceable edges. If the decision
changes a prior ADR, identify the exact clauses retained and superseded.

## Expected outcome

Name the artifact or behavior this decision should create, objective assertions,
the evaluator, required environmental observations, evidence levels, and finite
stop states. “Looks good,” “improved,” or “complete” is not an expected outcome.

Allowed evidence IDs are:

`source-only`, `unit`, `simulated-integration`, `simulated-host`,
`exact-candidate`, `real-host-chain`, `live-user`, `release`, and
`local-blocked`.

`local-blocked` cannot promote a decision or implementation state.

## Authority and effects

- Who may read, create, change, confirm, recover, publish, or approve state?
- Which authorities remain unchanged?
- Which external effects, credentials, approvals, idempotency keys, readbacks,
  and reconciliation states are required?
- Can the author independently approve this decision or its implementation?

Agent outputs, KGs, Repo Graph, CI, tests, and evidence packets are operational
provenance. They do not create participant or product authority.

## Failure and recovery behavior

Describe cancellation, retry, stale state, duplicate submission, offline use,
unavailable capability, partial failure, corrupted state, expired approval,
interrupted dispatch, mismatched readback, rollback, and budget exhaustion.
Unknown external effects must be reconciled before redispatch.

## Alternatives considered

Record credible alternatives, supporting evidence, and why each was not
selected. Include the simplest adequate option and any provider-neutral route.

## Consequences

Include benefits, risks, migration, rollback, operations, privacy,
accessibility, performance, portability, and what becomes harder. State whether
normal ChopDot UI changes and how product-language boundaries remain protected.

## Verification and evidence

| Assertion | Evidence level | Exact command, artifact, or readback | Literal candidate identity | Result / gap |
|---|---|---|---|---|
| | | | | |

Name exact positive and negative checks, pass/fail/skip counts, evaluator
identity, independence, artifact hashes, environmental readback, and remaining
limitations. A moving PR body may use `CURRENT_PR_HEAD`; accepted ADR,
OutcomePacketV1, release, and deployment records require literal identities.

## Migration and rollback

How is existing source/data/history preserved? What is reversible? What cannot
be rolled back safely? A rollback must not weaken evidence thresholds or relabel
failure as success.

## Documentation impact

List source wiki/ADR/process/product documents that must change and generated
views that must be regenerated. Generated views are not edited as authority.

## Revisit trigger

Name the evidence, user behavior, escaped defect, law, provider/platform change,
cost, or falsifier that must reopen the decision.
