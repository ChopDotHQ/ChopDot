# J-010 Savings Circle Round

Date: 2026-07-01

Product card: P-006

## User Story

"I am Mina, I run a Friday savings circle, so I need to confirm this round's contributions and handle one delay so the group can close the round cleanly."

## One Next Action

Confirm received

## Screenshots

- Leo marks paid: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/01-leo-mark-paid.png`
- Leo waits for Mina: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/02-leo-waiting-confirmation.png`
- Mina confirms Leo: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/03-mina-confirm-leo.png`
- Mina sees Leo confirmed: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/04-mina-after-confirm.png`
- Mina records Nina delay: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/05-mina-records-nina-delay.png`
- Mina records Omar delay: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/06-mina-records-omar-delay.png`
- Mina prepares payout: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/07-mina-prepare-payout.png`
- Mina approves payout: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/08-mina-approve-payout.png`
- Mina records payout: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/09-mina-record-payout.png`
- Leo confirms payout: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/10-leo-confirm-payout.png`
- Leo after payout confirmation: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/11-leo-after-payout-confirm.png`
- Mina closes round: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/12-mina-close-round.png`
- Mina sees saved record: `artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/13-mina-round-closed.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Leo round entry | Friday savings circle | Round 1 · Leo | Mark paid | Total, confirmed, payout | Leo waits for Mina |
| Leo waiting | Friday savings circle | Waiting on Mina | None | Leo's row says marked paid | Mina confirms |
| Mina confirm | Friday savings circle | Confirm Leo | Confirm received | Contributions list stays visible | Leo becomes confirmed |
| Mina delay handling | Friday savings circle | Record delay | Record delay | Open member rows stay visible | Delayed rows count as handled |
| Mina payout prep | Friday savings circle | Prepare payout | Prepare payout | Payout recipient is visible | Payout approval step |
| Mina payout approval | Friday savings circle | Approve payout | Approve payout | Round record still visible | Payout record step |
| Mina payout record | Friday savings circle | Record payout | Record payout | Payout goes to Leo | Leo must confirm |
| Leo payout confirmation | Friday savings circle | Confirm payout | Confirm payout | Payout recorded | Round becomes closeable |
| Mina close round | Friday savings circle | Close round | Close round | 1 confirmed, 2 delayed | Saved record |
| Saved round | Friday savings circle | Record saved | None | 1 confirmed, 2 delayed | Journey complete |

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

- Dead ends: The previous generic chapter screen felt like a dashboard and exposed too many competing controls. The new focused round screen gives each person one visible next action.
- Stale or misleading state: The native signed-action path could persist Leo's action while leaving Leo's own screen stale if clicked before replay setup finished. The primary action now waits until the native session is ready.
- Confusing copy: Savings-circle payout steps previously inherited release wording. The normal UI now says payout.
- UI noise: Success toasts covered the bottom navigation even though the screen state already confirmed the action. Savings-circle success toasts are now suppressed.
- Sequencing: Close round previously appeared before payout confirmation. Close now waits until contribution handling and payout confirmation are complete.
- Visual concern: The dark/premium treatment is clean, but it differs from the lighter normal-pot baseline. Keep savings circles experimental until the cross-mode visual system is decided.

## Fixes

- [x] Persist `ChapterHome` updates back into the real pot state.
- [x] Hide developer controls unless explicitly requested by query flag.
- [x] Replace the generic chapter dashboard with a focused savings-round view.
- [x] Hide duplicate row actions when the hero owns the same next action.
- [x] Use payout language for savings-circle money-out steps.
- [x] Suppress redundant savings-circle success toasts.
- [x] Disable the savings primary action until the native session is ready.
- [x] Run the screenshot-backed Leo/Mina/Nina/Omar savings-circle flow.
- [x] Update the focused Playwright savings-circle suite.

## Decision

Ship decision: PASS for experimental S3 savings-circle journey.

Reason: Leo can mark paid, Mina can confirm received, Mina can record delays, Leo can confirm payout, and Mina can close the round with a readable saved record. The flow now works as a product journey rather than a lab surface.

Do not promote savings circles to the default `/pots` list yet. Keep them behind the experimental flag until the next design alignment pass decides whether advanced money modes share this darker treatment or inherit the normal pot background.
