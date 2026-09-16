# Gate A UX Review — J01 → J02 Baseline

Status: **CHANGES REQUIRED / pilot review**
Purpose: first application of `UX_LAWS_V1.md` to a real ChopDot integration gate.

## Review basis

- Golden authority base: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`
- Integrated preview family: `preview/golden-faithful-v2`
- Screenshot review: 20 Gate A states at 430×890 plus Home checks at 393×852 / 430×890.
- Screenshot evidence produced from the Gate A review tooling; the screenshot exercise is treated as design evidence, not product authority.

Important: the visible primary J01 path and J02 Golden render are materially better than V1, but the contact-sheet review found integration and UX defects that route-level tests did not expose.

## Preconditions / fidelity and continuity

### Strong
- Real J01 Welcome/email/code/name/signed-in screens are present.
- Email is the familiar primary path; wallet is secondary.
- Proper semantic SVG/icon vocabulary is restored.
- Invite context can remain visible through account-backed sign-in.
- Wallet waiting/unknown/declined/expired states are explicit.
- J02 uses the rich approved Home hierarchy rather than a simplified reconstruction.

### Failing / unresolved

**CONT-A-001 — new-person identity discontinuity — MAJOR**
- New person completes J01 as `Sam / sam@example.com`.
- J02 immediately renders a populated `DP / Devinson` Home fixture.
- User consequence: the integrated app appears to change identity and history when moving between journeys.
- Required fix: shared persona state decides which J02 state is rendered. A new person must receive a coherent first-use/new-person Home; a returning fixture may receive the populated Home.

**CONT-A-002 — C1 guest artifact is not product UI — MAJOR**
- The C1 guest successor changes to ivory/forest visual language, `Chop.Dot` branding, different typography, and review-artifact wording.
- User consequence: the product visibly changes identity during a single entry journey.
- Required fix: preserve C1 guest semantics, but express them in the approved ChopDot J01/J04 product language.

**CONT-A-003 — invite fixture discontinuity — MAJOR**
- Account-backed invite path uses one group/inviter/member fixture; C1 guest path uses a different group/inviter/member fixture.
- User consequence: choosing guest vs account appears to alter the invite itself.
- Required fix: one invite object drives both entry paths.

**CONT-A-004 — reviewer chrome leaks into normal product — MINOR**
- `Demo` control appears throughout normal J01 screens.
- Required fix: reviewer tools only appear in explicit reviewer mode.

## Seven-law review

### UX-01 — Hick’s Law
Applicability: **APPLIES**

**What works**
- Welcome gives two well-prioritized entry methods: email primary, wallet alternate.
- Email/code/name progression limits decisions per step.
- J02 groups information instead of presenting one flat action directory.

**Finding UX-01-A-001 — MINOR**
- `Demo` creates an extra equal-access control in a task that should be focused on sign-in.
- Fix: hide it outside reviewer mode.

**Finding UX-01-A-002 — MAJOR**
- C1 guest review artifact presents product choice together with technical/privacy/provenance explanations that belong to review documentation, increasing decision complexity at entry.
- Fix: preserve only the user-relevant invite context, privacy boundary, and guest/account choice; move contract detail out of product UI.

### UX-02 — Peak-End Rule
Applicability: **APPLIES**

**What works**
- J01’s `You’re ready` / `Welcome back` state is a clear positive completion point.
- Wallet error/unknown states are calmer than a hard failure page.

**Finding UX-02-A-001 — MAJOR**
- The strongest positive ending of onboarding is immediately undermined by landing in another person’s populated Home.
- User consequence: the onboarding “success” peak becomes a trust break.
- Fix: end J01 into a J02 state owned by the same participant/session fixture.

**Finding UX-02-A-002 — MAJOR**
- Guest handoff ends with internal contract/review wording rather than a user-centered next step.
- Fix: the end of the guest-entry segment should clearly say what the user can do next (review/join) and what has/not happened yet, using ChopDot language.

### UX-03 — Zeigarnik Effect
Applicability: **APPLIES**

**What works**
- Invite entry explicitly communicates that the invite is waiting and preserves it while signing in.
- Wallet pending/unknown states make unfinished work visible.
- Session-expired recovery communicates that context can be resumed.

**Finding UX-03-A-001 — MAJOR**
- Because the persona/fixture changes at J02, completion/resumption context is not trustworthy across the journey boundary.
- Fix: unfinished and completed state must remain attached to the same participant and invite objects across the handoff.

### UX-04 — Tesler’s Law
Applicability: **APPLIES**

**What works**
- Email-code authentication absorbs implementation detail and presents a simple sequence.
- Wallet states expose only the user-relevant approval result distinctions.

**Finding UX-04-A-001 — MAJOR**
- The C1 guest review artifact pushes contract/provenance complexity into the user interface (`account_backed`, provenance, participant-contract language).
- Fix: implementation/contract complexity remains behind the product; expose only necessary consent, privacy, identity, and next-step truth.

**Finding UX-04-A-002 — MINOR**
- Reviewer `Demo` machinery exposes prototype complexity during ordinary use.
- Fix: explicit reviewer-mode boundary.

### UX-05 — Jakob’s Law
Applicability: **APPLIES**

**What works**
- Email-first sign-in, back navigation, OTP code entry, primary/secondary button hierarchy, and wallet-as-alternate are familiar patterns.
- Semantic icons are recognizable and consistent with the broader product.

**Finding UX-05-A-001 — MAJOR**
- C1 guest surfaces abruptly use a different brand/visual system and technical labels.
- User consequence: users must relearn the interface and may interpret the guest path as a different product.
- Fix: same ChopDot components, terminology, icon language, and navigation grammar regardless of entry mode.

### UX-06 — Miller’s Law / Chunking
Applicability: **APPLIES**

**What works**
- Welcome, email, code, and profile screens are each focused chunks.
- J02 chunks attention, position, wallet context, and groups into scan-friendly modules.

**Finding UX-06-A-001 — MAJOR**
- C1 guest artifact mixes decision context with dense explanatory contract language.
- Fix: chunk into `what this invite is`, `what guest means`, `what happens if I continue`; remove implementation vocabulary.

**Finding UX-06-A-002 — OBSERVATION**
- As J02 becomes fully interactive in later gates, ensure the number of visible actionable modules does not force users to remember which journey owns each task. This is not a current failure, but Gate B should retest it once the actions are real.

### UX-07 — Fitts’s Law
Applicability: **APPLIES**

**What works**
- Primary email/wallet buttons have large mobile hit areas.
- OTP/profile continuation actions are prominent.
- J02’s central Add action and bottom navigation have strong target size and reachability.

**Finding UX-07-A-001 — MINOR**
- The small `Demo` control is visually secondary yet persistently interactive near the header; it is not a user task and creates an unnecessary mobile target.
- Fix: remove from normal mode rather than merely resizing it.

## Cross-law synthesis

The most important finding is not a button-size or visual-polish issue. It is **continuity of the user’s mental model**:

> the same person, invite, group, history, terminology and visual system must survive the boundary between approved journey artifacts.

The screenshot exercise exposed that a sequence can satisfy individual Golden layouts while still violate Peak-End, Zeigarnik, Jakob, Tesler, and basic continuity simultaneously.

## Fix order

1. **Unify participant/persona state** from J01 into J02; support coherent new-person vs returning-person Home states.
2. **Unify invite fixture** across account-backed and guest entry.
3. **Re-express C1 guest semantics in ChopDot Golden visual language**; do not embed the contract-review artifact as product UI.
4. **Hide reviewer/demo controls** outside explicit reviewer mode.
5. Re-capture the full Gate A contact sheet.
6. Re-run the seven-law review only on changed/affected laws plus a full sequence sanity pass.
7. Human walkthrough before Gate A acceptance.

## Pilot-process conclusion

The seven-law review is useful and should become part of each stage gate, but it works best **after fidelity/continuity extraction and before human acceptance**. It should not become a new design bureaucracy or a numeric scoring system.

Gate A remains **CHANGES REQUIRED**.
