# ChopDot v1 Completion — Canonical Execution Board

> Branch: `chatgpt/chopdot-v1-completion`  
> Purpose: build a consumer-grade ChopDot foundation in small, reviewable slices while newer local/Codex work remains unreconciled.  
> Rule: update this file after every slice. No slice begins from chat memory alone.

## Mandatory startup context

Read, in order:

1. this board
2. `docs/PRODUCT_EXPERIENCE.md`
3. `docs/SECURITY_TRUST_MODEL.md`
4. `docs/ARCHITECTURE_DECISIONS.md`
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/ENGINEERING_STANDARDS.md`
7. `docs/QUALITY_GATE.md`
8. `docs/FOUNDATION_DEBT.md`
9. relevant `docs/slices/*_PREFLIGHT.md`

For Polkadot/data work also read `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`, `SECURITY_FOUNDATION.md`, `PAYMENT_INTENT_CONTRACT.md`, `PAYMENT_INTENT_SERVICE_FOUNDATION.md`, `HOSTS.md`, and `PORTABLE_SHELL_TRIAL.md`.

## Mission

```text
enter ChopDot
→ establish local/Polkadot identity
→ add/invite people
→ create group
→ add/correct expense
→ review balances
→ request settlement
→ settle via cash / external rail / native Polkadot / USDC when genuinely supported
→ receiver confirms under current policy
→ inspect durable explainable history
```

Polkadot should improve authority, payment, proof and portability without leaking protocol complexity into ordinary consumer UX.

## Baseline + accepted architecture

Known DevNet deployment: `chopdotproof02.dot`, known version context `0.5.6`. This branch started from `codex/portable-shell-trial`; current deployed/local Codex work is not yet reconciled.

Current pushed runtime remains local reducer/AppState → local KV. Production target:

```text
Polkadot App/Host — identity + product account + approval/signing
        ↓
ChopDot client — UI + drafts/cache
        ↓ authorized/idempotent commands
ChopDot service
        ↓
Postgres — canonical shared operational truth + audit events
        ↙                         ↘
Polkadot chain                Statement Store
chain facts/finality          optional tiny wakeup hints
        ↓
Bulletin/Cloud Storage — optional encrypted artifacts
```

Authority rules: Postgres owns ChopDot shared application truth; Polkadot owns actual chain facts; Host/App owns user-side product-account/signing authority; Statement Store is never the ledger; backend never stores user private keys.

## Non-negotiable product/financial rules

- Money truth beats convenience.
- Confirmed history is append-only; corrections create new truth.
- Crypto is a rail, not a product mode.
- Names are presentation, never identity keys.
- Payer attestation/verified evidence → `marked_paid`; receiver confirmation → `confirmed` under current v1 policy.
- Manually entered destinations are not equivalent to host-authenticated identity.
- PAS DevNet proof is never called DOT production proof.
- SS58 formatting is presentation; authenticated 32-byte product public key is identity truth.
- One settlement action pays one creditor at a time; unrelated obligations are never bundled under one receiver.
- No fake sync, fake asset registration or fake chain capability.

## Platform blockers

- `BLOCKER-POLKADOT-001`: real Desktop Statement Store allowance, upstream issue `paritytech/polkadot-desktop-community#29`. Shared correctness must not depend on it.
- Current Product SDK chain preset supports Paseo; Polkadot mainnet preset is currently planned/not executable in the reviewed SDK line.
- No verified Paseo USDC asset registration/id has been established in this build.

## Status discipline

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`
- `DONE`

`READY_FOR_CODEX_VERIFY` means implementation/tests exist but required local typecheck/build/runtime/device evidence has not been executed. Runtime `DONE` also requires reconciliation against the true current source.

## Build queue

| Slice | Status | Canonical outcome / next evidence |
|---|---|---|
| FOUNDATION-000 | DONE | canonical execution process |
| FOUNDATION-001 | DONE | product/security/architecture/engineering/quality guardrails |
| RESEARCH-001 | DONE | first-party Parity architecture review |
| DATA-001 | DONE (design) | accepted hybrid Postgres + Polkadot architecture |
| MONEY-001 | READY_FOR_CODEX_VERIFY | expense list/detail/edit/delete before payment activity |
| MONEY-002 | READY_FOR_CODEX_VERIFY | stale-request replacement + additive correction/refund semantics |
| DATA-002 | TODO / RECONCILE CURRENT SOURCE FIRST | integer money + explicit persistence migrations |
| GROUP-001 | READY_FOR_CODEX_VERIFY | rename/add/remove active members with unresolved-obligation safety |
| PEOPLE-001 | READY_FOR_CODEX_VERIFY | person detail + reusable receive preferences; no manual wallet trust expansion |
| BACKEND-001 | TODO / RECONCILE CURRENT SOURCE FIRST | shared service + Postgres foundation |
| BACKEND-002 | TODO | obligations + durable payment intents + concurrency/idempotency |
| SETTLEMENT-001 | READY_FOR_CODEX_VERIFY | common rail/evidence lifecycle; verified EVM evidence waits for receiver |
| SETTLEMENT-002 | READY_FOR_CODEX_VERIFY | cash/manual acknowledgement + undo + persistent settlement audit |
| POLKADOT-001 | READY_FOR_CODEX_VERIFY | host-authenticated product identity + capability-aware Profile |
| POLKADOT-002 | READY_FOR_CODEX_VERIFY | native PAS/Paseo transaction adapter; production DOT unclaimed |
| POLKADOT-003 | READY_FOR_CODEX_VERIFY / LIVE EXECUTION BLOCKED | verified USDC metadata/evidence/executor seam; no fake Paseo/mainnet execution |
| HISTORY-001 | READY_FOR_CODEX_VERIFY | real activity timeline + finished-group archive |
| IDENTITY-001 | TODO | profile lifecycle/recovery/rebinding |
| QUALITY-001 | TODO | validation + failure/recovery pass |
| QUALITY-002 | TODO | 320/375/390px + accessibility + consumer polish |
| SYNC-001 | TODO / PARTIALLY PLATFORM-BLOCKED | canonical API reconciliation first; Statement Store optional wakeup |
| BULLETIN-001 | TODO / OPTIONAL | encrypted artifact policy only if it adds user value |
| RELEASE-001 | TODO | full acceptance journey + deployment evidence |

## Key implemented slice references

### MONEY-001 / MONEY-002

Expense inspection/edit/delete is available before payment activity. Once requests/payments exist, controlled correction preserves evidence, replaces stale requests and creates additive adjustment/refund truth. See corresponding preflights and reducer tests.

### GROUP-001 / PEOPLE-001

Active group membership can be managed without deleting historical attribution. Removal is blocked by raw unresolved obligations even when net balance is zero. People have reusable receive preferences; wallet/account references are not promoted to verified authority by local editing.

### SETTLEMENT-001 / SETTLEMENT-002

All rails share the same conceptual lifecycle. Manual payments can be undone only before receiver confirmation. Verified chain evidence is persisted, cannot use manual Undo and still does not equal receiver confirmation. Legacy `RECORD_MATCHED_PAYMENT` direct-confirm remains debt and must not be reused.

### POLKADOT-001

`User.hostIdentity` stores exact host username, product id, authenticated product public key/account id/prefix and bind time. Profile can explicitly Connect Polkadot. Private keys never enter ChopDot. Product-id derivation still requires real-host reconciliation.

### POLKADOT-002

Native DevNet settlement uses Product SDK signer/chain/tx primitives rather than PaymentManager:

```text
SignerManager.connect
→ getProductAccount(productId, 0)
→ verify signer public key against stored binding
→ getChainAPI('paseo')
→ Balances.transfer_keep_alive
→ submitAndWatch(finalized)
→ NativePolkadotPaymentReceipt
→ exact validation
→ marked_paid
→ receiver confirms
```

DevNet is PAS / Paseo / 10 decimals. DOT production execution is not claimed. `npm run test:native-payment` exists.

### POLKADOT-003

Verified mainnet metadata: Polkadot Hub USDC asset `1337`, six decimals. Current reviewed Product SDK does not expose the Polkadot preset and no verified Paseo USDC registration is known, so live execution is deliberately blocked.

Implemented safe seam:

- `PolkadotAssetConfig` with explicit verified/execution flags;
- mainnet USDC config metadata but execution disabled;
- Paseo USDC config with `assetId: null`, unverified and disabled;
- exact 6-decimal conversion;
- authenticated payer/receiver/product-id checks;
- public-key-derived network address plan;
- `PolkadotAssetTransferExecutor` dependency boundary;
- `PolkadotAssetPaymentReceipt` + exact matcher;
- tests rejecting metadata/asset/receiver/amount tampering;
- no user-facing Pay USDC button until capability is real.

Preflight: `docs/slices/POLKADOT-003_PREFLIGHT.md`.

### HISTORY-001

History now shows Recent activity first and Past groups second. It consumes correction + settlement events and additionally journals stable `expense_added`, `request_sent` (only with stable request id), and `group_saved` events. Unknown internal events are hidden. Payment copy distinguishes acknowledgement/evidence from receiver confirmation. `npm run test:history` exists.

Preflight: `docs/slices/HISTORY-001_PREFLIGHT.md`.

## Current foundation debt

Canonical: `docs/FOUNDATION_DEBT.md`.

- `DEBT-MONEY-001` — local canonical money still uses JS `number`.
- `DEBT-SECURITY-001` — legacy direct-confirm reducer action remains internally.
- `DEBT-PERSIST-001` — no explicit schema-version migration chain.
- `DEBT-SYNC-001` — new mutation/evidence/identity authority intentionally local-only on this branch.
- `DEBT-POLKADOT-IDENTITY-001` — exact deployed Product SDK product id/account derivation requires real-host proof.
- `DEBT-POLKADOT-SDK-001` — Product SDK package family compatibility requires install/type/build/host regression verification.
- HISTORY limitation — legacy SEND_REQUEST lacks canonical `occurredAt`; local activity uses observation time until backend commands own canonical timestamps.

## Next build decision

Next unblocked product slice: **IDENTITY-001 — Profile lifecycle + recovery/rebinding**.

Do not start DATA-002/BACKEND-001 until current source is reconciled. Do not enable USDC execution until verified network/asset capability exists.

## Codex reconciliation protocol

When current source is available:

1. identify exact commit producing current `.dot` build;
2. compare with this branch, never blindly merge;
3. keep stronger implementation per slice and cherry-pick modular commits;
4. reconcile Product SDK `productId` and package family;
5. remove/rewrite legacy wallet direct-confirm semantics;
6. run lint/typecheck + relevant unit tests + production build;
7. run host simulation;
8. run real device/chain proof for identity/native payment;
9. run mobile/accessibility acceptance;
10. deploy only after release gate and record version/CID/domain/evidence.

## Anti-AI-slop check

Before accepting any work: real user action? clear authority? deterministic money state? recoverable failure? human copy? no invented platform capability? no unnecessary architecture? testable? understandable from repo without chat? If any critical answer is no, stop.