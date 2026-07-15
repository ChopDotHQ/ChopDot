# P-009 Normal Pot Agent UI Audit

Status: `needs-fix`
Date: 2026-06-28

## User Journey

"I am testing ChopDot as Mina, Leo, Nina, and Omar on separate devices, so I need each person to use the visible app and reveal where the journey breaks."

## One Next Action

Run agent journey.

## Evidence

- Audit report: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/normal-pot-agent-ui-audit.md`
- Mina pot detail: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-mina-pot-detail.png`
- Mina add expense sheet: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/03-mina-add-expense-sheet.png`
- Leo pot detail: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-leo-pot-detail.png`
- Nina pot detail: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-nina-pot-detail.png`
- Omar pot detail: `artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-omar-pot-detail.png`

## What Passed

- Mina can open the normal pot and understand the organizer-owned job.
- `Add Expense` is visible and reachable from the first viewport.
- The add-expense sheet stays focused on amount, label, and split summary.

## What Failed

- Leo, Nina, and Omar each opened `/pots` from separate browser contexts and saw the same owner-style normal pot view.
- The normal pot view did not identify the active person or present a personal one-action payment job.
- The separate-device friend journey is therefore not proven through `/pots`.

## Supporting Test Result

`npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1` failed because the native chapter demo pots are no longer visible after the normal-pot reset. This is stale support coverage, not a normal-pot product pass.

## Decision

P-009 audit work is complete, but the journey result is `needs-fix`.

The next product fix is J-004: a no-app friend payment link. Friends should not be sent to the full normal pot view until ChopDot has either a personal link, invite identity, or real shared-session layer.
