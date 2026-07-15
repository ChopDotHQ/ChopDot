# J-002 Normal Pot: Settle One Person

## User Story

"I am Mina, I am done adding expenses, so I need to collect from one person and return to the pot knowing what changed."

## One Next Action

Settle Up

## Screenshots

- Before: `product/evidence/screenshots/post-settlement-pot-state/06-before-settle-final.png`
- Person selection: `product/evidence/screenshots/settle-flow-review/11-settle-selection-proof-clean.png`
- Payment action: `product/evidence/screenshots/settle-flow-review/12-settle-person-proof-clean.png`
- Done state: `product/evidence/screenshots/settle-flow-review/15-settle-confirmed-final.png`
- After return: `product/evidence/screenshots/post-settlement-pot-state/08-back-to-pot-after-received-final.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pot detail | Polkadot Builder Party | Open amount visible | Settle Up | Recent expenses stay below the fold | Opens who-to-settle list |
| Settle list | Settle Up | One open amount | Select person | Pay/collect rows explain direction | Opens selected payment |
| Selected person | Settle Bob | Amount and method visible | Mark received | Payment method is secondary | Shows done state |
| Done state | Money received | Single result visible | Back to pot | Saved-on-device note only | Returns to pot |
| Pot detail after return | Polkadot Builder Party | Open amount reduced | Add Expense | Received notice confirms what changed | Continue tracking or settle remaining people |

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
- Comparative bar: 0/1
- Total: 8/10
- Decision: PASS

## Findings

- Dead ends: The flow now returns to the same pot after confirmation.
- Confusing copy: The worst internal wording was removed from the normal flow. The remaining copy is short enough to scan.
- Stale or misleading state: Pot detail and Settle Up now agree on the open amount after the guest identity fix.
- Amateur design signals: Desktop still needs a dedicated composition pass; it currently works but does not yet feel as intentionally designed as mobile.

## Fixes

- [x] Remove early settlement suggestions from the normal expenses view.
- [x] Make the settlement flow one amount, one person, one action.
- [x] Return to the same pot with a clear received-state notice.
- [x] Align pot balance math with the Settle Up calculation.
- [ ] Run a dedicated desktop design pass before calling the journey visually excellent.
- [ ] Compare against the live published ChopDot pot flow before raising visual quality above 8/10.

## Decision

Ship decision: PASS

Reason: This journey is now product-legible and usable enough to continue. It is not a final visual-design benchmark; it passes because the user can understand the job, take one action, see the changed state, and avoid internal language.
