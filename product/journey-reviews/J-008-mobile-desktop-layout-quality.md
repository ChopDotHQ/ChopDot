# J-008 Mobile/Desktop Layout Quality

## User Story

"I am Mina, I use normal pots to add costs, settle people, and close the record, so I need the core mobile and desktop screens to feel clean, intentional, and easy to scan."

## One Next Action

Keep the current money action obvious.

## Screenshots

- Mobile pots list: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-01-pots-list.png`
- Mobile pot detail: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-02-pot-detail.png`
- Mobile settle selection: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-03-settle-selection.png`
- Mobile settle person: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-04-settle-person.png`
- Mobile close review: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-05-close-review.png`
- Mobile close ready: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-06-close-review-ready.png`
- Mobile saved record: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-07-saved-record.png`
- Desktop pots list: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-01-pots-list.png`
- Desktop pot detail: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-02-pot-detail.png`
- Desktop settle selection: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-03-settle-selection.png`
- Desktop settle person: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-04-settle-person.png`
- Desktop close review: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-05-close-review.png`
- Desktop close ready: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-06-close-review-ready.png`
- Desktop saved record: `product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-07-saved-record.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Pots list | Pots | Active pots and balances scan as a list | Open a pot | Add remains visible in the app dock | Pot detail |
| Pot detail | Team Offsite | Net balance, spent, left, and open amount are visible | Add Expense | Member balances and close/settle actions sit below the active summary | Expense entry or settlement |
| Settle selection | Settle Up | Open amount is visible without the expense list competing | Choose the person to settle with | Individual owed amounts | Person settlement |
| Settle person | Settle Up | Person, direction, and amount are visible | Mark received | Context stays compact | Back to pot with updated state |
| Close review | Team Offsite | Open payments are visible before close | Add note / Close with note | Record explains only what is necessary | Saved record |
| Saved record | Team Offsite | Record saved and still-open count are visible | Add Expense | Saved note and open items are retained | Continue tracking or return later |

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

- Dead ends: No primary action is blocked in the captured mobile or desktop journey. Bottom padding now leaves room below scrollable money surfaces.
- Confusing copy: The normal pot loop remains status/action led. The close and saved-record states do not expose internal technical language.
- Stale or misleading state: The saved-record state is visible after closing with open items and keeps the still-open count in the first viewport.
- Amateur design signals: The desktop view no longer feels like a narrow phone screenshot stretched into a browser window. The remaining weakness is that the bottom dock is still a mobile-derived pattern on desktop, so this passes as a controlled polish step rather than a final desktop design system.

## Fixes

- [x] Widen the desktop app shell so normal pot screens use available space without becoming a full dashboard.
- [x] Shrink the desktop bottom dock and floating action button so it stops dominating the viewport.
- [x] Add safer bottom spacing to normal pot, pots list, settle selection, and settle person screens.
- [x] Re-capture the normal pot loop on mobile and desktop.
- [x] Verify the close/saved-record screenshots do not contain forbidden internal product language.
- [ ] Design a proper desktop navigation treatment later instead of relying on the mobile dock forever.

## Decision

Ship decision: PASS

Reason: J-001 through J-003 now hold together on both mobile and desktop. The normal pot loop keeps the active money job visible, avoids internal language, leaves primary actions reachable, and records the remaining desktop design debt clearly enough to move to the next journey without losing track.
