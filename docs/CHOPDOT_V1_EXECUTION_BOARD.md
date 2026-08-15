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

Ship the simplest complete version of ChopDot that a normal person can trust for real shared-money coordination.

Target journey:

```text
enter ChopDot
→ establish local/Polkadot identity
→ add or invite people
→ create group
→ add expense
→ edit/correct expense safely
→ review balances
→ request settlement
→ settle via cash / external rail / DOT / USDC
→ receiver confirms according to current policy
→ preserve durable explainable history
```

Polkadot should improve identity, authority, payment, proof, portability, and host-native UX without forcing protocol complexity into ordinary screens.

---

## 2. Current Baseline

Known DevNet deployment:

- domain: `chopdotproof02.dot`
- known deployed version from upstream issue context: `0.5.6`

This branch was created from:

- `codex/portable-shell-trial`

Important limitation:

- the exact source that produced the latest deployed/current local shell may contain newer Codex work not yet reconciled here;
- this branch therefore favors modular domain logic, tests, adapters, narrow UI slices, and explicit debt over broad rewrites;
- when the true current source appears, Codex must compare/cherry-pick/reconcile rather than blindly merge.

Current pushed runtime persistence remains:

```text
local reducer/AppState
→ browser/host local KV
```

The accepted production target is **not** implemented yet.

---

## 3. Accepted Architecture

Target shared architecture:

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
canonical operational shared state + append-only audit events
        ↙                 ↘
POLKADOT CHAIN        STATEMENT STORE
DOT/USDC facts         tiny optional wakeup/version hints
finality/evidence      capability-gated
        ↓
BULLETIN / CLOUD STORAGE
optional encrypted receipts/snapshots/evidence blobs
```

Authority rules:

- Postgres = canonical ChopDot shared operational state.
- Polkadot chain = canonical facts for actual on-chain transactions/finality.
- Polkadot Host/App = product-account/login/signing authority boundary.
- local KV = local draft/cache/prototype persistence, not multi-user truth.
- Statement Store = optional tiny invalidation/wakeup transport, never the ledger.
- Bulletin = optional content-addressed artifacts, never the relational ledger.
- backend never stores user private signing keys/seed phrases.
- clients do not directly mutate canonical financial tables in production mode.

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
9. Under current v1 policy: payer evidence/attestation → `marked_paid`; receiver confirmation → `confirmed`.
10. Host capabilities are adapters, not separate product forks.
11. Polkadot complexity belongs at the authority/payment boundary.
12. A manually entered wallet/payment destination is not equivalent to host-authenticated identity.

Conceptual domain direction:

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

Current local statuses remain:

```text
open → request_sent → marked_paid → confirmed
```

---

## 5. Upstream / Platform Blockers

### BLOCKER-POLKADOT-001 — real Desktop Statement Store allowance

Issue:

- https://github.com/paritytech/polkadot-desktop-community/issues/29

Observed:

```text
container ✓
identity ✓
service ✓
allowance ✗
```

Failure includes:

```text
Submit failed, no allowance set for account
```

Policy:

- fail closed;
- do not change financial truth if the capability fails;
- do not claim Statement Store sync;
- canonical shared correctness must not depend on Statement Store.

### BLOCKER-POLKADOT-002 — historical dot.li network mismatch

Resolved context:

- https://github.com/paritytech/dotli-community/issues/57

Not a current product blocker.

---

## 6. Status Values / Quality Discipline

Statuses:

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`
- `DONE`

`READY_FOR_CODEX_VERIFY` means code/tests are written and reviewable here but required local/typecheck/build/device evidence has not been executed.

`DONE` for runtime work means applicable quality-gate evidence exists **and** reconciliation against the true current source occurred.

Required workflow:

```text
select slice
→ read mandatory context
→ preflight user goal + authority + failure states
→ implement smallest vertical slice
→ write deterministic tests
→ review diff/security/product boundaries
→ record evidence/limitations/debt
→ update this board
→ only then move to next slice
```

Unexecuted tests are always labelled **WRITTEN / NOT EXECUTED HERE**.

---

## 7. Build Queue

### FOUNDATION-000 — Canonical execution board

**Status:** `DONE`

Canonical persistent queue/process established.

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

Key conclusion: first-party Parity patterns support a hybrid architecture: normal Postgres/service coordination + device-side signing + specialized Polkadot primitives for chain facts, host authority, pub/sub, and content storage.

### DATA-001 — Canonical ChopDot data architecture

**Status:** `DONE` (G0 design only)

Accepted boundaries documented in `docs/DATA_ARCHITECTURE.md`.

### MONEY-001 — Expense detail + edit + delete foundation

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- expense list/detail;
- edit/delete before counterparty payment activity;
- amount/date/payer/participant/split replacement validation;
- deterministic balance recalculation;
- tests for correction, payer change, participant removal, invalid split, deletion and duplicate protection.

### MONEY-002 — Safe correction after request/settlement

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- idempotent `CORRECT_EXPENSE` flow;
- stale-request invalidation/replacement;
- additive correction/refund entries after payment evidence;
- immutable paid history;
- mixed-state request cleanup;
- consumer `Correct expense` UX.

