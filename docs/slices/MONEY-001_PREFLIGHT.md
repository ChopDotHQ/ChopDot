# MONEY-001 Preflight — Expense Detail + Edit + Delete

Status: dry run only; no runtime implementation started
Date: 2026-08-15
Branch: `chatgpt/chopdot-v1-completion`
Required gate: G2 (user-visible local flow)
Reconciliation required: yes — true `chopdotproof02.dot` v0.5.6 source is not yet pushed

## Purpose

Run the full v1 build process once before changing runtime code. This preflight tests whether the execution board, product experience, security/trust model, architecture decisions, engineering standards, and quality gate are sufficient to expose ambiguity and unsafe implementation choices.

This file is evidence of the dry run. It is not an implementation specification to merge blindly into the newer v0.5.6 source.

## Mandatory context reviewed

- `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/QUALITY_GATE.md`
- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `HOSTS.md`

Runtime surfaces inspected:

- `src/types.ts`
- `src/state/store.ts`
- `src/state/store.test.ts`
- `src/state/AppStateContext.tsx`
- `src/environment/hostSessionSync.ts`
- `src/App.tsx`
- `src/components/GroupDetail.tsx`

## Slice contract

### User goal

I made or entered an expense incorrectly and want to inspect and correct it without corrupting what the group owes.

### Current problem

Existing expenses can be added but are not exposed as editable records in the visible group flow. The current reducer has `ADD_EXPENSE` but no update/delete action. `GroupDetail` calculates totals and member balances from expenses/splits but does not present an expense list/detail navigation surface.

### Scope for the eventual implementation

- show existing expenses in the group;
- open an expense detail view;
- edit description;
- edit amount;
- edit payer;
- edit participants/splits;
- validate the resulting split;
- save one atomic expense+split correction;
- delete an unsettled expense;
- recalculate group totals and member balances deterministically;
- preserve expected state after reload.

### Non-goals

- editing an expense after request/payment activity has started (`MONEY-002`);
- changing confirmed settlement history;
- cross-device synchronization of edits while `SYNC-001` is blocked;
- DOT/USDC settlement work;
- broad router/state/persistence rewrites.

## Product experience review

### User question

`What happened in this expense, and can I fix it?`

### Entry point

The group screen should show a concise expense list below the group summary. An expense row is tappable and opens detail. This is preferable to adding a competing primary action to the bottom action area.

### Expense detail hierarchy

Primary information:

- description;
- total amount and currency;
- who paid;
- who participated / each share;
- date where useful.

Primary action while safely editable:

- `Edit expense`

Secondary destructive action:

- `Delete expense`

The group screen retains its existing dominant group-level action (`Request payment`, `Settle up`, `Confirm received`, etc.). Expense inspection must not compete with that action.

### Edit interaction

Editing should reuse the mental model of expense creation rather than introduce an accounting form. The user should be able to review the changed split before saving.

Validation failure preserves the draft. Back/cancel makes no money-state change.

### Counterparty impact

For MONEY-001, editing is allowed only where no non-local settlement/request state makes the change consequential. `MONEY-002` owns stale-request, marked-paid, confirmed, adjustment, and refund semantics.

## Domain/state review

### Current source

`src/state/store.ts` has `ADD_EXPENSE` but no atomic edit/delete action. Splits are independent records keyed by id. Group totals and balances are selectors over `expenses` and `splits`.

### Required future domain operations

Prefer explicit atomic actions such as:

```text
UPDATE_EXPENSE
  expense
  splits

DELETE_EXPENSE
  expenseId
```

`UPDATE_EXPENSE` must replace the complete split set for that expense atomically so obsolete participant splits cannot survive an edit.

`DELETE_EXPENSE` must remove the expense and every split belonging to it atomically.

### Preconditions for MONEY-001

The eventual reducer must reject update/delete when any affected split is beyond the safely editable state covered by this slice. The exact boundary should be conservative:

```text
all affected splits must be `open`
```

A request already sent moves correction semantics to `MONEY-002`.

## Security/trust review

### Authority

Current local shell treats the local actor as authoritative for local expense entry. The shared host authority code permits `ADD_EXPENSE` only when `expense.paidByUserId === actorUserId`.

For this parallel branch, edit/delete must NOT silently become a new cross-device/shared action while the real host shared-state path is blocked and the newer v0.5.6 source is unavailable.

Recommended temporary rule:

- implement local reducer semantics first;
- do not add `UPDATE_EXPENSE` / `DELETE_EXPENSE` to `SharedAction` during MONEY-001;
- reconcile shared authority deliberately after the v0.5.6 source arrives and `SYNC-001` architecture is reviewed.

### No silent settlement mutation

An edit/delete action must fail with unchanged state if any affected split is `request_sent`, `marked_paid`, or `confirmed`.

### Input validation

The action must reject:

- missing expense/group/payer/participant references;
- zero/negative/non-finite amount;
- duplicate participant split identities;
- split total mismatch;
- split pointing at a different expense;
- payer or participant not in the group unless product rules explicitly permit it.

## Persistence review

Current `AppStateContext` persists the whole state under `chopdot-portable-shell-state-v1` and reloads by shallowly merging parsed records into `createCleanState()`.

MONEY-001 can avoid a persistence-shape migration if it only changes values in existing `Expense` and `Split` records and introduces reducer action types/UI. Reload behavior still requires a test.

