# Portable Receipt Review And Correction V1

> Product gate result: superseded before integration. The engineering boundary
> passed, but the normal journey scored 7/10 because `Add receipt` accepted
> photos while the prototype could only parse text fixtures. See
> `2026-07-15-portable-capture-truth-correction-v2.md`.

## Change Name

`portable-receipt-review-correction-v1`

## Programme

Track 1 capture. This is a bounded extension of the portable shell after the
integration checkpoint at `a5676d95ec40696a34d5d083d5856437b8145a67`.

## User Journey

I am Mina, I photographed a receipt, I need to review and correct what ChopDot
read, so the group never receives a request based on the wrong amount.

## One Next Action

`Add receipt` is the first capture action. After extraction, the one next action
becomes `Review split`.

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

## Problem

The portable shell currently starts spend capture with manual amount and title
fields. Receipt capture must reduce typing without allowing extracted data to
become money truth before the organizer reviews it. The legacy receipt slice
proved useful correction behavior but also exposed stale errors and toast
overlays that obscured controls. This implementation must rebuild the behavior
against `CaptureSpend` and `ReviewSplit`, not migrate legacy UI code.

## Current Truth To Preserve

- The portable shell runs the same product journey in web, Telegram, and `.dot`
  host profiles.
- `CaptureSpend` owns only draft input.
- `ReviewSplit` is the only normal UI that dispatches `ADD_EXPENSE`.
- Payment request, marked-paid, confirmation, closeout, host-session, wallet,
  and payment-intent semantics remain unchanged.
- The organizer can return from split review without losing the draft.
- Normal UI shows no host, protocol, adapter, proof, or state-machine language.

## Scope In

- Receipt-first entry inside `CaptureSpend`.
- A deterministic, replaceable receipt extraction boundary.
- Editable extracted total and merchant/title before split review.
- A clear `Needs review` state for readable receipt drafts.
- A clear manual correction state when a receipt cannot be read.
- A secondary manual amount path for users without a receipt.
- Preserved draft source, amount, and title when navigating back from split
  review.
- Unit and browser proof for readable receipt, unreadable receipt, correction,
  and no premature expense creation.

## Scope Out

- External OCR, Gemini API calls, camera permissions, or image preprocessing.
- Persisting receipt images or raw receipt text.
- Backend storage, cross-device sync, auth, deployment, or live host changes.
- Changes to split math, payment states, payment intents, wallets, closeout, or
  host adapters.
- Migration of `SpendCardScreen.tsx` or any legacy receipt UI.
- D-019 changes outside this new capture surface.

## Requirements

1. Spend capture SHALL present `Add receipt` before manual entry.
2. Manual entry SHALL remain available as a secondary path.
3. Extracted receipt data SHALL remain an in-memory draft until the user taps
   `Review split` and subsequently saves from `ReviewSplit`.
4. A readable receipt draft SHALL show `Needs review`, the detected total, the
   merchant/title, the payer, and the selected group.
5. The organizer SHALL be able to correct the detected total and merchant/title
   before split review.
6. An unreadable or unsupported receipt SHALL show a concise manual correction
   state without losing access to amount and title inputs.
7. `Review split` SHALL remain disabled until amount is positive and title is
   non-empty.
8. Returning from `ReviewSplit` SHALL preserve amount, title, and whether the
   draft came from a receipt or manual entry.
9. Receipt errors SHALL clear when a new receipt is chosen or when the user
   begins a valid manual correction.
10. Errors and status feedback SHALL render inline and SHALL NOT obscure any
    correction control or bottom action.
11. Receipt extraction SHALL NOT dispatch `ADD_EXPENSE`, create splits, send a
    request, or alter net positions.
12. Existing manual spend, late-expense, guest-return, host, payment-intent, and
    wallet behavior SHALL remain valid.

## Scenarios

### Readable Receipt

GIVEN Mina is adding spend to a group
WHEN she selects a supported receipt text fixture containing a merchant and a
positive total
THEN ChopDot shows `Needs review`
AND displays the detected merchant and total as editable fields
AND shows Mina as payer
AND no expense or split has been created.

### Correct Wrong Extraction

GIVEN the receipt draft shows a detected total of CHF 120.00
WHEN Mina changes the total to CHF 126.00
AND taps `Review split`
THEN the split review uses CHF 126.00
AND the computed member shares use the corrected amount.

### Unreadable Receipt

GIVEN Mina selects an unsupported image receipt in the deterministic prototype
WHEN extraction cannot read it
THEN ChopDot shows `We couldn't read this receipt`
AND presents amount and title correction controls
AND keeps `Review split` disabled until both are valid.

### Back Navigation

GIVEN Mina reviewed a receipt draft and opened split review
WHEN she goes back
THEN the corrected amount and title remain visible
AND the screen still identifies the draft as receipt-based.

### Money Authority

GIVEN a receipt has been selected and corrected
WHEN Mina has not tapped `Save spend` in `ReviewSplit`
THEN group total, balances, payment requests, and activity remain unchanged.

## AI Fit And Risk

- User job: avoid retyping receipt details while retaining control of money
  truth.
- Automation value: propose merchant and total; never decide or save.
- Non-AI fallback: manual amount and title entry.
- Review point: required before split review and again before `Save spend`.
- Confidence states: `needs_review` and `could_not_read`.
- False-positive cost: high because an incorrect amount can create incorrect
  balances and requests.
- False-negative cost: moderate because the user can enter the values manually.
- Sensitive data: receipt file contents stay in memory and are not persisted.
- Correction path: edit fields inline or choose another receipt.
- Initial metric: successful correction-to-review completion without premature
  expense creation.
- Rollout: local portable-shell proof only; no deployment in this change.

## Implementation Tasks

1. Add a pure receipt-draft extraction module and unit tests.
2. Add explicit capture source to the route draft contract.
3. Rebuild `CaptureSpend` as receipt-first with a secondary manual path.
4. Preserve receipt/manual source through `ReviewSplit` back navigation.
5. Add browser tests for readable, corrected, unreadable, and manual paths.
6. Update existing journey automation to choose manual entry explicitly.
7. Run lint, build, security baseline, focused unit tests, and browser proof.
8. Regenerate web and Telegram proof packets; run `.dot` host proof without
   deploying.
9. Update portable-shell documentation with actual evidence and remaining
   limitations.

## Proof Required

- Unit proof that supported text receipt extraction returns draft values and
  unsupported images return `could_not_read`.
- Browser proof that CHF 120.00 can be corrected to CHF 126.00 and equal shares
  are CHF 42.00 for Mina, Leo, and Nina.
- Browser proof that unreadable receipt recovery has reachable fields and no
  overlay.
- Browser proof that navigating back preserves the receipt draft.
- Existing journey proof remains green after explicitly choosing manual entry.
- Screenshots at mobile viewport for receipt review and correction.

## Falsifiers

Stop and do not merge if:

- selecting a receipt creates an expense or request;
- extracted data is labeled saved, confirmed, or final;
- correction controls are hidden, covered, or unreachable;
- manual spend becomes unavailable;
- existing payment or host semantics change;
- web, Telegram, and `.dot` require separate product implementations.

## Documentation Impact

- Update `PORTABLE_SHELL_TRIAL.md` because receipt capture moves from explicit
  scope-out to a bounded post-trial extension.
- Update `HOSTS.md` or host proof records only if host-specific evidence changes.
- No ADR is required unless the extraction boundary gains an external provider,
  persistence, or security authority.
