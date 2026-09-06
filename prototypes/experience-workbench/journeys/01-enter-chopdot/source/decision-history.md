## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J01-D01 — Entry without losing intent

**Decision:** Email-code sign-in is the default; wallet sign-in is an alternative. New and returning people share entry; returning accounts skip the name step. Signing in does not join a group or authorize payment.

**Why:** The recorded user goal is to enter without losing the reason for opening ChopDot. The invitation or Home destination survives interruptions and sign-in-method changes.

**Alternatives:** Two separate registration forms are explicitly contrasted with the shared entry. Wallet is retained, not rejected. A comparative authentication-provider evaluation is not recorded in the inspected sources.

**Tradeoffs:** The experience is approved, not a provider implementation. Identity mismatch, stale challenges and cancelled wallet requests must not expose another account or accept a late result.

**Revisit when:** Entry tests show lost invitation context, repeated setup for returning people or confusion between sign-in and joining; provider selection exposes a new constraint.

**Approval / version:** v1 — Golden #11 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: candidate decisions not previously approved implementation choices](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/01-enter-chopdot/spec.md#candidate-decisions-not-previously-approved-implementation-choices); [Spec: context and authority](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/01-enter-chopdot/spec.md#context-and-authority); [Spec: recovery](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/01-enter-chopdot/spec.md#recovery); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Explicit approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/approvals/01-v1.json).
