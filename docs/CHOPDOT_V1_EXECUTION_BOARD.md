# ChopDot v1 Completion — Canonical Execution Board

> **Branch:** `chatgpt/chopdot-v1-completion`  
> **Purpose:** Build a consumer-grade ChopDot foundation in small, reviewable slices while the newer local/Codex branch remains unavailable.  
> **Rule:** This document is the source of truth for this parallel build. Update it after every completed slice before starting the next one.

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

Cross-device shared state should be enabled only when the real host capability is trustworthy. ChopDot must never pretend a payment or synchronization happened when it cannot prove it.

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

- the code that produced `chopdotproof02.dot` v0.5.6 may contain newer local Codex changes that are not yet pushed to GitHub.
- therefore this branch MUST prefer modular logic, tests, contracts, adapters, and narrowly scoped UI changes over broad rewrites.
- tomorrow, Codex should compare/cherry-pick/reconcile this branch against the true v0.5.6 source before deployment.

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

- fail closed
- do not change money truth when allocation fails
- do not claim cross-device synchronization
- keep the shared-state adapter boundary ready for the upstream fix

### BLOCKER-POLKADOT-002 — previous dot.li network mismatch

Resolved context:

- https://github.com/paritytech/dotli-community/issues/57
- `dot.li` pointed to deprecated Summit for the affected deploy
- `paseo.li` targets `paseo-next-v2`

This is historical context, not a current product blocker.

---

## 4. Product Rules — Non-Negotiable

These rules must survive every implementation choice.

1. **Money truth beats UI convenience.** Never silently rewrite confirmed payments.
2. **One dominant action per normal screen.** Avoid dashboards and protocol-console UX.
3. **Crypto is a payment rail, not a product mode.** Cash, bank links, DOT, and USDC should share one settlement model.
4. **No fake sync.** Local state is local until a real cross-device path is proven.
5. **Host capabilities are adapters, not forks.** Web, `.dot`, Telegram-like hosts, etc. should not create separate products.
6. **Normal users should not see internal protocol language.** No adapter/state-machine/host jargon in the consumer UI.
7. **Every destructive money action must be recoverable or explicitly irreversible.**
8. **Confirmed historical events are append-only.** Corrections create new truth; they do not erase old truth.
9. **Nobody should take action unless their money state is affected.**
10. **Polkadot complexity belongs at the boundary.** Identity/signing/asset transfer should be delegated to host/app capabilities where possible.

---

## 5. Shared Domain Model Direction

### Expense lifecycle

```text
draft → active → requested → partially_settled → settled → archived
```

Editing rules:

- `draft` / `active`: full edit + delete allowed
- `requested`: edit allowed, but affected requests become stale/reissued
- `partially_settled`: controlled correction only; preserve completed settlement evidence
- `settled`: original record immutable; corrections create an adjustment/refund obligation

### Obligation / settlement lifecycle

```text
open → requested → submitted → confirmed
                    ↘ failed
```

Meaning depends on the settlement adapter:

- Cash: `submitted` = payer marked paid; receiver still confirms
- External rail: `submitted` = payment action/evidence exists; confirmation policy depends on available proof
- DOT / USDC: `submitted` = signed transaction submitted; `confirmed` = chain confirmation/evidence accepted

### Settlement methods

```text
cash
bank
payment_link
DOT
USDC
```

The expense engine should not contain method-specific money logic.

---

## 6. Definition of Done for Every Slice

A slice is not complete because the UI exists.

Every slice must include, where applicable:

- [ ] explicit scope and non-goals
- [ ] domain/state behavior implemented
- [ ] validation and failure behavior
- [ ] persistence behavior
- [ ] unit tests
- [ ] host-sim / Playwright coverage where relevant
- [ ] no hidden mutation of confirmed money history
- [ ] accessible labels / keyboard-safe behavior where relevant
- [ ] mobile viewport sanity
- [ ] no new protocol jargon in normal UI
- [ ] execution board updated
- [ ] commit references recorded below

When local execution is unavailable, mark tests as **WRITTEN / NOT EXECUTED HERE** rather than claiming they passed.

