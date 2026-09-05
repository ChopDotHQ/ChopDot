# Gitleaks Journey 11 fingerprint follow-up

**Kind:** security investigation
**Status:** concluded
**Owner:** repository assurance
**Reviewers:** `fresh_security_boundary_review` (source classification) and
`final_baseline_review_retry` (candidate diff), both read-only delegated agents
**Last reviewed:** 2026-09-05
**Applies to:** 18 `generic-api-key` findings at commits
`69177e1df70fc62753d15baf86e0fb9c284a6a60` and
`facafaef6f2bbc1d15f7e189d9f293ea14cb1402`
**Authority:** classification of the 18 named findings only; no release,
credential, branch, workflow, or product authority

## Bounded question

Are the 18 new Journey 11 findings actionable credentials, or may they be
admitted as exact four-field history fingerprints without weakening detection
for another value, line, commit, path, or rule?

This decision determines whether ChopDot must rotate or remove credential
material, or may extend the existing exact-fingerprint baseline while
preserving the prototype's retry and recovery semantics.

## Source and experiment universe

- Hosted source: `agent-governance` run `33915628567`, exact candidate
  `3e508250ab86f3b23fa9676f85d67c948f166ecf`, redacted artifact
  `secrets-scan-33915628567`, artifact ID `9953032178`, API digest
  `sha256:b1874b0b00942419fc2051fa8b3bfc7e974e072064f017d91675d45bc6842c98`.
- Extracted redacted report: `gitleaks.json`, SHA-256
  `a47cc0b1c523029a583cc48c3ddc59092d5e3f6a26967924ce55561995ecfd31`.
- Exact-head receipt: `secrets-scan-exact-head.json`, SHA-256
  `238fa7f10b1a9bdc689fc5dd8de200d50f037a32e15c666c59930340c77b86d6`,
  binding expected and actual SHA to
  `3e508250ab86f3b23fa9676f85d67c948f166ecf`.
- Scanner: the workflow-pinned Gitleaks `8.30.1` release.
- Historical sources: the exact finding lines and their producer/validator
  paths in commits `69177e1df70fc62753d15baf86e0fb9c284a6a60` and
  `facafaef6f2bbc1d15f7e189d9f293ea14cb1402`.
- Policy source: `SECURITY.md` at both affected commits, matching
  `origin/main:SECURITY.md` and covering maintained `main` plus production.
- Control surfaces: `.gitleaksignore`,
  `docs/agent-system/GITLEAKS_HISTORY_BASELINE.md`, and
  `scripts/agent-governance/tests/hosted-assurance-evidence.test.mjs`.
- Excluded: secret values, unrelated findings, workflow semantics, source
  mutation, rule/path/regex/value ignores, scanner changes, and history
  rewriting.

## Facts

- The redacted artifact contains exactly 18 `generic-api-key` findings: one
  generator finding at commit `69177e1df70fc62753d15baf86e0fb9c284a6a60`
  and 17 generated-representation findings at commit
  `facafaef6f2bbc1d15f7e189d9f293ea14cb1402`.
- The 17 generated findings comprise three event-map rows, nine compatibility
  map rows, and five static HTML attributes. The complete ordered fingerprints
  are recorded in `docs/agent-system/GITLEAKS_HISTORY_BASELINE.md`.
- The commit lineage is
  `a0e85fbc8eab57f55af0ed25e24720cac5da7295` ->
  `69177e1df70fc62753d15baf86e0fb9c284a6a60` ->
  `facafaef6f2bbc1d15f7e189d9f293ea14cb1402`, retained on
  `origin/ux/experience-workbench`.
- A final remote-ref refresh advanced that branch to
  `9858822e4ae063ae578036751cc9b8b91b962fb5`; its additional commit introduced
  no new Gitleaks finding under the verified scan.
- Neither new commit is in candidate
  `3e508250ab86f3b23fa9676f85d67c948f166ecf`. The workflow's full fetch plus
  bare `gitleaks git .` makes other fetched refs part of the scan universe.
- The source is a hard-coded, human-readable prototype idempotency fixture.
  The generator places it in `data-idempotency-key` attributes; the Journey 11
  validators parse those attributes into generated event and compatibility
  maps and require their presence for replay-safe exact scope.
- Static inspection found no provider authentication, authorization header,
  environment-secret lookup, password, client secret, signing, custody, or
  network-authentication sink in the affected producer and representations.
