# ChopDot v1 Completion — Canonical Execution Board

> **Branch:** `chatgpt/chopdot-v1-completion`  
> **Purpose:** Build a consumer-grade ChopDot foundation in small, reviewable slices while the newer local/Codex branch remains unavailable.  
> **Rule:** This document is the source of truth for this parallel build. Update it after every completed slice before starting the next one.

---

## 0. Mandatory Startup Context

Before implementing any slice, read these in order:

1. `docs/CHOPDOT_V1_EXECUTION_BOARD.md` — current status and next slice
2. `docs/PRODUCT_EXPERIENCE.md` — what the product must feel like
3. `docs/SECURITY_TRUST_MODEL.md` — what can be trusted and who has authority
4. `docs/ARCHITECTURE_DECISIONS.md` — decisions that must stay consistent
5. `docs/DATA_ARCHITECTURE.md` — where shared/local/chain/artifact data belongs
6. `docs/ENGINEERING_STANDARDS.md` — how changes must be built
7. `docs/QUALITY_GATE.md` — what evidence is required before completion

For Polkadot/data-sensitive work also read:

- `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`

Then consult existing technical contracts as relevant:

- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `HOSTS.md`
- `PORTABLE_SHELL_TRIAL.md`
- `DESIGN.md`

Before touching runtime work that intersects known debt, read:

- `docs/FOUNDATION_DEBT.md`
- the relevant `docs/slices/*_PREFLIGHT.md`

**No slice begins from chat context alone.**

---

## 1. Mission

Ship the simplest complete version of ChopDot that a normal person can trust for real shared-money coordination.

The product should feel like a consumer finance app first. Polkadot should make identity, payment, proof, portability, and host-native capabilities better without forcing crypto complexity into normal flows.

The minimum end-to-end journey is:

```text
enter ChopDot
→ establish identity/profile
→ add or invite people
→ create group
→ add expense
→ edit/correct expense if needed
→ review split
→ see balances
→ request settlement
→ settle via cash / external rail / DOT / USDC
→ confirm outcome
→ preserve durable history
```

Cross-device shared state should be enabled only when its real authority path is trustworthy. ChopDot must never pretend a payment or synchronization happened when it cannot prove it.

---

## 2. Current Baseline

### Deployed product

Current known DevNet deployment:

- Domain: `chopdotproof02.dot`
- Known deployed app version from upstream issue: `0.5.6`
- Current product surface observed on device:
  - Home / groups
  - Add spend
  - Split review
  - Friends
  - Receive Money / payment methods
  - History
  - Settings
  - Local profile
  - PAS wallet entry point

### GitHub-visible source baseline

This branch was created from:

- `codex/portable-shell-trial`

Important limitation:

- the code that produced `chopdotproof02.dot` v0.5.6 may contain newer local Codex changes that are not yet pushed to GitHub;
- therefore this branch MUST prefer modular logic, tests, contracts, adapters, and narrowly scoped UI changes over broad rewrites;
- when the true v0.5.6 source appears, Codex must compare/cherry-pick/reconcile rather than blindly merge.

### Current runtime data baseline

The pushed portable shell currently uses:

```text
local reducer/AppState
→ host/browser local persistence
```

It does **not** yet implement the accepted shared Postgres architecture in `docs/DATA_ARCHITECTURE.md`.

That distinction must remain explicit: the data architecture is the target for shared production mode, not a claim about what the current deployed shell already does.

---

## 3. Upstream Polkadot / DevNet Blockers

### BLOCKER-POLKADOT-001 — Statement Store allowance on real Desktop host

Issue:

- https://github.com/paritytech/polkadot-desktop-community/issues/29

Observed real-host probe:

```text
container → identity → service → allowance → canary publish → canary readback
```

Current result:

```text
container ✓
identity ✓
service ✓
allowance ✗
```

Failure:

```text
Submit failed, no allowance set for account
```

Separate product-side error also observed:

```text
Unknown enum discriminant: 92
```

Policy for ChopDot:

- fail closed;
- do not change money truth when allocation fails;
- do not claim Statement Store synchronization;
- Statement Store is optional wakeup/invalidation transport, not canonical storage;
- keep the capability boundary ready for the upstream fix.

### BLOCKER-POLKADOT-002 — previous dot.li network mismatch

Resolved historical context:

- https://github.com/paritytech/dotli-community/issues/57
- `dot.li` pointed to deprecated Summit for the affected deploy
- `paseo.li` targets `paseo-next-v2`