---

## 7. Ordered Build Queue

Status values:

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`
- `DONE`

### FOUNDATION-000 — Canonical execution board

**Status:** `DONE`

Deliverable:

- this document
- shared product rules
- ordered build queue
- blocker references
- handoff/update process

---

### MONEY-001 — Expense detail + edit + delete foundation

**Status:** `TODO`

Goal:

Existing expenses must be inspectable and correctable.

Scope:

- expense detail screen/state
- edit amount
- edit description/reason
- edit date if currently modeled
- edit payer
- edit participants
- edit equal/custom split
- delete unsettled expense
- recalculate balances deterministically
- preserve state after reload

Critical cases:

1. `$600 → $500` before any request: balances recalculate
2. change payer before request: obligations reverse correctly
3. remove participant before request: split recalculates correctly
4. delete unsettled expense: balances return to prior truth
5. invalid split cannot save

Non-goal:

- rewriting already-confirmed settlement history

---

### MONEY-002 — Safe correction after request/settlement

**Status:** `TODO`

Goal:

Editing must remain safe after money activity has started.

Scope:

- stale request detection
- reissue/update affected request
- preserve marked-paid and confirmed evidence
- create adjustment/refund obligation when correction happens after settlement
- explicit user messaging before consequential correction

Critical cases:

1. Jeanine requested `$300`; expense changes so she owes `$250` → request becomes `$250`, not stale `$300`
2. Jeanine already paid `$300`; correct obligation is `$250` → preserve `$300 paid`, create `$50` reverse obligation
3. settled expense cannot be silently deleted

---

### GROUP-001 — Group editing + member safety

**Status:** `TODO`

Scope:

- rename group
- add member
- remove member only when safe
- prevent removal with unresolved obligations unless explicitly resolved
- preserve historical attribution if a person leaves
- group archive/finish semantics

---

### PEOPLE-001 — Friends + reusable payment preferences

**Status:** `TODO`

Scope:

- friend detail
- reusable display name
- identity/address references where available
- preferred receive methods
- Polkadot identity/QR seam where host supports it
- avoid social-network scope creep

---

### SETTLEMENT-001 — Unified settlement domain + adapters

**Status:** `TODO`

Goal:

Introduce one settlement interface for all payment methods.

Scope:

- common settlement result/state shape
- cash adapter
- bank/external adapter contract
- payment-link adapter contract
- DOT adapter contract
- USDC adapter contract
- evidence model
- failure/retry semantics

No UI-specific branching in core ledger logic.

---

### SETTLEMENT-002 — Cash settlement complete

**Status:** `TODO`

Scope:

- mark cash paid
- receiver confirmation
- cancel/retry before confirmation
- durable history
- no wallet prompts

---

### POLKADOT-001 — Host identity integration boundary

**Status:** `TODO`

Goal:

Use the Polkadot host/app identity where available without breaking local/guest mode.

Scope:

- host identity capability adapter
- local fallback
- account/address presentation
- QR/share seam
- capability-aware UI

Must not require Statement Store publishing.

---

### POLKADOT-002 — DOT settlement adapter

**Status:** `TODO`

Goal:

Pay an obligation using DOT through the supported Polkadot host/app signing path.

Scope:

- account selection where supported
- amount validation
- recipient validation
- signing boundary
- transaction submission result
- pending / confirmed / failed state
- transaction evidence stored in ChopDot history
- cancel/retry behavior

If the current host cannot provide a required capability, implement the adapter boundary and mark the execution path `BLOCKED`, not faked.

---

### POLKADOT-003 — USDC settlement adapter

**Status:** `TODO`

Goal:

Settle an obligation with USDC on the supported Polkadot asset environment.

Scope mirrors DOT adapter plus:

- asset identification
- decimals
- balance checks
- correct destination/account format

Do not assume the same execution API as native DOT until verified.

---

### HISTORY-001 — Real money activity history

**Status:** `TODO`

Goal:

History should explain what happened, not merely list finished groups.

Candidate events:

```text
expense_added
expense_edited
expense_deleted
request_sent
request_updated
payment_submitted
payment_marked_paid
payment_confirmed
payment_failed
adjustment_created
group_finished
```

Requirements:

- readable consumer language
- timestamps
- relevant amount/currency
- settlement evidence where applicable
- confirmed events append-only

---

### IDENTITY-001 — Profile lifecycle + recovery model

**Status:** `TODO`

Scope:

- local profile completeness
- rename/profile editing
- distinguish device-local profile from host identity
- migration/recovery behavior when host identity becomes available
- no misleading cloud-sync claims

---

### QUALITY-001 — Validation + error/recovery pass

**Status:** `TODO`

Scope:

- form validation
- destructive-action confirmation
- failed payment recovery
- loading states
- capability-unavailable states
- back/cancel consistency
- app restart resilience
- local persistence corruption handling where practical

---

### QUALITY-002 — Mobile + accessibility + consumer polish

**Status:** `TODO`

Scope:

- 320/375/390px viewport review
- safe areas
- focus/input viewport behavior
- accessible labels
- tap targets
- empty states
- copy hierarchy
- no dashboard/protocol-console drift

---

### SYNC-001 — Cross-device shared-state activation

**Status:** `BLOCKED`

Blocked by:

- `BLOCKER-POLKADOT-001`

Prepare but do not claim:

- adapter contract
- notification/status semantics
- idempotency
- reconciliation tests
- two-device acceptance journey

Activation requires successful real-host allowance + canary publish/readback.

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
→ settle USDC (if host capability verified)
→ confirm outcomes
→ inspect history
→ close/reopen app
→ same money truth remains
```

