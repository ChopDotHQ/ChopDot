## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J10-D01 — People-led position with visible source lineage

**Decision:** Default to people; show gross owed/owing alongside net. Net only for the same two people in one currency and expose group offsets. Estimates are optional orientation, never payment instructions.

**Why:** The source explicitly chooses people because payments happen between people. It requires the path to a person-level amount to remain visible.

**Alternatives:** Groups are secondary. Silent currency combination, trust scores, wallet-address clutter and using this view to execute payments/requests are excluded.

**Tradeoffs:** A person can have multiple separate currency positions. An issue affects only dependent amounts. The Journey 11 contract makes Overall Position a derived read model, not a mutable balance.

**Revisit when:** Tests hide gross exposure or source groups, treat a conversion as payable, or block unrelated balances.

**Approval / version:** v1 — Golden #8 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: primary view](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#primary-view); [Spec: netting rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#netting-rule); [Spec: currency rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#currency-rule); [Spec: readiness rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#readiness-rule); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Derived-read-model contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#payment-and-agentic-compatibility-contract).
