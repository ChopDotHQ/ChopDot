# ChopDot Agent Instructions

These instructions apply to the repository root and all descendants.

## Start here

Before changing code:

1. Record `git status --short`, current branch, and `git rev-parse HEAD`.
2. Fetch origin without discarding local work.
3. Read `docs/CODEX_HANDOFF.md`.
4. Read `docs/CHOPDOT_V1_EXECUTION_BOARD.md` and the mandatory guardrails it lists.
5. Read the relevant `docs/slices/*_PREFLIGHT.md` for the slice being handled.

This branch is parallel work based on `codex/portable-shell-trial`. The true current/deployed source may contain newer local or Codex changes. **Never blindly merge this branch into current source.** Compare slice by slice, keep the stronger implementation, and prefer reviewable cherry-picks or deliberate ports.

## Status discipline

- `READY_FOR_CODEX_VERIFY` means code/tests were written but required local build/device/chain evidence is incomplete.
- `DONE` requires applicable quality-gate evidence and reconciliation with true current source.
- Update `docs/CHOPDOT_V1_EXECUTION_BOARD.md` after each slice.
- Do not claim tests were run unless they were actually run.

## Non-negotiable money/security rules

- Payer attestation or verified evidence moves a payment to `marked_paid`; receiver confirmation moves it to `confirmed` under current v1 policy.
- Preserve paid history; corrections create additive truth rather than rewriting evidence.
- One payment action pays one creditor at a time.
- Names and manually typed addresses are not authenticated authority.
- PAS/Paseo proof is not production DOT proof.
- Do not expose USDC execution without verified network/asset/runtime support.
- Statement Store and URL packets are not the financial ledger.
- Private keys and seed phrases never enter ChopDot.
- Failures leave money state unchanged or explicitly recoverable.

## Engineering expectations

- Build small vertical slices.
- Keep money/domain logic outside UI where practical.
- Use stable IDs, idempotency, validation, explicit invariants and append-only audit events.
- Add deterministic tests for financial behavior and failure paths.
- Avoid broad opportunistic refactors during feature work.
- Use human consumer copy; do not leak protocol jargon into ordinary screens.

## Current work position

`QUALITY-001` is ready for verification. `QUALITY-002` is building. Continue only after reconciling current source. The current QUALITY-002 focus is mobile/accessibility: shared touch/focus/safe-area primitives are started; bottom navigation semantics/safe-area, async status announcements, long-content stress cases, 320/375/390px acceptance and screen-reader checks remain.

See `docs/CODEX_HANDOFF.md` for the full history, architecture, slice inventory, blockers, verification commands and recommended reconciliation sequence.