Not a current product blocker.

---

## 4. Product Rules — Non-Negotiable

1. **Money truth beats UI convenience.** Never silently rewrite confirmed payments.
2. **One dominant action per normal screen.** Avoid dashboards and protocol-console UX.
3. **Crypto is a payment rail, not a product mode.** Cash, bank links, DOT, and USDC share one settlement model.
4. **No fake sync.** A client cannot claim another device has changed until canonical shared state says so.
5. **Host capabilities are adapters, not forks.** Web, `.dot`, Telegram-like hosts, etc. do not create separate products.
6. **Normal users should not see internal protocol language.** No adapter/state-machine/host jargon in consumer UI.
7. **Every destructive money action must be recoverable or explicitly irreversible.**
8. **Confirmed historical events are append-only.** Corrections create new truth; they do not erase old truth.
9. **Nobody should take action unless their money state is affected.**
10. **Polkadot complexity belongs at the boundary.** Identity/signing/asset transfer should be delegated to host/app capabilities where possible.
11. **Shared application state and chain truth are different authorities.** Postgres owns ChopDot operational state; Polkadot owns facts that happened on-chain.
12. **Keys stay with the user.** The ChopDot backend never stores user seed phrases/private signing keys.

---

## 5. Accepted Data/Trust Shape

Target shared architecture:

```text
POLKADOT APP / HOST
identity + product account + approval + signing
                |
                v
CHOPDOT CLIENT (.dot / web)
UI + drafts + local cache + offline projection
                |
          authorized commands
                v
CHOPDOT SERVICE
pure domain decisions + auth + idempotency + DB transactions
                |
                v
POSTGRES
canonical operational multi-user state + append-only audit events
                |
       +--------+---------+
       |                  |
       v                  v
POLKADOT CHAIN       STATEMENT STORE
DOT/USDC transfer     tiny optional wakeup/status
finality/evidence     capability-gated
       |
       v
BULLETIN / CLOUD STORAGE
optional encrypted receipts/snapshots/evidence blobs
```

Canonical reference:

- `docs/DATA_ARCHITECTURE.md`
- ADR-019 through ADR-026 in `docs/ARCHITECTURE_DECISIONS.md`

Important:

- this target does **not** require a big-bang backend rewrite before local product slices continue;
- pure domain logic should be extracted so current local tests and future server command handlers can share the same rules;
- shared datastore implementation happens in its own planned slices after v0.5.6 reconciliation.

---

## 6. Shared Domain Model Direction

Target conceptual flow:

```text
Expense
→ ExpenseSplit
→ Obligation
→ PaymentIntent
→ SettlementAttempt
→ SettlementEvidence
→ final application confirmation / closed obligation

Every meaningful transition
→ ActivityEvent (append-only)
```

### Expense lifecycle

```text
draft → active → requested → partially_settled → settled → archived
```

Editing rules:

- `draft` / `active`: full edit + delete allowed;
- `requested`: edit allowed, but affected requests become stale/cancelled/reissued;
- `partially_settled`: controlled correction only; preserve completed evidence;
- `settled`: original record immutable; corrections create adjustment/refund semantics.

### Payment lifecycle

Current local shell statuses remain:

```text
open → request_sent → marked_paid → confirmed
```

The mature shared model may represent additional attempt states internally such as `signing`, `submitted`, `failed`, and `cancelled` without leaking state-machine jargon into consumer UI.

Current v1 policy:

- Cash/manual: payer says paid -> `marked_paid`; receiver confirms -> `confirmed`.
- DOT/USDC: verified chain evidence may substantiate/advance payment state, but receiver confirmation remains the current final ChopDot transition until the canonical payment contract is deliberately amended.

Future automatic chain confirmation requires a threat-model + contract change per ADR-011.

---

## 7. Quality System

Every slice is governed by:

- Product: `docs/PRODUCT_EXPERIENCE.md`
- Security: `docs/SECURITY_TRUST_MODEL.md`
- Architecture: `docs/ARCHITECTURE_DECISIONS.md`
- Data: `docs/DATA_ARCHITECTURE.md`
- Engineering: `docs/ENGINEERING_STANDARDS.md`
- Release evidence: `docs/QUALITY_GATE.md`

Required workflow:

```text
select slice
→ read mandatory context
→ fill/preflight slice contract
→ review product/security/architecture/data constraints
→ implement smallest vertical behavior
→ write tests
→ review diff
→ collect available evidence
→ update this board + debt/ADRs if learned
→ only then select next slice
```

