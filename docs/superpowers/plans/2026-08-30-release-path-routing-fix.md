# Release path routing fix

**Kind:** execution plan
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-30
**Applies to:** `codex/release-path-routing-fix`
**Authority:** bounded agent-governance repair; cannot approve or perform a
release

## Goal

Make the adoption boundary reserve only the declared release-script filename
namespaces, including deliberate suffix variants, instead of allowing them to
fall through to `repository-default`.

## Current truth to preserve

- Directory prefixes and exact paths already classify deterministically.
- `PRODUCT_TRUTH.md` remains product-definition-only.
- Non-promotable prefixes remain excluded from governed acceptance.
- Release paths require a release-authorized profile and `release` evidence.
- Acceptance V1 remains one contract, outcome, profile, evidence level,
  provenance record, attestation, run directory, and recall.

## Scope in

- Correct filename-prefix matching for the existing adoption policy.
- Hostile tests for exact prefix matches, near misses, directory prefixes, and
  release profile/evidence enforcement.
- Update the pinned policy digest only if policy bytes change.
- Run focused and governance regression checks.

## Scope out

- Broadening accepted profiles or lowering evidence levels.
- Multi-packet acceptance.
- Changing product law, product UI, deployment files, or release state.
- Publishing, staging, promotion, ownership transfer, or main merge.

## Requirements

1. A declared reserved namespace such as `scripts/verify-dot-host` SHALL match
   `scripts/verify-dot-host.mjs` and related deliberate suffix variants.
2. It SHALL NOT match an unrelated directory or ambiguous near-miss that is not
   within the declared filename family.
3. Directory-prefix behavior SHALL remain unchanged.
4. Every matched release script SHALL reject `implementation` and evidence
   below `release`.
5. Existing policy-digest tamper detection SHALL remain green.

## Loop contract

- **Expected outcome:** all declared release script families classify as
  release and fail closed under the wrong profile/evidence.
- **Proof:** focused hostile tests plus governance regression and exact diff.
- **Failure:** any release script falls through, a near-miss is overmatched, or
  an existing classification/regression fails.
- **Owner:** implementation owner; independent reviewer evaluates the result.
- **Retry:** repair the matcher/test hypothesis and rerun focused plus aggregate
  governance tests.
- **Exit:** exact-head tests pass, independent review finds no bypass, and the
  PR contains only the bounded repair, tests, and this plan.

## Documentation impact

This plan records the behavioral change. The agent-governance README and source
wiki must be checked for wording impact. Because the policy, matcher, tests, and
plan are governed steering sources, the catalog and health read models SHALL be
regenerated and reviewed before acceptance.
