# 2026-08-23 — Pull-request exact-head provenance

**Kind:** historical investigation imported from PR #14
**Status:** concluded
**Original owner:** ChopDot supervision work in PR #14
**Original path:** `docs/investigations/2026-08-23-pr-head-provenance.md`
**Original PR:** [#14 — chore: enforce ChopDot supervision contract](https://github.com/ChopDotHQ/ChopDot/pull/14)
**Original PR head:** `baaa25176a7d8d74e5ef27ab5b39e75f494cc388`
**Original file SHA-256:** `bad2191988e792b5e8704fa5f996cc66bc430de4e07e6e98b7b294d45a55d627`
**Original file Git blob:** `d213a272c8a3cb33649d2f850b46aeb8319c5a41`
**Original evidence level:** `exact-candidate` for the PR #14 governance
candidate only
**Imported/adapted on:** 2026-08-26
**Import target root:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Import target starting branch:** `codex/chopdot-v1-launch`
**Import target starting HEAD:** `74d81cba8edd7200246b837c5a31ec4f00456409`
**Reconciliation:** `docs/investigations/2026-08-26-pr-14-agent-supervision-reconciliation.md`
**Authority:** historical provenance and regression input only; not current
workflow, CI enforcement, branch protection, integration, or release proof

## Question

Does a successful GitHub `pull_request` workflow prove that the declared PR
head itself was tested, and can a literal head SHA in a moving PR body remain
synchronized with the event that triggers the check?

## Why it matters

ChopDot distinguishes source existence, merge-candidate execution, exact-head
execution, real-host proof, and release proof. Mislabeling GitHub's synthetic
merge ref as the source head would weaken every later evidence and release
claim.

## Original sources and provenance

The PR #14 investigation recorded:

- GitHub Actions run `32648060132`, job `97215286768`;
- GitHub Actions run `32648380571`, job `97216071824`;
- PR base `db17f44337c5be5eae2781441f7bdb8bf5667de9`;
- initial head `208217a9b1032d263d5e95960764fac34489219a`;
- corrected exact-checkout head
  `a8ee0413997fe12f8d2e5514c58e252a2c802315`; and
- final PR #14 head `baaa25176a7d8d74e5ef27ab5b39e75f494cc388`.

The reconciler's 2026-08-26 GitHub readback found final run `32649082372`
completed successfully on exact PR head `baaa2517…`; the public-beta evidence
job was skipped. That later result is governance evidence for PR #14 only.

## Original method

The first green workflow was inspected at decoded job-log level rather than
accepted from its conclusion. The checkout ref and `git log -1 --format=%H`
were compared with the PR head. The workflow was then changed to pass the event
head explicitly to checkout and assert `git rev-parse HEAD` at runtime. The
second run separated successful exact-head checkout from PR-body validation.

This imported record did not rerun those historical jobs or re-audit their
decoded logs. It preserves the original result as a regression source and
binds it to the exact PR/file identities above.

## Facts recorded by the original investigation

1. Run `32648060132` was green but checked out synthetic merge commit
   `ded68082b99e30ad474296e4af67e76452b6f0ce`, not PR head `208217a9…`.
2. Run `32648380571` explicitly checked out and asserted head `a8ee0413…`.
3. The PR's then-current supervision self-tests and structural/provider scan
   passed on that exact head.
4. The PR-body step failed because the `synchronize` event had snapshotted the
   description before its literal head SHA was updated.
5. A moving PR therefore needs an event-resolved head token, while immutable
   evidence requires literal full source identities.

## Adversarial checks recorded by the original investigation

- Inspect the actual checkout ref and runtime HEAD rather than job name or green
  conclusion.
- Require exact-ref checkout and runtime assertions in ordinary and release
  governance jobs.
- Reject stale literal head SHAs in moving PR declarations.
- Reject claim rows that cite a stale candidate SHA.
- Do not confuse a row containing the word “claim” with a table header.

## Decision

**ACCEPT WITH CONDITIONS.** Moving pull-request prose may use
`CURRENT_PR_HEAD`. The governance workflow must resolve it to
`pull_request.head.sha`, check out that exact SHA, and assert the runtime Git
HEAD against it. A matching literal 40-character SHA is also accepted.

Immutable `OutcomePacketV1`, accepted ADRs, evidence artifacts, deployment
records, and release claims may not use the moving token. They require literal
commit/tree, clean-status, lockfile, build-profile, artifact, and timestamp
identities appropriate to the claim.

## Current limitations

- The investigation does not prove the integrated
  `.github/workflows/agent-governance.yml` because that is a different future
  candidate.
- The historical artifact and job logs were not independently recomputed in
  this import task.
- Exact-head checkout does not prove test completeness, branch protection,
  independent review, live-host behavior, deployment, or user success.
- GitHub event and checkout semantics, action revisions, and repository rules
  remain revisit triggers.

## Required follow-up evidence

1. Parse and validate the integrated workflow's exact-head configuration.
2. Run it on a current PR and read back the event head, checkout ref, and
   runtime HEAD equality from actual job evidence.
3. Exercise negatives for stale literal SHAs, mismatched base, merge refs,
   missing event payload, skipped jobs, and moving-body snapshot races.
4. Record branch/ruleset readback separately before `ci_enforced` or
   `branch_protected` becomes true.

## 2026-08-27 live PR #13 retry observation

Run `33019750114` checked out exact head
`6cd0e092e662e5b421c28914cb4bfef5f7ea6390`. Agent contract, agent runner,
knowledge adapters, and application fast assurance passed. Repo governance
failed because the `synchronize` event retained the earlier empty PR body; the
final outcome correctly skipped. Updating the live PR body after the push did
not change that immutable event payload.

An empty follow-up commit `0fee2b6f9c5d2e021d69b42dd74ff5bee9a69e77`
changed no tree bytes but did not produce a new governance run. Therefore the
bounded retry is a non-empty documentation commit made only after the governed
body passes local validation. That push must produce a fresh `synchronize`
event, and the entire exact-head workflow must pass; rerunning
`33019750114` would reuse stale event evidence and is not acceptable proof.