When local execution is unavailable, tests are labelled **WRITTEN / NOT EXECUTED HERE**. No unexecuted test is described as passing.

---

## 8. Status Values

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`
- `DONE`

`DONE` means the applicable Quality Gate evidence exists at the required level and, for runtime work on this parallel branch, reconciliation against the true current source has occurred.

For G0 research/architecture documents, `DONE` means source review + internal consistency review completed; it does not imply runtime implementation.

---

## 9. Ordered Build Queue

### FOUNDATION-000 — Canonical execution board

**Status:** `DONE`

Deliverable: this source-of-truth board and ordered completion queue.

---

### FOUNDATION-001 — Product/security/architecture/engineering/quality guardrails

**Status:** `DONE`

Deliverables:

- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/QUALITY_GATE.md`

Consistency result:

- guardrails align with existing payment/security contracts;
- older chain-auto-confirm wording is explicitly treated as debt/conflict;
- current v1 stays conservative until deliberately amended.

---

### RESEARCH-001 — Parity reference architecture review

**Status:** `DONE`

Deliverable:

- `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`

Key evidence/conclusion:

- Product SDK separates local KV, Statement Store, Cloud Storage, chain access, contracts, and signing rather than treating one primitive as the database;
- Statement Store is small ephemeral pub/sub;
- Bulletin/Cloud Storage is CID-addressed content storage;
- Parity's current Polkadot App backend uses PostgreSQL for shared service coordination while keeping signing on-device;
- Parity's Polkadot Hub App also uses React + Node.js + Postgres;
- a hybrid Postgres + Polkadot authority/settlement architecture is first-party-pattern-aligned.

---

### DATA-001 — Canonical ChopDot data architecture

**Status:** `DONE` (G0 design; implementation not started)

Deliverable:

- `docs/DATA_ARCHITECTURE.md`
- ADR-019 through ADR-026

Accepted boundaries:

- Postgres = shared operational application truth;
- Polkadot chain = canonical chain transaction/finality facts;
- Polkadot App/Host = identity/product account/signing authority boundary;
- local KV = draft/cache/offline projection;
- Statement Store = optional tiny invalidation/wakeup signal;
- Bulletin = optional content-addressed encrypted artifacts;
- backend keys = never user private signing keys;
- client does not directly write canonical financial tables;
- shared mutations go through an authorized/idempotent command boundary.

Implementation is deliberately deferred until the true v0.5.6 source is reconciled and the backend migration slices are scoped.

---

### MONEY-001 — Expense detail + edit + delete foundation

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented on this branch:

- concise expense list in Group Detail;
- expense detail surface;
- edit amount/description/date/payer/participants/split before payment activity;
- delete unsettled/open expense;
- atomic replacement validation;
- deterministic balance recalculation;
- reducer tests for correction, payer change, participant removal, invalid split, deletion and duplicate protection;
- edit/delete remains local-only and is not published through the blocked shared-session transport.

Safety boundary:

- `request_sent`, `marked_paid`, or `confirmed` counterparty activity refuses ordinary edit/delete and routes to MONEY-002.

Tests are written but not executed in this connected environment. Required G2 local-flow evidence still needs Codex/local verification against the true current source.

---

### MONEY-002 — Safe correction after request/settlement

**Status:** `READY_FOR_CODEX_VERIFY`

Implemented on this branch:

- `CORRECT_EXPENSE` command with correction-id idempotency;
- request-only correction invalidates the old request scope and issues a fresh request id for still-owed requested participants;
- removing a requested participant leaves no live stale request;
- payment-active correction preserves original expense/payment evidence and creates explicit forward/refund adjustment records;
- mixed state invalidates remaining stale requests without mutating paid evidence;
- payer changes are rejected after request/payment activity in this local-shell implementation;
- adjustment entries are read-only historical records;
- effective group spend applies forward/refund adjustment direction;
- Expense Detail offers a consumer-facing **Correct expense** flow with consequence messaging.

Current limitation:

- tests are **WRITTEN / NOT EXECUTED HERE**;
- no repository CI workflow exists on this branch;
- local verification is still required before `DONE`.

---

### DATA-002 — Integer money + persisted schema migration

**Status:** `TODO / RECONCILE v0.5.6 FIRST`

Triggered by:

- `DEBT-MONEY-001`
- `DEBT-PERSIST-001`

