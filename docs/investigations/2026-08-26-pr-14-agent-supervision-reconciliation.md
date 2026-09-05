# 2026-08-26 — PR #14 agent-supervision reconciliation

**Kind:** investigation and integration disposition
**Status:** concluded
**Trigger:** Wave 0 of the portable agent outcome system
**Owner:** agent-systems integrator
**Independent review:** still required before the Wave 0 implementation slice
is accepted
**Inspected at:** 2026-08-26T16:20:24Z
**Exact target root:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Exact target branch:** `codex/chopdot-v1-launch`
**Exact target starting HEAD:** `74d81cba8edd7200246b837c5a31ec4f00456409`
**Target starting status:** clean relative to HEAD except untracked
`docs/superpowers/plans/2026-08-26-portable-agent-outcome-system.md`
**PR:** [#14 — chore: enforce ChopDot supervision contract](https://github.com/ChopDotHQ/ChopDot/pull/14)

## Question

Which parts of PR #14 should be retained, adapted, superseded, or rejected so
the portable agent outcome system gains its proven controls without creating a
second product/process authority, packet family, workflow, instruction order,
or ADR history?

## Why it matters

PR #14 contains useful exact-head, invariant, evidence, negative-test, PR
traceability, and provider-independence work. It also predates the current
release-tree governance, conflicts with the active branch, and introduces
parallel authority surfaces. Wholesale merge would make agents choose between
two internally coherent operating systems—the exact drift this programme is
intended to prevent.

## Sources and provenance

### Exact worktree baseline

| Source | SHA-256 at inspection | Disposition |
|---|---|---|
| `PRODUCT_TRUTH.md` | `d5ea94b3b89f682d7b7ab76f580102316c25b0366c52b9b5a851a5ab7162bba6` | preserve unchanged |
| `product/cards.md` | `8b3f1de935d2e7f241c3f8c2bc7be4df67e5f3127c290b39c043f64dc01b6c2b` | preserve P-035 and current priority unchanged |
| `AGENTS.md` | `4406f6df6bd7469560e3bf1cdc434ca02663a38f04fd45ea517c5faace26ccf4` | preserve exact-worktree read order; later route commands to the portable system |
| `docs/adr/0004-context-authority-and-cited-recall.md` | `deb4836edaeb391aefe8b134f9ba59ba5c1f8387bd3fd998557558401c4b46a3` | preserve authority hierarchy; ADR 0005 supersedes backend-specific naming only |
| `docs/CHOPDOT_OPERATING_LOOPS.md` | `766bce5ebb4c9ab6a80914be21795d93a06c1dc32c3ba4c9219eba23a76b56e9` | migrate labels through the taxonomy; do not delete history |
| `docs/CHOPDOT_LOOP_RUNNER.md` | `a142ead6cf8501b188437d5d16f0e9625bb3ab3f8a2bb778436ccf09d8ac61f4` | retain as active command guide until executable replacement is integrated |
| `product/context-authority.json` | `79ef054942587eca5f51a259fa752f8a2474e6c491584a32e0c0cfe8c6dc50e4` | update only after accepted docs and instruction routes are integrated |
| `.knowns/tasks` | `3095adfd9f25fa841f9640f053fac5d41c788cc06a238d811a23c8e662fb9ba6` | generated read-model file; never a runner dependency |

`product/generated/product-resume.md` reported P-035 as the next gate. The
exact worktree had no `.local-private/agentops` directory and no local
`.agents/skills` directory at inspection; machine-local tools or skills outside
this root remain supporting capabilities and cannot prove exact-worktree state.

### PR #14 identity and live GitHub readback

Read-only `gh` inspection returned:

| Field | Value |
|---|---|
| state | `OPEN` |
| draft | `true` |
| base ref | `codex/chopdot-v1-launch` |
| base OID | `db17f44337c5be5eae2781441f7bdb8bf5667de9` |
| head ref | `agent/chopdot-supervision-contract` |
| head OID | `baaa25176a7d8d74e5ef27ab5b39e75f494cc388` |
| commits | `208217a9`, `a8ee0413`, `a150f3cd`, `baaa2517` |
| mergeable | `CONFLICTING` |
| merge state | `DIRTY` |
| files | 16 |
| latest update | `2026-08-23T15:39:32Z` |

GitHub Actions run `32649082372` completed successfully on exact PR head
`baaa25176a7d8d74e5ef27ab5b39e75f494cc388`. The Supervision contract job
passed, public-beta evidence enforcement was skipped, and Vercel passed. The
artifact `supervision-report-32649082372` (ID `9495667934`) was present and not
expired at inspection, with expiry `2026-09-22T15:36:39Z`. Those are PR-head
governance results, not integration, public-beta, Devnet, user, or release
proof.

Commands used:

```bash
gh pr view 14 --repo ChopDotHQ/ChopDot --json ...
gh api --paginate repos/ChopDotHQ/ChopDot/pulls/14/files
gh api repos/ChopDotHQ/ChopDot/contents/<file>?ref=<head>
gh pr checks 14 --repo ChopDotHQ/ChopDot
gh api repos/ChopDotHQ/ChopDot/actions/runs/32649082372
gh api repos/ChopDotHQ/ChopDot/actions/artifacts/9495667934
```

Each PR file SHA-256 below was computed from the raw file bytes returned by the
GitHub Contents API at exact head
`baaa25176a7d8d74e5ef27ab5b39e75f494cc388`.

## File-by-file disposition

Decision vocabulary:

- **ADAPT** — retain the behavior, but integrate it behind the portable
  contract and current exact-worktree authority.
- **RETAIN** — preserve the file or historical evidence after current-source
  validation.
- **SUPERSEDE** — do not activate the competing surface; preserve provenance
  and move any useful rule to the named canonical target.

| # | PR #14 file and SHA-256 | Exact-worktree observation | Decision and canonical target | Reason and required proof |
|---:|---|---|---|---|
| 1 | `.github/pull_request_template.md`<br>`c9e5355de9415982148d8d87f377d137844b4c58178c8b5da5e53a3dd73bfd82` | absent | **ADAPT** into the eventual same path during Wave 7 | Retain exact base/head identity, affected invariant IDs, authority/failure analysis, claim-to-evidence rows, side investigations, provider attestation, release non-claim, and remaining risk. Replace standalone supervision terminology with `OutcomePacketV1` assertion/evidence references. Test completed rows, stale SHAs, `CURRENT_PR_HEAD`, missing evidence, and untouched placeholders. |
| 2 | `.github/workflows/supervision-gate.yml`<br>`ed000b5275a2874268afd6b7086edf3cda472aa40eff480ba9888d9478898964` | absent | **SUPERSEDE** the standalone workflow; **ADAPT** exact-head checkout, runtime HEAD assertion, summaries, artifacts, and manual release job into `.github/workflows/agent-governance.yml` | One required workflow must cover contracts, runner, adapters, repo governance, app assurance, and approved release enforcement. Preserve separate release gating. Add action pinning/review, current-source tests, exact job names, and branch/ruleset readback before `ci_enforced=true`. |
| 3 | `AGENTS.md`<br>`212d62bfa3f939cb6b48b2cce6f0fdbaddf872733cf34d2b158efe0bb5cc6168` | a richer active file exists with SHA-256 `4406f6df…` | **SUPERSEDE** PR content as an instruction authority; **ADAPT** its exact-state, no-wholesale-merge, evidence-boundary, and provider-independence rules into the current `AGENTS.md` during Wave 6 | The PR file would replace the exact-worktree read order and current live-first-use guardrails. Instruction-surface tests must prove one route and no product/stack claims in `CLAUDE.md` or skills. |
| 4 | `SUPERVISION.md`<br>`c5215781dec50931e01d86744b7b58283e452af2e0b18fb41dcbdf848c7e7720` | absent | **SUPERSEDE** as a root operating authority; **ADAPT** invariant review, evidence ladder, promotion restraint, side-investigation triggers, provider scan, and custody change control into ADR 0005, policies, loop profiles, and existing operating docs | Its useful content must not sit beside `docs/CHOPDOT_OPERATING_LOOPS.md` as a second process law. Validate every moved control against current product law and exact source. |
| 5 | `docs/adr/0000-template.md`<br>`aef02d49e270e6e3a19a627a1bd469d860ffe21a31f6573ea72b9eddc7f01728` | absent | **ADAPT** into `docs/adr/0000-template.md` during documentation integration | Retain date, status, source identity, alternatives, consequences, evidence, and revisit trigger. Align metadata with Kind, Owner, Authority, Applies-to, and the portable evidence vocabulary. Template existence is not an accepted decision. |
| 6 | `docs/adr/0004-current-pr-head-token.md`<br>`1f1924f4be3beb6d50e45ac8704c52ff155cb3f9408c30b5754cb001879164bb` | path absent; ADR number 0004 is already occupied by context authority | **SUPERSEDE** the colliding path; **ADAPT** its decision into ADR 0005 and exact-head workflow tests | Moving PR text may use `CURRENT_PR_HEAD` resolved from the event; immutable packets/releases require literal full SHAs. Preserve PR #14 provenance in this record. Do not create a second ADR 0004. |
| 7 | `docs/investigations/0000-template.md`<br>`df612db506973c5341c08b727a70c4ce866136ea17639e11b069d163c62bd418` | absent | **ADAPT** into the same path during documentation integration | Retain question, impact, primary-source provenance, method, findings, adversarial checks, decision, and follow-up evidence. Add Kind, Authority, Applies-to, limitations, and outcome assertion references. |
| 8 | `docs/investigations/2026-08-23-pr-head-provenance.md`<br>`bad2191988e792b5e8704fa5f996cc66bc430de4e07e6e98b7b294d45a55d627` | absent | **RETAIN** as historical investigation after validating run links; import with explicit PR #14 source provenance | It records the discovered synthetic merge-ref and PR-body snapshot race. It supports, but does not independently prove, current workflow semantics. The later integration test must exercise the current workflow at its exact head. |
| 9 | `docs/investigations/README.md`<br>`f059515ce8291d4a139264b25b5039ae34858ece2f3264a14fa7947bd255a0ad` | absent | **ADAPT** into the same path during documentation integration | Keep the boundary that an investigation is reasoning evidence, not automatically runtime, host, chain, user, or release proof. Route templates and accepted packets through the portable taxonomy. |
| 10 | `governance/evidence-packet.schema.json`<br>`1f05e8abb28b8965802bf7fbd26d7a0e91daced9f6e366ad1f47e3e6e2671c52` | absent | **SUPERSEDE** as a top-level packet; **ADAPT** candidate, lockfile, check, host, network, participants, finality, artifact, and deployment fields into `governance/agent-system/contracts/outcome-packet.v1.schema.json` | The PR schema accepts only pass packets and three evidence levels, has permissive object bodies, and would create a second packet family. New schema validation and negative fixtures must prove wrong candidate, weak evidence, missing readback, and unknown major-version failure. |
| 11 | `governance/supervision-contract.json`<br>`2db86c2bdb2ee18d6179d07941c814eafae57d4c7d1a14715d41f9297f159aaa` | absent | **SUPERSEDE** as a parallel authority; **ADAPT** all 15 invariant IDs, state order, evidence ladder, known gaps, required checks, source links, and provider scan into agent-system policies and evaluation assertions | Revalidate every path/check against the current worktree. Invariant states become evidence assertions and cannot reprioritize product work or declare release truth. Keep one evidence vocabulary and make provider scanning policy-driven rather than a core Supabase branch. |
| 12 | `scripts/tests/verify-pr-supervision.test.mjs`<br>`25cd97da614128479deac9f69900b7a1237a2dc9cbaa0bc0788dede356fca1c2` | absent | **ADAPT** into `scripts/agent-system/tests/pr-governance.test.mjs` | Retain positive `CURRENT_PR_HEAD`/literal-SHA cases and negatives for unknown invariant, stale declared/row SHA, empty table, unchecked provider attestation, placeholder decision, malformed evidence, and claim text containing “claim.” Add wrong base, packet digest, unrelated dirty path, and moving-event fixtures. |
| 13 | `scripts/tests/verify-supervision-contract.test.mjs`<br>`17e5743e78fb39aafb21a3414c8a9c9647c5178ccc5f0b2b5ff6bf469ca6dd6c` | absent | **ADAPT** into agent contract, outcome, invariant, and provider-policy test suites | Retain duplicate-ID, missing automated check, unsupported promotion, weak/dirty exact candidate, release threshold, and provider reintroduction negatives. Add all new schemas, terminal states, effect reconciliation, portability, false-green, and exit-code assertions. |
| 14 | `scripts/tests/verify-workflow-exact-head.test.mjs`<br>`c364553ae6a76b51ab55fe57a82263e912385167ff64ad3a06694a4a95bcb987` | absent | **ADAPT** into `scripts/agent-system/tests/workflow-exact-head.test.mjs` | Retain exact ref and runtime assertion checks for ordinary and release jobs. Strengthen beyond string-count checks with parsed workflow/job assertions and an exact-head integration run before enforcement. |
| 15 | `scripts/verify-pr-supervision.mjs`<br>`7500eb9b47c376e2852410cf449fcc5b9242c606e33f8d532817f3619ebfdf00` | absent | **ADAPT** behind the `agent:ci`/repo-governance command surface | Retain section parsing, change-class and decision validation, affected-invariant lookup, evidence-level validation, exact base/head handling, and fail-nonzero behavior. Consume taxonomy/policy/outcome schemas rather than `governance/supervision-contract.json`. Keep PR-body format as review support, not technical approval. |
| 16 | `scripts/verify-supervision-contract.mjs`<br>`b48c5b1e97cca90ed6163912b94587b801fe4717f8dc8fd0f2e6a3fd01476ca0` | absent | **ADAPT** its invariant, evidence promotion, provider scan, report, and release-threshold checks into `scripts/agent-system/validate.mjs`, evaluator policies, and repo-governance tests | Preserve fail-closed validation and exact evidence requirements. Replace ad hoc packet validation with the canonical schemas, distinguish warnings from promotable proof, and ensure malformed output, skipped checks, stale source, and forbidden provider references cannot exit zero. |

All 16 PR files have an explicit disposition. No PR #14 file is silently
dropped, and no file is authorized for wholesale copy.

## Consolidated control mapping

| PR #14 capability | Portable-system home | Acceptance condition |
|---|---|---|
| 15 product/security/release invariants | policies plus versioned evaluation assertions | current paths and checks validated; no product-priority authority |
| evidence ladder and state restraint | `taxonomy.json`, evidence policy, `OutcomePacketV1` | one vocabulary; false promotion fixtures fail |
| exact PR-head checkout | `agent-governance.yml` and workflow tests | actual run logs exact event head and runtime equality |
| PR claim-to-evidence table | PR template and repo-governance validator | missing/stale/unsupported claims fail non-zero |
| evidence packet fields | `OutcomePacketV1.evidence_index` | no second packet family; schema and negative tests pass |
| provider independence scan | policy-driven repository evaluator | active forbidden references fail; historical fixtures narrowly allowlisted |
| side investigations | investigation template and outcome citations | reasoning evidence remains distinct from live/release evidence |
| public-beta thresholds | approved release job | missing candidate/host/user/release proof cannot report release success |

## Findings

### Facts

1. PR #14's latest head has a successful exact-head governance workflow, but
   its release enforcement job was skipped.
2. The PR is currently draft, conflicting, and based on an older commit than
   the exact target worktree.
3. Fifteen invariant records, nine evidence levels, and 18 claimed self-tests
   are present in the PR. Their current-worktree applicability has not yet been
   revalidated.
4. The PR's `AGENTS.md`, `SUPERVISION.md`, evidence packet, supervision
   contract, workflow, and ADR numbering would compete with current surfaces if
   copied as-is.
5. Its exact-head rule correctly distinguishes moving PR prose from immutable
   evidence: `CURRENT_PR_HEAD` may be resolved in CI; release/evidence records
   require literal source identities.

### Inferences

1. The PR has high control value but low wholesale-merge safety.
2. File-by-file adaptation behind ADR 0005 is safer and preserves more current
   context than either discarding the PR or accepting its authority hierarchy.
3. Its tests are useful regression seeds, not proof that the future portable
   runner, adapters, or current application meet their contracts.

### Unknowns and limitations

- The referenced artifact expires and was not downloaded or independently
  recomputed in this slice.
- GitHub run success was read back from GitHub; job logs were not re-audited in
  this task.
- PR #14 action references use moving major tags and need supply-chain review
  before integration.
- The PR validator depends on stable prose headings and cannot replace code,
  security, product, or release review.
- Current-source revalidation, integration implementation, exact-head CI on the
  reconciled branch, CODEOWNERS, and branch protection remain future waves.

## Decision

**ACCEPT WITH CONDITIONS.** Preserve PR #14 and adapt the useful controls in
the table. Do not merge, copy, or activate the PR wholesale. ADR 0005,
`governance/agent-system/taxonomy.json`, the canonical schemas, and the single
`agent-governance.yml` workflow own the integrated design. PR #14 may be closed
or retargeted only after the integrated source has equivalent or stronger
tests, its provenance remains linked, and independent review accepts the
comparison.

## Required follow-up evidence

1. A machine completeness check proves one disposition for all 16 exact PR
   paths and hashes.
2. The current 15-invariant catalog is revalidated path by path against the
   accepted integration commit.
3. Ported negative tests run against canonical contracts and fail non-zero on
   every false-green fixture.
4. The integrated workflow checks out and asserts its exact PR head in a real
   GitHub run; release enforcement remains separate and honest.
5. Independent architecture review confirms no second authority, packet family,
   evidence vocabulary, or instruction route remains.
6. `PRODUCT_TRUTH.md`, P-035, participant authority, and current release
   verdicts remain unchanged by the governance integration.
