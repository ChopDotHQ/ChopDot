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

- do not silently migrate this inside unrelated slices;
- do not introduce new money models that worsen the inconsistency;
- when v0.5.6 source is available, decide whether the local ledger should migrate to integer canonical units in a dedicated migration slice.

## DEBT-SECURITY-001 — Legacy matched-wallet reducer action directly confirms payment

**Status:** PARTIALLY MITIGATED / CODEX RECONCILIATION REQUIRED

Current state:

- the live PAS payer flow no longer dispatches `RECORD_MATCHED_PAYMENT`;
- after exact finalized chain evidence it now dispatches the local `RECORD_VERIFIED_CHAIN_PAYMENT` path, which independently checks expected network/from/to/amount, rejects duplicate transaction hashes, persists the receipt on the exact split, and leaves the split `marked_paid`;
- receiver confirmation therefore remains the final user-facing ChopDot transition;
- `src/settlement/settlement.ts` defines rail-independent settlement/evidence contracts around `awaiting_receiver_confirmation`;
- `src/settlement/localSettlementAudit.ts` journals payer attestation, verified chain evidence, retraction, and receiver confirmation;
- the legacy `RECORD_MATCHED_PAYMENT` branch in `src/state/store.ts` still sets a matching split directly to `confirmed`;
- the old wallet reducer test still documents that legacy behavior;
- `HOSTS.md` also contains historical direct-confirm wording.

Risk:

- the live path is conservative and now preserves evidence across reloads, but an old internal action still has a conflicting definition of `confirmed` and must not become reachable again accidentally.

Current v1 guardrail:

- chain evidence can prove/substantiate payment but receiver confirmation remains final unless the canonical contract is deliberately amended after threat-model review;
- new runtime code must not call the legacy direct-confirm action;
- manual Undo must never retract a split carrying chain evidence.

Rule:

- during Codex/local reconciliation, rewrite or remove `RECORD_MATCHED_PAYMENT` so it follows the same verified-evidence + `marked_paid` semantics or delegates to the canonical settlement path;
- update the wallet reducer test and historical host documentation in the same reviewed change;
- run wallet, state, host-wallet, and settlement tests before marking this debt resolved;
- do not extend DOT/USDC execution on top of the legacy direct-confirm action.

## DEBT-PERSIST-001 — Persistence has no explicit schema migration chain

**Status:** OPEN

Current state:

- state is stored under `chopdot-portable-shell-state-v1`;
- reload shallow-merges parsed data into a clean state;
- no explicit persisted `schemaVersion` or ordered migration functions exist.

Risk:

- future persisted-shape changes can silently misinterpret or discard historical money state.

Rule:

- local product slices may proceed only when persisted-shape changes are additive/backward-compatible;
- before a feature introduces incompatible persisted shapes, add explicit schema versioning, migration tests, and safe corruption handling.

## DEBT-SYNC-001 — Edit/delete shared authority is intentionally undefined

**Status:** BLOCKED / DEFER TO v0.5.6 + SYNC RECONCILIATION

Current state:

- `hostSessionSync.ts` has an explicit allowlist/authority model for shared actions;
- the real Statement Store allowance path is blocked upstream;
- the newer v0.5.6 source is not yet available in GitHub.

Risk:

- adding local mutation actions to shared transport now could create inconsistent cross-device authority and merge conflicts.

Rule:

- keep parallel-branch edit/correction/group/person preference/settlement-undo changes local-only;
- do not claim cross-device propagation;
- revisit when v0.5.6 is reconciled and `SYNC-001` is unblocked/defined.

## DEBT-PRODUCT-001 — Group screen lacked an expense inspection surface

**Status:** RESOLVED ON PARALLEL BRANCH / VERIFY WITH CODEX

Current state:

- MONEY-001 added a concise tappable expense list to Group Detail and an expense detail surface.

Remaining requirement:

- reconcile and verify against the true current source before marking the runtime slice `DONE`.

## Debt handling rule

For every debt item:

1. keep it separate from unrelated feature commits;
2. resolve or explicitly defer it before a dependent slice proceeds;
3. update the execution board when status changes;
4. preserve evidence/tests for the decision;
5. reconcile against the true v0.5.6 source before declaring resolved.