Goal:

Move canonical product money/persistence toward the accepted data model without silently destroying existing local records.

Scope to define after v0.5.6 appears:

- explicit local `schemaVersion`;
- migration chain and corruption handling;
- integer minor/base units for canonical money domain;
- compatibility with existing UI formatting;
- migration/invariant tests.

Do not hide this migration inside unrelated expense UX work.

---

### GROUP-001 — Group editing + member safety

**Status:** `READY_FOR_CODEX_VERIFY`

Preflight:

- `docs/slices/GROUP-001_PREFLIGHT.md`

Implemented on this branch:

- unobtrusive Manage Group entry point from Group Detail;
- rename group with normalized non-empty name;
- add a person by name and reuse an existing known user where names match;
- remove an eligible person from the active roster only;
- preserve former-member `User`, expense, and split history;
- block removal whenever raw unresolved obligations involve that person, even when derived net balance is zero;
- block self-removal in this first slice;
- plain-language blocked-removal messaging;
- pure group-safety helper module and invariant tests.

Current limitation:

- local updates persist through the existing prototype `CREATE_GROUP` state action; canonical owner/admin authorization belongs to BACKEND/POLKADOT shared-mode work;
- dedicated archive/ownership-transfer semantics remain deferred;
- tests are **WRITTEN / NOT EXECUTED HERE** and require Codex/local G2 verification.

---

### PEOPLE-001 — Friends + reusable payment preferences

**Status:** `TODO`

Scope:

- friend detail;
- reusable display name;
- identity/address references where available;
- preferred receive methods;
- Polkadot identity/QR seam where host supports it;
- avoid social-network scope creep.

---

### BACKEND-001 — Shared service + Postgres foundation

**Status:** `TODO / RECONCILE v0.5.6 FIRST`

Prerequisites:

- DATA-001 accepted ✓
- v0.5.6 source reconciled
- exact Polkadot auth/product-account flow verified
- privacy/retention baseline decided

Initial scope:

- PostgreSQL + migrations;
- TypeScript service/repository boundary;
- likely Drizzle ORM unless current repo constraints argue otherwise;
- pure domain decisions reused from local product logic where possible;
- users/identities/groups/group_members/expenses/splits/activity schema first;
- idempotent authenticated command boundary;
- indexed paginated query boundary;
- no user private keys on server.

Non-goal: migrate every feature/backend entity in one PR.

---

### BACKEND-002 — Obligations + payment-intent persistence

**Status:** `TODO`

Scope:

- formal obligation projection;
- durable payment intents conforming to `PAYMENT_INTENT_CONTRACT.md`;
- optimistic concurrency/versioning;
- idempotency records;
- append-only events;
- transactional repository tests.

---

### SETTLEMENT-001 — Unified settlement domain + adapters

**Status:** `TODO`

Goal: introduce one settlement interface for all payment methods.

Scope:

- common settlement result/state shape;
- cash adapter;
- bank/external adapter contract;
- payment-link adapter contract;
- DOT adapter contract;
- USDC adapter contract;
- evidence model;
- failure/retry/idempotency semantics.

No UI-specific branching in core financial logic.

---

### SETTLEMENT-002 — Cash settlement complete

**Status:** `TODO`

Scope:

- mark cash paid;
- receiver confirmation;
- cancel/retry before confirmation;
- durable history;
- no wallet prompts.

---

### POLKADOT-001 — Host identity + authenticated application authority

**Status:** `TODO`

Goal: use Polkadot host/app identity where available without breaking local/guest mode and establish a secure server actor/session boundary for shared mode.

Scope:

- current Product SDK host/product-account identity verification;
- local fallback while shared mode is absent;
- account/address presentation;
- QR/share seam;
- capability-aware UI;
- challenge/session design only after first-party verification;
- keys remain on user device.

Must not require Statement Store publishing.

---

### POLKADOT-002 — DOT settlement adapter

**Status:** `TODO`

Goal: pay an obligation using DOT through the supported Polkadot host/app signing path.

Scope:

- product/account selection where supported;
- canonical base units;
- amount/recipient/network validation;
- signing boundary;
- transaction submission/finality evidence;
- server-side/independent evidence matching when shared backend exists;
- receiver confirmation under current v1 policy;
- evidence/history;
- cancel/retry/idempotency behavior.

If a required capability is unavailable, mark execution `BLOCKED`, not faked.

---

