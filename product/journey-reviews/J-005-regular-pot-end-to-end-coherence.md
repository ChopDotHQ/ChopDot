# J-005 Regular Pot: End-To-End Coherence

## User Story

"I am Mina, I am using a regular pot for dinner, so I need to add costs, split/pay, confirm received money, and close the record without wondering which flow I am in."

## One Next Action

Review journey

## Screenshots

- Pots list: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/01-pots-list.png`
- Pot before first cost: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/02-pot-before-first-cost.png`
- Add expense sheet: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/03-add-expense-sheet.png`
- Pot after first cost: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/04-pot-after-first-cost.png`
- Split payment start: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/05-split-payment-start.png`
- Split payment created: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/06-split-payment-created.png`
- Leo pay link: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/07-leo-pay-link.png`
- Mina confirmation: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/09-mina-confirms-leo.png`
- Pot after confirmations: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/15-pot-after-confirmations.png`
- Close record review: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/16-close-record-review.png`
- Saved record: `artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/17-saved-record.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pots list | Pots | Friday Crew is visible | Open Friday Crew | Current balance is calm and compact | Opens pot detail |
| Pot before first cost | Friday Crew | Empty pot with group shortcut | Add first shared cost or Split this payment | Members and payment app are visible | Starts a normal cost or payment moment |
| Add expense sheet | Add expense | CHF 90 Apero entered | Save | Equal split stays secondary | Returns to pot with Apero visible |
| Pot after first cost | Friday Crew | CHF 60 still open | Add Expense | Review record and Settle Up are secondary | Continue adding or move to payment |
| Split payment start | Friday Crew | Payment capture is focused | Split this payment | Total, context, friends, TWINT | Creates friend payment links |
| Split payment created | Friday Crew | Two shares open | Share / Mark paid | Group status is visible after creation | Friends pay from links |
| Leo pay link | Pay Mina | CHF 40 to Mina | Mark paid | TWINT handoff details | Leo waits for Mina |
| Mina confirmation | Confirm Leo | CHF 40 from Leo | Confirm received | Exact payer and amount | Matching share is cleared |
| Pot after confirmations | Friday Crew | CHF 60 still open | Review record | Apero and Dinner both remain visible | Close review shows only remaining Apero shares |
| Close review | Friday Crew | Two CHF 30 shares still open | Add note to close | The open items are explicit | Enables close with note |
| Saved record | Friday Crew | Record saved with 2 open | Add Expense | Saved record explains the note and open items | Pot remains reusable |

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

- Dead ends: The first run found a capture screen dead end where entering the amount removed the context field. The screen now keeps amount and context together until the user splits the payment.
- Confusing copy: The bottom action row wrapped awkwardly on mobile. It now uses a compact "Still open" status.
- Stale or misleading state: The first full run found that the payment capture projection erased the normal Apero expense. The projection now preserves existing pot expenses.
- Stale or misleading state: The main pot summary originally counted the paid Dinner split as still open after Leo and Nina were confirmed. Confirmed payment-link legs now reduce only the matching visible balances.
- Amateur design signals: The normal mobile path is coherent enough to pass, but the split-created screen still has more explanatory status text than the rest of the app. It should be a later polish target after P-011.
- 2026-06-30 acceptance refresh: The pots list card was almost invisible in a fresh screenshot because the audit captured during row animation and the card inherited weak contrast. The card now uses explicit foreground text, and the runner waits for the row before screenshotting.
- 2026-06-30 acceptance refresh: The compact saved-record row said `Record saved`, `2 still open`, and `Closed` together. It now says `Saved` when open items remain, while the expanded saved record still states `Closed with open items`.
- 2026-06-30 screenshot review: The add-expense sheet was too transparent, the split-created screen had stale toast/status clutter, the confirm screen had no visible escape path near the action, and the saved-record state appeared twice. The current packet fixes those by using a solid sheet, suppressing redundant success toasts, keeping payment links as the split-created focus, pinning confirm/back actions to the bottom, and showing only one saved-record summary on pot home.
- 2026-06-30 final S1 cleanup: The add-expense sheet is a `QuickKeypadSheet` component inside `PotHome`, not a routed screen, so the product map now tracks it as an implementation detail instead of a separate journey surface.
- 2026-06-30 final S1 cleanup: The sheet boundary now uses a solid surface, visible rim, stronger shadow, and non-blurred overlay. The intent is to make the sheet feel like a precise object without making the background look smeared or distracting.

## Fixes

- [x] Add P-022 and DC-022 so the full normal pot story is tracked in the cockpit.
- [x] Add an executable P-022 runner that clicks the full app journey and captures screenshots.
- [x] Keep payment amount and context visible together on the capture screen.
- [x] Preserve existing normal pot expenses when saving a capture chapter.
- [x] Apply confirmed payment-link legs to the visible pot balance and close-record review.
- [x] Tighten the mobile action row copy after expenses are open.
- [x] Re-run the full screenshot journey after fixes.
- [x] Re-run the full 2026-06-30 acceptance packet after P-011 language cleanup.
- [x] Fix the pots-list legibility and saved-record contradiction found by visual review.
- [x] Apply the 2026-06-30 operator screenshot review fixes for add expense, split-created, confirm, and saved-record duplication.
- [x] Clarify the add-expense sheet boundary without relying on background blur.
- [x] Remove false product-map warnings for in-flow sheet components and stale audit script references.

## Decision

Ship decision: PASS

Reason: The normal pot journey now behaves as one coherent flow across add expense, split payment, friend pay link, receiver confirmation, remaining open amount, close review, and saved record. The pass also caught and fixed the exact two-track failure mode: capture no longer wipes normal expenses, and confirmed friend payments no longer remain counted as unpaid in the main pot summary.
