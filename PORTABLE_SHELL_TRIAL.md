# Portable Shell Trial Contract

## Change Name

`portable-shell-trial-v1`

## Problem

ChopDot has a strong product ambition, but previous production-facing UI work
became heavy and drifted away from the user. The AI Studio shell proved that
small jobs, simple state, and end-to-end checks can produce a clearer product
surface quickly.

This trial tests whether that clearer shell can become a portable mini-app
foundation before adding backend, wallet, OCR, or payment complexity.

## Current Truth To Preserve

- ChopDot is a group-money product, not a dashboard or protocol console.
- Normal users should see one obvious next action per screen.
- `request_sent`, `marked_paid`, and `confirmed` are separate states.
- A payer saying they paid does not reduce the organizer's net position until
  the organizer confirms received.
- Finishing a group creates a readable group summary without changing open
  money truth.
- Internal/dev surfaces stay hidden from normal users.

## Scope In

- Keep the current local group-money journey working.
- Add environment capability seams only where they reduce host-specific code.
- Test the same journey in multiple host environments.
- Capture screenshots and capability notes for each host.

## Scope Out

- Real auth.
- Real payment processing.
- Wallet signing.
- Receipt OCR.
- Backend persistence.
- Cross-device sync.
- New group-money modes.
- Host-specific product forks.

## Requirements

1. The same source code SHALL run in standard web and mobile-browser contexts.
2. The normal journey SHALL remain:
   `guest -> group -> spend -> split -> settle -> payer paid -> confirm -> finish -> history`.
3. Environment behavior SHALL be represented as capabilities, not product
   forks.
4. Clipboard/share behavior SHALL use a capability seam with an honest fallback.
5. Normal UI SHALL NOT show adapter, protocol, host, native, proof, or state
   machine language.
6. Every normal screen SHALL keep one dominant next action.
7. Refresh/persistence limitations SHALL be called out until a persistence seam
   exists.
8. No new product mode SHALL be added before the portability proof packet exists.

## Scenarios

### Clipboard Capability

GIVEN a friend row is visible
WHEN the user taps Copy invite
THEN ChopDot attempts the environment clipboard capability
AND shows `Copied` if it succeeds
AND shows `Invite ready` if the host blocks clipboard access.

### Payment Truth

GIVEN Leo is open
WHEN Mina sends a link
THEN Leo becomes request sent
AND Mina's net position does not decrease.

GIVEN Leo is request sent
WHEN Leo marks paid
THEN Leo becomes needs confirm
AND Mina's net position does not decrease.

GIVEN Leo is needs confirm
WHEN Mina confirms received
THEN Leo becomes confirmed
AND Mina's net position decreases by Leo's amount.

### Finish Group

GIVEN Nina is still open
WHEN Mina finishes the group
THEN the group summary shows Nina as open
AND the still-open amount remains visible.

## Proof Packet

For each target host, capture:

- first-run / guest setup
- empty home
- create group
- group detail before spend
- add spend
- review split
- open balances
- settle up
- payer view
- needs confirm
- after confirm
- finish group
- history

Record:

- viewport size
- safe-area behavior
- clipboard/share behavior
- storage behavior
- back navigation behavior
- any host-specific blockers

## Falsifiers

Pause or kill this trial if:

- the shell requires separate product flows per environment;
- adapter work becomes larger than the group-money journey;
- the UI gets worse to satisfy a host;
- normal users see host/protocol/internal language;
- local-state limitations make the proof misleading;
- the same journey cannot be screenshot-proven in at least two environments.

## Next Ordered Tasks

1. Verify web/mobile-browser journey from a clean load. `Done for local web`
2. Add a minimal environment capability seam. `Done`
3. Route clipboard invite through the seam. `Done`
4. Add a persistence seam, still local-only. `Done`
5. Produce the first web/mobile proof packet. `Done for local web`
6. Select one mini-app host candidate for the second proof packet. `Next`

## Current Proof

Local web proof packet:

- path: `proof/portable-shell-web/`
- viewport: `390 x 844`
- screenshots: `20`
- report: `proof/portable-shell-web/report.json`
- storage: `localStorage` key `chopdot-portable-shell-state-v1`
- result: full normal journey completed and state persisted after refresh

Covered path:

```text
first run
-> guest setup
-> empty home
-> create group
-> group before spend
-> add spend
-> review split
-> open balances
-> settle up
-> request sent
-> payer view
-> needs confirm
-> confirm received
-> finish group
-> group summary
-> history/home
-> reload with persisted state
```
