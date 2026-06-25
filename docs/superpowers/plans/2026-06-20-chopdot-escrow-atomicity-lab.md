# ChopDot Escrow / Atomicity Lab Plan

Status: `complete`
Programme: `B` native truth + escrow lab
Date: 2026-06-20
Last updated: 2026-06-20

## Summary

Build a testnet-only lab that proves whether ChopDot can support real token movement, smart-contract escrow, and atomic release/refund flows for:

- group expenses
- savings circles
- emergency pots
- community pots

This is **not** a production custody launch. The lab exists to answer one hard question:

```text
Can groups understand and safely use on-chain escrow without confusing contract state with ChopDot human confirmation?
```

## Product Rule

ChopDot must preserve this invariant in every escrow scenario:

```text
deposit != claim != confirmation != approval != release != closeout
```

Smart contracts may hold and release test tokens. ChopDot remains the group coordination and trusted-record layer.

## Decision Frame

### FACTS

- Real Paseo Asset Hub PAS transfer evidence has already been proven in ChopDot.
- Current ChopDot native evidence flow can replay finalized token movement as evidence-only.
- Official faucet funding requires human reCAPTCHA; unattended faucet automation is not a valid path.
- Polkadot Hub supports smart contracts and testnet PAS.
- Current native host Product SDK transaction execution is still unproven.

### INFERENCES

- PAS should be the first real-token rail because it is already available and verified.
- Other test tokens should start as deployed mock tokens, not assumed official assets.
- Escrow/atomicity should be isolated behind a lab flag and not mixed into the normal ChopDot pot UX until product comprehension is proven.
- Savings circles and emergency pots are the highest-risk modes because they can look like pooled custody.

### ASSUMPTIONS

- Testnet escrow can be built without making production legal claims.
- Users will understand escrow only if the UI makes "held", "ready to release", "released", "refundable", and "needs human confirmation" obvious.
- A simple Solidity contract on Polkadot Hub TestNet is acceptable for the first escrow lab before PVM-specific optimization.

## Scope

### In Scope

- Testnet-only smart contract escrow.
- PAS deposits and releases.
- Mock ERC20-style test token deployment for `TEST_USDC` and one additional token if useful.
- Contract events mapped into ChopDot evidence events.
- Agent tests where Leo, Nina, Omar, Mina, and role-specific emergency/community users act from separate browser/device contexts.
- Adversarial tests for wrong actor, early release, duplicate deposit, partial deposit, timeout refund, and closeout before confirmation.
- Plain-English user report explaining what people understood and where they got confused.

### Out of Scope

- Mainnet funds.
- Production escrow/custody launch.
- Yield, investment, pooled managed balances, cards, automatic bank payouts, or guarantees.
- Public emergency recipient identity or public donor wall by default.
- Claiming fully-native status before Product SDK host tx, Statement Store, archive, and proof gates pass.

## Architecture

```text
ChopDot mode scenario
  -> signed participant action
  -> escrow contract transaction
  -> contract event evidence
  -> ChopDot kernel replay
  -> human confirmation / approval
  -> closeout receipt
```

## Contract Model

Create a minimal `ChopDotEscrowVault` lab contract.

Required primitives:

- `createCase(mode, token, amount, participants, rulesHash, deadline)`
- `deposit(caseId, participantId, amount)`
- `approveRelease(caseId)`
- `release(caseId)`
- `refund(caseId)`
- `voidCase(caseId, reasonHash)`

Required events:

- `CaseCreated`
- `Deposited`
- `ReleaseApproved`
- `Released`
- `Refunded`
- `Voided`

Required safety checks:

- no duplicate deposit for the same required participant/obligation
- release blocked until required deposits are present
- release blocked until required approvals are met
- refund blocked until timeout/cancel condition
- void requires organizer/admin authority
- contract event alone cannot create ChopDot closeout

## Token Plan

### Phase T1 — PAS

Use real Paseo Asset Hub / Polkadot Hub TestNet PAS for native-token flows.

Acceptance:

- funded test account can deposit PAS
- contract can receive/hold PAS if contract environment supports native value
- release/refund emits events
- ChopDot records tx evidence but still requires human confirmation

### Phase T2 — Mock Tokens

Deploy mock ERC20-style tokens on Polkadot Hub TestNet:

- `ChopDotMockUSDC`
- optional `ChopDotMockDOT`

