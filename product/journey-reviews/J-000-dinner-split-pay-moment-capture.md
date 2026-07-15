# J-000 Dinner Split Pay-Moment Capture

## User Story

"I am Mina, I just paid CHF 120 for dinner in Zurich, so I need ChopDot to capture the moment and give Leo and Nina one clear way to pay me back."

## One Next Action

Split this payment.

## Screenshots

- Pot entry: `artifacts/chopdot-p001-capture/2026-06-29/p001-capture-2026-06-29/01-pot-capture-entry.png`
- Capture start: `artifacts/chopdot-p001-capture/2026-06-29/p001-capture-2026-06-29/02-mina-capture-start.png`
- Split created: `artifacts/chopdot-p001-capture/2026-06-29/p001-capture-2026-06-29/03-split-created.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pot entry | Friday Crew | No expenses yet | Split this payment | Leo, Nina, CHF | Capture screen |
| Capture start | Split this payment | Total needed | Split this payment | Scan receipt, paste link, friends, payment app | Payment links ready |
| Split created | Payment links are ready | 2 open | Share | Leo and Nina each owe 40.00 CHF | Friends pay |

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

- Dead ends: fixed. The normal pot now has a compact capture entry that opens the payment-moment screen.
- Confusing copy: reduced. The screen starts from payment amount and group context, not a process explanation.
- Stale or misleading state: fixed. Typing only a memo no longer moves the screen into review.
- Amateur design signals: after-state is acceptable for this pass, but the group-status panel below the first viewport still deserves a later copy and density pass.

## Fixes

- [x] Add a compact normal-pot entry for "Split this payment".
- [x] Make the capture screen amount/payment led instead of receipt-tool led.
- [x] Keep manual item editing hidden before capture.
- [x] Reduce share-link actions to one visible action per friend.
- [ ] Later: polish the lower group-status section after payment links are created.

## Decision

Ship decision: PASS

Reason: Mina can start from the normal pot, capture the dinner payment, create the split, and get one share action per friend without manual receipt-item entry or internal language.
