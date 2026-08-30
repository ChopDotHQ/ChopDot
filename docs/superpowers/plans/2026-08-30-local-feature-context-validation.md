# Local feature-worktree context validation

**Kind:** execution plan
**Status:** active
**Owner:** agent-governance
**Last reviewed:** 2026-08-30
**Applies to:** `codex/chopdot-v1-launch`
**Authority:** bounded local context-validation repair; cannot change product
truth, canonical context authority, or governed acceptance

## Goal

Allow an explicitly requested local feature-worktree validation path without
making feature checkouts canonical and without weakening the exact-root,
exact-branch default.

## Current truth to preserve

- `product/context-authority.json` remains the canonical manifest.
- Local validation without an explicit feature-worktree flag requires the
  manifest's exact root and branch.
- GitHub PR validation remains separately attested and unchanged.
- Local validation is preflight evidence only and cannot approve a change.

## Scope in

- Add explicit `--feature-worktree` handling to context validation.
- Prove the checkout is a registered worktree of the same repository as the
  manifest root.
- Require a non-detached feature branch.
- Resolve the exact local `refs/remotes/origin/<manifest.branch>` ref and prove
  it is an ancestor of the feature HEAD.
- Propagate the option through `context:validate`, `product:validate`, and
  `product:query` command paths.
- Add hostile, hermetic tests for absent authorization and spoofed or stale Git
  context.

## Scope out

- Editing `product/context-authority.json` or product decisions.
- Automatic feature-worktree detection.
- Accepting detached checkouts, unregistered roots, alternate repositories,
  guessed remotes, missing target refs, or non-ancestor targets.
- Product UI, release state, deployment, commit, push, or hosted acceptance.

## Requirements

1. Default local validation SHALL continue to require the exact manifest root
   and exact manifest branch.
2. Feature validation SHALL activate only with `--feature-worktree`.
3. The candidate root SHALL be a registered worktree whose common Git
   directory equals the manifest root's common Git directory.
4. The candidate SHALL have a non-detached branch distinct from the manifest
   branch.
5. `refs/remotes/origin/<manifest.branch>` SHALL exist as an exact commit ref
   and SHALL be an ancestor of candidate `HEAD`.
6. Manifest bytes and authority SHALL remain unchanged; caller-supplied or
   environment metadata SHALL not replace Git observations.
7. A feature-worktree success SHALL be labelled as bounded local validation,
   never canonical or governed acceptance.

## Loop contract

- **Expected outcome:** ordinary feature worktrees can run the three read-only
  context/product checks when and only when their exact Git relationship to the
  canonical manifest branch is proven.
- **Proof:** focused hostile tests, canonical validation without the flag, and
  clean feature-worktree validation with the explicit flag.
- **Failure:** any absent flag, detached checkout, wrong repository, missing or
  wrong target ref, stale/non-ancestor base, or spoofed metadata reaches green.
- **Owner:** bounded implementation owner; hosted PR review remains the
  authoritative acceptance path.
- **Retry:** repair the violated invariant and rerun the focused and real
  worktree matrix.
- **Exit:** all hostile tests and both canonical/feature command matrices pass,
  with no tracked changes outside this plan, the cockpit implementation/tests,
  and any strictly necessary source documentation.

## Documentation impact

Add a concise source note under `docs/agent-system/` only if command semantics
cannot be made self-evident from CLI output and tests. No wiki or ADR change is
required because this is an operator validation mechanism, not product or
architecture authority.
