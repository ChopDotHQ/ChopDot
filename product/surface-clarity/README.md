# Use ChopDot Surface Clarity

Read [FRAMEWORK.md](FRAMEWORK.md), then use the specific prompts in
[JOURNEY_PLAYBOOK.md](JOURNEY_PLAYBOOK.md). This adds review tooling, not product behavior.
Node 24+, Git and the frozen schema/authority commits are prerequisites; no npm
installation, backend or browser is needed for bookkeeping commands. A shallow
clone must fetch the declared commits using its normal authorized Git access.

From the repository root:

```sh
node scripts/surface-clarity.mjs context
node scripts/surface-clarity.mjs check
node scripts/surface-clarity.mjs report
node --test scripts/surface-clarity.test.mjs
node scripts/surface-clarity.mjs ready
```

`check` exits 0 for coherent records, 1 for invalid/stale sources. `ready` exits 2
when review is incomplete; that is the expected starting state. `report` prints a
Markdown table to stdout without overwriting files. Counts are registry-derived.

For a new registered journey:

```sh
node scripts/surface-clarity.mjs init J29
```

This refuses to overwrite an existing record. It does not add a journey or
product authority. A new journey absent from the frozen schema needs its own
approved source mapping; the starter remains pending. Add that mapping to
`additional_authority` with immutable `commit`, `path`, byte `sha256`, its `role`
and `approval_reference`. This preserves V1 rather than inventing a frozen schema
projection. No missing journey is
silently dropped from the denominator.

## Fill a record

Edit `journeys/Jxx.json`. `context` reports current binding digests; updating a
digest is bookkeeping, never evidence that a flow was tested. Set scope to the
actual task/state/actor/entry/return/viewport/fixture. Add cases beyond the nine
starter categories as needed. For each applicable check and scenario add steps,
an expected outcome, result and evidence IDs; explain all not_applicable entries.
Add surface decisions and hypotheses using the template. Keep external
capabilities and human comprehension explicitly untested when appropriate.

Each evidence record has `id`, `kind`, `implementation_sha`, `runtime_digest`,
`scope`, `artifacts` and `environment`. Artifacts are repo-relative file paths with
SHA-256 hashes. Automated evidence additionally needs `command`, `exit_code` and
`log` pointing to an artifact. USER_STUDY requires `protocol`, anonymized
`participant_scope` and `observations`; independent review names its reviewer
and scope. The checker validates metadata and file integrity, not honesty or
clinical/statistical validity. Do not include personal data or secrets.

Only pass records consume evidence as successful proof. An unassessed item may
cite historical observations without becoming green. Historical audit entries
are labelled source import, not fresh tests. Imported `results.json` is pinned
by hash; screenshots live in the separately supplied original audit archive.

## Source tracing

Each starter links its frozen composition projection, applicable operations,
contexts/laws and certified task IDs, plus its current registry entry. Use:

```sh
git show 5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013:product-schema/V1_USAGE_GUIDE.md
git show 5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013:product-schema/generated/reconstruction-pieces.json
```

The paths are intentionally not copied into the runtime branch. Piece IDs are
identifiers for the approved surface, not assertions that current UI is identical.
Record actual post-Golden decisions/impacts and compare the relevant source
manifests. Existing `expansion/run.sh` retains the prototype regression suite;
see `prototypes/integrated-product-preview-v2/PROTOTYPE_USAGE.md` for its real
prerequisites. The framework checker does not run or replace that suite.

## Decision and evidence template

```json
{
  "surface": "journey + state + control + destination",
  "piece_id": "source-resolved identifier or explicit authority-accounted limitation",
  "operation": "existing owner/operation or navigation/presentation",
  "decision": "KEEP | CORRECT | DELETE | UI_CUE | LABEL | CAPTION | INLINE | DETAILS | INTERNAL | TEST",
  "observation": "what was actually observed",
  "prediction": "what a person should understand or do differently",
  "lens": "named UX lens, if relevant",
  "tradeoff": "what might become harder or less visible",
  "authority_boundary": "meaning preserved or named decision required",
  "success_evidence": "neutral task, predicted consequence, interaction/observation",
  "result": "pending; evidence ID after execution"
}
```

Keep the method version small. Add a check only after a demonstrated omission,
document why, update starter records and tests, and review effects. Version the
method separately from immutable Product Schema V1.
