## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J13-D01 — Private requests, overlap protection and withdrawal

**Decision:** Create a private in-app request for the exact initiating balance. Reuse an active overlapping-source request for the same payer/currency. No automatic reminders. Withdrawal preserves request history, balances and memberships, and is blocked during payment.

**Why:** The recorded goal is requesting money without awkward coordination. The source states that a different note is not a new debt or a way around duplicate protection; withdrawal stops the request rather than its balance.

**Alternatives:** Public links, contact uploads, arbitrary edited amounts, cross-currency sums and automatic nudges are excluded in this candidate. A full comparison of notification strategies is not recorded.

**Tradeoffs:** Created, delivered and paid remain separate. Delivery retry reuses the request. Already delivered messages cannot be recalled; production detail must show current status.

**Revisit when:** Overlapping requests escape exclusion, delivery is mistaken for receipt/payment, or withdrawal races with payment.

**Approval / version:** v1 — Golden #13 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: main path](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/13-request-money/spec.md#main-path); [Spec: candidate policies for approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/13-request-money/spec.md#candidate-policies-for-approval); [Spec: creation delivery and payment are separate](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/13-request-money/spec.md#creation-delivery-and-payment-are-separate); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Explicit approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/approvals/13-v1.json).
