# ChopDot v1 Completion — Canonical Execution Board

> **Branch:** `chatgpt/chopdot-v1-completion`  
> **Purpose:** Build a consumer-grade ChopDot foundation in small, reviewable slices while newer local/Codex work remains unavailable or unreconciled.  
> **Rule:** This file is the canonical status/queue for the parallel build. Update it after every slice before moving on.

---

## 0. Mandatory Startup Context

Before implementing any slice, read:

1. `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
2. `docs/PRODUCT_EXPERIENCE.md`
3. `docs/SECURITY_TRUST_MODEL.md`
4. `docs/ARCHITECTURE_DECISIONS.md`
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/ENGINEERING_STANDARDS.md`
7. `docs/QUALITY_GATE.md`
8. `docs/FOUNDATION_DEBT.md`
9. the relevant `docs/slices/*_PREFLIGHT.md`

For Polkadot/data-sensitive work also read:

- `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`
- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `HOSTS.md`
- `PORTABLE_SHELL_TRIAL.md`

**No slice begins from chat memory alone.**

---

## 1. Mission

Ship the simplest complete ChopDot that normal people can trust for real shared-money coordination.

Target journey:

```text
enter ChopDot
→ establish local/Polkadot identity
→ add/invite people
→ create group
→ add expense
→ edit/correct safely
→ review balances
→ request settlement
→ settle via cash / external rail / native Polkadot / USDC
→ receiver confirms under current policy
→ inspect durable explainable history
```

Polkadot should improve identity, authority, payment, proof, portability and host-native UX without forcing protocol complexity into ordinary screens.

---

## 2. Current Baseline

Known DevNet deployment:

- domain: `chopdotproof02.dot`
- known deployed version from upstream issue context: `0.5.6`

Parallel branch base:

- `codex/portable-shell-trial`

Important limitation:

- the exact current/local source may contain newer Codex work not reconciled here;
- this branch therefore favors modular domain logic, tests, adapters, narrow UI slices and explicit debt over broad rewrites;
- when current source appears, Codex must compare/cherry-pick/reconcile rather than blindly merge.

Current pushed persistence:

```text
local reducer/AppState
→ browser/host local KV
```

Accepted production target is not yet implemented.

---

## 3. Accepted Architecture

```text
POLKADOT APP / HOST
identity + product account + approval + signing
                ↓
CHOPDOT CLIENT (.dot / web)
UI + drafts + local cache + offline projection
                ↓ authorized commands
CHOPDOT SERVICE
pure domain rules + auth + idempotency + DB transactions
                ↓
POSTGRES
canonical shared operational state + append-only audit events
        ↙                 ↘
POLKADOT CHAIN        STATEMENT STORE
chain facts/finality   tiny optional wakeup/version hints
        ↓
BULLETIN / CLOUD STORAGE
optional encrypted receipts/snapshots/evidence blobs
```

Authority rules:

- Postgres = canonical ChopDot shared operational state.
- Polkadot chain = canonical facts for actual on-chain transactions/finality.
- Polkadot Host/App = login/product-account/signing authority boundary.
- local KV = local draft/cache/prototype persistence, not multi-user truth.
- Statement Store = optional invalidation/wakeup transport, never the ledger.
- Bulletin = optional content artifacts, never relational state.
- backend never stores user private signing keys/seed phrases.
- clients do not directly mutate canonical financial tables in production.

Canonical design: `docs/DATA_ARCHITECTURE.md` + ADR-019 through ADR-026.

---

## 4. Product + Financial Rules

1. Money truth beats UI convenience.
2. Confirmed historical events are append-only; corrections create new truth.
3. Crypto is a rail, not a separate product mode.
4. One dominant action per normal consumer screen.
5. No fake sync or fake verification.
6. Names are presentation, never financial/identity keys.
7. Mistakes should be cheap before final confirmation.
8. Payment evidence and ChopDot application confirmation are distinct concepts.
9. Current v1: payer evidence/attestation → `marked_paid`; receiver confirmation → `confirmed`.
10. Host capabilities are adapters, not product forks.
11. Polkadot complexity belongs at the authority/payment boundary.
12. A manually entered wallet/payment destination is not equivalent to host-authenticated identity.
13. PAS DevNet evidence must never be described as DOT production evidence.
14. Native chain addresses are derived from authenticated public keys; SS58 formatting is not identity truth.

Conceptual domain:

```text
Expense
→ ExpenseSplit
→ Obligation
→ PaymentIntent
→ SettlementAttempt
→ SettlementEvidence
→ final application confirmation / closed obligation

Every important transition
→ ActivityEvent (append-only)
```

Current local statuses:

