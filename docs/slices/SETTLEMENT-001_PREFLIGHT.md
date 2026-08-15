# SETTLEMENT-001 Preflight — Unified settlement domain + adapters

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A person should be able to settle what they owe through different rails without ChopDot having different definitions of payment truth for cash, external payment links, DOT/PAS, or USDC.

The payment rail should change **how evidence is produced**, not the core lifecycle of the obligation.

## Current model facts

- Local split lifecycle is `open -> request_sent -> marked_paid -> confirmed`.
- Cash/external flows currently call `MARK_PAID` after the payer says they paid, then wait for receiver confirmation.
- PAS wallet execution currently verifies a finalized exact transaction and dispatches `RECORD_MATCHED_PAYMENT`.
- The current reducer incorrectly turns matched wallet evidence directly into `confirmed`, conflicting with the accepted security/payment contract.
- Wallet execution is hard-coded inside `PayerView`; cash/external and wallet flows do not share a domain contract yet.
- DOT/USDC production execution is not complete and must not be faked in this slice.

## Canonical rule

Settlement lifecycle is rail-independent:

```text
obligation/request
  -> settlement attempt
  -> evidence produced/observed
  -> marked paid / awaiting receiver acknowledgement
  -> receiver confirms
  -> confirmed
```

A rail may produce stronger evidence than another rail, but under current v1 policy **evidence alone does not finalize ChopDot application settlement**.

## Settlement rails

Initial unified rail identifiers:

- `cash`
- `bank_transfer`
- `payment_link`
- `polkadot_native`
- `polkadot_usdc`

`PAS` remains the currently implemented Polkadot test-network/native asset execution path, but product/domain naming should not bake PAS into the generic contract.

## Evidence classes

- `payer_attestation` — payer says they paid (cash/external rail)
- `external_reference` — optional external reference/link metadata; not independently authoritative
- `chain_transaction` — verified chain/network/from/to/amount/finality evidence

Evidence must be immutable once attached to the settlement record/split history.

## State rules

1. `open` cannot be confirmed directly.
2. `request_sent` may become `marked_paid` through payer attestation or valid matched chain evidence.
3. `marked_paid` requires receiver authority to become `confirmed` under current v1 policy.
4. Replaying the same chain transaction hash cannot settle a second split.
5. Evidence for wrong network, sender, recipient, amount, or split is rejected.
6. A rail adapter never directly mutates unrelated expenses or balances.
7. Failed/cancelled execution leaves financial truth unchanged.
8. No private key or seed material enters ChopDot state.
9. DOT/USDC adapters may exist as contracts/capability descriptors before execution is available; unavailable capability must be reported honestly.
10. Consumer UI should say `Payment sent` / `Waiting for confirmation`, not expose adapter/state-machine terminology.

## Local-shell implementation in this slice

- Introduce a pure settlement-domain module defining rail/evidence/outcome contracts and capability helpers.
- Migrate current PAS matched-payment reducer behavior from direct `confirmed` to `marked_paid` + immutable wallet evidence.
- Preserve duplicate transaction-hash protection and exact receipt matching.
- Update PAS wallet tests to require receiver confirmation after matched evidence.
- Update PayerView copy so verified chain submission says payment was sent and is awaiting receiver confirmation, instead of claiming the share is already settled.
- Do not implement USDC transfer execution yet.
- Do not build the Postgres settlement-attempt tables here; BACKEND-002 owns durable shared persistence.

## Acceptance cases

1. Cash payer attestation advances requested split to `marked_paid`, not `confirmed`.
2. Exact finalized Polkadot native payment evidence advances requested split to `marked_paid`, preserves receipt, and waits for receiver confirmation.
3. Receiver `CONFIRM_RECEIVED` then advances that exact split to `confirmed`.
4. Duplicate transaction hash cannot be attached to another split.
5. Wrong network/from/to/amount evidence changes nothing.
6. Failed adapter execution changes no money state.
7. Settlement rail metadata is generic enough for DOT and USDC without branching core financial rules.
8. UI does not say `settled` immediately after chain evidence under current policy.
9. Existing manual cash/external flow continues to work.
10. No new wallet-address editing/trust shortcut is introduced.

## Deferred

- canonical `SettlementAttempt` and `SettlementEvidence` database persistence — BACKEND-002;
- full cash adapter UX/history completion — SETTLEMENT-002;
- authenticated Polkadot identity/address binding — POLKADOT-001;
- production DOT adapter using supported host/app path — POLKADOT-002;
- USDC asset execution and evidence matching — POLKADOT-003;
- automatic chain-evidence final confirmation — only after explicit threat-model/contract amendment.

## Quality status

Required gate: G2 local-flow evidence.

Tests and code can be written/reviewed here, but `lint`, unit tests, production build, and mobile/host runtime must be executed by Codex/local verification before `DONE`.