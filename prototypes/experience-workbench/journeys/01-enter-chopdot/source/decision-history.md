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

### J01-D02 — Verification freshness survives reset/restart collisions

**Decision:** Verification authority is bound to a cryptographically unique process/session epoch and an opaque epoch-scoped request identity. Resettable request/challenge counters are not freshness authority. A full reset, reload, browser/process restart, invite reset or `START_OVER` creates a new epoch; provider evidence from an earlier epoch cannot authorize the recreated subject + destination flow.

**Why:** Reviewer receipt #38 `5707911597`, consuming Security #43 `5707441287`, proved that the previous process-local counters could deterministically recreate the same wallet/email correlation tuple after restart. The already-approved J01 contract requires stale-event/restart fail-closed behavior, so this is an implementation/acceptance repair rather than a new visible product semantic.

**Invariant:** Exact authenticated subject, method, request/challenge and destination remain bound as before. The new epoch is additionally carried by pending and verified authority, and every request identity is namespaced by that epoch. Profile/display-name changes cannot become identity authority; wallet/account switches rotate request identity; J04/J27/J28 may inherit only freshly current verified authority.

**Scope boundary:** No authentication provider is selected. The prototype uses runtime cryptographic uniqueness only to model non-reusable proof identity; it does not claim production session storage, provider finality, account recovery, signing, payment authority or a production implementation. Unrelated Golden bytes and GUEST-01/SPEND-01 semantics remain unchanged.

**Acceptance family:** Wallet and email replay are exercised across Home and invite destinations, browser reload/process recreation and `START_OVER`; stale S1 evidence must fail in S2 even when the subject, destination and local action sequence repeat, and only fresh S2-bound evidence may verify.
