# ChopDot Experience Workbench — Start Here

## Golden journeys

1. Home / Orientation — V1.4
2. Create a Group — V2
3. Invite / Join — V1
4. Group Home — V1
5. Add an Expense — V1
6. Review / Correct Expense — V1.1
7. Review / Agree / Raise an Issue — V1.1
8. Overall Position — V1

## Current review

Journey 11 — Settle Up — **V1 Golden Candidate**

Read:

- `journeys/11-settle-up/README.md`
- `journeys/11-settle-up/spec.md`
- `journeys/11-settle-up/STATE_INVENTORY.md`
- `journeys/11-settle-up/VISUAL_QA.md`
- `registry/checkpoints/2026-09-04-j11-v1.json`

Restore the clickable prototype:

```bash
base64 --decode journeys/11-settle-up/v1-golden-candidate.html.gz.b64 | gzip -d > /tmp/chopdot-j11.html
```

## Journey boundary

Journey 11 chooses the person, scope, currency, amount, and payment method.

Journey 12 owns payment progress, external-app return, recipient confirmation, failure, proof, and updated balances.

## Current progress

- Registered journeys: 28
- Golden / Design Approved: 8
- Current journey: 11
- Remaining overall: 20
- Remaining in the in-app money loop: Journeys 11 and 12
- Full core loop still also needs Journey 01 — Enter ChopDot

## Map governance

`registry/journeys.json` is canonical. Generated maps must never be hand-edited or shortened.

Run `npm run gate` before freezing any journey.

## Workflow

**Registry → Generate map → Validate → Inherit → Build → Render → Inspect → State QA → Journey QA → Approve → Freeze**

Do not recreate the design from memory.
