# ChopDot Architecture Decisions

Status: active decision log for the v1 completion track
Owner: product + engineering

## Purpose

This file records the decisions that must stay stable across implementation slices and AI/IDE handoffs. The goal is to prevent different agents from making incompatible assumptions about the same product.

Use short decision IDs in commits, tests, and implementation notes where relevant.

---

## ADR-001 — Financial truth is a domain concern, not a UI concern

Status: accepted

Decision:

- expense, split, balance, obligation, correction, and settlement rules live in domain/state logic;
- React components render and dispatch intent but must not independently calculate canonical money truth.

Why:

- deterministic testing;
- one source of truth;
- easier host/platform changes;
- less risk of screen-specific financial behavior.

---

## ADR-002 — Confirmed historical money events are append-only

Status: accepted

Decision:

- confirmed payments are not silently rewritten or deleted;
- corrections after settlement create explicit adjustment/refund obligations and new history.

Why:

- trust;
- explainability;
- auditability;
- protects against retroactive balance corruption.

---

## ADR-003 — Expenses remain editable before final money state

Status: accepted

Decision:

- unsettled expenses may be edited/deleted;
- requested expenses may be corrected, but affected requests must be invalidated/reissued;
- settled expenses require adjustment semantics rather than silent mutation.

---

## ADR-004 — Settlement methods share one domain interface

Status: accepted

Decision:

Settlement methods such as:

```text
cash
bank/external
payment link
DOT
USDC
```

must map into the same obligation/settlement lifecycle and evidence model.

Payment-specific logic belongs in adapters, not in the expense ledger.

---

## ADR-005 — Crypto is optional infrastructure, not a separate product mode

Status: accepted

Decision:

- the same group/expense product works with or without crypto;
- Polkadot features appear only when they reduce friction, add proof, improve identity, or enable a payment rail;
- no separate crypto dashboard or crypto-only group flow.

---

## ADR-006 — Hosts expose capabilities, not product forks

Status: accepted

Decision:

Web, `.dot`, Telegram-like environments, Desktop, and future hosts use a shared capability boundary.

Product components must not branch directly on host SDK globals.

Canonical reference: `HOSTS.md`.

---

## ADR-007 — Statement Store carries bounded status/notification data, not the full ledger

Status: accepted from measured evidence

Decision:

- do not publish the complete ChopDot action/event stream through Statement Store;
- use it only for payloads that fit the documented/verified budget and match replaceable-status semantics;
- full product state remains behind the product persistence/sync boundary.

Evidence:

- a realistic `ADD_EXPENSE` action exceeded the measured per-user Statement Store budget by ~3.6x on the pushed portable-shell branch;
- small encrypted notification/status payloads fit the intended use.

---

## ADR-008 — Cross-device sync must fail closed until real host authority is proven

Status: accepted / current platform blocker

Decision:

- do not claim shared state from simulation alone;
- activation requires a real-host allowance path and successful canary publish/readback;
- local-only behavior must be disclosed honestly.

Reference:

- `paritytech/polkadot-desktop-community#29`

---

## ADR-009 — Payment request links are routing/display hints, not payment authority

Status: accepted

Decision:

- URL packets may route or display an exact request;
- production mutation authority must conform to `PAYMENT_INTENT_CONTRACT.md`;
- stale or mismatched request packets cannot change current money truth.

---

## ADR-010 — Manual payment confirmation belongs to the receiver

Status: accepted

Decision:

For cash and external/manual rails:

```text
payer says paid -> marked_paid
receiver confirms -> confirmed
```

A payer action alone cannot settle the receiver's ledger.

---

## ADR-011 — Verified chain settlement provides strong evidence, not auto-confirmation in current v1

Status: accepted for current v1; future auto-confirm remains a deliberate contract change

Decision:

A signed/finalized on-chain transfer may move an exact obligation to `submitted`/`marked_paid` only when the adapter independently matches:

- payer;
- receiver;
- amount;
- asset;
- network;
- live intent/scope;
- transaction finality.

