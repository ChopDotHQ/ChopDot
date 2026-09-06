## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J11-D01 — Exact payment preparation, not completion

**Decision:** Journey 11 selects person, amount, currency, source items and method. Approve in wallet emits PaymentApprovalRequested, not PaymentIntentAuthorized; only a verified result may authorize. Journey 12 owns progress and closure.

**Why:** The recorded goal is an exact payment without losing person, amount, currency, source lineage or method. The compatibility closeout explicitly separates requesting approval from authorization.

**Alternatives:** Direct authorization from the wallet UI click is explicitly rejected. Product dependence on a named protocol/chain and using estimated conversion as an instruction are excluded.

**Tradeoffs:** Methods require distinct authority and progress semantics. Manual receipt requires the receiver. Durable event acceptance is distinct from the final readable Saved record; optional Product SDK metadata is not its only retrieval path.

**Revisit when:** A UI action asserts provider authorization, receipt or closure; adapter/storage work loses exact scope, ordinary retrieval or replay safety.

**Approval / version:** v1.1 — Golden #9 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: existing design direction preserved](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#existing-design-direction-preserved); [Spec: payment and agentic compatibility contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#payment-and-agentic-compatibility-contract); [Spec: compatibility closeout](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#compatibility-closeout); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Authoritative wallet action mapping](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/UI_TO_DOMAIN_EVENTS.md); [Saved record retrieval contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/STORAGE_AND_REPLAY_CONTRACT.md).