```text
open → request_sent → marked_paid → confirmed
```

---

## 5. Upstream / Platform Blockers

### BLOCKER-POLKADOT-001 — real Desktop Statement Store allowance

Issue: https://github.com/paritytech/polkadot-desktop-community/issues/29

Observed:

```text
container ✓
identity ✓
service ✓
allowance ✗
```

Policy:

- fail closed;
- do not change financial truth if capability fails;
- do not claim Statement Store sync;
- shared correctness must not depend on Statement Store.

### BLOCKER-POLKADOT-002 — historical dot.li network mismatch

Resolved context: https://github.com/paritytech/dotli-community/issues/57

Not a current product blocker.

---

## 6. Status / Quality Discipline

Statuses:

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`
- `DONE`

`READY_FOR_CODEX_VERIFY` = code/tests exist and are reviewable, but required local/typecheck/build/device evidence has not been executed.

`DONE` for runtime work = applicable quality-gate evidence exists and reconciliation against current source occurred.

Workflow:

```text
select slice
→ read mandatory context
→ preflight user goal + authority + failure states
→ implement smallest vertical slice
→ write deterministic tests
→ review diff/security/product boundaries
→ record evidence/limitations/debt
→ update this board
→ only then move on
```

Unexecuted tests are always labelled **WRITTEN / NOT EXECUTED HERE**.

---

## 7. Build Queue

### FOUNDATION-000 — Canonical execution board

**Status:** `DONE`

### FOUNDATION-001 — Product/security/architecture/engineering/quality guardrails

**Status:** `DONE`

Deliverables:

- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/QUALITY_GATE.md`

### RESEARCH-001 — Parity reference architecture review

**Status:** `DONE`

Conclusion: first-party Parity patterns support normal Postgres/service coordination + device-side signing + specialized Polkadot primitives for authority, chain facts, pub/sub and content storage.

### DATA-001 — Canonical ChopDot data architecture

**Status:** `DONE` (G0 design only)

### MONEY-001 — Expense detail + edit + delete

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented: expense list/detail, safe edit/delete before payment activity, replacement validation, balance recalculation and tests.

### MONEY-002 — Safe correction after request/settlement

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented: idempotent corrections, stale-request replacement, additive adjustment/refund records, immutable paid history and consumer correction UX.

### DATA-002 — Integer money + persistence migration

**Status:** `TODO / RECONCILE CURRENT SOURCE FIRST`

Triggered by `DEBT-MONEY-001` + `DEBT-PERSIST-001`.

### GROUP-001 — Group editing + member safety

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented: rename/add/reuse/remove active member safely while preserving history and blocking unresolved-obligation removal.

### PEOPLE-001 — Friends + reusable payment preferences

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented: person detail, shared-group context, reusable receive preferences and no manual friend-wallet trust expansion.

### BACKEND-001 — Shared service + Postgres foundation

**Status:** `TODO / RECONCILE CURRENT SOURCE FIRST`

Prerequisites:

- DATA-001 accepted ✓
- current source reconciled
- exact Polkadot host/product-account flow verified
- privacy/retention baseline decided

### BACKEND-002 — Obligations + payment-intent persistence

**Status:** `TODO`

Scope: obligation projection, durable intents, concurrency/versioning, idempotency, append-only events and transactional tests.

### SETTLEMENT-001 — Unified settlement domain + adapters

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- generic cash/bank/link/native/USDC rail contract;
- evidence classes/common lifecycle;
- exact EVM PAS evidence persisted;
- evidence remains `marked_paid` until receiver confirmation;
- duplicate/network/from/to/amount checks;
- `npm run test:settlement`.

Limitation: legacy `RECORD_MATCHED_PAYMENT` direct-confirm remains under `DEBT-SECURITY-001`.

### SETTLEMENT-002 — Cash/manual settlement complete

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented: payer attestation, waiting state, undo before receiver confirmation, evidence-protected irreversibility and persistent audit events.

### POLKADOT-001 — Host identity + authenticated application authority

**Status:** `READY_FOR_CODEX_VERIFY`

Preflight: `docs/slices/POLKADOT-001_PREFLIGHT.md`

Implemented:

- explicit `User.hostIdentity` provenance;
- validated 32-byte product-account public key;
- local-only bind/unbind;
- capability-aware Profile + Connect Polkadot;
- display name separate from host username;
- private key never enters ChopDot;
- disconnect preserves financial history;
- `npm run test:identity`.

Mandatory verification:

- resolve actual current/deployed Product SDK `productId`;
- verify `getProductAccount(productId, 0)` on real host;
- run typecheck/build/identity/host tests;
- exercise approve/reject/reload/disconnect on device.