### POLKADOT-003 — USDC settlement adapter

**Status:** `TODO`

Goal: settle an obligation with USDC on the supported Polkadot asset environment.

Scope mirrors DOT adapter plus:

- explicit asset identification;
- decimals/base units;
- balance checks;
- correct destination/account format;
- network/asset evidence matching.

Do not assume native DOT execution APIs apply unchanged to USDC until verified.

---

### HISTORY-001 — Real money activity history

**Status:** `TODO`

Goal: history explains what happened, not merely which groups are finished.

Candidate events:

```text
expense_added
expense_edited
expense_deleted
request_sent
request_replaced
settlement_submitted
payment_marked_paid
payment_confirmed
payment_failed
adjustment_created
group_finished
```

Requirements:

- readable consumer language;
- timestamps;
- relevant amount/currency;
- settlement evidence where applicable;
- confirmed/audit events append-only.

---

### IDENTITY-001 — Profile lifecycle + recovery model

**Status:** `TODO`

Scope:

- local profile completeness;
- rename/profile editing;
- distinguish device-local profile from verified host identity;
- migration/import behavior when shared identity becomes available;
- no misleading cloud-sync claims.

---

### QUALITY-001 — Validation + error/recovery pass

**Status:** `TODO`

Scope:

- form validation;
- destructive-action confirmation;
- failed payment recovery;
- loading states;
- capability-unavailable states;
- back/cancel consistency;
- app restart resilience;
- local persistence corruption handling where practical.

---

### QUALITY-002 — Mobile + accessibility + consumer polish

**Status:** `TODO`

Scope:

- 320/375/390px viewport review;
- safe areas;
- focus/input viewport behavior;
- accessible labels;
- tap targets;
- empty states;
- copy hierarchy;
- no dashboard/protocol-console drift.

---

### SYNC-001 — Shared-state client activation

**Status:** `TODO / PARTIALLY PLATFORM-BLOCKED`

Canonical shared-state correctness does **not** depend on Statement Store once BACKEND-001 exists. A standard API refresh/reconnect path may provide correctness first.

Statement Store enhancement remains blocked by:

- `BLOCKER-POLKADOT-001`

Intended eventual role:

```text
canonical DB commit
→ tiny Statement Store wakeup/version hint
→ peer fetches canonical projection
```

Prepare/test:

- client repository adapter;
- optimistic version/reconciliation rules;
- idempotency;
- offline recovery;
- two-device acceptance journey;
- fallback when Statement Store is unavailable.

Never make Statement Store mandatory for financial correctness.

---

### BULLETIN-001 — Private artifact policy + optional receipt/evidence storage

**Status:** `TODO / OPTIONAL FOR V1`

Before storing personal financial artifacts on Bulletin:

- define encryption;
- key sharing/recovery;
- retention/renewal;
- authorization;
- deletion/privacy expectations;
- clear user value over a conventional private object store.

No plaintext personal receipts merely to increase Polkadot usage.

---

### RELEASE-001 — v1 acceptance journey

**Status:** `TODO`

Target acceptance journey:

```text
fresh user
→ profile/identity
→ create group
→ add people
→ add expense
→ correct expense
→ review balances
→ request payment
→ settle cash
→ settle DOT
→ settle USDC if capability verified
→ confirm outcomes according to current policy
→ inspect explainable history
→ close/reopen app
→ same money truth remains
```

For shared mode, additionally:

```text
two devices
→ same canonical group
→ authorized mutation
→ other device refreshes/reconciles
→ no duplicate or conflicting financial state
```

Statement Store is not a prerequisite for correctness if the canonical service path is available; its native wakeup path remains separately evidence-gated.

---

## 10. Current Foundation Debt

Canonical register:

- `docs/FOUNDATION_DEBT.md`

Current important items:

- `DEBT-MONEY-001` — current local money uses JS `number`; dedicated migration required.
- `DEBT-SECURITY-001` — current matched-wallet runtime directly confirms, conflicting with conservative canonical contract.
- `DEBT-PERSIST-001` — local persistence lacks explicit schema migration chain.
- `DEBT-SYNC-001` — current edit/correction/delete/group shared authority is undefined on old portable transport.
- `DEBT-PRODUCT-001` — **resolved on this branch by MONEY-001:** Group Detail now exposes expense inspection.

Debt is not silently fixed inside unrelated slices.

---

## 11. Codex Reconciliation Protocol

When the real v0.5.6 source is pushed:

