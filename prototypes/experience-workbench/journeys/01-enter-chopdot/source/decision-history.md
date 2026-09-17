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

**Decision:** Verification authority is bound to a cryptographically unique process/session epoch and an opaque epoch-scoped request identity. Resettable request/challenge counters are not freshness authority. A full reset, reload, browser/process restart, invite reset or `START_OVER` creates a new epoch. For email, the ordinary provider/adapter result additionally carries an opaque provider request identity fixed when that request is issued; the UI may consume that result but may not manufacture its proof binding from the current pending state. Provider evidence from an earlier request or epoch cannot authorize a recreated subject + destination flow.

**Why:** Reviewer receipt #38 `5707911597`, consuming Security #43 `5707441287`, proved that the previous process-local counters could deterministically recreate the same wallet/email correlation tuple after restart. Security follow-up #43 `5708182785` proved that an email result carrying only a code could be rebound to the current epoch when the model synthesized omitted proof-binding fields. Reviewer receipt #38 `5708896186` then demonstrated that the ordinary code form still recreated the complete proof tuple from current S2 pending state at consumption time even after the reducer itself became fail-closed. The already-approved J01 contract requires stale-event/restart fail-closed behavior, so this remains an implementation/acceptance repair rather than a new visible product semantic.

**Alternatives:** Resettable client counters and consumption-time rebinding are rejected as freshness authority. A provider-issued opaque verification transaction/result identity or an equivalent provider-neutral request-bound proof remains acceptable. The prototype models that identity at request issuance and requires the returned result to carry it. No concrete authentication provider is selected here.

**Tradeoffs:** The adapter/result boundary must carry enough correlation data to prove which verification request produced the evidence. A raw code/value is not itself authoritative proof and current local pending state cannot add the missing provenance later. This intentionally models a stronger provider-result boundary while leaving the production provider, transport and persistence mechanism unresolved.

**Revisit when:** A concrete authentication provider or production identity adapter is selected, its request/result correlation contract is known, or restart/recovery lifecycle constraints require a different non-reusable freshness primitive. Any alternative must retain the same fail-closed S1→S2 replay property through the ordinary UI/adapter path.

**Approval / version:** Phase C1 selective successor only — bounded by Reviewer `REVISE` #38 `5708896186`, predecessor Reviewer #38 `5707911597`, Security #43 `5707441287`, and same-family Security follow-up #43 `5708182785` / #38 `5708184031`. This record does not create a new Golden/product semantic, human approval, materialization/re-lock authority, or production implementation authority.

**Invariant:** Exact authenticated subject, method, request/challenge, destination and restart epoch remain bound. Email provider evidence additionally carries its request-lifecycle opaque identity and must match the issued record before verification. The normal code form may submit only the retained provider/adapter result; it cannot derive request, challenge, subject, destination, epoch or provider identity from current S2 pending state. Profile/display-name changes cannot become identity authority; wallet/account switches rotate request identity; J04/J27/J28 may inherit only freshly current verified authority.

**Scope boundary:** No authentication provider is selected. The prototype uses runtime cryptographic uniqueness and a provider-neutral issued-result identity only to model non-reusable proof provenance; it does not claim production session storage, provider finality, account recovery, signing, payment authority or a production implementation. Unrelated Golden bytes and GUEST-01/SPEND-01 semantics remain unchanged.

**Acceptance family:** Wallet and email replay are exercised across Home and invite destinations, browser refresh/full process recreation and `START_OVER`. The exact email negative retains valid S1 provider evidence, recreates the same subject + destination in S2, delivers S1 evidence through the same ordinary UI/adapter result path, and requires zero S2 verification/session authority; only fresh S2-issued evidence may verify. Back/Forward/direct-hash, explicit stale-event reuse, profile-vs-authority mutation and wallet/account-switch siblings remain fail-closed.

**Sources:** [Reviewer bounded REVISE #38 `5708896186`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5708896186); [Reviewer prior REVISE #38 `5707911597`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5707911597); [Security restart/reset finding #43 `5707441287`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5707441287); [Security ordinary-email-result follow-up #43 `5708182785`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5708182785); [public-safe cross-reference #38 `5708184031`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5708184031).
