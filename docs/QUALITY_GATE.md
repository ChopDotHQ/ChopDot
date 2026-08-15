# ChopDot Quality Gate

Status: active release gate for the v1 completion track
Owner: product + engineering + product security

## Purpose

A ChopDot slice is not done because the UI renders or TypeScript compiles. It is done only when the relevant product, money, security, persistence, accessibility, and platform checks have credible evidence.

This gate is intentionally strict because ChopDot coordinates money and is being built across multiple AI/IDE/tooling environments.

## Gate Levels

Use the narrowest required gate for the slice, but never skip a relevant category.

- **G0 — Documentation/decision only:** consistency review, references, no runtime claims.
- **G1 — Domain-only:** deterministic logic and invariant tests.
- **G2 — User-visible local flow:** G1 + UI + persistence + mobile/accessibility + failure states.
- **G3 — Host/payment adapter:** G2 + adapter contract tests + host simulation + capability failure behavior.
- **G4 — Real host/chain:** G3 + live host/device/chain evidence required before claiming the capability works in production-like DevNet conditions.

## QG-01 — Scope integrity

Before coding:

- [ ] Slice ID exists on the execution board.
- [ ] User goal is explicit.
- [ ] Scope and non-goals are explicit.
- [ ] Required evidence level is named.
- [ ] No unrelated refactor is bundled into the slice.
- [ ] New architecture decision is recorded if the slice changes an accepted boundary.

## QG-02 — Product experience

For user-visible work:

- [ ] The screen/flow answers a clear user question.
- [ ] One next action is visually dominant.
- [ ] Money direction and amount are understandable in human language.
- [ ] Common mistakes are recoverable where financial truth permits.
- [ ] Counterparty experience is considered.
- [ ] No protocol/host/internal jargon leaks into normal UI.
- [ ] Polkadot capability reduces friction, adds trust, or enables a real rail; it is not present merely for novelty.
- [ ] Failure tells the user what they can do next.

Reference: `docs/PRODUCT_EXPERIENCE.md`.

## QG-03 — Financial invariants

Where money truth changes:

- [ ] Split totals equal the expense amount in canonical units.
- [ ] Balance calculations conserve value.
- [ ] Payer/receiver direction is deterministic.
- [ ] A request does not count as payment.
- [ ] A payer claim alone does not count as receiver confirmation for manual rails.
- [ ] A confirmed payment cannot be applied twice.
- [ ] A stale request cannot settle a changed obligation.
- [ ] Settled history cannot be silently deleted or rewritten.
- [ ] Correction/refund logic is explicit after settlement.
- [ ] Currency/asset units and decimals are explicit; no floating-point canonical money state.

## QG-04 — Security and authority

- [ ] Actor is authorized for every state-changing command.
- [ ] URLs, QR, host data, storage, and callbacks are treated as untrusted until matched/validated.
- [ ] State-changing commands are idempotent where retries/duplication are possible.
- [ ] Wrong payer/receiver/amount/currency/asset/network evidence cannot update money truth.
- [ ] Host capability failure leaves prior money truth unchanged.
- [ ] No secret/private key/seed material is introduced into client code, logs, fixtures, or docs.
- [ ] Sensitive telemetry/log data is minimized/redacted.
- [ ] Threat-model review was performed if the slice introduces signing, a payment rail, cross-device mutation, backend authority, custody, or automatic evidence confirmation.

Reference: `docs/SECURITY_TRUST_MODEL.md` and existing security contracts.

## QG-05 — Persistence and migration

For any persisted-state change:

- [ ] Schema impact is documented.
- [ ] Existing state migration is implemented or explicitly proven unnecessary.
- [ ] Reload preserves the expected money truth.
- [ ] Corrupt/invalid state fails safely.
- [ ] No release silently wipes meaningful group/payment history.
- [ ] Local/host mirrors do not become canonical authority accidentally.

## QG-06 — Deterministic tests