1. Identify the branch/commit that produced `chopdotproof02.dot` v0.5.6.
2. Compare it with `chatgpt/chopdot-v1-completion`.
3. Do **not** blindly merge.
4. Read this board + guardrails + DATA-001 before changing architecture.
5. For every implementation slice:
   - inspect whether v0.5.6 already solved it;
   - prefer the stronger implementation;
   - cherry-pick modular commits where possible;
   - resolve domain/data-model conflicts deliberately.
6. Update foundation debt based on the real source.
7. Run relevant tests locally.
8. Build production bundle.
9. Run host simulation.
10. Run real `.dot`/device/chain proof where required.
11. Deploy only after the acceptance gate for that increment passes.
12. Record deployed version/CID/domain below.

---

## 12. Build / Decision Log

| Date | Slice | Status | Commit(s) | Evidence | Notes |
|---|---|---|---|---|---|
| 2026-08-15 | FOUNDATION-000 | DONE | `9625b4cd` | G0 | Canonical execution board established |
| 2026-08-15 | FOUNDATION-001 | DONE | `9d997ed`, `32413a3`, `69df8f1`, `c0a19d7`, `c9043a6` + consistency fixes | G0 | Product/security/architecture/engineering/quality guardrails established |
| 2026-08-15 | MONEY-001 preflight | DONE (preflight only) | `d135570a` | G0 inspection | No runtime code changed; found architecture debt |
| 2026-08-15 | Foundation debt register | DONE | `b84ec02e` | G0 | Explicit debt prevents opportunistic hidden fixes |
| 2026-08-15 | RESEARCH-001 | DONE | `2b1e8a7a` | First-party Parity source review | Hybrid Postgres + Polkadot pattern supported |
| 2026-08-15 | DATA-001 | DONE (design only) | `3f6d66f9`, ADR update `f3f4a8ad` | G0 architecture review | Shared source-of-truth boundaries accepted; no backend implementation claim |
| 2026-08-15 | MONEY-001 | READY_FOR_CODEX_VERIFY | `b0e795ec`, `61bacc9f`, `97d2717a`, `3af74311` | G2 code/tests written, runtime unverified | Expense list/detail/edit/delete foundation; no shared mutation claim |
| 2026-08-15 | MONEY-002 | READY_FOR_CODEX_VERIFY | `5259ee3`, `73a2efa`, `184341f`, `82e5064`, `690a4d8`, `a8a2175`, `6bad422`, `b7208d3`, `1fcbe32` | G2 code/tests written, runtime unverified | Safe stale-request replacement + additive correction/refund model + consumer correction UX |
| 2026-08-15 | GROUP-001 | READY_FOR_CODEX_VERIFY | `44a6e71`, `4d73a12`, `0a0a9f9`, `a1099ac`, `4214804`, `5f78fd9` | G2 code/tests written, runtime unverified | Rename/add/remove active roster with raw-obligation safety and preserved history |

---

## 13. External References

Current important upstream references:

- Desktop Statement Store allowance blocker: https://github.com/paritytech/polkadot-desktop-community/issues/29
- Historical dot.li/paseo.li resolution: https://github.com/paritytech/dotli-community/issues/57
- Product SDK: https://github.com/paritytech/product-sdk
- Polkadot Desktop: https://github.com/paritytech/polkadot-desktop-community
- Polkadot App backend: https://github.com/paritytech/identity-backend-community
- dotli starter: https://github.com/paritytech/dotli-starter
- Polkadot app examples: https://github.com/paritytech/polkadot-apps

---

## 14. Anti-AI-Slop Review

Before accepting any generated implementation, ask:

- Does this solve a real user action visible in the product?
- Is money state unambiguous before and after the action?
- Which system is authoritative for this fact: local client, ChopDot DB, Polkadot chain, or artifact store?
- Is there exactly one canonical authority for the resulting state?
- Does failure leave money truth unchanged or clearly recoverable?
- Are we adding architecture because it is required, or because it sounds sophisticated?
- Can the behavior be tested deterministically?
- Does the UI use normal human language?
- Are we duplicating a host/platform capability unnecessarily?
- Are we forcing data onto Polkadot where a private/queryable datastore is the better product/security fit?
- Does Polkadot add authority, settlement, proof, portability, or reduced friction here?
- Can another engineer/agent understand the decision from repo docs/tests without this chat?

If the answer to any critical question is no, stop and resolve it before marking the slice complete.
