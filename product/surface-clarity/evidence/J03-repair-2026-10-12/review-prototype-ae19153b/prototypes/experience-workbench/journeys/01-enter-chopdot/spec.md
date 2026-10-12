# Journey 01 — Enter ChopDot V1

**Status:** Golden Candidate #11 — review pending. **Priority:** P0.

## Basis and sequence

The registered Journey 01 goal is “Enter, authenticate or continue, then arrive somewhere useful.” Its entries are app launch and an invite link; its exits are Home (02) and invitation acceptance (04). It follows the completed in-app money loop. Journey 12 V1.1 was frozen separately as Golden #10 before this candidate began.

## User goal

Get into ChopDot without losing the reason for opening it.

## Candidate decisions, not previously approved implementation choices

Email with a short sign-in code is the proposed default. Wallet sign-in is optional. New and returning people share the same entry rather than having to decide between two registration forms. The returning-account fixture skips the name step; a new person supplies only the name their groups will see. This proposes an experience, not an authentication-provider choice.

## Paths

New person: Welcome → Email → Code → Name → Signed in → Home reference.

Returning person: Email → Code → Signed in → Home reference.

Invite: Invite waiting → Email or wallet sign-in → Signed in → Continue to invite → existing Join experience. Signing in never joins a group automatically.

Wallet: Account → Request sign-in approval → Waiting → verified result → Signed in. Check again reads the current request; it does not fabricate approval. Declined, expired and unknown outcomes remain distinct. Cancelling invalidates that request so a late result cannot sign the person in.

Expired session: Sign in again → original identity verified → resume invitation. A different identity sees a clear mismatch and no private groups are opened.

## Context and authority

The destination is an allowlisted Home or invitation context, retained through back navigation, changing sign-in methods, retries and offline recovery. The URL retains only that demo destination, not email, code or a session token. Reopening the document requires verification again; a URL is never sign-in proof.

Only verified authentication-provider results establish a real session. Browser fields, clicking Continue, connecting an account, and tapping Check again are not sufficient. Production verification, throttling, single-use challenge checks, replay protection and destination permission checks belong to deterministic server/provider logic, not to an LLM or this prototype's demo code.

Sign-in approval is not payment approval. It cannot authorize a transfer, confirm receipt, close a payment, merge two identities, or accept an invitation. Wallet secrets and private keys are never collected here. Account linking is not designed in this journey.

Before a real Join action, Journey 04 revalidates invitation availability and membership. This candidate does not replace that boundary. Home/Invite references deliberately use existing demo data, not accounts created by the prototype.

## Recovery

Invalid email; incorrect code; expired code and resend; offline with the invitation retained; expired session; wrong identity; wallet approval waiting, rejected, expired or unknown; loading failure. Retry while offline stays offline. A late approval for a cancelled request is ignored.

## Prototype limitations

No email is sent, account created, wallet connected, payment made or group joined by the entry model. Code 123456 and the dev@example.com returning-person fixture are public demonstration values. Do not reuse the demo verifier as production authentication. Fresh document loads intentionally do not restore an authenticated session. Native email delivery, wallet callbacks, recovery services, rate limiting and real account records require later implementation and testing.

## Inheritance and typography

The first style block is copied verbatim from the approved Journey 12 V1.1 artifact. Entry-specific styles are scoped additions, using the existing surfaces, colors, icons, headings and fixed frame. Existing Golden files are not edited. TYPO-01 (small progress labels) stays deferred to the later shared typography pass.

## Review focus

Does email-first feel natural? Is the one-field name step worthwhile? Does an invite survive every interruption? Are signing in and joining visibly separate? Are wallet refresh and approval clearly different? Do the signed-in result and two reference handoffs feel continuous with the Goldens?

## Next boundary

Do not freeze without explicit approval. Once entry is approved, finish any cross-journey integration review before selecting the next supporting journey from the registry.

<!-- JOURNEY_DECISION_HISTORY:START -->
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

### J01-D02 — Verification result provenance survives reset/restart and attempt collisions

**Decision:** Verification authority is bound to a cryptographically unique process/session epoch and an opaque epoch-scoped request identity. Resettable request/challenge counters are not freshness authority. A full reset, reload, browser/process restart, invite reset or `START_OVER` creates a new epoch. Both email and wallet ordinary provider/adapter result paths carry opaque request/attempt identities fixed when their respective requests are issued. The UI may consume those issued results but may not manufacture proof binding from current pending state. Provider evidence from an earlier request, account, destination or epoch cannot authorize a recreated flow.

