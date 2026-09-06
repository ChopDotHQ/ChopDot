## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J14-D01 — One-recipient sharing with explicit export

**Decision:** Propose a private 24-hour link for one selected authenticated ChopDot user, owner-only creation/stopping, and a separate deliberate copy export. Stopping access does not cancel a request, recall copies or change a balance.

**Why:** The source explicitly gives the 24-hour rationale: asynchronous sharing without a short countdown pressuring payment. General copy is the alternative for someone outside ChopDot.

**Alternatives:** Public/group-wide sharing by default and link possession as access authority are excluded. Raw copy is retained as an explicit export, not rejected. Other expiry durations are not evaluated in the inspected sources.

**Tradeoffs:** Authentication adds a recipient requirement. External copies/screenshots cannot be recalled. Changed destination versions invalidate prior review. The local QR encodes an inert sharing reference, not a provider payment code.

**Revisit when:** Review finds recipient selection or expiry confusing; tests reveal stale destinations, excess exported fields or confusion between stopping access and cancelling payment.

**Approval / version:** v1 — current candidate / review-pending; NOT approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: candidate policies for approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#candidate-policies-for-approval); [Spec: exact context and destination](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#exact-context-and-destination); [Spec: prototype behavior and limits](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#prototype-behavior-and-limits); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
