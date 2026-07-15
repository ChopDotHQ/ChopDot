# J-004 No-App Friend Payment Link

## User Story

"I am Leo, Mina sent me a ChopDot link, so I need to know what I owe and pay without setting up an account first."

## One Next Action

Pay Mina.

## Screenshots

- Pay: `artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/01-leo-pay-link.png`
- Waiting: `artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/02-leo-done-for-now.png`
- Confirm: `artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/03-mina-confirm-link.png`
- Done: `artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/04-mina-confirmed-received.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Leo pay link | Pay Mina | 40.00 CHF to Mina | Mark paid | Friday Crew, TWINT details | Waiting for Mina |
| Leo waiting | Pay Mina | Marked paid | None | Waiting for Mina | Mina confirms |
| Mina confirm | Confirm Leo | 40.00 CHF from Leo | Confirm received | To Mina | Confirmed |
| Mina done | Confirm | Confirmed received | None | 40.00 CHF from Leo | Complete |

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

- Dead ends: fixed. Mina now lands on a confirmation result instead of being redirected away.
- Confusing copy: reduced. The friend link no longer explains the whole process.
- Stale or misleading state: none found in this pass.
- Amateur design signals: the link screens are clean enough for this journey, but still need a later broader visual system pass across light/dark, desktop, and friend-link polish.

## Fixes

- [x] Keep friend links focused on one amount, one receiver, and one action.
- [x] Keep confirmation links on the completed state after Mina confirms.
- [x] Remove process explanation from the visible payment handoff panel.
- [ ] Later: run a dedicated visual-system pass across all one-action link screens.

## Decision

Ship decision: PASS

Reason: Leo can pay from a single-purpose link without organizer controls, full pot chrome, setup pressure, or internal language. Mina can confirm the matching item and see a clear completed state.
