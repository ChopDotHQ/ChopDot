# Journey 11 V1.1 — Visual, Contract and Journey QA

## Preserved Golden language

No broad redesign was made. The candidate retains the Journey 1–10 frame, typography, surfaces, spacing, Lucide-style icons, restrained pink accent and focused footer actions.

## Contract-driven visible corrections

- Removed workshop copy such as `Journey 12 handoff` from product screens.
- Replaced it with human states and actions.
- Changed cash/manual wording from `Mark as paid` to `Record a payment` and `Record as sent`.
- Kept **sent** visually and semantically separate from **complete**.
- Added clear Journey 12 boundary previews for **Sent**, **Waiting for confirmation**, **Received**, **Failed** and **Complete**.
- Added separate exact wallet-received/complete and partial-payment waiting/complete states.
- Kept one obvious primary action on the default Journey 11 screen.

## Contract mapping

- 88 explicit screens.
- Every screen has `data-payment-state` and `data-transition-authority`.
- Every primary action has `data-domain-event` and `data-authority`.
- Complete mappings are stored in `SCREEN_STATE_MAPPING.json` and `UI_EVENT_MAPPING.json`.
- No visible product screen contains the prohibited architecture terms.

## Required visual states

The QA render set includes, at both 393 × 852 and 430 × 890:

- default settlement;
- TWINT review;
- external app opened;
- payer marked sent;
- waiting for receiver confirmation;
- receiver-confirmed/received;
- failed with safe retry;
- complete with updated balance;
- wallet approval;
- exact wallet received and complete;
- partial payment waiting and complete;
- open issue;
- balance changed;
- wallet cancellation;
- quote expiry.

## Functional checks

- 284/284 internal hash links resolve;
- no duplicate IDs;
- 176 full-layout checks across all 88 states and both target phone sizes;
- 78 retained screenshots covering the important flows and contract states;
- no horizontal overflow;
- no header/content/footer overlap;
- no clipped primary cards;
- no placeholder icon glyphs;
- repeated-click retry maps to the same idempotency scope;
- external/manual sent states never route directly to complete;
- wallet status advances through provider/network refresh, not a payer receipt claim;
- mixed-currency estimates never appear as payment instructions.

## Small Golden correction

Journey 07's earlier group-wide blocking wording is narrowed: only payment items dependent on the disputed expense are blocked. The Journey 07 interaction design does not change.

## Verdict

**Contract-strengthened Golden Candidate. Not Golden until the actual HTML/spec/QA exist on `ux/experience-workbench`, the expanded workbench gate passes, and the user approves it.**

<!-- J11_COMPATIBILITY_CLOSEOUT:START -->
## Compatibility closeout QA

- Existing Journey 11 V1.1 layouts and happy-path screen count are unchanged.
- Five recovery-only screens were added: cancellation separation, approval expiry, result unknown and recovery; existing waiting, rejected and disconnected screens were repurposed.
- **Approve in wallet** now requests approval before authorization.
- Visible chain branding was removed.
- All 93 states passed 393×852 and 430×890 layout checks: 186/186, with no overflow, frame overlap or clipped primary card.
- Default settlement and existing payment-status screens are pixel-identical; wallet copy changes are limited to chain-neutral wording.
- Sent, waiting, received, failed and complete remain visually distinct.
- The expanded banned-language scan passes.
<!-- J11_COMPATIBILITY_CLOSEOUT:END -->
