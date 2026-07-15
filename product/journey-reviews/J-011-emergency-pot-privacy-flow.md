# J-011 Emergency Pot: Privacy Flow

## User Story

"I am Casey, I want to help with an emergency, so I need to contribute privately without exposing Jordan's private details."

## One Next Action

Contribute

## Screenshots

- Batch 1 reference sheet: `product/design-references/chopdot-batch-1-flow-reference-2026-07-01/batch-1-contact-sheet.png`
- Batch 2 reference: `product/design-references/chopdot-batch-2-settlement-reference-2026-07-01/README.md`
- Consolidated principles: `product/design-references/chopdot-batch-1-2-consolidated-principles-2026-07-01.md`
- Emergency principles packet: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/index.html`
- Casey contributes: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/01-casey-contribute.png`
- Casey waiting: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/02-casey-waiting.png`
- Riley confirms Casey: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/03-riley-confirm-casey.png`
- Morgan contributes: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/04-morgan-contribute.png`
- Riley confirms Morgan: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/05-riley-confirm-morgan.png`
- Riley prepares release: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/06-riley-prepare-release.png`
- Riley approves release: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/07-riley-approve-release.png`
- Taylor approves release: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/08-taylor-approve-release.png`
- Riley records release: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/09-riley-record-release.png`
- Jordan confirms received: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/10-jordan-confirm-received.png`
- Riley closes pot: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/11-riley-close-pot.png`
- Riley saved record: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/12-riley-record-saved.png`
- Casey redacted saved record: `artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/13-casey-saved-redacted.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Casey contributes | Emergency pot | Private support for Casey | Contribute | Amount and organizer only in first viewport | Casey waits for organizer |
| Casey waiting | Emergency pot | Waiting on Riley | None | Casey sees the saved state without recipient details | Riley confirms |
| Riley confirms Casey | Emergency pot | Confirm Casey | Confirm received | Riley sees support list and private recipient status | Casey becomes confirmed |
| Morgan contributes | Emergency pot | Private support for Morgan | Contribute | Morgan sees only his support and private record state | Riley confirms Morgan |
| Riley confirms Morgan | Emergency pot | Confirm Morgan | Confirm received | Riley sees Casey confirmed and Morgan marked paid | All contributions ready |
| Riley prepares release | Emergency pot | Prepare release | Prepare release | Release amount and recipient are visible to organizer | Approval state opens |
| Riley approves release | Emergency pot | Approve release | Approve release | Riley's approval is one action | Taylor approval is still needed |
| Taylor approves release | Emergency pot | Approve release | Approve release | Taylor sees release context without extra admin controls | Release can be recorded |
| Riley records release | Emergency pot | Record release | Record release | Riley records the outside transfer after approvals | Recipient confirmation is next |
| Jordan confirms received | Emergency pot | Confirm received | Confirm received | Jordan sees only the receive job | Riley can close |
| Riley closes pot | Emergency pot | Close pot | Close pot | All required actions are complete | Saved private record |
| Saved record | Emergency pot | Record saved | None | Record stays private by default | Contributors see redacted completion |

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

- Privacy: Contributor screens do not expose Jordan's name, private reason, sensitive notes, or payment references.
- Clarity: Each role gets one obvious primary action instead of the previous lab-style status board.
- Trust: Casey, Morgan, Riley, Taylor, and Jordan each see the minimum state needed to understand their own job and the pot's readiness.
- Flow: Contribution, organizer confirmation, release preparation, approval, release record, recipient confirmation, and saved record are distinct without showing internal mechanics.
- Design: The first revision passed the journey but still looked like a compressed status board. The Batch 2 revision now uses a centered hero state, a single amount, one primary action, rounded premium panels, and compact supporting cards.
- Polish: Success toasts are suppressed for this focused emergency flow because the screen state itself confirms completion. This prevents transient feedback from competing with the bottom navigation.
- 2026-07-01 principle pass: The first viewport now contains only the emergency-pot title, hero state, amount, context line, and primary action. Target/raised/release details are below the focused moment.
- 2026-07-01 principle pass: The bottom nav is hidden during the focused emergency task so payment/approval/close actions feel decisive instead of competing with app navigation.
- 2026-07-01 principle pass: Privacy copy changed from defensive language to `Kept private` and `private by default`.
- 2026-07-01 screenshot review: The progress bar under the primary action looked like a broken pink underline, so it was removed from the hero. Release copy now reads `Recipient kept private` instead of `For Kept private`.

## Fixes

- [x] Replace emergency-pot lab layout with a focused ChopDot-native privacy flow.
- [x] Hide recipient/private reason from contributors and reviewers who do not need it.
- [x] Give each role one visible next action: contribute, confirm received, prepare release, approve release, record release, confirm received, close pot.
- [x] Update the focused Playwright emergency flow to use real UI actions only.
- [x] Capture a 13-screen agent run across Casey, Morgan, Riley, Taylor, and Jordan.
- [x] Compare the result against the Batch 1 one-screen-one-job design reference.
- [x] Apply the Batch 2 settlement/reference language: centered hero state, compact details, one dominant action.
- [x] Suppress success toasts in the focused emergency flow so completion screens stay clean.
- [x] Re-run the 13-screen agent packet after the Batch 2 UI pass.
- [x] Document Batch 1 + Batch 2 consolidated design principles for future checks.
- [x] Apply the consolidated principle pass: first viewport is hero/action only, app chrome hidden, and privacy copy softened.
- [x] Re-run the 13-screen agent packet after the consolidated principle pass.
- [x] Remove the misleading hero progress bar below the emergency primary action and refresh the Riley record-release screenshot.

## Decision

Ship decision: PASS

Reason: The emergency pot is now a privacy-first user flow instead of a technical chapter view. It shows each person only what they need, keeps sensitive details private by default, makes the next action obvious, follows the Batch 1/2 hero/detail/action pattern, and closes with a clean saved private record.
