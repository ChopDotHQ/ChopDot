# ChopDot Native Friends Readiness Report

Status: `pass-local`
Date: 2026-06-20
Programme: `B` native truth

## Plain-English Result

ChopDot can now run the next-iteration friend flow locally across three Polkadot-native-shaped modes:

- savings circle
- emergency fund
- community pot

Each mode can be opened by separate people from separate browser contexts. Each person sees one clear next action, records or confirms what they are allowed to do, and the group converges on one shared signed-event state.

This is not the same as live `.dot` readiness. The user flow is working locally; the real Polkadot host adapters still need live host proof.

## What Works

### Savings Circle

- Leo marks paid.
- Mina sees Leo waiting and confirms.
- Nina marks paid.
- Mina confirms Nina.
- Omar is recorded as delayed.
- Mina prepares and approves payout.
- Omar records release outside ChopDot.
- Leo confirms receipt.
- Mina closes the round.
- All devices see the record closed.

### Emergency Fund

- Casey records a private contribution.
- Riley confirms Casey.
- Morgan records a private contribution.
- Riley confirms Morgan.
- Riley prepares and approves release readiness.
- Taylor adds the second approval.
- Riley records the release outside ChopDot.
- Jordan confirms receipt.
- Riley closes the fund.
- All devices see the record closed.

Privacy result: the emergency flow keeps sensitive details out of normal user flow and existing redaction tests still pass.

### Community Pot

- Sam records a contribution.
- Alex confirms Sam.
- Noor records a contribution.
- Alex confirms Noor.
- Alex prepares the release and gives first approval.
- Sam cannot record the release before Priya approves.
- Priya gives the second approval.
- Sam records release outside ChopDot.
- Jordan confirms receipt.
- Alex closes the period.
- All devices see the record closed.

Control result: approval, payment/release claim, receiver confirmation, and closeout remain separate.

## What This Proves

- The three modes are real ChopDot pot flows, not only lab scenes.
- Native-session state is replayed from signed events for all three modes.
- Product truth is not taken from Supabase rows in this native path.
- Weak payment evidence stays claim-only; verified recipient+amount evidence can clear the payment leg.
- The receiver/treasurer confirmation still controls truth.
- Closeout waits for confirmations, approvals, or explicit annotations.
- Developer controls are hidden from native friend flows unless explicitly requested.

## What Is Still Not Proven

- Live Product Account signing inside the real Polkadot host.
- Live Statement Store append/load/replay inside the real host.
- Live Bulletin/archive save and retrieve.
- Live Asset Hub transaction evidence from the host.
- Live closeout proof anchor.
- Full HybridRemovalGate pass without EVM/PVM/classic closeout in native-critical runtime.
- Live `.dot` load and registry publish.

## Verification

Passed locally:

```bash
npx tsc --noEmit
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/simulationAgents.test.ts
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium
npm run validate:chopdot-coverage
npm run validate:chopdot-native-map
npm run build
```

Result: all passed locally. The production build still emits existing Rollup warnings for third-party eval/chunk size, but it completes successfully.

## Friend-Use Judgment

Ready for a local friend trial: yes.

Ready to claim live Polkadot-native production readiness: no.

The honest claim is:

```text
The ChopDot friend flow now works locally across savings circle, emergency fund, and community pot using a signed native-session model. Live Polkadot host proof is still the remaining external/runtime gate.
```
