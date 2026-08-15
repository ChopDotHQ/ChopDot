# ChopDot v1 Foundation Debt Register

Status: active
Owner: product + engineering + security
Source: `docs/slices/MONEY-001_PREFLIGHT.md`

This register contains pre-existing architectural debt discovered while dry-running the first implementation slice. These items must not be hidden inside unrelated feature work.

## DEBT-MONEY-001 — Local canonical money uses JavaScript `number`

**Status:** OPEN / RECONCILE WITH v0.5.6 FIRST

Current state:

- `Expense.amount` and `Split.amount` are JavaScript `number` values.
- selectors perform direct floating-point addition/subtraction.
- the payment-intent security contract already uses integer minor units.

Risk:

- decimal drift and inconsistent canonical money representation as features become more complex.

Rule:

- do not silently migrate this inside `MONEY-001`;
- do not introduce new money models that worsen the inconsistency;
- when v0.5.6 source is available, decide whether the local ledger should migrate to integer canonical units in a dedicated migration slice.

## DEBT-SECURITY-001 — Existing matched-wallet path directly confirms payment

**Status:** OPEN / SECURITY RECONCILIATION REQUIRED BEFORE DOT/USDC EXPANSION

Current state:

- `RECORD_MATCHED_PAYMENT` in `src/state/store.ts` sets a matching split directly to `confirmed`.
- `HOSTS.md` also describes exact finalized-wallet matching as direct confirmation.
- `PAYMENT_INTENT_CONTRACT.md` and `SECURITY_FOUNDATION.md` currently say payment evidence may support `marked_paid` but does not independently confirm receipt.

Risk:

- two conflicting meanings of `confirmed` across runtime and security contracts.

Current v1 guardrail:

- keep the conservative contract: chain evidence can prove/substantiate payment but receiver confirmation remains final unless the canonical contract is deliberately amended after threat-model review.

Rule:

- do not change this opportunistically during expense editing;
- resolve before extending DOT/USDC settlement adapters.

## DEBT-PERSIST-001 — Persistence has no explicit schema migration chain

**Status:** OPEN

Current state:

- state is stored under `chopdot-portable-shell-state-v1`;
- reload shallow-merges parsed data into a clean state;
- no explicit persisted `schemaVersion` or ordered migration functions exist.

Risk:

- future persisted-shape changes can silently misinterpret or discard historical money state.

Rule:

- `MONEY-001` may proceed only if it does not change persisted object shapes;
- before a feature introduces incompatible persisted shapes, add explicit schema versioning, migration tests, and safe corruption handling.

## DEBT-SYNC-001 — Edit/delete shared authority is intentionally undefined

**Status:** BLOCKED / DEFER TO v0.5.6 + SYNC RECONCILIATION

Current state:

- `hostSessionSync.ts` has an explicit allowlist/authority model for shared actions;
- the real Statement Store allowance path is blocked upstream;
- the newer v0.5.6 source is not yet available in GitHub.

Risk:

- adding `UPDATE_EXPENSE` / `DELETE_EXPENSE` to shared transport now could create inconsistent cross-device authority and merge conflicts.

Rule:

- implement first edit/delete slice as local-only on the parallel branch;
- do not claim cross-device edit propagation;
- revisit when v0.5.6 is reconciled and `SYNC-001` is unblocked/defined.

## DEBT-PRODUCT-001 — Group screen lacks an expense inspection surface

**Status:** REQUIRED BY MONEY-001

Current state:

- `GroupDetail` shows total spend, member balances/status, invite and group actions;
- individual expenses are not visible/tappable from the group screen.

Impact:

- an expense-detail/edit flow would be undiscoverable without a small expense-list surface.

Rule:

- add a concise expense list as part of the MONEY-001 vertical slice;
- preserve the group-level dominant bottom action and avoid dashboard-like density.

## Debt handling rule

For every debt item:

1. keep it separate from unrelated feature commits;
2. resolve or explicitly defer it before a dependent slice proceeds;
3. update the execution board when status changes;
4. preserve evidence/tests for the decision;
5. reconcile against the true v0.5.6 source before declaring resolved.
