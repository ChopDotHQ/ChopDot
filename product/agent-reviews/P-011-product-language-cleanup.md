# P-011 Product Language Cleanup

Status: `PASS`
Date: 2026-06-30
Reference: `product/design-references/kast-premium-money-app-2026-06-30/README.md`

## User Story

"I am a first-time ChopDot user, so I need the app to tell me what to do without technical or internal vocabulary."

## One Next Action

Clean visible copy.

## Screenshots

Source run:

- `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/p022-regular-pot-coherence-audit.md`

Key screenshots:

- Split created: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/06-split-payment-created.png`
- Friend pay link: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/07-leo-pay-link.png`
- Marked paid: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/08-leo-marked-paid.png`
- Close review: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/16-close-record-review.png`
- Saved record: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/17-saved-record.png`

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

## Visual Quality Gate

- Hierarchy: 1/1
- Spacing: 1/1
- Typography: 1/1
- Shape system: 1/1
- Color discipline: 1/1
- Copy tightness: 1/1
- State timing: 1/1
- Mobile fit: 1/1
- Desktop fit: 0/1
- Comparative bar: 1/1
- Total: 9/10
- Decision: PASS

## Findings

- Split-created had process-manual copy: `Payment links are ready`, `2 shares still need to be marked paid before receivers can confirm`, and a teaching sentence about `Mark paid` vs `Confirm received`.
- Friend pay link showed a redundant `ready to pay` status.
- Marked-paid state used notification-style copy instead of compact status.
- Close review had an overly bright note textarea in the dark app surface.
- Saved record said `0 of 2 confirmed`, which was accurate but awkward when the record was intentionally closed with open items.

## Fixes

- [x] Replaced split-created header with `Payment links` / `Send to Leo and Nina`.
- [x] Reduced group status to compact `waiting to pay` and `waiting to confirm` labels.
- [x] Removed the teaching sentence from the normal split-created UI.
- [x] Hid redundant `ready to pay` copy on the friend pay link.
- [x] Changed marked-paid state to `Marked paid` / `Mina confirms next`.
- [x] Updated close note styling to match the dark surface.
- [x] Changed saved-record summary to `2 still open`.
- [x] Updated focused tests to assert the new user-facing language.

## Verification

- `node scripts/run-p022-regular-pot-coherence-audit.mjs` -> PASS
- `npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-spend-loop.spec.ts --project=chromium --workers=1` -> PASS
- `npm run type-check` -> PASS
- `npm run product:validate` -> PASS with existing cockpit warnings

Known unrelated failures from broader capture run:

- `tests/e2e/capture-firma-webhook.spec.ts`: webhook simulation returned `ok=false`.
- `tests/e2e/capture-image-receipt-flow.spec.ts`: OCR receipt flow did not reach an enabled confirm button.

These failures are outside the normal-pot visible language cleanup and should be handled under the receipt/webhook cards.

## Decision

Ship decision: PASS.

Reason: The regular pot journey now uses compact app-status language, keeps internal terms out of normal UI, and better matches the premium money app reference without changing the underlying product state model.

