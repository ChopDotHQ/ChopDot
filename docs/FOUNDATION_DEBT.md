# ChopDot v1 Foundation Debt Register

Status: active
Owner: product + engineering + security
Source: `docs/slices/MONEY-001_PREFLIGHT.md`

This register contains architectural debt that must not be hidden inside unrelated feature work.

## DEBT-MONEY-001 — Local canonical money uses JavaScript `number`

**Status:** OPEN / RECONCILE CURRENT SOURCE FIRST

Current state:

- `Expense.amount` and `Split.amount` are JavaScript `number` values.
- selectors perform direct floating-point addition/subtraction.
- the payment-intent security contract already uses integer minor units.

Risk:

- decimal drift and inconsistent canonical money representation as features become more complex.

Rule:

- migrate only in dedicated DATA-002 work with schema/version tests.

## DEBT-SECURITY-001 — Legacy matched-wallet reducer action directly confirms payment

**Status:** PARTIALLY MITIGATED / CODEX RECONCILIATION REQUIRED

Current state:

- live PAS flow uses local `RECORD_VERIFIED_CHAIN_PAYMENT`, checks expected network/from/to/amount, rejects duplicate hashes, persists evidence, and leaves the split `marked_paid`;
- receiver confirmation remains final in the live product path;
- the legacy `RECORD_MATCHED_PAYMENT` branch in `src/state/store.ts` still direct-confirms;
- old wallet tests/docs still describe that legacy behavior.

Risk:

- an old internal action still has a conflicting meaning of `confirmed`.

Rule:

- remove/rewrite the legacy action during Codex/current-source reconciliation and run wallet/state/host-wallet/settlement tests before resolving.

## DEBT-PERSIST-001 — Persistence has no explicit schema migration chain

**Status:** OPEN

Current state:

- state is stored under `chopdot-portable-shell-state-v1`;
- reload shallow-merges parsed state;
- no persisted `schemaVersion` or ordered migration functions exist.

Risk:

- future shape changes can silently misinterpret historical financial state.

Rule:

- additive compatible fields only until DATA-002 adds explicit migration/version handling.

## DEBT-SYNC-001 — Local mutation authority is intentionally not shared

**Status:** BLOCKED / DEFER TO CURRENT-SOURCE + SYNC RECONCILIATION

Current state:

- the old host session transport has an explicit allowlist/authority model;
- real Statement Store allowance remains blocked upstream;
- current shared backend authority is not implemented on this branch.

Local-only parallel-branch actions currently include:

- expense edit/correction/delete;
- group management;
- person preferences;
- settlement undo / verified-chain evidence wrapper;
- Polkadot host identity bind/unbind.

Risk:

- publishing these through the old transport without a reviewed authority model could create inconsistent cross-device truth.

Rule:

- do not claim cross-device propagation;
- canonical shared mutations will move behind BACKEND command authorization/reconciliation.

## DEBT-PRODUCT-001 — Group screen lacked expense inspection

**Status:** RESOLVED ON PARALLEL BRANCH / VERIFY WITH CODEX

MONEY-001 added expense list/detail. Runtime reconciliation remains before DONE.

## DEBT-POLKADOT-IDENTITY-001 — Product id / product-account derivation must be reconciled

**Status:** OPEN / MUST RESOLVE BEFORE POLKADOT-001 DONE OR POLKADOT-002 TRUSTS THE BINDING

Current state:

- `PolkadotHostBridge.requestIdentity()` requests `getProductAccount(this.productId, 0)`;
- the bridge default remains `chopdot-shell-proof.dot`, inherited from the proven portable-shell path;
- the known deployed product/domain is `chopdotproof02.dot`, but the exact current host registration / derivation input has not been verified in this connected environment;
- POLKADOT-001 now records the exact `productId`, host username, product-account public key/account id, prefix and binding timestamp returned by the host;
- changing the product id can derive a different product account, so it must never be changed speculatively.

Risk:

- silently changing the product id could bind ChopDot to a different product-derived account and make later settlement/authorization assumptions wrong.

Rule:

1. identify the exact Product SDK product id used by the current deployed/current-source ChopDot;
2. exercise `getProductAccount(productId, 0)` on the real current host;
3. compare it with any existing product-account evidence;
4. only then decide whether the bridge default needs migration;
5. if changed, migrate identity bindings explicitly rather than silently overwriting them;
6. POLKADOT-002/003 must not treat the local host binding as production authority until this is resolved.

## Debt handling rule

For every debt item:

1. keep it separate from unrelated feature commits;
2. resolve or explicitly defer it before dependent work proceeds;
3. update the execution board when status changes;
4. preserve evidence/tests for the decision;
5. reconcile against the true current source before declaring resolved.
