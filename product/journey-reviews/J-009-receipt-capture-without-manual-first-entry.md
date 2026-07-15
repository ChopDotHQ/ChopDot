# J-009 Receipt Capture Without Manual-First Entry

## User Story

"I am Mina, I just paid for dinner, so I need to add the receipt or payment link and have ChopDot prepare the split without making me type everything."

## One Next Action

Add receipt

## Screenshots

- Add receipt: `artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/01-add-receipt.png`
- Review split: `artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/02-review-split.png`
- Payment links: `artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/03-payment-links.png`
- Screen/text/state review: `artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/p012-receipt-capture-review.json`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Capture start | Add receipt | No manual amount yet | Add receipt | Paste payment link, Enter total instead | Receipt/photo/link creates review draft |
| Review split | Ready to split | Receipt saved, total parsed | Split this payment | Change payment app, Change split | Payment links are created |
| Payment links | Send to Leo and Nina | 2 open | Share | Per-person amount | Friends get one payment action |

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

- The old start state made manual amount entry the loudest path. The new start state makes receipt capture the obvious path.
- Manual total entry is now a fallback behind "Enter total instead".
- Item editing remains behind "Change split" and only appears after a capture exists.
- The first review screenshot initially had a success toast covering the primary action. That toast was removed.
- The receipt card initially repeated "saved"; it now shows "Receipt" and one saved status.
- Normal UI text in the final screenshot review contains no forbidden internal terms.

## Fixes

- [x] Made `Add receipt` the first primary action.
- [x] Moved manual amount entry behind a fallback.
- [x] Kept payment-link paste as the secondary capture path.
- [x] Removed the receipt-read toast from the review screen.
- [x] Removed duplicate saved copy from the receipt summary.
- [x] Updated receipt-focused Playwright specs.
- [x] Captured and reviewed screenshots.

## Decision

Ship decision: PASS

Reason: Mina can start from a receipt/photo/link, review the parsed total and split, and create payment links without starting from manual item entry or a form dump.