Acceptance:

- mint test balances to Leo/Nina/Omar/Mina
- approve escrow contract
- deposit token into escrow
- release/refund token
- map token tx to ChopDot evidence

### Phase T3 — Asset Hub Assets Research Gate

Investigate whether official/common test assets on Asset Hub can be used safely.

Acceptance:

- document available assets
- document faucet/source availability
- do not block escrow lab on this

## Scenario Plan

### 1. Group Expense Escrow

User story:

```text
Friends split a shared expense. Each person deposits their share. Funds release only when enough deposits are present and the receiver confirms receipt after release.
```

Happy path:

- Mina creates dinner expense escrow.
- Leo, Nina, and Omar deposit test tokens.
- ChopDot shows all shares held.
- Mina releases funds.
- Receiver confirms received.
- ChopDot closes with receipt.

Adversarial paths:

- Leo tries to deposit twice.
- Omar tries to release before all deposits.
- Viewer tries to release.
- Contract release happens but receiver does not confirm.
- Closeout attempted before receiver confirmation.

### 2. Savings Circle Escrow

User story:

```text
A trusted group runs a round. Each member deposits. The round receiver is paid only when the round is ready or an exception is recorded.
```

Happy path:

- Mina creates Friday savings circle round.
- Leo, Nina, and Omar deposit.
- Payout order shows Leo as receiver.
- Contract release sends the pot to Leo.
- Leo confirms received.
- Mina closes round with receipt.

Adversarial paths:

- Nina misses deposit.
- Mina tries to release before Nina deposits or delay is recorded.
- Wrong receiver tries to confirm.
- Omar tries to change payout order.
- Contract event exists but ChopDot closeout remains blocked without human confirmation.

### 3. Emergency Pot Escrow

User story:

```text
A group coordinates urgent help. Contributors deposit test tokens. Approvers decide release readiness. Recipient identity and reason stay private/redacted.
```

Happy path:

- Riley creates emergency pot with redacted reason.
- Casey and Morgan deposit.
- Riley and Taylor approve release.
- Contract releases funds.
- Jordan confirms received.
- Redacted receipt hides sensitive details.

Adversarial paths:

- Contributor tries to view private reason.
- Single approver tries to release when two approvals are required.
- Public receipt leaks recipient/reason/payment refs.
- Release event exists but recipient does not confirm.
- Refund/void path is recorded if emergency is cancelled.

### 4. Community Pot Escrow

User story:

```text
A small group collects shared funds and releases money only after required approvals, then hands off a clean period record.
```

Happy path:

- Alex creates community pot.
- Sam and Noor deposit.
- Alex creates release request.
- Alex and Priya approve.
- Sam triggers release.
- Jordan confirms received.
- Alex closes period with handoff receipt.

Adversarial paths:

- Payer tries to release before second approval.
- Contributor tries to close period.
- Receiver confirms a release not addressed to them.
- Refund is attempted before the policy allows it.
- Closeout with open approvals is blocked unless annotated.

## UX Requirements

The user should see plain states, not technical contract language:

- `Waiting for deposits`
- `Held for this round`
- `Ready for approval`
- `Ready to release`
- `Released outside ChopDot`
- `Needs confirmation`
- `Refund available`
- `Closed with open items`

Normal UI must not show:

- `kernel`
- `adapter`
- `atomicity`
- `escrow contract`
- raw JSON
- chain jargon as the main explanation

Developer checks may show:

- contract address
- tx hash
- block number
- event name
- token address
- replay status

## Implementation Steps

### Phase 0 — Contract Feasibility Spike

- [x] Confirm current Polkadot Hub TestNet RPC and deployment tool path.
- [x] Decide Foundry vs Hardhat based on existing repo setup.
- [x] Compile minimal escrow contract locally.
- [x] Deploy to Polkadot Hub TestNet with test account.
- [x] Record contract address and deployment tx.

### Phase 1 — Escrow Contract

- [x] Implement `ChopDotEscrowVault`.
- [x] Implement native PAS/value path if supported by chosen tooling.
- [x] Implement ERC20 mock-token path.
- [x] Add contract unit tests for deposits, approvals, release, refund, and void.
- [x] Add negative tests for duplicate/early/wrong-actor actions.

### Phase 2 — Token Setup