### POLKADOT-002 — Native Polkadot settlement adapter

**Status:** `READY_FOR_CODEX_VERIFY`

Preflight: `docs/slices/POLKADOT-002_PREFLIGHT.md`

Important platform decision:

- Product SDK `PaymentManager` is a host fixed-payment-asset surface, not generic DOT transfer;
- native settlement therefore uses Product SDK transaction/signer/chain-client primitives.

Implemented:

- explicit native configs:
  - DevNet `paseo / PAS / 10 decimals`;
  - future production `polkadot / DOT / 10 decimals` (not yet production-proven);
- exact integer native amount conversion;
- payer + receiver must both have host-authenticated product identities;
- network-specific SS58 sender/receiver addresses derived from authenticated public keys;
- runtime signer public key must match stored authenticated payer public key;
- `SignerManager.connect()` + `getProductAccount(productId, 0)`;
- `getChainAPI(network)`;
- `Balances.transfer_keep_alive`;
- `submitAndWatch(..., waitFor: 'finalized')`;
- distinct `NativePolkadotPaymentReceipt` with tx/block/network/asset/from/to/amount evidence;
- `Split.nativePayment` preserves native evidence separately from EVM evidence;
- exact native evidence validation before application state changes;
- duplicate native tx hashes rejected;
- valid native evidence → `marked_paid`, never direct `confirmed`;
- native evidence cannot use manual Undo;
- activity journal records `native_chain_transaction` evidence;
- PayerView prefers native PAS when both participants are authenticated and the obligation itself is PAS;
- existing EVM PAS route remains compatibility fallback otherwise;
- consumer UI explicitly says `Paseo TestNet · PAS`; no fake DOT claim;
- `npm run test:native-payment`.

Tests written for amount precision, identity/product mismatch, public-key-derived addresses, receipt tampering, exact evidence persistence, duplicate tx rejection, receiver confirmation and local-only routing.

Required before DONE:

- dependency install/typecheck/build;
- resolve `DEBT-POLKADOT-IDENTITY-001`;
- resolve/verify `DEBT-POLKADOT-SDK-001` package compatibility;
- real host native PAS payment with funded product account;
- signing rejection + insufficient-balance failure proof;
- receiver confirmation after successful native evidence.

Production DOT remains unclaimed until a separate real Polkadot-network proof exists.

### POLKADOT-003 — USDC settlement adapter

**Status:** `TODO`

Next unblocked build slice.

Requirements:

- verify current first-party asset-transfer path rather than assume native Balances API;
- explicit USDC asset id/decimals/network;
- authenticated destination;
- integer base units;
- balance/fee behavior;
- signing/submission/finality evidence;
- exact evidence matching;
- current receiver-confirmation policy;
- no fake mainnet claim from DevNet proof.

### HISTORY-001 — Real money activity history

**Status:** `TODO`

Consume append-only events into human-readable timeline.

### IDENTITY-001 — Profile lifecycle + recovery

**Status:** `TODO`

### QUALITY-001 — Validation + error/recovery

**Status:** `TODO`

### QUALITY-002 — Mobile + accessibility + consumer polish

**Status:** `TODO`

Required viewports: 320/375/390px.

### SYNC-001 — Shared-state client activation

**Status:** `TODO / PARTIALLY PLATFORM-BLOCKED`

Canonical correctness comes from BACKEND/API first. Statement Store is optional wakeup/version hint.

### BULLETIN-001 — Private artifact policy + optional evidence storage

**Status:** `TODO / OPTIONAL FOR V1`

No plaintext personal receipts merely to increase Polkadot usage.

### RELEASE-001 — v1 acceptance journey

**Status:** `TODO`

```text
fresh user
→ local/Polkadot identity
→ group + people
→ add/correct expense
→ balances
→ request
→ cash settlement
→ native Polkadot settlement
→ USDC if verified
→ receiver confirmation
→ explainable history
→ restart/reload
→ same money truth
```

---

## 8. Current Foundation Debt

Canonical register: `docs/FOUNDATION_DEBT.md`.

Important items:

- `DEBT-MONEY-001` — local canonical money still uses JS `number`.
- `DEBT-SECURITY-001` — legacy direct-confirm reducer action remains internally.
- `DEBT-PERSIST-001` — local persistence lacks schema-version migration chain.
- `DEBT-SYNC-001` — new mutation/evidence/identity actions are intentionally local-only on this branch.
- `DEBT-PRODUCT-001` — expense inspection resolved; runtime verification remains.
- `DEBT-POLKADOT-IDENTITY-001` — product id/account derivation must be reconciled on real host.
- `DEBT-POLKADOT-SDK-001` — new transaction packages must be dependency/type/build/host-regression verified against inherited SDK versions.