- [ ] Happy-path test exists.
- [ ] At least one failure-path test exists.
- [ ] Relevant money invariants are asserted directly.
- [ ] Duplicate/idempotency behavior is tested where applicable.
- [ ] Stale/version mismatch behavior is tested where applicable.
- [ ] Tests validate resulting state, not only that a button was clickable.
- [ ] Property/generated tests are added when financial combinatorics make example tests insufficient.

## QG-07 — UI and interaction resilience

For user-visible slices:

- [ ] Cancel/back does not mutate money state.
- [ ] Validation preserves the user's draft where practical.
- [ ] Loading is distinguishable from success.
- [ ] Destructive actions explain consequences before execution.
- [ ] Empty/error states are actionable.
- [ ] Repeated rapid taps do not duplicate financial actions.
- [ ] Interrupted/reopened flow has a defined recovery behavior where relevant.

## QG-08 — Mobile and accessibility

Where relevant:

- [ ] 320px viewport sanity.
- [ ] 375px viewport sanity.
- [ ] 390px viewport sanity.
- [ ] Safe-area/bottom controls remain reachable.
- [ ] Focus/input viewport does not hide the primary action.
- [ ] Buttons/controls have meaningful accessible labels.
- [ ] Touch targets are practical.
- [ ] Text/content stress does not break money meaning.
- [ ] Dark/light behavior remains coherent if the slice touches shared UI.

## QG-09 — Adapter/platform behavior

For host/wallet/payment slices:

- [ ] Adapter interface is narrow and domain-independent.
- [ ] Unavailable capability has an explicit result.
- [ ] Malformed response is handled.
- [ ] Timeout/failure is handled.
- [ ] Duplicate callback/event is handled.
- [ ] Wrong network/account/asset is handled where relevant.
- [ ] Simulator behavior is not described as real-host proof.
- [ ] Platform/SDK versions are recorded for live evidence.

## QG-10 — Real-host / real-chain proof

Required before a capability is marked `DONE` at G4:

- [ ] Source commit is known.
- [ ] Deployed app version/domain/CID is known where applicable.
- [ ] Host/Desktop/App version is recorded.
- [ ] Relevant Product SDK versions are recorded.
- [ ] Real host/device journey reaches the expected capability.
- [ ] Real chain transaction/evidence is captured for chain settlement.
- [ ] Failure/cancel path is checked on the real integration when material.
- [ ] Known upstream blockers are linked.

If real-host execution is impossible or blocked, status must be `READY_FOR_CODEX_VERIFY` or `BLOCKED`, never `DONE`.

## QG-11 — Regression journey

For any meaningful v1 slice, verify the relevant portion of the golden journey remains intact:

```text
fresh/profile
-> create/open group
-> add expense
-> review split
-> balances
-> request
-> payer action
-> receiver/verified confirmation
-> history
-> reload
```

Payment-specific releases additionally test the relevant cash/DOT/USDC route.

## QG-12 — Commit and handoff quality

- [ ] Commits are conceptually scoped.
- [ ] Commit messages describe behavior.
- [ ] Execution board status is updated.
- [ ] Commit hashes are recorded in the build log.
- [ ] Tests are labelled `PASSED`, `FAILED`, or `WRITTEN / NOT EXECUTED HERE` accurately.
- [ ] Known limitations are recorded.
- [ ] Codex reconciliation requirement is recorded if the newer v0.5.6 source is still unavailable.

## Completion Decision

A slice can move to:

### `READY_FOR_CODEX_VERIFY`

When implementation and test code are review-complete on this branch but required local/runtime/live-host execution is unavailable here.

### `DONE`

Only when all relevant gates have evidence at the required level and reconciliation against the true current source has occurred.

## Stop Conditions

Stop and do not merge if any of these is true:

- financial invariant is ambiguous;
- the same action produces different money truth on different screens/hosts;
- an uncertain external callback can mark payment confirmed;
- a migration can silently destroy meaningful money history;
- a host/platform error is being hidden with fake success;
- implementation requires exposing protocol complexity to normal users without product value;
- test evidence contradicts the product claim;
- the newer deployed-source implementation conflicts with this branch and the conflict has not been deliberately resolved.

## References

- `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/ENGINEERING_STANDARDS.md`
- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `HOSTS.md`
