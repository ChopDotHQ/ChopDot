# Gitleaks history fingerprint classification

**Kind:** security investigation
**Status:** concluded
**Owner:** repository assurance
**Last reviewed:** 2026-09-04
**Applies to:** `codex/chopdot-v1-launch`
**Authority:** classification of the 12 named Gitleaks findings only; no release,
credential, branch, or product authority

## Bounded question

Are the 12 `generic-api-key` findings reported for commit
`a0e85fbc8eab57f55af0ed25e24720cac5da7295` actionable credentials, or may
they be admitted as exact four-field history fingerprints without weakening
future-secret detection?

This decision determines whether the repository must rotate or remove a
credential, or may instead extend the existing fingerprint-only baseline.

## Source and experiment universe

- Hosted source: `agent-governance` run `33872309852`, candidate
  `bdcedb414e768212375afb0e3e1c787284f94685`, redacted artifact
  `secrets-scan-33872309852`, artifact ID `9936400061`, artifact SHA-256
  `3cb6c144b6e073fde9b2aa31805cb59998b856f53cb418f61e9564665e9e9236`.
- Scanner: official Gitleaks `8.30.1` Darwin arm64 archive, SHA-256
  `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`,
  accessed 2026-09-04 from the official GitHub release.
- Historical source: the 12 artifact records and their exact lines in the two
  prototype representations at commit `a0e85fbc8eab57f55af0ed25e24720cac5da7295`.
- Repository policy source: `origin/main:SECURITY.md`, which covers maintained
  `main` and its production deployment.
- Existing classification and control surfaces:
  `.gitleaksignore`, `docs/agent-system/GITLEAKS_HISTORY_BASELINE.md`,
  `scripts/agent-governance/tests/hosted-assurance-evidence.test.mjs`, and
  `.github/workflows/agent-governance.yml`.
- Excluded: secret values, unrelated findings, rule-wide or path-wide ignores,
  scanner changes, workflow changes, source-branch mutation, and history
  rewriting.

## Facts

- All 12 findings share one commit, one rule, and two prototype paths. The
  redacted artifact contains no additional finding class.
- Direct source inspection identifies the matched strings as deterministic,
  human-readable idempotency labels used by an internal settle-up prototype.
  They are repeated between a generated event mapping and its HTML
  representation and are not shaped or used as provider credentials.
- The prototype documentation describes retry/idempotency behavior and does
  not establish a credential or production-authority path.
- Existing repository practice admits reviewed findings only by exact
  `commit:path:rule:line` fingerprints. The governance test exact-compares the
  ordered baseline, requires uniqueness and four-field form, and rejects broad,
  missing, duplicate, or reordered variants.
- The verified Gitleaks `8.30.1` command
  `gitleaks git . --redact --verbose --exit-code=1 --report-format=json`
  scanned 925 fetched commits after the candidate baseline was applied and
  reported zero findings.
- A separate current-directory scan still reports four previously classified
  synthetic/hash fixtures because directory-mode fingerprints omit the commit
  field. That command is not the hosted full-history job and is not a reason to
  broaden this baseline.

## Inferences

- The 12 reported strings are false-positive credential findings with high
  static confidence; no rotation or credential-removal action is supported by
  the inspected evidence.
- Exact four-field additions preserve detection for other values, other lines,
  later revisions, other paths, and other rules. They are the smallest repair
  for the failing full-history scan.
- A scanner-version change is a re-review trigger because the version is not
  encoded in the fingerprint.

## Assumptions and counterevidence

- The classification assumes the inspected historical bytes and redacted
  artifact are the records exercised by the hosted finding. Their commit,
  paths, rule, lines, candidate, artifact ID, and artifact digest are recorded
  so a mismatch is falsifiable.
- `generic-api-key` is legitimate counterevidence: an apparent label could
  still conceal a credential. Direct usage and representation inspection did
  not find provider authentication, authorization, custody, or production use.
- The affected commit is outside maintained `main`, but that alone would not
  excuse a real credential; the non-credential classification is based on the
  bytes and their use, not branch protection.

## Adversarial checks

- A fresh read-only pre-patch reviewer inspected the historical source and
  identified the exact test surface required to prevent a broad or incomplete
  baseline.
- Two fresh read-only final-diff reviews looked for surviving bypasses and
  regressions and reported no concrete finding. These are delegated-agent
  reviews, not independent human approval.
- The final candidate passed the exact baseline test (7 pass, 0 fail),
  repository validation (574 checks), workflow validation (483 checks),
  `git diff --check`, and the verified Gitleaks `8.30.1` 925-commit scan.

## Conclusion

**ACCEPT WITH CONDITIONS.** Add only the 12 exact fingerprints, record every
classification in the security baseline, and keep the governance test's exact
list and negative variants. Do not add a path, rule, regex, value, workflow, or
history-wide exclusion.

This conclusion does not authorize merge. The candidate still requires hosted
exact-head execution and independent human review because it changes a secret
scan baseline.

## Next bounded proof

Run the hosted governance workflow against the exact PR head, require the
`Secrets scan` job to report zero findings with Gitleaks `8.30.1`, and obtain a
recorded independent human review before merge.
