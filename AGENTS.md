# ChopDot Agent Instructions

These instructions apply to the repository root and all descendants.

## Start here

Before changing code:

1. Record `git status --short`, current branch, and `git rev-parse HEAD`.
2. Fetch origin without discarding local work.
3. Read `docs/CODEX_HANDOFF.md`.
4. Read `docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md`.
5. Read `docs/CHOPDOT_V1_EXECUTION_BOARD.md` and the mandatory guardrails it lists.
6. Read the relevant `docs/slices/*_PREFLIGHT.md` for the slice being handled.

Before any Polkadot/Parity/platform-dependent change also read:

- `docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`
- `docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json`
- `docs/research/CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md`
- `docs/research/LIVE_DEVNET_REGISTRY_REFRESH.md`

This branch is parallel work based on `codex/portable-shell-trial`. The true current/deployed source may contain newer local or Codex changes. **Never blindly merge this branch into current source.** Compare slice by slice, keep the stronger implementation, and prefer reviewable cherry-picks or deliberate ports.

## Status discipline

- `READY_FOR_CODEX_VERIFY` means code/tests were written but required local build/device/chain evidence is incomplete.
- `DONE` requires applicable quality-gate evidence and reconciliation with true current source.
- Update `docs/CHOPDOT_V1_EXECUTION_BOARD.md` after each slice.
- Do not claim tests were run unless they were actually run.
- A repository README or documented feature is not runtime/security evidence.
- Record exact SDK version, host version, network/genesis and asset/contract identifiers for platform proof.

## Non-negotiable money/security rules

- Payer attestation or verified evidence moves a payment to `marked_paid`; receiver confirmation moves it to `confirmed` under current v1 policy.
- Preserve paid history; corrections create additive truth rather than rewriting evidence.
- One payment action pays one creditor at a time.
- Names and manually typed addresses are not authenticated authority.
- PAS/Devnet proof is not production DOT proof.
- Do not expose USDC execution without verified network/asset/runtime support.
- Statement Store and URL packets are not the financial ledger.
- Bulletin is not a relational database and should not receive plaintext personal expense data by default.
- A DotNS name must be freshly resolved and confirmed before it is used as a payment destination.
- Private keys and seed phrases never enter ChopDot.
- Failures leave money state unchanged or explicitly recoverable.

## Platform boundaries

- Product SDK is the high-level product-facing family.
- TrUAPI is the low-level host protocol.
- Triangle JS and `@polkadot-apps/*` are predecessor/compatibility families; do not mix them into new work without a migration plan.
- CDM handles contract lifecycle/dependency publication; Product SDK contracts handles runtime calls.
- Asset Hub/People/Bulletin/DotNS/Browse each have specialized authority; none replaces ChopDot service/Postgres.
- Reference products are implementation donors, not audited dependencies.
- Live Browse/Playground inventory is dynamic; use a timestamped registry snapshot before making current app claims.

## Engineering expectations

- Build small vertical slices.
- Keep money/domain logic outside UI where practical.
- Keep Product SDK/TrUAPI types behind narrow adapters rather than inside financial domain objects.
- Use stable IDs, idempotency, validation, explicit invariants and append-only audit events.
- Add deterministic tests for financial behavior and failure paths.
- Avoid broad opportunistic refactors during feature work.
- Use human consumer copy; do not leak protocol jargon into ordinary screens.

## Current work position

- `RESEARCH-002` is complete as a dated Products Devnet capability catalog.
- `QUALITY-001` is ready for verification.
- `QUALITY-002` is building.
- `PLATFORM-001` is planned but must wait for true-source reconciliation.

The current QUALITY-002 focus is mobile/accessibility: shared touch/focus/safe-area primitives are started; bottom navigation semantics/safe-area, async status announcements, long-content stress cases, 320/375/390px acceptance and screen-reader checks remain.

See `docs/CODEX_HANDOFF.md`, `docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md` and the execution board for the full history, architecture, slice inventory, blockers, verification commands and recommended reconciliation sequence.