Debt is never silently fixed inside unrelated slices.

---

## 9. Codex Reconciliation Protocol

When current local/deployed source is available:

1. Identify exact branch/commit that produced current `.dot` build.
2. Compare with `chatgpt/chopdot-v1-completion`.
3. Do not blindly merge.
4. Read this board + guardrails + data architecture first.
5. For each slice, keep the stronger implementation and cherry-pick modular commits where practical.
6. Reconcile actual Product SDK `productId`/product-account derivation.
7. Reconcile Product SDK family versions before native host execution.
8. Remove/rewrite legacy matched-wallet direct-confirm semantics.
9. Run lint/typecheck + relevant unit tests.
10. Build production bundle.
11. Run host simulation.
12. Run real `.dot`/device/chain proof where required.
13. Deploy only after acceptance gate passes.
14. Record deployed version/CID/domain/evidence here.

---

## 10. Build / Decision Log

| Date | Slice | Status | Evidence / representative commits | Notes |
|---|---|---|---|---|
| 2026-08-15 | FOUNDATION-000 | DONE | `9625b4cd` | Canonical execution system |
| 2026-08-15 | FOUNDATION-001 | DONE | guardrail commits | Product/security/architecture/engineering/quality standards |
| 2026-08-15 | RESEARCH-001 | DONE | `2b1e8a7a` | First-party Parity architecture review |
| 2026-08-15 | DATA-001 | DONE (design) | `3f6d66f9`, `f3f4a8ad` | Hybrid shared-data architecture accepted |
| 2026-08-15 | MONEY-001 | READY_FOR_CODEX_VERIFY | `b0e795ec`…`3af74311` | Expense inspection/edit/delete |
| 2026-08-15 | MONEY-002 | READY_FOR_CODEX_VERIFY | `5259ee3`…`1fcbe32` | Safe request/payment corrections |
| 2026-08-15 | GROUP-001 | READY_FOR_CODEX_VERIFY | `44a6e71`…`5f78fd9` | Group management + obligation safety |
| 2026-08-15 | PEOPLE-001 | READY_FOR_CODEX_VERIFY | `49b5365`…`0df4c76` | Reusable people + receive preferences |
| 2026-08-15 | SETTLEMENT-001 | READY_FOR_CODEX_VERIFY | `f0313f7`…`8a00a88`, follow-ups | Unified rails/evidence; conservative chain semantics |
| 2026-08-15 | SETTLEMENT-002 | READY_FOR_CODEX_VERIFY | `679eb8e`…`0f3828a` | Reversible manual acknowledgement + audit journal |
| 2026-08-15 | POLKADOT-001 | READY_FOR_CODEX_VERIFY | `db2b702`…`f6644ed` | Host-authenticated product identity; real-host/product-id verification pending |
| 2026-08-15 | POLKADOT-002 | READY_FOR_CODEX_VERIFY | `e2f03de`…`c9f63d7` | Native PAS DevNet adapter + Product SDK transaction path; runtime/real-chain evidence pending |

---

## 11. External References

- Statement Store allowance blocker: https://github.com/paritytech/polkadot-desktop-community/issues/29
- Historical dot.li/paseo.li resolution: https://github.com/paritytech/dotli-community/issues/57
- Product SDK: https://github.com/paritytech/product-sdk
- Product SDK transaction reference: `product-sdk/skills/product-sdk-transactions/SKILL.md`
- TrUAPI payment types: `paritytech/truapi` payment API
- Polkadot Developer Docs: Paseo native PAS uses 10 decimals
- Polkadot Desktop: https://github.com/paritytech/polkadot-desktop-community
- Polkadot App backend: https://github.com/paritytech/identity-backend-community
- dotli starter: https://github.com/paritytech/dotli-starter

---

## 12. Anti-AI-Slop Review

Before accepting generated work, ask:

- Does this solve a real user action?
- Is money state unambiguous before/after?
- Which system is authoritative for this fact?
- Is there exactly one canonical authority?
- Is identity provenance explicit rather than inferred from names/strings?
- Is asset/network identity explicit rather than inferred from branding?
- Does failure leave financial truth unchanged/recoverable?
- Are we adding architecture because required, not because it sounds sophisticated?
- Can behavior be tested deterministically?
- Is consumer copy human rather than protocol jargon?
- Are we duplicating a host/platform capability?
- Are we forcing data onto Polkadot where a private/queryable store is better?
- Does Polkadot add authority, settlement, proof, portability or reduced friction here?
- Can another engineer/agent understand the decision from repo docs/tests without this chat?

If any critical answer is no, stop and resolve it before marking the slice complete.
