# Late Expense After Payment Request V1

Status: complete locally and on the live Paseo host

## Current truth to preserve

- The portable shell runs the same normal group-money journey on web, Telegram, and the Polkadot host.
- A payment request has a fixed payer, receiver, and amount.
- A sent request must not silently change because another expense is added later.
- Confirmed payment changes only the matching share.

## Scope in

- Keep `Add expense` available after settlement has started and until the group is saved.
- Remove the premature `Finish group` action while required payments remain open.
- Preserve existing sent-request amounts when a later expense is added.
- Offer one explicit action to send the additional amount after a late expense.
- Add regression proof for the late-expense state.

## Scope out

- Cancelling or replacing a sent payment request.
- Partial payments.
- Main ChopDot changes.

## Requirements

1. The group detail screen SHALL offer `Add expense` whenever the group contains expenses but has not been saved.
2. An open balance SHALL keep one payment action visually dominant.
3. `Finish group` SHALL NOT be offered from group detail while required payment shares remain open.
4. Adding an expense SHALL NOT rewrite an existing `request_sent` share.
5. The newly added expense SHALL create new `open` shares and update the group total.
6. Normal UI SHALL NOT expose internal state or host language.
7. When a later expense adds an open amount, the receiver SHALL be able to send
   an updated link for the full remaining amount.
8. A non-PAS payer SHALL retain the external-payment `I paid` action; a PAS
   payer SHALL retain the wallet payment action.

## Scenarios

### Forgotten expense after request

GIVEN Mina has sent Leo a payment request for USD 5
WHEN Mina adds a forgotten USD 10 expense split equally
THEN Leo's existing request remains USD 5
AND the new Leo share remains open
AND the group total becomes USD 20
AND `Add expense` remains reachable
AND Mina can request the additional USD 5 owed by Leo.

### Open group action hierarchy

GIVEN the group still has an unpaid share
AND no payment request has been sent
WHEN Mina returns to the group
THEN `Settle up` is the primary action
AND `Add expense` is the secondary action
AND `Finish group` is not shown.

### Sent request stays fixed

GIVEN Mina has sent Leo a payment request
WHEN Mina returns to the group before Leo pays
THEN ChopDot shows that the group is waiting for Leo
AND `Add expense` remains available
AND ChopDot does not offer to recalculate the sent request.

## Proof

- Focused reducer regression test.
- Focused browser click-through at mobile size.
- Screenshot before adding the late expense.
- Screenshot after saving the late expense.
- Screenshot of the additional-request action and updated payer total.
- Type-check and production build.
- Live Paseo deployment and 22-screen hosted journey replay.

## Result

- Final CID: `bafybeiehgkzuyejf5gllweyavsfpfm2rfxdeu4vooh3ukmt3wyhjoxrp7q`
- Local reducer, late-expense browser, five-person UI, type-check, and build gates passed.
- Live browser proof passed from the pending request through forgotten expense,
  `Request $10.00 more`, updated `$15.00` link, and Leo's `I paid Mina` action.
- Full live hosted journey passed with 22 screenshots and reload persistence.
