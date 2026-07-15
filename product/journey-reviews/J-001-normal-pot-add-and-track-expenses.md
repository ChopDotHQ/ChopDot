# J-001 Normal Pot: Add And Track Expenses

## User Story

"I am Mina, I need to track costs during a shared evening or trip, so the group can see what has been spent and keep adding expenses until we are ready to settle."

## One Next Action

Add Expense

## Screenshots

- Pots list: `product/evidence/screenshots/normal-pot-j001-pass/01-pots-list.png`
- Pot detail before action: `product/evidence/screenshots/normal-pot-j001-pass/02-pot-before-add.png`
- Add expense sheet empty: `product/evidence/screenshots/normal-pot-j001-pass/03-add-expense-sheet-empty.png`
- Add expense sheet ready: `product/evidence/screenshots/normal-pot-j001-pass/04-add-expense-sheet-ready.png`
- Pot detail after add: `product/evidence/screenshots/normal-pot-j001-pass/06-pot-after-add-clean.png`
- Desktop pot before add: `product/evidence/screenshots/normal-pot-j001-desktop-compare/01-local-desktop-pot-before.png`
- Desktop add sheet: `product/evidence/screenshots/normal-pot-j001-desktop-compare/02-local-desktop-add-sheet.png`
- Desktop add sheet ready: `product/evidence/screenshots/normal-pot-j001-desktop-compare/03-local-desktop-add-ready.png`
- Desktop pot after add: `product/evidence/screenshots/normal-pot-j001-desktop-compare/04-local-desktop-after-add.png`
- Published app comparison: `product/evidence/screenshots/normal-pot-j001-desktop-compare/10-live-desktop-pots.png`

## Product Mapping

- Product card: P-018 Normal pot expense tracking
- Pillar: Catch
- Supporting pillar: Management
- Current boundary: normal expense add-and-track only; close record remains J-003
- Comparative bar: local desktop is bounded like the published app instead of stretching full width

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pots list | Pots | Existing pots visible | Open pot | Pot cards show current group context | Opens pot detail |
| Pot detail | Team Offsite | Spent, left, open amount, balances | Add Expense | Settle Up and balances are visible | Opens quick add sheet |
| Add expense sheet | Add expense | Amount starts empty | Save | Title and split summary are visible; split settings are behind Change | Adds expense and returns to pot |
| Pot detail after add | Team Offsite | Updated spent/open balances | Add Expense | Recent activity appears below main card | Continue adding costs or settle later |
| Desktop pot detail | Team Offsite | Same hierarchy in a bounded desktop shell | Add Expense | Recent activity appears below the primary card | Opens centered add sheet |
| Desktop add sheet | Add expense | Centered modal over same pot context | Save | Split details stay secondary | Returns to bounded desktop pot |

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
- Comparative bar: 1/1
- Total: 10/10
- Decision: PASS

## Findings

- Dead ends: The main cycle is not a dead end. Add Expense opens the sheet, Save returns to the pot, and the new expense appears in Recent Activity.
- Confusing copy: Normal UI language is clean. It does not leak internal terms.
- Stale or misleading state: The after-state updates spent, open amount, member balances, and activity.
- Amateur design signals: The quick-add sheet is now amount/title first, but the dark treatment still needs a later brand-system pass before it becomes the final visual benchmark.
- Product mapping mismatch: Fixed by adding P-018 for normal pot expense tracking.
- Desktop comparison: The local desktop view is bounded and composed like the published app, while keeping the current dark theme. It no longer reads as a full-width dashboard or lab panel.

## Fixes

- [x] Restore normal Add Expense as the primary action.
- [x] Hide experimental capture/chapter surfaces from the normal pot path.
- [x] Move settlement suggestions out of the first expense view.
- [x] Make quick add feel like a focused money entry sheet, not a dense form.
- [x] Delay or reduce payback UI until the user indicates they are done adding expenses.
- [x] Add or split a product card for the normal manual expense tracking journey.
- [x] Run the same journey on desktop and score it separately.
- [x] Compare the screen against the live published ChopDot flow before raising the visual score.

## Decision

Ship decision: PASS

Reason: The normal-pot add-and-track cycle now has one clear primary action, a focused add sheet, updated post-save state, clean language, mobile screenshots, desktop screenshots, and a published-app comparison. This passes the current J-001 quality bar.