### DATA-002 — Integer money + persisted schema migration

**Status:** `TODO / RECONCILE CURRENT SOURCE FIRST`

Triggered by `DEBT-MONEY-001` and `DEBT-PERSIST-001`.

Scope:

- explicit schema version + migrations;
- corruption handling;
- integer minor/base units for canonical money;
- migration/invariant tests.

### GROUP-001 — Group editing + member safety

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- Manage Group;
- rename/add/reuse known person;
- safe active-roster removal;
- preserve historical attribution;
- raw unresolved-obligation safety, including zero-net-but-unsettled cases;
- tests.

### PEOPLE-001 — Friends + reusable payment preferences

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- lightweight person detail;
- shared-group context;
- reusable cash/bank/payment-link preferences;
- per-person preferred receive method;
- stable update ids;
- read-only wallet/account references;
- no manual friend wallet-address trust expansion;
- tests.

### BACKEND-001 — Shared service + Postgres foundation

**Status:** `TODO / RECONCILE CURRENT SOURCE FIRST`

Prerequisites:

- DATA-001 accepted ✓
- current source reconciled
- exact Polkadot host/product-account flow verified
- privacy/retention baseline decided

Initial scope:

- Postgres migrations;
- TypeScript service/repository boundary;
- users/identities/groups/group_members/expenses/splits/activity first;
- authenticated/idempotent command boundary;
- paginated/indexed query boundary;
- no user private keys server-side.

### BACKEND-002 — Obligations + payment-intent persistence

**Status:** `TODO`

Scope:

- formal obligation projection;
- durable payment intents;
- optimistic concurrency/versioning;
- idempotency records;
- append-only events;
- transactional tests.

### SETTLEMENT-001 — Unified settlement domain + adapters

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- generic rails: cash, bank transfer, payment link, Polkadot native, Polkadot USDC;
- evidence classes and common lifecycle;
- evidence → awaiting receiver confirmation under current policy;
- live PAS path no longer claims immediate final settlement;
- exact verified chain evidence persisted on the split;
- duplicate tx/network/from/to/amount checks;
- `npm run test:settlement`.

Limitation:

- legacy `RECORD_MATCHED_PAYMENT` direct-confirm branch remains under `DEBT-SECURITY-001` and must be removed/reconciled locally.

### SETTLEMENT-002 — Cash/manual settlement complete

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented:

- payer attestation → `marked_paid`;
- clear “waiting for receiver” state;
- manual Undo before receiver confirmation;
- confirmed/chain-evidenced payments cannot use manual Undo;
- durable local events for mark-paid / retract / confirm;
- invalid/no-op transitions do not create false audit events.

### POLKADOT-001 — Host identity + authenticated application authority

**Status:** `READY_FOR_CODEX_VERIFY`

Preflight:

- `docs/slices/POLKADOT-001_PREFLIGHT.md`

Implemented:

- explicit `User.hostIdentity` provenance: source, host username, product id, product-account public key, account id/prefix, bound timestamp;
- 32-byte public-key normalization/validation;
- local-only bind/unbind actions that never enter the legacy shared-session publisher;
- local app reducer composes identity + settlement safety boundaries;
- Profile probes host capability and offers `Connect Polkadot` only when appropriate;
- successful Product SDK-backed host login/account request binds the returned product account to the current local user;
- display name remains independent from host username;
- connected Profile shows host username/product account/product id with explicit private-key and sync caveats;
- disconnect removes host provenance + compatibility account public key while preserving profile/groups/expenses/history;
- manually saved wallet address stays separate from authenticated product account;
- tests cover identity binding, malformed keys/metadata, unbinding, wallet separation, and local-only action routing;
- `npm run test:identity` added.

Mandatory verification before DONE:

- reconcile the current/deployed ChopDot Product SDK `productId` before changing derivation inputs;
- verify `getProductAccount(productId, 0)` on the real current host;
- run typecheck/build/unit/host-adapter tests;
- approve + reject login paths on-device;
- verify identity persistence/reload and disconnect behavior.

Important: this slice authenticates the host-returned product account locally. It does **not yet** implement backend challenge/session issuance for canonical shared API authorization.

### POLKADOT-002 — DOT settlement adapter

**Status:** `TODO`

Goal: settle an obligation using the supported Polkadot native-asset host/app signing path.

Requirements:

- consume trusted host/product-account capability rather than arbitrary destination trust;
- canonical base units;
- recipient/network/amount validation;
- signing boundary;
- submission/finality evidence;
- independent matching where shared backend exists;
- receiver confirmation under current v1 policy;
- retry/idempotency/failure safety.

### POLKADOT-003 — USDC settlement adapter

**Status:** `TODO`

Same discipline as DOT plus explicit asset id/decimals/balance/destination/network matching. Do not assume native DOT APIs apply unchanged.

### HISTORY-001 — Real money activity history

**Status:** `TODO`

Goal: global history explains what happened rather than only listing finished groups.

Consume append-only events such as:

```text
expense_added
expense_edited
request_sent
request_replaced
payment_marked_paid
payment_confirmed
settlement_submitted
payment_failed
adjustment_created
group_finished
```