- The labels preserve legitimate prototype behavior: retries reuse the exact
  request scope, unknown results do not create a replacement payment, and a
  wallet approval request does not become authorization until a verified result
  is accepted.
- The repository convention admits reviewed findings only as exact
  `commit:path:rule:line` fingerprints. The governance test exact-compares the
  ordered list, enforces uniqueness and four-field syntax, and rejects broad,
  missing, duplicate, and reordered variants.
- Repository security policy requires rotation for a real credential exposed on
  a branch. Branch status therefore does not excuse a credential; this decision
  rests on the inspected data role and usage.

## Inferences

- All 18 findings are false-positive credential findings with high static
  confidence. They are deterministic prototype idempotency metadata and cross
  no supported credential or production-security boundary.
- No credential rotation, deletion, provider revocation, or prototype behavior
  change is supported by the evidence.
- Adding only the 18 artifact-ordered four-field fingerprints is the narrowest
  safe repair. A changed line, new commit, new path, different rule, or another
  value still produces a different fingerprint and fails the scan.

## Assumptions and counterevidence

- `generic-api-key` is legitimate counterevidence: a human-readable label can
  still conceal credential material. Direct producer, representation, and
  validator inspection found only replay/idempotency metadata and no credential
  consumer.
- The affected files are prototype-only and outside maintained `main`, but
  neither fact is used as the basis for safety. A real leaked credential would
  still require rotation under repository policy.
- The extracted artifact and historical source are assumed to be the exact
  bytes exercised by the hosted result. Run, artifact, candidate, commit, path,
  rule, line, and digests are recorded so a mismatch is falsifiable.

## Adversarial checks

- A fresh read-only delegated reviewer independently traced the generator,
  static HTML, event-map generation, compatibility-map generation, retry and
  recovery lifecycle, and repository security policy. It classified all 18
  inputs `not_actionable` with high static confidence and found no credential
  sink or supported security-boundary crossing.
- Parent inspection separately traced the generator's fixture through HTML data
  attributes into both generated maps and searched the affected surfaces for
  authentication, secret, signing, custody, and network sinks.
- The fresh candidate-diff reviewer found no actionable issues. It verified
  that all 18 additions match the hosted artifact in order, the original 26
  entries remain intact, and all 44 entries agree across the ignore file, test,
  and classification table. Its review was static plus focused tests; it did
  not independently rerun the full-history scan or verify hosted receipts.
- The verified Gitleaks `8.30.1` binary, sourced from the checksum-verified
  archive recorded in the baseline, scanned 938 fetched commits after the final
  remote-ref refresh and reported zero findings. Its redacted JSON report had
  length zero and SHA-256
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`.
- The exact baseline test passed 7 of 7 tests; the repository validator passed
  574 checks; the workflow validator passed 483 checks; the local security
  baseline checked 200 files; and `git diff --check` passed.
- `npm run context:validate` was not applicable to this isolated worktree: its
  stored cockpit context is pinned to
  `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch` on branch
  `codex/chopdot-v1-launch`, so it correctly rejected this different root and
  branch. No cockpit context was changed for this security-only patch.
- The final patch must preserve the exact ordered list, negative baseline tests,
  scanner version, workflow, and prototype source. No path, rule, regex, value,
  commit-wide, or scanner-wide exception is permitted.

## Conclusion

**ACCEPT WITH CONDITIONS.** Admit only the 18 exact fingerprints recorded in
the security baseline and mirror the resulting 44-entry list in the governance
test. Keep the prototype and Gitleaks workflow unchanged. No credential rotation
is supported by the evidence.

This conclusion does not itself authorize merge. The candidate still requires
the verified local Gitleaks `8.30.1` scan and hosted exact-head execution under
the active `delegated-owner-principal` acceptance gates. The separately
identified reviewers here are delegated-agent reviews, not independent human
approval; no independent human-review gate is required by the active authority
profile.

## Next bounded proof

Run the exact baseline test, repository and workflow validators,
`git diff --check`, and verified Gitleaks `8.30.1` against the fetched history.
Require a zero-finding local report, then push the exact candidate and require
hosted `Secrets scan`, `Repo governance`, and `PR outcome` success.

Documentation impact is confined to this investigation and the existing
security baseline record. No `docs/wiki/` or ADR update is required because no
product, architecture, or supported security boundary changes.