Under the current `PAYMENT_INTENT_CONTRACT.md`, evidence does not independently produce `confirmed`; receiver confirmation remains the final transition.

A future direct auto-confirm policy is allowed only after:

1. threat-model review;
2. explicit amendment of `PAYMENT_INTENT_CONTRACT.md`;
3. explicit amendment of `SECURITY_FOUNDATION.md`;
4. adapter tests proving exact-match and finality behavior;
5. real-host/live-chain evidence.

This deliberately chooses the stricter existing contract over older wording in `HOSTS.md` until that historical inconsistency is reconciled.

---

## ADR-012 — Money uses integer canonical units in authority boundaries

Status: accepted

Decision:

- authoritative payment-intent values use integer minor/base units;
- display formatting is separate;
- adapters must handle asset decimals explicitly;
- never use floating-point arithmetic as canonical money truth.

Reference: `PAYMENT_INTENT_CONTRACT.md`.

---

## ADR-013 — Stable IDs and idempotent commands are mandatory

Status: accepted

Decision:

Expenses, splits, obligations, payment intents, corrections, evidence records, and state-changing commands must have stable identifiers appropriate to their scope.

Repeated commands/callbacks must not create duplicate financial transitions.

---

## ADR-014 — Persistence is versioned and migratable

Status: accepted

Decision:

- persisted product state has an explicit schema version;
- changes to stored shapes require migration or safe fallback;
- invalid/corrupt state must not be interpreted as valid money truth.

---

## ADR-015 — Current state and history are separate concerns

Status: accepted

Decision:

- current state answers `what is true now?`;
- history/audit answers `how did we get here?`;
- do not use a mutable current-state object as the only historical record.

---

## ADR-016 — Product capabilities must degrade honestly

Status: accepted

Decision:

When identity, wallet, Statement Store, share, storage, or payment capabilities are unavailable:

- preserve financial truth;
- disable or replace the unsupported action;
- offer a valid fallback where one exists;
- never show fake success.

---

## ADR-017 — Build vertical slices, not speculative platform layers

Status: accepted

Decision:

Prefer complete user behavior such as:

```text
open expense -> edit -> validate -> save -> balances update -> reload
```

over broad infrastructure work with no proven user flow.

Foundation/refactor work is allowed only when required by a named slice or security invariant.

---

## ADR-018 — The v0.5.6 deployed branch wins conflicts until reviewed

Status: temporary accepted rule for parallel development

Decision:

This completion branch was created from an older GitHub-visible baseline. When the source that produced `chopdotproof02.dot` v0.5.6 is pushed:

- compare before merging;
- keep the stronger implementation;
- cherry-pick modular work selectively;
- do not assume this branch is canonical merely because it is documented.

---

## ADR-019 — PostgreSQL is the canonical shared operational datastore

Status: accepted design / implementation pending

Decision:

When ChopDot activates true multi-user shared mode, PostgreSQL will hold the canonical operational application state for relational/private/mutable data such as:

- groups and membership;
- expenses and splits;
- obligations;
- payment intents and settlement workflow state;
- payment preferences/references;
- idempotency/version records;
- append-only activity/audit events.

Why:

- ChopDot needs indexed relational queries, transactional multi-record updates, authorization, pagination, idempotency, concurrency/version checks, retry state, and durable shared coordination;
- Parity's current Polkadot App backend itself uses PostgreSQL as its only multi-instance coordination point while keeping user signing on-device;
- neither Statement Store nor Bulletin/Cloud Storage is presented by Product SDK as a relational application database.

Canonical reference: `docs/DATA_ARCHITECTURE.md` and `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`.

---

## ADR-020 — The backend never owns user private signing keys

Status: accepted

Decision:

- user seed phrases/private account keys remain in the Polkadot App/wallet/device authority boundary;
- ChopDot service stores public identity/account references and verified session/authorization state only;
- chain-signing requests route through supported Product SDK/Host/App signer capabilities;
- no backend convenience feature may introduce custodial user-key storage without a wholly separate architecture/security decision.

The exact login/session proof protocol must be verified against the current Product SDK rather than invented from generic wallet-login patterns.

