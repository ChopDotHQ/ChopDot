# Portable Capture Truth Correction V2

## Change Name

`portable-capture-truth-correction-v2`

## Problem

The receipt candidate made `Add receipt` the dominant action and accepted image
files, but the deterministic prototype cannot extract real receipt photos. That
normal journey promised reduced work and then always required manual entry.

## Current Truth To Preserve

- `ReviewSplit` remains the only normal UI that dispatches `ADD_EXPENSE`.
- Draft amount and title survive Back navigation.
- Payment, host, wallet, closeout, and payment-intent semantics are unchanged.
- The provider-neutral extraction module remains available for a future,
  privacy-reviewed image extraction implementation.

## User Journey

I am Mina, I need to enter one spend quickly, so the group can review the split
without ChopDot promising automation that does not exist.

## One Next Action

Enter amount and reason, then tap `Review split`.

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

## Scope In

- Restore manual amount and reason as the normal capture surface.
- Remove receipt file selection and filenames from normal UI.
- Keep the improved draft/save authority boundary.
- Keep the extraction seam and unit tests dormant for future provider work.
- Regenerate normal web and Telegram journey evidence.

## Scope Out

- Image OCR, camera capture, file upload, or text-fixture import in normal UI.
- Deployment or live `.dot`/Telegram proof.
- Payment, split math, wallet, host, or closeout changes.

## Requirements

1. Normal `Add spend` SHALL open amount and reason fields directly.
2. Normal UI SHALL NOT show `Add receipt`, file selection, receipt filenames,
   OCR, or extraction language.
3. `Review split` SHALL be the sole dominant bottom action.
4. `Review split` SHALL remain disabled until amount and reason are valid.
5. Back navigation SHALL preserve amount and reason.
6. No expense SHALL exist before `Save spend` in `ReviewSplit`.
7. Existing money and host semantics SHALL remain unchanged.

## Scenarios

GIVEN Mina opens `Add spend`
WHEN the screen appears
THEN amount and reason are immediately available
AND no receipt or file promise is visible.

GIVEN Mina enters 120 and `Dinner at Gusto`
WHEN she taps `Review split`
THEN the review shows the same values
AND no expense exists before `Save spend`.

GIVEN Mina returns from split review
WHEN capture reopens
THEN amount and reason are preserved.

## Proof

- Local web and Telegram 24-step journeys pass.
- Manual capture screenshot shows amount/reason with one bottom action.
- Type-check, build, security baseline, capture regression, guest return,
  late-expense, and host UI remain green.

## Documentation Impact

- Update `PORTABLE_SHELL_TRIAL.md` to remove the receipt candidate from current
  product proof.
- Keep the failed candidate plan as historical product-gate evidence.
- No wiki or ADR change is required because no provider or durable architecture
  decision has been adopted.

## Live Proof Addendum

After the local correction passed and was integrated as commit `07936cd`, the
same source was deployed to the Paseo `.dot` host and the existing Vercel
Telegram profile on 2026-07-15.

- `.dot`: 22-frame live journey passed with persisted reload.
- Telegram profile: 24-frame live host simulation passed, including the
  fresh-device payer action and persisted reload.
- Review: `proof/portable-capture-live-host-proof-2026-07-15.md`.
- Real Telegram client and completed Polkadot Product Account login remain
  separate proof gates.
