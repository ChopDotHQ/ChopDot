# ChopDot v1 Completion — Canonical Execution Board

> Branch: `chatgpt/chopdot-v1-completion`  
> Purpose: build a consumer-grade ChopDot foundation in small reviewable slices while current local/Codex source is unreconciled.  
> Rule: update this board after every slice. No implementation starts from chat memory alone.

## Mandatory context

Read before each slice:

1. this board
2. `docs/PRODUCT_EXPERIENCE.md`
3. `docs/SECURITY_TRUST_MODEL.md`
4. `docs/ARCHITECTURE_DECISIONS.md`
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/ENGINEERING_STANDARDS.md`
7. `docs/QUALITY_GATE.md`
8. `docs/FOUNDATION_DEBT.md`
9. relevant `docs/slices/*_PREFLIGHT.md`

For Polkadot/data work also read `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`, `SECURITY_FOUNDATION.md`, `PAYMENT_INTENT_CONTRACT.md`, `PAYMENT_INTENT_SERVICE_FOUNDATION.md`, `HOSTS.md`, and `PORTABLE_SHELL_TRIAL.md`.

## Mission / target journey

```text
local or Polkadot identity
→ people + group
→ expense
→ safe edit/correction
→ balances
→ request one creditor at a time
→ cash / external / native Polkadot / USDC when genuinely supported
→ receiver confirmation under current policy
→ explainable activity history
→ restart/recover same truth
```

Polkadot should improve authority, payment, proof and portability without exposing protocol complexity to ordinary users.

## Accepted architecture

```text
Polkadot App/Host — identity + product account + approval/signing
        ↓
ChopDot client — UI + local drafts/cache
        ↓ authorized/idempotent commands
ChopDot service
        ↓
Postgres — canonical shared operational truth + audit events
        ↙                         ↘
Polkadot chain                Statement Store
chain facts/finality          optional wakeup/version hint
        ↓
Bulletin/Cloud Storage — optional encrypted artifacts
```

Current pushed shell still uses local reducer/AppState → local KV. Postgres/shared mode is the accepted target, not an implemented claim.

Authority rules: chain facts come from chain; shared app truth comes from ChopDot service/DB; Host/App owns user-side product account/signing authority; private keys never enter ChopDot; Statement Store is never the ledger.

## Non-negotiable product/financial rules

- money truth beats convenience;
- confirmed history is append-only;
- payer attestation/verified evidence → `marked_paid`; receiver confirmation → `confirmed`;
- crypto is a rail, not a separate product mode;
- names are presentation, not identity;
- manually entered destinations are not host-authenticated identity;
- PAS DevNet proof is never called DOT production proof;
- authenticated 32-byte product public key is identity truth; SS58 is network presentation;
- one settlement action pays one creditor at a time;
- no fake sync, asset registration, account recovery or chain capability;
- failures must leave financial truth unchanged or explicitly recoverable.

## Current blockers / debt

Canonical debt register: `docs/FOUNDATION_DEBT.md`.

Major items:

- `DEBT-MONEY-001`: local canonical money still uses JS `number`;
- `DEBT-PERSIST-001`: no explicit schema-version migration chain;
- `DEBT-SECURITY-001`: legacy `RECORD_MATCHED_PAYMENT` still direct-confirms internally; live code no longer uses it;
- `DEBT-SYNC-001`: new parallel-branch mutations/evidence/identity remain local-only until canonical backend authority exists;
- `DEBT-POLKADOT-IDENTITY-001`: exact deployed Product SDK `productId`/derived account needs real-host reconciliation;
- `DEBT-POLKADOT-SDK-001`: Product SDK package-family install/type/build/host compatibility needs verification;
- Statement Store real-host allowance remains upstream-blocked (`paritytech/polkadot-desktop-community#29`);
- Product SDK reviewed chain preset supports Paseo; Polkadot preset is currently planned;
- no verified current Paseo USDC registration/id has been established.

## Status definitions

- `TODO`
- `BUILDING`
- `BLOCKED`
- `READY_FOR_CODEX_VERIFY`: implementation/tests written; runtime evidence not executed here
- `DONE`: required quality evidence + current-source reconciliation complete

Unexecuted tests are always labelled WRITTEN / NOT EXECUTED HERE.

## Queue / status

| Slice | Status | Reference / outcome |
|---|---|---|
| FOUNDATION-000 | DONE | canonical build process |
| FOUNDATION-001 | DONE | product/security/architecture/engineering/quality guardrails |
| RESEARCH-001 | DONE | first-party Parity architecture review |
| DATA-001 | DONE (design) | hybrid Postgres + Polkadot target |
| MONEY-001 | READY_FOR_CODEX_VERIFY | expense inspection/edit/delete before activity |
| MONEY-002 | READY_FOR_CODEX_VERIFY | stale-request replacement + additive corrections/refunds |
| DATA-002 | TODO / RECONCILE FIRST | integer money + persistence migrations |
| GROUP-001 | READY_FOR_CODEX_VERIFY | group/member management with unresolved-obligation safety |
| PEOPLE-001 | READY_FOR_CODEX_VERIFY | reusable people + receive preferences |
| BACKEND-001 | TODO / RECONCILE FIRST | shared service + Postgres |
| BACKEND-002 | TODO | obligations + durable payment intents |
| SETTLEMENT-001 | READY_FOR_CODEX_VERIFY | common rail/evidence lifecycle |
| SETTLEMENT-002 | READY_FOR_CODEX_VERIFY | reversible manual acknowledgement + audit |
| POLKADOT-001 | READY_FOR_CODEX_VERIFY | host-authenticated product identity |
| POLKADOT-002 | READY_FOR_CODEX_VERIFY | native PAS/Paseo Product SDK transaction adapter |
| POLKADOT-003 | READY_FOR_CODEX_VERIFY / EXECUTION BLOCKED | USDC config/evidence/executor seam; no fake live execution |
| HISTORY-001 | READY_FOR_CODEX_VERIFY | real money timeline + past-group archive |
| IDENTITY-001 | READY_FOR_CODEX_VERIFY | honest local profile lifecycle + Polkadot/recovery distinction |
| QUALITY-001 | TODO — NEXT | validation + error/recovery pass |
| QUALITY-002 | TODO | mobile/accessibility/consumer polish |
| SYNC-001 | TODO / PARTIALLY PLATFORM-BLOCKED | API correctness first; Statement Store optional wakeup |
| BULLETIN-001 | TODO / OPTIONAL | encrypted artifact policy only if useful |
| RELEASE-001 | TODO | full acceptance journey + deployment proof |

## Important completed-slice details

Full implementation/acceptance details live in the corresponding preflight docs. Key current facts:

- MONEY-001/002 preserve financial history rather than rewriting paid truth.
- GROUP-001 blocks member removal on raw unresolved obligations, including zero-net-but-unsettled cases.
- PEOPLE-001 does not allow arbitrary friend wallet text to become trusted settlement authority.
- SETTLEMENT-001/002 unify rail semantics; manual Undo is blocked after chain evidence/receiver confirmation.
- POLKADOT-001 stores explicit hostIdentity provenance and never stores private keys.
- POLKADOT-002 uses Product SDK signer + chain client + `Balances.transfer_keep_alive` + finalized evidence for PAS DevNet; production DOT remains unclaimed.
- POLKADOT-003 knows verified mainnet USDC metadata (asset 1337, six decimals) but keeps execution disabled because current reviewed Product SDK mainnet preset is unavailable and Paseo USDC is unverified.
- HISTORY-001 journals stable expense/request/archive events and renders correction/settlement events in human language; legacy SEND_REQUEST timestamp is local observation time until backend commands provide canonical event time.
- IDENTITY-001 removes fake login choices, gives one real local onboarding path, validates/normalizes names, saves profile edits intentionally, and states that Polkadot identity reconnect does not yet restore groups/history on another device.

## Next slice: QUALITY-001

Goal: audit forms, destructive actions, capability failures, payment failures, loading/retry states, back/cancel behavior, and restart resilience. Fix real failure modes first; do not mix visual polish into this slice unless required for recovery clarity.

## Reconciliation protocol

When current local/deployed source becomes available:

1. identify exact commit producing current `.dot` build;
2. compare with this branch, never blindly merge;
3. keep stronger implementation per slice and cherry-pick modular commits;
4. reconcile Product SDK product id and package family;
5. remove/rewrite legacy direct-confirm behavior;
6. run lint/typecheck + all relevant unit tests + production build;
7. run host simulation and real host/device/chain proofs where applicable;
8. run mobile/accessibility acceptance;
9. deploy only after release gate; record version/CID/domain/evidence.

## Anti-AI-slop check

For every change: real user action? clear authority? deterministic money state? recoverable failure? human copy? no invented capability? no unnecessary architecture? deterministic tests? understandable from repo without chat? If any critical answer is no, stop.