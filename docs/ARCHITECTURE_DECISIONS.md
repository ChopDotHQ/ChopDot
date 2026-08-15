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

## Decision Change Protocol

If a slice requires reversing an accepted ADR:

1. stop implementation;
2. document the conflict;
3. update the ADR with rationale and migration impact;
4. update affected tests/contracts;
5. update `docs/CHOPDOT_V1_EXECUTION_BOARD.md`;
6. only then continue implementation.

Unrecorded architecture changes are not acceptable on the v1 completion track.
