# ChopDot v1 Foundation Debt Register

Status: active
Owner: product + engineering + security

This register contains architectural debt that must not be hidden inside unrelated feature work.

## DEBT-MONEY-001 — Local canonical money uses JavaScript `number`

**Status:** OPEN / RECONCILE CURRENT SOURCE FIRST

Current state:

- `Expense.amount` and `Split.amount` are JavaScript `number` values.
- selectors perform direct floating-point addition/subtraction.
- payment-intent and native-chain boundaries already use integer units.

Risk: decimal drift and inconsistent canonical money representation.

Rule: migrate only in DATA-002 with schema/version and money-invariant tests.

## DEBT-SECURITY-001 — Legacy matched-wallet reducer action directly confirms payment

**Status:** PARTIALLY MITIGATED / CODEX RECONCILIATION REQUIRED

Current state:

- live EVM PAS and native PAS evidence paths persist exact evidence and leave splits `marked_paid`;
- receiver confirmation remains final in the live product path;
- legacy `RECORD_MATCHED_PAYMENT` in `src/state/store.ts` still direct-confirms;
- old wallet tests/docs still describe that legacy behavior.

Risk: an old internal action still has a conflicting meaning of `confirmed`.

Rule: remove/rewrite the legacy action during current-source reconciliation and run wallet/state/host-wallet/settlement/native-payment tests before resolving.

## DEBT-PERSIST-001 — Persistence has no explicit schema migration chain

**Status:** OPEN

Current state:

- state is stored under `chopdot-portable-shell-state-v1`;
- reload shallow-merges parsed state;
- no persisted `schemaVersion` or ordered migration functions exist.

Risk: future shape changes can silently misinterpret historical financial state.

Rule: additive compatible fields only until DATA-002 adds explicit migration/version handling.

## DEBT-SYNC-001 — Local mutation authority is intentionally not shared

**Status:** BLOCKED / DEFER TO CURRENT-SOURCE + SYNC RECONCILIATION

Current state:

- old host session transport has an explicit allowlist/authority model;
- real Statement Store allowance remains blocked upstream;
- canonical shared backend authority is not implemented on this branch.

Local-only parallel-branch actions include:

- expense edit/correction/delete;
- group management;
- person preferences;
- settlement undo;
- verified EVM/native chain evidence attachment;
- Polkadot host identity bind/unbind.

Risk: publishing these through the old transport without reviewed authority could create inconsistent cross-device truth.

Rule: do not claim cross-device propagation; canonical shared mutations move behind BACKEND command authorization/reconciliation.

## DEBT-PRODUCT-001 — Group screen lacked expense inspection

**Status:** RESOLVED ON PARALLEL BRANCH / VERIFY WITH CODEX

MONEY-001 added expense list/detail. Runtime reconciliation remains before DONE.

## DEBT-POLKADOT-IDENTITY-001 — Product id / product-account derivation must be reconciled

**Status:** OPEN / MUST RESOLVE BEFORE POLKADOT-001 OR POLKADOT-002 DONE

Current state:

- `PolkadotHostBridge.requestIdentity()` requests `getProductAccount(this.productId, 0)`;
- bridge default remains `chopdot-shell-proof.dot`, inherited from the portable-shell proof;
- known deployed domain is `chopdotproof02.dot`, but exact current host derivation input is unverified here;
- changing product id can derive a different product account;
- POLKADOT-001 stores the exact product id/public key/account returned by host.

Risk: silently changing product id could bind to a different account and invalidate settlement/authorization assumptions.

Rule:

1. identify exact current deployed Product SDK product id;
2. exercise `getProductAccount(productId, 0)` on real host;
3. compare with stored/proven account evidence;
4. migrate bindings explicitly if product id changes;
5. POLKADOT-002/003 cannot be production authority until resolved.

## DEBT-POLKADOT-SDK-001 — Product SDK transaction package versions require compatibility verification

**Status:** OPEN / VERIFY BEFORE NATIVE PAYMENT DONE

Current state:

- branch inherited `@parity/product-sdk-host` 0.14.1 and Statement Store 0.6.2;
- POLKADOT-002 adds current transaction-line packages observed in Parity's first-party repository:
  - chain-client 0.10.0;
  - signer 0.12.1;
  - tx 0.4.1;
- Parity's same current source line reports host 0.15.1 and Statement Store 0.6.4;
- no dependency installation/typecheck/build has been executed in this connected environment.

Risk:

- npm may install multiple host SDK versions or expose changed host/TrUAPI contracts;
- upgrading inherited host packages casually could regress the already-proven identity/Statement Store adapter paths.

Rule:

1. install dependencies locally/Codex;
2. inspect resolved dependency tree for duplicate incompatible host/TrUAPI versions;
3. run typecheck + host adapter + identity + native payment + host simulation tests;
4. if alignment is required, upgrade the Product SDK family as one reviewed compatibility slice rather than package-by-package guesswork;
5. do not call native settlement DONE until resolved.

## Debt handling rule

For every debt item:

1. keep it separate from unrelated feature commits;
2. resolve or explicitly defer it before dependent work is marked DONE;
3. update execution board when status changes;
4. preserve evidence/tests;
5. reconcile against true current source before declaring resolved.