**Why:** Reviewer receipt #38 `5707911597`, consuming Security #43 `5707441287`, proved that process-local counters could deterministically recreate wallet/email correlation tuples after restart. Security #43 `5708182785` then showed a raw email code could be rebound when omitted authority fields were synthesized from current pending state; Reviewer #38 `5708896186` required the ordinary email path to retain request-lifecycle provenance, which was repaired in successor `777d76d5b3f356ea85d9c1af24e3417b97022aa6`. After that repair, Security #43 `5709874182` proved the symmetric wallet ordinary-result seam still consumed only a raw result while `ui.js` supplied the current request and `APPROVAL_RESULT` defaulted missing subject/destination/epoch from S2. Reviewer #38 `5710375251` classified that exact package `REVISE` and granted one bounded implementation/acceptance successor. This remains closure of the already-authorized freshness contract, not a second user-visible product semantic.

**Alternatives:** Resettable counters, raw code/result values and consumption-time rebinding are rejected as authority provenance. A provider-issued opaque verification transaction/result identity, wallet approval attempt identity, or an equivalent provider-neutral request-bound proof is acceptable. The prototype models those identities at request issuance and requires returned results to carry them. No concrete authentication or wallet provider is selected here.

**Tradeoffs:** The adapter/result boundary must retain enough correlation data to prove which exact verification or approval request produced the evidence. A raw code, `approved`, `declined` or `unknown` value is not itself authoritative proof, and current local pending state cannot add missing provenance later. This intentionally models a stronger provider-result boundary while leaving the production provider, transport and persistence mechanism unresolved.

**Revisit when:** A concrete authentication provider, wallet host or production identity adapter is selected and its request/result correlation contract is known, or restart/recovery lifecycle constraints require a different non-reusable freshness primitive. Any alternative must retain the same fail-closed S1→S2 replay property through the ordinary UI/adapter path.

**Approval / version:** Phase C1 selective successor only — bounded by latest Reviewer `REVISE` #38 `5710375251`, predecessor Builder handoff #38 `5709655452`, predecessor Reviewer #38 `5709811369`, Security #43 `5709874182`, packet delta #43 `5709280243`, and earlier same-family findings #43 `5707441287` and `5708182785`. This record does not create a new Golden/product semantic, human approval, materialization/re-lock authority, or production implementation authority. Canonical approved authority remains `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76` until an exact successor is independently reviewed and explicitly approved.

**Invariant:** Exact authenticated subject, method, request/challenge, destination and restart epoch remain bound. Email provider evidence carries its request-lifecycle opaque identity; wallet provider evidence carries its request-lifecycle opaque attempt identity. `VERIFY_CODE` and `APPROVAL_RESULT` require their issued provider evidence and synthesize no missing authority fields from current S2 pending state. Profile/display-name changes cannot become identity authority. Wallet/account switches, cancel/retry and reset/restart boundaries rotate request/attempt identity. J04/J27/J28 may inherit only freshly current verified authority.

**Scope boundary:** No authentication provider, wallet provider, rail, card, pot, issuer or BaaS is selected. The prototype uses runtime cryptographic uniqueness and provider-neutral issued-result identities only to model non-reusable proof provenance; it does not claim production session storage, provider finality, account recovery, signing, payment authority or a production implementation. Unrelated Golden bytes and GUEST-01/SPEND-01/MoneyV1/PaymentIntent semantics remain unchanged.

**Acceptance family:** Email and wallet replay are exercised across Home and invite destinations, browser refresh/full process recreation, `START_OVER` and wallet cancel/account-switch boundaries. The exact wallet negative retains valid S1 provider evidence, recreates the same subject + destination in S2, injects S1 evidence into the same ordinary wallet adapter buffer and invokes the same ordinary result control; stale `approved`, `declined` and `unknown` results must mint zero S2 authority. Only fresh S2-issued evidence may verify, and a fresh `unknown` may resolve only with that same fresh S2-bound attempt. The accepted email sibling remains covered through its ordinary code form. Back/Forward/direct-hash, explicit stale-event reuse, profile-vs-authority mutation, wallet/account switch and J04/J27/J28 inherited continuity remain in the same family.

**Sources:** [Latest Reviewer bounded REVISE #38 `5710375251`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5710375251); [Security wallet-result provenance finding #43 `5709874182`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5709874182); [public-safe security cross-reference #38 `5709875870`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5709875870); [Production-start packet delta #43 `5709280243`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5709280243); [prior Reviewer #38 `5708896186`](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5708896186); [Security restart/reset finding #43 `5707441287`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5707441287); [Security ordinary-email-result follow-up #43 `5708182785`](https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5708182785).
<!-- JOURNEY_DECISION_HISTORY:END -->