Cross-device steps are optional until `SYNC-001` is unblocked, but the app must clearly disclose local-only state where applicable.

---

## 8. Tomorrow / Codex Reconciliation Protocol

When the real v0.5.6 source is pushed:

1. Identify the branch/commit that produced `chopdotproof02.dot` v0.5.6.
2. Compare it with `chatgpt/chopdot-v1-completion`.
3. Do NOT blindly merge.
4. For every completed slice:
   - inspect whether v0.5.6 already solved it
   - prefer the stronger implementation
   - cherry-pick modular commits where possible
   - resolve domain-model conflicts deliberately
5. Run all relevant tests locally.
6. Build production bundle.
7. Run host simulation.
8. Run real `.dot` smoke test.
9. Deploy only after the acceptance slice for that increment passes.
10. Record the resulting deployed version/CID/domain in this document.

---

## 9. Build Log

Record each completed slice here.

| Date | Slice | Status | Commit(s) | Tests | Notes |
|---|---|---|---|---|---|
| 2026-08-15 | FOUNDATION-000 | DONE | initial execution-board commit | N/A | Canonical parallel-build plan established |

---

## 10. External References

Current important upstream references:

- Desktop Statement Store allowance blocker: https://github.com/paritytech/polkadot-desktop-community/issues/29
- Historical dot.li/paseo.li resolution issue: https://github.com/paritytech/dotli-community/issues/57
- Product SDK resource-allocation context referenced by issue #29: https://github.com/paritytech/triangle-js-sdks/issues/167
- DotNS PoP request historical context: https://github.com/paritytech/dotns/issues/190

Existing project reference on source branch:

- `PORTABLE_SHELL_TRIAL.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `SECURITY_FOUNDATION.md`
- `HOSTS.md`

These should be preserved as historical/technical context. This execution board governs the new completion track unless explicitly amended.

---

## 11. Anti-AI-Slop Checklist

Before accepting any generated implementation, ask:

- Does this solve a real user action visible in the product?
- Is the money state unambiguous before and after the action?
- Is there exactly one source of truth for the resulting state?
- Does failure leave money truth unchanged or clearly recoverable?
- Are we adding architecture because it is required, or because it sounds sophisticated?
- Can the behavior be tested deterministically?
- Does the UI use normal human language?
- Are we duplicating host/platform capabilities unnecessarily?
- Would this still make sense if Polkadot branding were hidden?
- Can Codex or another engineer understand why this exists from the tests and this board alone?

If the answer to any critical question is no, the slice is not done.
