# SETTLEMENT-001 Preflight — Unified settlement domain + adapters

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A person should be able to settle what they owe through different rails without ChopDot having different definitions of payment truth for cash, external payment links, DOT/PAS, or USDC.

The payment rail should change **how evidence is produced**, not the core lifecycle of the obligation.

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

`PAS` remains the currently implemented Polkadot test-network/native asset execution path, but product/domain naming does not bake PAS into the generic contract.

## Evidence classes

- `payer_attestation` — payer says they paid (cash/external rail)
- `external_reference` — optional external reference/link metadata; not independently authoritative
- `chain_transaction` — verified chain/network/from/to/amount/finality evidence

## Implemented on this branch

- `src/settlement/settlement.ts` defines rail-independent settlement rails, evidence types, capability reporting, and a common `awaiting_receiver_confirmation` outcome after evidence;
- `src/settlement/settlement.test.ts` covers rail classification, shared post-evidence lifecycle, and honest unavailable-capability reporting;
- `npm run test:settlement` provides a direct verification command;
- the live PAS payer flow no longer dispatches the legacy direct-confirm action after a matched finalized transaction;
- after verified PAS evidence the live flow dispatches `MARK_PAID`, displays `Payment sent`, and tells the payer it is waiting for receiver confirmation;
- failed wallet execution continues to leave split state unchanged;
- USDC execution is not faked or exposed as complete.

## Important compatibility limitation

The central legacy reducer action `RECORD_MATCHED_PAYMENT` still exists in `src/state/store.ts` and still directly sets a split to `confirmed`. The connected GitHub editing environment exposes that large reducer only through truncated content, so a whole-file replacement here would be an unsafe blind edit.

Therefore:

- the **live runtime PayerView no longer calls that action**;
- new settlement code must not call it;
- `DEBT-SECURITY-001` records it as partially mitigated rather than resolved;
- Codex/local reconciliation must rewrite/remove the action so verified receipt evidence is preserved while the split remains `marked_paid`;
- the existing wallet reducer test and historical `HOSTS.md` direct-confirm wording must be updated in that same verified local change.

This is a deliberate fail-safe boundary, not a claim that the legacy action is acceptable.

## State rules

1. `open` cannot be confirmed directly.
2. `request_sent` may become `marked_paid` through payer attestation or valid matched chain evidence.
3. `marked_paid` requires receiver authority to become `confirmed` under current v1 policy.
4. Replaying the same chain transaction hash must not settle a second split.
5. Evidence for wrong network, sender, recipient, amount, or split is rejected.
6. A rail adapter never directly mutates unrelated expenses or balances.
7. Failed/cancelled execution leaves financial truth unchanged.
8. No private key or seed material enters ChopDot state.
9. DOT/USDC adapters may exist as contracts/capability descriptors before execution is available; unavailable capability must be reported honestly.
10. Consumer UI says `Payment sent` / `Waiting for confirmation`, not adapter/state-machine terminology.

## Acceptance cases for Codex/local verification

1. `npm run test:settlement` passes.
2. Existing manual cash/external flow still advances request -> marked paid -> receiver confirm.
3. Exact finalized PAS payment in the live payer flow advances requested split to `marked_paid`, not `confirmed`.
4. Receiver confirmation then advances that exact split to `confirmed`.
5. Failed/rejected wallet payment changes no money state.
6. After legacy reducer rewrite, duplicate transaction hash cannot attach to another split.
7. After legacy reducer rewrite, wrong network/from/to/amount receipt changes nothing.
8. Host-wallet Playwright flow reflects `Payment sent` before receiver confirmation.
9. Production build and TypeScript lint pass.
10. No manual friend-wallet-address trust shortcut exists.

## Deferred

- canonical `SettlementAttempt` and `SettlementEvidence` database persistence — BACKEND-002;
- full cash adapter UX/history completion — SETTLEMENT-002;
- authenticated Polkadot identity/address binding — POLKADOT-001;
- production DOT adapter using supported host/app path — POLKADOT-002;
- USDC asset execution and evidence matching — POLKADOT-003;
- automatic chain-evidence final confirmation — only after explicit threat-model/contract amendment.

## Quality status

Required gate: G2 local-flow evidence.

Code/tests are written and the live safety path is changed, but local execution/reducer reconciliation is still required before `DONE`.
