# ChopDot Experience Workbench — Start Here

## Current truth

- 28 registered journeys
- 9 Golden journeys
- Journey 11 — Settle Up V1.1 remains frozen as Golden #9
- Journey 12 — Complete Settlement V1 is the current Golden Candidate
- Running the gate preserves Journey 12 progress

## Open first

`journeys/12-complete-settlement/v1-golden-candidate.html`

Then read:

1. `journeys/12-complete-settlement/spec.md`
2. `journeys/12-complete-settlement/STATE_AND_AUTHORITY.md`
3. `journeys/12-complete-settlement/GIVEN_WHEN_THEN.md`
4. `journeys/12-complete-settlement/UI_TO_DOMAIN_EVENTS.md`
5. `journeys/12-complete-settlement/VISUAL_QA.md`

## Review boundary

Do not alter Journeys 1–11. Do not freeze Journey 12 without explicit user approval.

## Gate

Run `npm run gate`. It must preserve Journey 12 as current and verify the Journey 11 Golden checksum.
