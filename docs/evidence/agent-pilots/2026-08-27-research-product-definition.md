# PAOS real pilots: P-035/P-022 research and product definition

**Kind:** exact-candidate pilot evidence
**Observed:** 2026-08-27
**Root:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch:** `codex/chopdot-v1-launch`
**Commit:** `89a5b136170fcac7f892b752af759c132e058307`
**Tree:** `034dadf99bc6e5c29764d3f820dcbe62e434146f`
**Starting Git status:** clean

## Research pilot

Run: `run_paos_research_20260827_001`.

The exact current source supports the local P-035/P-022 repair, while the
durable release record and live finding describe the older failed
`cd61093b...` candidate. Therefore local repair, immutable candidate, live
reachability, real-user proof, and knowledge recall remain separate verdicts.
This pilot performed no network readback and makes no deployment claim.

The declared universe contains eight sources; all eight were inspected and
hashed. Nine material statements are classified as fact, inference, or
unknown; every one cites at least one catalogued source. Two counterevidence
checks prevent local source acceptance from overwriting the failed live record.

## Product-definition pilot

Run: `run_paos_product_definition_20260827_001`.

The bounded closure contract preserves `PRODUCT_TRUTH.md` and
`product/cards.md`. It defines six SHALL requirements, six GIVEN/WHEN/THEN
scenarios, six proof bindings, a 10/10 product gate, explicit account and group
authority, plain-language recovery, screenshot acceptance, and separate local,
live, user, and knowledge verdicts.

Neither run may become `succeeded` through its author. Research requires a
different evaluation run; product definition requires a different actor.

## Independent evaluation result

Both first attempts ended `failed_verification`; neither was promoted as an
accepted outcome.

- The research artifact recorded SHA-256
  `7cb19169a5ab0bb3d06732686fde15010d7a0eed0c77b8957cf59bd16e05c666`,
  while independent readback found
  `f3c91441f63d3a634fcdee52d106f06f63dee3526982d5837c3330a5b3754c68`.
- The product-definition artifact recorded SHA-256
  `eefef141f078ffe6e9eaf6f9a260bf74b72dca811df363184b9f30544238187a`,
  while independent readback found
  `a4f45339b83fc816ce0f098308b981ccde9226b52620eec5b534aedae8bcfd5a`.
- Both recorded artifacts were bound to a candidate whose Git status contained
  this then-untracked evidence file. That cannot satisfy the policy meaning of
  `exact-candidate`, which requires a clean commit and tree.
- Their `measurements.json` files were human-readable summaries rather than the
  required immutable `MeasurementEvidenceV1` documents and typed
  `evidence_level` plus `evidence_artifact_ids` bindings.

The preserved continuations are:

- Research: `output/working_memory/run_paos_research_20260827_001-continuation.json`,
  SHA-256 `55c08e8530e6c7466c64ce24af6bb221e78e5d4285461ace914ac403418631b4`.
- Product definition:
  `output/working_memory/run_paos_product_definition_20260827_001-continuation.json`,
  SHA-256 `52c143dfab9b126673f3002f11b4cf95884977d16084cd2e05ad9f679a0e7489`.

An operator-process exception is also recorded: the author invoked
`npx prettier --write` against two ignored working-memory JSON files. Because
Prettier was absent, `npx` fetched `prettier@3.9.6` into the user npm cache.
No tracked repo file, `package.json`, or `package-lock.json` changed, but the
fetch exceeded the intended bounded pilot workflow and must not be repeated.

The next attempts SHALL start only after this failure evidence is committed,
shall build the measurement evidence before recording its artifact, shall not
mutate the artifact afterward, and shall be independently evaluated against
the same clean candidate identity.

## Second fail-closed discovery

The `_002` pilot round stopped before evaluation because `contract-new`
accepted a creator ID but silently defaulted its kind to `human`. That made
agent-authored contracts claim a human creator and could weaken the practical
meaning of `different_actor` or `different_run`. All five started `_002` runs
were terminated as `failed_verification`; their continuations remain in
`output/working_memory/` and none was promoted.

The runner repair makes `--created-by` and `--created-by-kind` an inseparable
pair, accepts only the contract actor vocabulary, supports truthful overrides
for template-derived contracts, and documents that labels alone do not prove
independence. Fresh focused and complete runner verification passed 115/115
tests. The next real round must use `--created-by-kind=agent` and a genuinely
different evaluator.