### IDENTITY-001 — Profile lifecycle + recovery

**Status:** `TODO`

Scope:

- local profile lifecycle;
- rename/profile editing quality;
- import/migration when canonical shared identity exists;
- recovery/rebinding semantics;
- no misleading cloud-sync claims.

### QUALITY-001 — Validation + error/recovery pass

**Status:** `TODO`

### QUALITY-002 — Mobile + accessibility + consumer polish

**Status:** `TODO`

Required viewports include 320/375/390px.

### SYNC-001 — Shared-state client activation

**Status:** `TODO / PARTIALLY PLATFORM-BLOCKED`

Canonical correctness should come from BACKEND/API first.

Intended Statement Store enhancement:

```text
canonical DB commit
→ tiny wakeup/version hint
→ peer fetches canonical projection
```

Never make Statement Store mandatory for financial correctness.

### BULLETIN-001 — Private artifact policy + optional evidence storage

**Status:** `TODO / OPTIONAL FOR V1`

No plaintext personal receipts merely to increase Polkadot usage.

### RELEASE-001 — v1 acceptance journey

**Status:** `TODO`

Target:

```text
fresh user
→ local/Polkadot identity
→ group + people
→ add/correct expense
→ balances
→ request
→ cash settlement
→ DOT settlement
→ USDC if verified
→ receiver confirmation
→ explainable history
→ restart/reload
→ same money truth
```

Shared-mode extension:

```text
two devices
→ same canonical group
→ authorized mutation
→ peer refresh/reconcile
→ no duplicated/conflicting financial truth
```

---

## 8. Current Foundation Debt

Canonical register: `docs/FOUNDATION_DEBT.md`.

Current important items:

- `DEBT-MONEY-001` — local canonical money still uses JS `number`; dedicated migration required.
- `DEBT-SECURITY-001` — live settlement now follows conservative evidence/confirmation semantics, but legacy `RECORD_MATCHED_PAYMENT` direct-confirm remains internally.
- `DEBT-PERSIST-001` — local persistence still lacks explicit schema-version migration chain.
- `DEBT-SYNC-001` — local edit/correction/group/people/settlement-undo/identity-binding authority is intentionally not propagated through the old shared transport.
- `DEBT-PRODUCT-001` — expense inspection surface resolved on this branch; runtime verification remains.
- `DEBT-POLKADOT-IDENTITY-001` — current Product SDK product id/account derivation must be reconciled against the true current deployed host before POLKADOT-001 can be production authority.

Debt is never silently fixed inside unrelated slices.

---

## 9. Codex Reconciliation Protocol

When current local/deployed source is available:

1. Identify the exact branch/commit that produced the current `.dot` build.
2. Compare it with `chatgpt/chopdot-v1-completion`.
3. Do **not** blindly merge.
4. Read this board + guardrails + data architecture first.
5. For every slice:
   - determine whether current source already solved it;
   - keep the stronger implementation;
   - cherry-pick modular commits where practical;
   - resolve domain/security/data conflicts deliberately.
6. Reconcile the actual Product SDK `productId`/account derivation before treating host identity as production authority.
7. Remove/rewrite legacy matched-wallet direct-confirm semantics.
8. Run lint/typecheck + relevant unit tests.
9. Build production bundle.
10. Run host simulation.
11. Run real `.dot`/device/chain proof where required.
12. Deploy only after the acceptance gate passes.
13. Record deployed version/CID/domain/evidence here.

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
| 2026-08-15 | POLKADOT-001 | READY_FOR_CODEX_VERIFY | `db2b702`…`2b17aec`, boundary fix `ac052aa`, routing test `203eb9a` | Host-authenticated product-account provenance + capability-aware Profile; real-host/product-id verification pending |

---

## 11. External References

- Statement Store allowance blocker: https://github.com/paritytech/polkadot-desktop-community/issues/29
- Historical dot.li/paseo.li resolution: https://github.com/paritytech/dotli-community/issues/57
- Product SDK: https://github.com/paritytech/product-sdk
- Polkadot Desktop: https://github.com/paritytech/polkadot-desktop-community
- Polkadot App backend: https://github.com/paritytech/identity-backend-community
- dotli starter: https://github.com/paritytech/dotli-starter
- Polkadot app examples: https://github.com/paritytech/polkadot-apps

---

## 12. Anti-AI-Slop Review

Before accepting generated work, ask:

- Does this solve a real user action?
- Is money state unambiguous before/after?
- Which system is authoritative for this fact?
- Is there exactly one canonical authority?
- Is identity provenance explicit rather than inferred from names/strings?
- Does failure leave financial truth unchanged/recoverable?
- Are we adding architecture because required, not because it sounds sophisticated?
- Can behavior be tested deterministically?
- Is consumer copy human rather than protocol jargon?
- Are we duplicating a host/platform capability?
- Are we forcing data onto Polkadot where a private/queryable store is better?
- Does Polkadot add authority, settlement, proof, portability, or reduced friction here?
- Can another engineer/agent understand the decision from repo docs/tests without this chat?

If any critical answer is no, stop and resolve it before marking the slice complete.
