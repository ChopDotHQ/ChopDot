# ChopDot Experience Workbench — Start Here

## Current truth

- 28 registered journeys
- 8 Golden journeys
- Journey 11 — Settle Up V1.1 is the current contract-strengthened candidate
- Journey 12 owns progress, confirmation, failure, proof and balance updates

## Open first

`journeys/11-settle-up/v1.1-golden-candidate.html`

Then read:

1. `journeys/11-settle-up/spec.md`
2. `journeys/11-settle-up/STATE_AND_AUTHORITY.md`
3. `journeys/11-settle-up/GIVEN_WHEN_THEN.md`
4. `journeys/11-settle-up/UI_TO_DOMAIN_EVENTS.md`
5. `journeys/11-settle-up/VISUAL_QA.md`

## Freeze gate

Run `npm run gate`. Journey 11 cannot become Golden unless the actual HTML/spec/QA files exist and both the workbench and payment-contract checks pass.
