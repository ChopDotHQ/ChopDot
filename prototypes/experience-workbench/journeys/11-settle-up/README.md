# Journey 11 — Settle Up V1.1 Contract Candidate

Open `v1.1-golden-candidate.html`.

## Preserved flow

`Overall Position → Settle with one person → Confirm exact scope → Choose method and amount → Review → Start or record payment → Journey 12`

## Added guardrail

- actual payment states and authorities remain distinct;
- payer-marked-sent never closes a payment;
- external/manual payment waits for receiver confirmation;
- exact finalized wallet/provider transfers close only exact matched items;
- retries are idempotent;
- agents prepare by default and execute only under exact valid delegation;
- payment systems remain replaceable integrations.

## Review files

- `spec.md`
- `STATE_AND_AUTHORITY.md`
- `GIVEN_WHEN_THEN.md`
- `UI_TO_DOMAIN_EVENTS.md`
- `PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md`
- `SCREEN_STATE_MAPPING.json`
- `UI_EVENT_MAPPING.json`
- `VISUAL_QA.md`
- `contract-validation.json`
