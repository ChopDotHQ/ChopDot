# Hosted assurance closure

**Kind:** execution plan
**Status:** active
**Owner:** assurance integrator
**Last reviewed:** 2026-08-30
**Applies to:** `codex/hosted-assurance-closure`
**Authority:** repository assurance only; cannot approve product or release state

## Goal

Close the highest-risk assurance gaps left by the retired main workflows without
reintroducing Supabase, obsolete Cypress paths, unsafe write automation, or
false release claims.

## Current truth to preserve

- `Application fast assurance` proves exact-head typecheck, build, Node tests,
  and the bounded security baseline.
- `PR outcome` must depend on every required exact-head evidence producer.
- The current hosted lane does not run the production-entrypoint Playwright
  release suite and does not scan the repository-wide candidate for secrets.
- Release evidence, coverage thresholds, and deployment effects remain separate
  later packages.

## Scope in

- Add exact-head hosted production-entrypoint browser assurance using the current
  Playwright release configuration and Chromium.
- Add a repository-wide Gitleaks scan using a fixed CLI release and verified
  SHA-256 before execution.
- Upload fail-closed exact-head evidence for both jobs.
- Make `PR outcome` require and bind both new job results.
- Extend hostile workflow tests so removing, skipping, masking, or repointing
  either job fails validation.
- Document the disposition of the nine retired main workflows.

## Scope out

- Coverage threshold design.
- Immutable `release-evidence-*` production.
- Changing the GitHub ruleset before both new contexts have emitted green.
- UI changes, product decisions, deployment, publication, promotion, or transfer.

## Requirements

1. `Application browser assurance` SHALL check out the exact candidate SHA,
   install exact lockfile dependencies and Chromium, and run
   `npm run test:release-browser` without masking failures.
2. `Secrets scan` SHALL check out full history at the exact candidate, download
   only the pinned Gitleaks archive, verify its literal SHA-256, and scan the
   repository with redaction and exit-on-leak.
3. Both jobs SHALL upload exact-head evidence with `if-no-files-found: error`.
4. `PR outcome` SHALL depend on and bind the result of both jobs.
5. Hostile structural tests SHALL reject missing, skipped, masked, moving-ref,
   unpinned, or checksum-free variants.
6. A green result SHALL remain application/security evidence only, never `.dot`
   release, deployment, reachability, ownership, or user proof.

## Expected outcome contract

- **Expected outcome:** every governed PR receives exact-head browser and
  repository-wide secret evidence before the outcome packet can be accepted.
- **Proof:** hostile workflow tests, local focused runs, clean exact diff,
  independent review, and hosted job/readback results.
- **Failure:** either assurance job can be skipped/masked/repointed, the scanner
  bytes are not verified, evidence can be absent, or PR outcome can pass without
  both results.
- **Owner:** assurance implementation owner; a separate reviewer evaluates it.
- **Retry:** change the failed workflow/test hypothesis and rerun focused plus
  aggregate governance tests.
- **Exit:** both jobs emit green on the exact PR head and are included in the
  generated accepted outcome; ruleset promotion is a separate readback step.

## Documentation impact

This plan and a source workflow-disposition record are required. No product wiki
or ADR change is expected unless implementation reveals an architecture change.
