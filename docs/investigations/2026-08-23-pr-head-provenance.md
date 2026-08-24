# 2026-08-23 — Pull-request exact-head provenance

- **Status:** CONCLUDED
- **Trigger:** PR #14 supervision-gate verification
- **Owner:** ChopDot supervision
- **Exact source SHA:** CURRENT_PR_HEAD

## Question

Does a successful `pull_request` workflow prove that the declared PR head itself
was tested, and can a literal head SHA in the PR body remain synchronized with
the event that triggers the test?

## Why it matters

ChopDot distinguishes source existence, merge-candidate execution, exact-head
execution, real-host proof, and release proof. Mislabeling a synthetic merge ref
as the exact candidate would weaken every later evidence and release claim.

## Sources and provenance

- GitHub Actions run `32648060132`, job `97215286768`.
- GitHub Actions run `32648380571`, job `97216071824`.
- PR #14 base `db17f44337c5be5eae2781441f7bdb8bf5667de9`.
- Initial head `208217a9b1032d263d5e95960764fac34489219a`.
- Corrected exact-checkout head `a8ee0413997fe12f8d2e5514c58e252a2c802315`.

## Method

The first green workflow was inspected at decoded job-log level rather than
accepted from its conclusion. The checkout ref and `git log -1 --format=%H` were
compared with the PR head. The workflow was then changed to pass the event head
to `actions/checkout` and assert `git rev-parse HEAD` at runtime. The second run
was inspected to separate checkout success from PR-body validation failure.

## Findings

1. Run `32648060132` was green but checked out synthetic merge commit
   `ded68082b99e30ad474296e4af67e76452b6f0ce`, not head `208217a9...`.
2. Run `32648380571` explicitly checked out and asserted head `a8ee0413...`.
3. All 15 self-tests and the structural/provider scan passed on that exact head.
4. The PR-body step failed because the `synchronize` event had snapshotted the
   description before its literal head SHA was updated.
5. A moving PR therefore needs a CI-resolved head token, while immutable evidence
   must retain literal full SHAs.

## Adversarial checks

- Inspected the actual checkout command rather than relying on the job name.
- Added a regression test requiring exact-ref checkout and runtime assertions in
  both structural and release jobs.
- Retained stale literal-SHA rejection in the PR validator.
- Added a test that a claim row cannot cite a stale literal candidate SHA.

## Product and build impact

No product or financial authority changes. Evidence classification becomes more
accurate: the first run is merge-candidate evidence, the second proves exact
checkout but not a complete PR gate, and only a subsequent token-aware green run
may advance the supervision mechanism to `READY_FOR_CODEX_VERIFY`.

## Decision

ACCEPT WITH CONDITIONS

Use `CURRENT_PR_HEAD` in moving PR descriptions, resolve it to the event head in
CI, and require literal full SHAs for evidence packets and release records.

## Required follow-up evidence

A complete green PR #14 run that logs the exact head checkout, passes the token-
aware PR validator, passes all self-tests and provider scans, and uploads the
structural report.