---

## ADR-021 — Statement Store is an optional wakeup/invalidation transport

Status: accepted design / real activation currently blocked

Decision:

In shared mode, Statement Store may carry tiny signals such as:

```text
group_changed { groupId, version }
request_changed { intentId, version }
settlement_changed { settlementId, version }
```

Receiving a signal causes the client to fetch/validate canonical state. Missing, duplicate, stale, or out-of-order signals must not lose or corrupt financial truth.

Statement Store is therefore not:

- the database;
- the complete event log;
- the only synchronization mechanism;
- sufficient authority to settle money.

This refines ADR-007 with the first-party Product SDK model and preserves the real-host blocker in ADR-008.

---

## ADR-022 — Bulletin/Cloud Storage stores content-addressed artifacts, not relational state

Status: accepted design

Decision:

Use Bulletin/Product SDK Cloud Storage only when CID-addressed artifact storage creates clear value, for example:

- encrypted receipts;
- closed-group exports;
- settlement evidence bundles;
- audit snapshots;
- product/static release artifacts.

Do not use it as the operational query store for expenses, memberships, obligations, or settlement workflow.

Financial/personal artifacts must not be uploaded in plaintext by default. Any such use requires explicit encryption, key-sharing, access, retention, and renewal policy.

---

## ADR-023 — Polkadot is canonical for on-chain settlement facts

Status: accepted design

Decision:

For DOT/USDC/other supported chain settlement, the chain is canonical for:

- transaction existence;
- sender and receiver;
- asset and base-unit amount;
- network/genesis context;
- block inclusion/finality;
- contract state where deliberately used.

Postgres stores a verified application projection/reference so ChopDot can query and explain the result, but it must not invent or override chain finality.

How verified evidence advances a payment intent remains governed by ADR-011 and `PAYMENT_INTENT_CONTRACT.md`.

---

## ADR-024 — Local Product SDK storage is cache/draft/offline state, not shared authority

Status: accepted design

Decision:

Product SDK/host/browser local KV may store:

- drafts;
- UI preferences;
- offline/read cache;
- migration checkpoints;
- potentially queued commands with stable IDs/expected versions.

It may not independently claim that a shared expense, request, cash confirmation, or chain settlement succeeded.

Offline queued financial commands must reconcile against canonical server versions and may require human conflict resolution rather than last-write-wins.

---

## ADR-025 — Shared financial mutations pass through a trusted command boundary

Status: accepted design / implementation pending

Decision:

The production client does not write canonical financial tables directly.

A shared state-changing command must:

1. authenticate/bind the actor;
2. authorize the actor for the exact command and scope;
3. validate expected state/version/idempotency;
4. run pure domain decision logic;
5. commit all affected current-state rows and audit events transactionally where possible;
6. return a canonical projection.

External wallet/chain interactions use an explicit attempt/reconciliation state machine rather than keeping a DB transaction open across signing/network waits.

If Supabase/Postgres is selected as infrastructure, browser-side table writes/RLS do not replace this domain command boundary; RLS remains defense-in-depth.

---

## ADR-026 — Backend complexity must stay proportional to ChopDot

Status: accepted

Decision:

Borrow Parity's architectural discipline, not its organizational scale.

A v1 backend may use PostgreSQL + TypeScript + Drizzle and a small HTTP framework, but ChopDot should not copy Effect-TS, multiple daemons, leader election, or other infrastructure unless a named requirement justifies them.

The preferred pattern is:

```text
pure domain module
+ thin command/query/API layer
+ transactional repository
+ Polkadot adapters
```

Framework choice remains replaceable infrastructure, not product truth.

---

## Decision Change Protocol

If a slice requires reversing an accepted ADR:

1. stop implementation;
2. document the conflict;
3. update the ADR with rationale and migration impact;
4. update affected tests/contracts;
5. update `docs/CHOPDOT_V1_EXECUTION_BOARD.md`;
6. only then continue implementation.

Unrecorded architecture changes are not acceptable on the v1 completion track.
