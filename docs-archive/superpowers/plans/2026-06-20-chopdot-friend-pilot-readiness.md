# ChopDot Friend Pilot Readiness Plan

Date: 2026-06-20
Programme: B product usability + Track 1 readiness
Status: local-gate-ready

## Goal

Create a repeatable friend-pilot contract that proves whether real people can use ChopDot without technical narration across:

- group expenses
- savings circles
- emergency pots
- community funds
- capture/pay/confirm links
- closeout receipts
- onboarding/guest entry
- visible Polkadot-native blocked gates

## Why This Exists

Local Playwright, Vitest, and agent simulations prove the mechanics. They do not prove that friends understand the product in the room.

This plan converts the remaining "needs friend pilot" gap in `use-case-9-completeness-scorecard-2026-06-20.md` into a concrete test script with pass/fail criteria.

## Acceptance Bar

A mode can be promoted to 9/10 only when at least three real participants can, without coaching:

1. open the right surface,
2. state their own next step,
3. name who the group is waiting on,
4. complete their action from their own device,
5. explain why claim, confirmation, approval, release, and closeout are separate,
6. recover from one delay or open item,
7. find or explain the receipt,
8. avoid custody, escrow, guaranteed payout, or verified-payment interpretations,
9. understand that live `.dot`/host proof is blocked if shown.

## Tasks

- [x] Create the friend-pilot script with scenario prompts, devices, roles, pass/fail checks, and evidence fields.
- [x] Include all four core modes and capture/pay/confirm.
- [x] Include sensitive-mode checks for emergency privacy and community approval.
- [x] Include explicit falsifiers for unsafe user beliefs.
- [x] Add a validator so the script cannot omit required modes, questions, or pass/fail gates.
- [x] Add a results ledger so no scenario can be promoted without participant/device/action/receipt evidence.
- [x] Register the artifacts in the master coverage registry.
- [x] Update the 9/10 scorecard to point to this as the next human evidence gate.

## Verification

```bash
npm run validate:friend-pilot
npm run validate:chopdot-coverage
```

No product runtime tests are required for this planning pass unless app code changes. Runtime evidence remains covered by the existing suites listed in the scorecard.

## Claim Boundary

Allowed after this pass:

```text
ChopDot has a repeatable friend-pilot script and results ledger that can prove or falsify 9/10 usability.
```

Not allowed after this pass:

```text
Real users have passed the pilot.
Every mode is 9/10.
Live `.dot` proof is complete.
```
