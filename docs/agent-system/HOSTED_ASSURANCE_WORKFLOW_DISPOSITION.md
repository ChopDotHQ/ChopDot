# Hosted assurance workflow disposition

**Kind:** governance source
**Status:** current
**Last reviewed:** 2026-08-30
**Baseline reviewed:** `origin/main@5082b80b73be2e1a4a32c0b99e86ff4253709976`
**Candidate lane:** `codex/hosted-assurance-closure`
**Authority:** workflow migration record only; this document cannot prove a check ran or approve a release

## Purpose

The release line replaces nine independent workflows from the reviewed `main`
baseline with one exact-candidate governance workflow. Consolidation is accepted
only when the replacement keeps the useful outcome, rejects stale or missing
evidence, and clearly records deferred work. A workflow being listed here does
not make its outcome green.

## Disposition of the nine `main` workflows

| Former workflow | Disposition | Concrete replacement or boundary |
|---|---|---|
| `.github/workflows/ci.yml` | Adapted | `Application fast assurance` runs lockfile install, lint/typecheck, build, Node suites, and the bounded security baseline on the exact PR head. |
| `.github/workflows/coverage.yml` | Adapt later | Coverage threshold design is explicitly outside this assurance package. It remains release debt and must not be inferred from green tests. |
| `.github/workflows/data-002-bootstrap.yml` | Superseded | The former bootstrap automation is not an acceptance check. Current repository-governance validation and human-governed PR integration replace automated branch/PR mutation; no write automation is restored here. |
| `.github/workflows/data-002-open-pr.yml` | Superseded | The former PR-opening automation is not an acceptance check. PR creation remains an explicit operator action, separate from exact-head verification. |
| `.github/workflows/e2e-cypress.yml` | Adapted | `Application browser assurance` installs the lockfile and exact Playwright Chromium, then runs `npm run test:release-browser` against the production entrypoint. |
| `.github/workflows/edge-functions.yml` | Superseded | The no-Supabase release architecture does not treat legacy edge-function validation as candidate authority. No equivalent backend check is claimed. |
| `.github/workflows/release-validation.yml` | Adapt later | Immutable release-evidence production, candidate fingerprint readback, deployment, reachability, ownership, and user proof remain a later release package. `Release enforcement` only validates supplied governed evidence. |
| `.github/workflows/secrets-scan.yml` | Adapted | `Secrets scan` checks out full exact-candidate history, verifies the pinned Gitleaks 8.30.1 archive SHA-256, scans with redaction and leak exit status, and uploads fail-closed evidence. |
| `.github/workflows/smoke-targeted.yml` | Adapted | Targeted production-entrypoint smoke coverage is carried by `Application browser assurance`; its result is application evidence only. |

## Outcome contract

- **Expected outcome:** every governed pull request is evaluated at one immutable
  head by contract, runner, knowledge, repository, fast application, browser,
  and secret-scan evidence producers before `PR outcome` can accept it.
- **Proof:** the hosted checks emit green for the exact candidate; their
  exact-head reports are present once each; `PR outcome` binds all seven job
  results; hostile structural tests reject removal, skipping, masking, moving
  refs, missing checksums, and missing evidence.
- **Failure:** any required result is missing, skipped, failed, stale, duplicated,
  conditionally bypassed, or cannot prove the candidate commit and tree.
- **Owner:** assurance integrator; a separate reviewer evaluates the change.
- **Retry:** repair the owning workflow or validator, rerun focused and aggregate
  governance tests, then obtain a fresh hosted run on the new exact head.
- **Exit:** both new contexts have emitted green, the aggregate `PR outcome` is
  green for that same head, and check readback confirms those exact contexts.

## Promotion boundary

Required-check or ruleset promotion happens only after the new hosted contexts
exist and have emitted green. Coverage and immutable release evidence remain
separate open packages. No result in this workflow proves `.dot` deployment,
public reachability, domain ownership, transfer, recovery, or real-user success.
