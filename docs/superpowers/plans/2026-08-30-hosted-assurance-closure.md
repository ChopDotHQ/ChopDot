# Hosted assurance closure

**Kind:** execution plan
**Status:** active
**Owner:** assurance integrator
**Last reviewed:** 2026-08-31
**Applies to:** `codex/hosted-assurance-release`, integrated from release base `373c80231f37a4cbe05bbca9b0ec3f720eb2d792`
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
- Route every active release-suite evidence writer through one externally
  configurable, repository-contained path helper and fail if a future active
  writer is missing from that inventory.
- Retain Playwright's machine-readable result and bind the release command,
  exclusion set, output directory, and JSON reporter in hostile tests.
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
1.1. All active browser evidence writers SHALL write beneath
   `CHOPDOT_RELEASE_EVIDENCE_ROOT`; the suite SHALL emit a non-empty JSON result
   there and leave the repository completely clean.
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

## Integration reconciliation

- The stale implementation branch was not merged wholesale. Its source changes
  were replayed onto the accepted release base and seven conflicts were
  reconciled against the current contextual Home and authority-key behavior.
- The first inventory covered ten writers. An independent audit and a live full
  run found seven additional active writers, including four that rewrote twelve
  tracked proof files. All seventeen are now covered by a derived hostile
  inventory; generated proof changes are not candidate source.
- The current release configuration collects ninety browser tests. The JSON
  reporter and runtime artifact directory now live below the external evidence
  root so a hosted result records exact counts without dirtying the checkout.

## Local verification on the reconciled candidate

- Focused hosted-assurance and hostile workflow tests: `53/53` passed.
- Evidence-path boundary tests: `3/3` passed.
- Workflow structural validator: `477` checks, zero errors and zero warnings.
- Focused stale-expectation and hosted-frame repair: `9/9` browser tests passed.
- Full production-entrypoint release suite: `90/90` passed in `127213.39 ms`;
  the JSON report recorded `90` expected, `0` skipped, `0` unexpected, and `0`
  flaky tests.
- TypeScript, production build, `377/377` Node tests, the `200`-file security
  baseline, and `1309` repository-governance checks passed. Repository validation
  retained the declared steering-surface degradation warning; it did not report
  a new error.
- Full-history Gitleaks audit: `783` commits scanned with zero findings after
  the exact fourteen-fingerprint reviewed baseline; the hosted job independently
  verifies the pinned `8.30.1` archive before scanning.
- The first full browser run reproduced twelve tracked proof rewrites. After the
  seventeen-writer repair, the same suite produced no tracked proof or new
  repository output paths.
- GitHub's workflow parser rejected the first pushed candidate before creating
  jobs because `runner.temp` is unavailable in job-level `env`. The evidence
  root is now bound only on the two runtime steps where GitHub exposes the
  runner context and is referenced directly by the upload step. A hostile test
  and structural validator now reject moving that binding back to job scope.