- [x] Reuse generated ChopDot test account and public dev accounts where safe.
- [x] Create deterministic test accounts for Leo, Nina, Omar, Mina, and emergency/community roles.
- [x] Fund accounts with PAS or document faucet blocker.
- [x] Deploy/mint mock `TEST_USDC` on public testnet.
- [x] Record balances before and after local/public contract scenarios.

### Phase 3 — ChopDot Escrow Evidence Adapter

- [x] Add an escrow evidence model separate from normal payment claim evidence.
- [x] Map contract events to ChopDot evidence records.
- [x] Ensure contract events cannot directly confirm, approve, release, or close in the kernel.
- [x] Add replay tests for every mode.
- [x] Add privacy checks for emergency pot receipts.

### Phase 4 — Native UI Lab

- [x] Add a dev-only escrow lab surface behind query flag.
- [x] Use native ChopDot pot/chapter visual language, not standalone technical chrome.
- [x] Add mode entry points for group expense, savings circle, emergency pot, community pot.
- [x] Hide contract/tx details under `Developer checks`.
- [x] Show next actor, blockers, held amount, release readiness, and receipt preview.

### Phase 5 — Agent/User Simulation

- [x] Run each mode from separate browser contexts/devices.
- [x] Give each agent a funded testnet balance.
- [x] Have agents click through happy paths.
- [x] Have agents attempt forbidden actions.
- [x] Record where the UI fails to guide them.
- [x] Generate a plain-English report.

### Phase 6 — Verification + Report

- [x] Run contract tests.
- [x] Run ChopDot kernel/replay tests.
- [x] Run Playwright scenario tests.
- [x] Run `npm run type-check`.
- [x] Run `npm run build`.
- [x] Update native runtime proof report and evidence ledger.
- [x] Write final report with product findings and gate status.

## Progress Log

### 2026-06-20 Local Contract + Evidence Replay

FACTS

- Hardhat remains the selected contract tool because the repo already has a Polkadot Hub contract lab.
- `ChopDotEscrowVault` now exists with native-value and ERC20-style token paths.
- `ChopDotMockToken` now supports mock `TEST_USDC` style scenarios in the local lab.
- Local contract tests pass for case creation, deposit, release approval, release, refund, void, duplicate deposit rejection, early release rejection, wrong-actor release rejection, and mock-token release.
- Public Polkadot Hub TestNet RPC health check passes at `https://services.polkadothub-rpc.com/testnet`; observed chain ID `420420417` and latest block `10251156`.
- `ChopDotEscrowVault` deployed on Polkadot Hub TestNet at `0x93818bEe323c0202467f41f45a64C9ffc3f8B4C0`; deployment tx `0x664d0ecba04a3a6497849dc2cb5992b3a385d50d910e467873433a429c93a40a`, block `10251262`.
- `ChopDotMockToken` deployed as mock `TEST_USDC` at `0x198daAA27BcD49582d97a7952Bc340B65fD6850D`; deployment tx `0xd7c452f847d609ad62322ee1a88cc072527dca823c88c515e12932cb1c7d9949`, block `10251265`.
- Public testnet scenarios ran on the deployed contracts for group expense, savings circle, emergency pot, native PAS escrow, and community fund refund; artifact: `artifacts/polkadot-native/escrow-public-scenarios-2026-06-20.json`.
- The latest public scenario produced 46 public testnet transactions:
  - group expense mock `TEST_USDC` case `10` released
  - savings circle mock `TEST_USDC` case `11` released
  - emergency pot mock `TEST_USDC` case `12` released after two approvals
  - shared expense native PAS case `13` released
  - community fund mock `TEST_USDC` case `14` refunded after deadline
- Mina used the public Hardhat deployer key; Leo, Nina, and Omar used fresh ephemeral role wallets funded by Mina for the run. This is valid lab evidence, not a production identity model.
- ChopDot signed-session replay now accepts `escrow_evidence` as evidence-only.
- Replay tests cover group expense, savings circle, emergency pot, and community fund deposit evidence.
- Replay tests prove escrow release evidence does not confirm the recipient or close the chapter.
- Emergency redacted receipts are tested so escrow tx refs and contract addresses do not leak.
- A real public Paseo Asset Hub PAS transfer is already documented as token evidence-only in [real-paseo-token-trial-2026-06-20.md](../../chopdot-dot/real-paseo-token-trial-2026-06-20.md).

INFERENCES

