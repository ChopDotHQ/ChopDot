# ChopDot Batch 2 Settlement Reference

Date: 2026-07-01

Source files:

- `screenshots/batch-2.png`
- `screenshots/batch-2b.png`

## Why This Reference Matters

Batch 2 is the stronger visual reference for post-expense, settlement, receipt, and activity screens.

The useful parts are:

- one focused phone-sized screen per job;
- dark premium money-app surface;
- a centered hero state for confirmations and completion;
- one dominant pink action;
- compact detail cards below the hero;
- no dense dashboard metrics before the user understands the job;
- short labels instead of explanatory paragraphs;
- payment method and activity rows that feel tappable and finished;
- receipts that look like saved records, not raw data.

## Design Rules To Reuse

- Start with the user state: request sent, mark as paid, payment received, all settled.
- Show one amount or one status as the hero.
- Put supporting money details in a single compact card.
- Keep secondary actions light and below the primary action.
- Use status rows for activity instead of process diagrams.
- Keep technical or proof language outside normal UI.

## Applied Immediately

P-007 emergency pot was revised after this reference because the first implementation worked but looked like a compressed status board. The revised emergency flow uses:

- a centered hero icon/status;
- one primary action;
- one compact summary card;
- compact support rows;
- a private-record card that reinforces redaction without showing private details.