However, the dry run found a broader pre-existing gap: persistence has a storage-key version but no explicit in-state schema version/migration pipeline. This violates the new engineering standard for future persisted-shape changes and should be tracked as foundational debt before a slice introduces new persisted fields.

## Test plan

### Domain tests

1. Edit `$600 -> $500` with all splits open; group total and member balances recalculate.
2. Change payer while all splits are open; debt direction changes deterministically.
3. Remove a participant; obsolete split is removed, not left orphaned.
4. Custom split whose sum does not equal expense total is rejected with identical state object/financial truth.
5. Delete open expense removes expense and all its splits.
6. Edit/delete request-sent expense is rejected for MONEY-001.
7. Edit/delete marked-paid expense is rejected.
8. Edit/delete confirmed expense is rejected.
9. Unknown expense id is a no-op/rejected result according to reducer convention.
10. Repeated identical edit cannot create duplicate split records.

### UI/flow tests

1. Group with expenses exposes readable expense rows.
2. Expense row opens detail.
3. `Edit expense` loads existing values.
4. Cancel returns without mutation.
5. Invalid amount/split cannot save and draft remains visible.
6. Successful save returns to detail/group with updated relational money language.
7. Delete requires explicit consequence confirmation and returns to the group.
8. Reload preserves the updated/deleted state.
9. 320/375/390px flows keep save/delete controls reachable.

### Regression checks

- add expense still works;
- late-expense behavior remains separate from already-sent requests;
- request/mark-paid/confirm flow is unchanged;
- group totals and balances remain correct;
- host capability failure does not affect local edit behavior.

## Dry-run findings / blockers discovered

### FINDING-001 — Canonical money representation is currently `number`

`Expense.amount` and `Split.amount` are currently JavaScript `number` values. Existing selectors add/subtract those numbers directly.

This conflicts with the new quality rule that canonical money truth should not depend on floating-point arithmetic. The existing payment-intent contract already uses integer minor units, but the local expense ledger does not.

Decision needed before large financial-model changes:

- either explicitly scope MONEY-001 to preserving the existing local representation and create a separate migration slice for canonical integer money;
- or migrate the local ledger first, which materially increases scope and merge risk.

Recommendation: do NOT sneak the migration into MONEY-001. Track it as dedicated foundational debt and reconcile it against v0.5.6 before changing persisted money representation.

### FINDING-002 — Existing wallet payment path auto-confirms in runtime

`RECORD_MATCHED_PAYMENT` currently sets the split directly to `confirmed` after matching a PAS wallet receipt.

The current `PAYMENT_INTENT_CONTRACT.md` / `SECURITY_FOUNDATION.md` says payment evidence may support `marked_paid` but does not independently confirm receipt. The new v1 guardrails were deliberately aligned to that conservative contract.

This is a pre-existing runtime contradiction, not introduced by MONEY-001.

Action: track as a separate security reconciliation item before extending DOT/USDC settlement. Do not alter it opportunistically inside expense editing.

### FINDING-003 — Persistence versioning is incomplete

The storage key includes `v1`, but there is no explicit schema-version field and migration chain. Parsed data is shallow-merged.

This is acceptable for MONEY-001 only if no persisted schema shape changes. Any future new persisted fields/shape migrations must address this deliberately.

### FINDING-004 — Shared-action transport is not a safe place to add edit/delete yet

`hostSessionSync.ts` has an explicit shared-action allowlist and authority model. Current shared actions can be chunked/published when a session config exists. The real Statement Store allowance path is blocked upstream, and the newer v0.5.6 source is unavailable.

Adding edit/delete to this allowlist during MONEY-001 would expand a platform-sensitive surface unnecessarily.

Decision: keep MONEY-001 local-only on this parallel branch; cross-device edit/delete belongs to later reconciliation/sync work.

### FINDING-005 — GroupDetail currently has no expense-list product surface

The current group screen shows total spend, members, statuses, and bottom settlement/add-expense actions, but not the individual expenses. Therefore `MONEY-001` needs a small product surface addition before detail/edit can be discoverable.

This is a legitimate part of the user goal, not scope creep.

## Gate result

### G0 / planning consistency

PASS.

The guardrails exposed real ambiguities and prevented an unsafe “just add an Edit button” implementation.

### G1 / domain readiness

CONDITIONAL PASS.

The intended atomic reducer boundary is clear, but local floating-point money is known technical debt and must not be silently worsened or migrated inside this slice.

### G2 / implementation readiness

READY TO IMPLEMENT LOCALLY ON THE PARALLEL BRANCH, with these constraints:

1. preserve current money representation for this slice;
2. no persisted schema-shape expansion unless migration is added;
3. edit/delete only when all affected splits are `open`;
4. no shared-action publication for edit/delete yet;
5. no opportunistic change to wallet-confirmation semantics;
6. mark final implementation `READY_FOR_CODEX_VERIFY`, not `DONE`, until reconciled with v0.5.6 and executed locally.

## Process verdict

The process works.

It did more than generate documentation: it found a current security-contract/runtime contradiction, persistence-versioning debt, a money-representation issue, a cross-device scope hazard, and a missing product entry surface before implementation began.

No runtime code should be changed until the execution board records these findings and the dedicated follow-up debt items are visible in the queue.
