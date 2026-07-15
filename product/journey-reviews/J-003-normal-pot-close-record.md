# J-003 Normal Pot: Close Record

## User Story

"I am Mina, I finished adding costs and collecting from people, so I need to close the pot with a readable record the group can trust later."

## One Next Action

Close record

## Screenshots

- Before: `product/evidence/screenshots/normal-pot-j003-close-record/mobile-01-pot-before-close.png`
- Review: `product/evidence/screenshots/normal-pot-j003-close-record/mobile-02-close-review-open-items.png`
- Note ready: `product/evidence/screenshots/normal-pot-j003-close-record/mobile-03-close-review-note-ready.png`
- After: `product/evidence/screenshots/normal-pot-j003-close-record/mobile-04-saved-record.png`
- Desktop before: `product/evidence/screenshots/normal-pot-j003-close-record/desktop-01-pot-before-close.png`
- Desktop review: `product/evidence/screenshots/normal-pot-j003-close-record/desktop-02-close-review-open-items.png`
- Desktop after: `product/evidence/screenshots/normal-pot-j003-close-record/desktop-04-saved-record.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pot detail | Team Offsite | Open amount and member balances visible | Review record | Add Expense remains available | Opens close-record review |
| Close review | Team Offsite | Three payments still open | Add note to close | Each open payment is listed by person and amount | Enables close action |
| Close review with note | Team Offsite | Note added | Close with note | Open items remain visible | Saves record and returns to pot |
| Pot detail after close | Team Offsite | Record saved, 3 still open | Add Expense | Saved record and note are visible below the summary | Continue tracking or return later |

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
- Desktop fit: 1/1
- Comparative bar: 0/1
- Total: 9/10
- Decision: PASS

## Findings

- Dead ends: The first screenshot pass caught a real mobile blocker where the bottom nav intercepted the close button. The close-review route now hides the bottom nav.
- Confusing copy: The review screen copy was shortened from explanation-led text to status and action language.
- Stale or misleading state: The first implementation returned to the pot before the saved state was visible. The close action now waits for persistence and shows `Record saved` in the first viewport.
- Amateur design signals: The saved record is readable and useful, but the broader desktop/mobile composition still needs the dedicated J-008 visual pass before this becomes the final benchmark.

## Fixes

- [x] Add a real close-record route from the normal pot detail screen.
- [x] Hide bottom navigation on close-record review so the final action is reachable on mobile.
- [x] Require a note before closing with open payments.
- [x] Save the close record into pot state and show it after returning.
- [x] Include the closing note in the saved record.
- [x] Check screenshots for mobile and desktop.
- [x] Check normal UI for forbidden internal language.
- [ ] Fold J-001 through J-003 into the dedicated J-008 desktop/mobile visual quality pass.

## Decision

Ship decision: PASS

Reason: The normal pot can now move from expenses to settlement to a readable saved record. The flow clearly shows what is still open, blocks closing without a note, saves the note, and returns to a visible saved-record state without internal technical language.