- The contract semantics have now passed local tests, public Polkadot Hub TestNet mock-token flows, and a public native PAS escrow flow.
- The product boundary is still intact: contract deposit/release evidence does not become ChopDot confirmation, approval, release confirmation, or closeout.
- The remaining high-risk work is real-user comprehension and production-grade custody/legal/security design, not the basic lab state machine.

ASSUMPTIONS

- Public-chain evidence uses a funded public Hardhat deployer key and fresh funded role wallets. This is acceptable for a lab, but not safe for production custody or private balances.
- Local Hardhat execution remains useful contract-semantics evidence, but live-chain proof now comes from the deployed testnet artifact.

VERIFICATION

- `npm run test` in `scripts/polkadot-contract-lab` — pass, 12 contract tests.
- `npm run rpc:check` in `scripts/polkadot-contract-lab` — pass, public Polkadot Hub TestNet RPC reachable.
- `POLKADOT_HUB_TESTNET_PRIVATE_KEY=<public-hardhat-dev-key> npm run deploy:escrow-direct:testnet` — pass; deployed escrow and mock `TEST_USDC`.
- `CHOPDOT_USE_PUBLIC_HARDHAT_TEST_KEYS=1 npm run scenario:escrow-public:testnet` — pass; ran public group expense, savings circle, emergency pot, native PAS escrow, and community fund refund scenarios.
- `npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts` — pass, 62 tests.
- `npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/testTokenRail.test.ts` — pass, 67 tests.
- `npx playwright test tests/e2e/chopdot-escrow-atomicity.spec.ts --project=chromium --workers=1` — pass, 3 browser tests.
- `npx playwright test tests/e2e/chopdot-escrow-agent-devices.spec.ts --project=chromium --workers=1` — pass, 5 separate-context browser tests.
- `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1` — pass, 12 browser tests.
- `npx playwright test tests/e2e/chopdot-escrow-atomicity.spec.ts tests/e2e/chopdot-escrow-agent-devices.spec.ts tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1` — pass, 20 focused browser tests.
- `npm run type-check` — pass.
- `npm run validate:chopdot-coverage` — pass, 45 markdown files registered.
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows and 21 evidence ledger entries.
- `npm run build` — pass.

REPORTS

- [escrow-atomicity-lab-progress-2026-06-20.md](../../chopdot-dot/escrow-atomicity-lab-progress-2026-06-20.md) records the plain-English product findings and open gates.
- [polkadot-native-runtime-proof-report.md](../../chopdot-dot/polkadot-native-runtime-proof-report.md) records the local escrow proof without promoting host/native gates.

## Acceptance Criteria

The plan is complete only when all of the following are true:

- Group expense, savings circle, emergency pot, and community pot each have one happy-path escrow scenario.
- Each scenario uses real public testnet transactions or explicitly documented faucet/testnet blockers.
- At least one scenario uses real PAS.
- At least one scenario uses deployed mock token flow.
- Escrow release/refund behavior is contract-tested.
- ChopDot replay proves contract events remain evidence, not product truth.
- Emergency receipt redaction still passes.
- Wrong-person, duplicate, early release, and early closeout adversarial tests pass.
- Browser agent tests run from separate contexts and produce observations.
- Final report says which mode is safest to promote and which should remain lab-only.

## Falsifiers

Stop and redesign if:

- Users cannot tell whether money is held, released, refundable, or merely claimed.
- Contract events bypass receiver confirmation.
- Emergency details leak through receipts, tx refs, or UI.
- Savings circle escrow implies guaranteed payout, yield, or managed custody.
- Testnet deployment requires unsafe private-key handling.
- The implementation forces chain-specific semantics into the ChopDot domain kernel.

## Verification Commands

Expected command set, adjusted after contract tooling is chosen:

```text
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts
npm run type-check
npm run build
npm run validate:chopdot-coverage
npm run validate:chopdot-native-map
npx playwright test tests/e2e/chopdot-escrow-atomicity.spec.ts --workers=1
```

Contract commands will be added after Phase 0 selects Foundry or Hardhat.

## Done Definition

Done means a real user-facing report can honestly say:

```text
We tested group expenses, savings circles, emergency pots, and community pots with testnet token escrow.
The contract can hold/release/refund test value.
ChopDot still protects the human confirmation and closeout record.
We know which escrow behavior is useful, which is confusing, and what should stay deferred.
```

It does **not** mean production custody is ready.
