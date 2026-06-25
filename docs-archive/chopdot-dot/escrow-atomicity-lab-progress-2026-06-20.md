# Escrow Atomicity Lab Progress

Status: `lab_complete`
Date: 2026-06-20
Programme: `B` native truth + escrow lab

## Plain-English Summary

We proved the first important thing: a smart contract can hold test value, release it only after the rules are met, refund it after timeout, and reject obvious bad actions.

We also proved the more important ChopDot rule: held/released evidence is only evidence. It does not mean the group agrees. It does not confirm receipt. It does not close the record.

This means escrow can be explored without breaking the product truth model, but it is not ready to show as a normal user feature yet. The native ChopDot surface now has a dev-only escrow lab that labels the surface as "Lab evidence only" and keeps contract-style evidence controls inside Developer checks.

## What Worked

- The local escrow contract can create a case, accept native-value deposits, accept mock-token deposits, require approvals, release funds, refund after timeout, and void a case.
- Duplicate deposits are blocked.
- Early release is blocked.
- Wrong-person release is blocked.
- Mock `TEST_USDC` works locally through an ERC20-style path.
- ChopDot records escrow deposit/release events as evidence-only.
- Group expense, savings circle, emergency pot, and community fund replay tests all keep deposits separate from ChopDot confirmation.
- Release evidence does not confirm the receiver or close the savings-circle round.
- Emergency redacted receipts do not leak recipient names, sensitive reasons, contract addresses, or tx hashes.
- Group expense now exists as a first-class native chapter pot alongside savings circle, emergency pot, and community fund.
- The native ChopDot pot UI can show lab-held evidence amount, open blockers, release readiness, and receipt preview without a separate lab shell.
- The normal ChopDot surface does not show escrow lab status or escrow lab controls unless the lab flag is present.
- The escrow lab UI explicitly says ChopDot is not holding funds, protecting funds, or guaranteeing payout.
- Browser agents can click a group expense all the way through: Leo records held evidence, marks paid, Mina confirms, Nina and Omar pay, Mina prepares and approves reimbursement, release evidence is recorded, Mina confirms, and the split closes.
- Browser checks prove held evidence across all four modes does not mark paid or clear blockers by itself.
- A viewer trying to record held evidence for Leo is blocked.
- The public Polkadot Hub TestNet RPC is reachable; the lab saw chain ID `420420417` and latest block `10251156`.
- `ChopDotEscrowVault` deployed on public Polkadot Hub TestNet: `0x93818bEe323c0202467f41f45a64C9ffc3f8B4C0`.
- Mock `TEST_USDC` deployed on public Polkadot Hub TestNet: `0x198daAA27BcD49582d97a7952Bc340B65fD6850D`.
- Public testnet movement ran through the deployed escrow:
  - group expense mock `TEST_USDC` case `10` released
  - savings circle mock `TEST_USDC` case `11` released
  - emergency pot mock `TEST_USDC` case `12` released after two approvals
  - shared expense native PAS case `13` released
  - community fund mock `TEST_USDC` case `14` refunded after deadline
- The latest public scenario used fresh funded role wallets for Leo, Nina, and Omar, which better models separate people/devices and avoids stale public dev-account nonces.
- Separate browser-context agent tests passed for all four modes, plus an adversarial viewer attempt.

## What Is Still Not Done

- We have not yet proven users understand the difference between `held`, `released`, `needs confirmation`, and `closed`.
- The public-chain run used a public Hardhat deployer key and fresh funded role wallets. That is acceptable for lab proof, but not for production security, privacy, or custody.
- The public-chain run used a mock token, not real-value USDC.
- The native PAS escrow run used public testnet PAS, not production funds, and still does not prove custody readiness.

## Current Gate Status

| Gate | Status | Meaning |
| --- | --- | --- |
| Local contract semantics | `pass` | The basic escrow state machine behaves correctly under local Hardhat tests. |
| Real PAS movement | `pass for lab` | A real public PAS evidence transfer exists, and native PAS also moved through the deployed escrow in case `13`. |
| Public testnet escrow deploy | `pass` | `ChopDotEscrowVault` deployed at `0x93818bEe323c0202467f41f45a64C9ffc3f8B4C0`. |
| Public testnet RPC | `pass` | Polkadot Hub TestNet RPC responded to chain ID, latest block, gas price, and client checks. |
| Mock token public testnet path | `pass` | Mock `TEST_USDC` deployed, minted, approved, deposited, released, and refunded on public testnet. |
| ChopDot evidence boundary | `pass` | Escrow events and held evidence do not confirm, approve, release-confirm, or close the chapter. |
| Emergency privacy | `pass` | Redacted receipts do not expose sensitive fields or escrow refs. |
| Native ChopDot UI lab | `pass` | The lab uses the real pot list/detail/tabs, labels escrow as lab evidence only, and hides technical controls in Developer checks. |
| Browser agent flow | `pass` | Chromium agent tests cover all four modes, separate browser contexts, and a wrong-person adversarial attempt. |
| User comprehension | `partial` | The UI now exposes clearer held/open/confirmed states, but real friends have not yet tested it unscripted. |

## Product Interpretation

Escrow is not automatically a better ChopDot. It adds trust around held value, but it also adds confusion and custody-like expectations.

For ChopDot, the safest path is:

1. Keep normal group expenses, savings circles, emergency pots, and community funds coordination-first.
2. Keep escrow behind a lab/dev flag until users can explain the states back correctly.
3. Use escrow evidence to support the record, never to replace human confirmation.
4. Start with group expenses or community funds before emergency pots, because emergency flows are more privacy-sensitive and emotionally charged.

## Next Move

Run an unscripted friend pilot against the native ChopDot escrow lab:

- Can a normal user explain the difference between "lab evidence", "marked paid", "confirmed", "released outside ChopDot", and "closed"?
- Does the organizer know exactly who needs to act next?
- Does a contributor understand that a held/released transaction is not the same as receiver confirmation?
- Does emergency support feel private and respectful?
- Does community fund approval feel useful without sounding like a DAO or bank?
- Do users trust the receipt more after the flow, or does escrow make it feel riskier?

Only after unscripted real-person tests pass should escrow be treated as product-useful rather than just technically interesting.

## Verification

- `npm run test` in `scripts/polkadot-contract-lab` — pass, 12 tests.
- `npm run rpc:check` in `scripts/polkadot-contract-lab` — pass.
- `POLKADOT_HUB_TESTNET_PRIVATE_KEY=<public-hardhat-dev-key> npm run deploy:escrow-direct:testnet` — pass.
- `CHOPDOT_USE_PUBLIC_HARDHAT_TEST_KEYS=1 npm run scenario:escrow-public:testnet` — pass; artifact includes 46 public testnet txs, mock-token release/refund cases, and native PAS escrow case `13`.
- `npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/testTokenRail.test.ts` — pass, 67 tests.
- `npx playwright test tests/e2e/chopdot-escrow-atomicity.spec.ts --project=chromium --workers=1` — pass, 3 tests.
- `npx playwright test tests/e2e/chopdot-escrow-agent-devices.spec.ts --project=chromium --workers=1` — pass, 5 tests.
- `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1` — pass, 12 tests.
- Combined focused browser command across all three specs — pass, 20 tests.
- `npm run type-check` — pass.
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows and 21 evidence ledger entries.
- `npm run build` — pass.
