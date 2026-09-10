# ChopDot Prototype Workflow

## Journey pipeline

1. Define the user goal, entry, exit, and boundaries.
2. Update the canonical registry before building.
3. Compose the active context bundle from `DESIGN_CONTRACT.md`, the current journey contract/history, relevant adjacent Goldens, `shared/improvements.md`, and the exact task.
4. Inherit the Golden frame, tokens, components, copy, and icons.
5. Build the review artifact and structured source.
6. Render at 393 × 852 and 430 × 890.
7. Inspect actual screenshots against Golden references.
8. Test happy, empty, loading, offline, permission, conflict, and failure states as relevant.
9. Validate links, overflow, frame overlap, IDs, icons, and semantic variants.
10. Update feature and edge-case coverage.
11. Run `npm run gate`.
12. Run an independent review under `REVIEW_PROTOCOL.md`; green mechanical QA alone cannot produce `GOLDEN-READY`.
13. User reviews the exact `GOLDEN-READY` candidate.
14. Freeze as Golden only after explicit approval of that exact candidate.

## Authority and context rule

`registry/progress.json`, `registry/journeys.json`, approval records, and Golden artifact locks are authoritative for current status. Historical prose does not override them.

For active journey work, load only the context bundle defined in `DESIGN_CONTRACT.md`. Do not duplicate the whole design/process contract into journey docs or agent prompts.

## Shared-system debt rule

Journey work may discover cross-cutting issues and record them in `shared/improvements.md`. It may not fix them locally. A shared-system pass must be deliberately opened, separately reviewed, and regression-tested across affected Goldens.

## Control rule

The visual map may never be shortened manually. It is generated from `registry/journeys.json`.

`feature-coverage.html` and `edge-case-ledger.html` are generated from the same fingerprint.

`registry/goldens.manifest.json` is generated from `registry/journeys.json` plus `registry/golden-artifact-locks.json`; it is a machine-readable projection, not a second approval authority.

## Freeze gate

```bash
npm run gate
```

The gate rejects:

- stale journey, Golden, or remaining counts;
- missing or duplicate journey IDs;
- broken journey connections;
- undeclared dead ends;
- Golden journeys without prototype/spec/QA paths;
- orphan features or edge cases;
- missing journeys in the visual map;
- stale generated control surfaces;
- registry/map fingerprint mismatch;
- Golden manifest count/path/checksum disagreement with the canonical journey and lock registries.

If the gate fails, the journey is not ready to freeze.

## Generated-file rule

Do not hand-edit:

- `journey-map.html`
- `feature-coverage.html`
- `edge-case-ledger.html`
- `registry/map-fingerprint.json`
- `registry/goldens.manifest.json`

Update the authoritative registries, then rerun the gate.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history and future revisits

Before bringing a new or revised journey for review, record its consequential decisions in `journeys/<id>-<slug>/source/decision-history.md`. Use `templates/decision-history.md`. The gate renders that small source section into the existing `spec.md#decision-history` after historical bundles run; do not edit the managed spec copy directly.

Each entry needs a stable ID, decision, why, alternatives considered, tradeoffs, revisit trigger, approval/version and source references. Distinguish the date a decision was made (only when known) from the date it was recorded or backfilled. Capture new choices and rejected options while discussing them, not after they are forgotten.

Backfill only what inspected sources support. Write **Not recorded in inspected sources** for missing rationale or alternatives. Do not invent discussions, treat a plausible explanation as a past decision, or turn a candidate policy into approval. Revisit triggers added later are labelled maintenance notes, not historical reasoning or authority to redesign.

Append later decisions with new IDs and link any superseded entry; never silently rewrite the historical reason. Use registry/approval records for current approval truth when old candidate-stage prose remains in a spec. Link the relevant scope, state/action mapping, test, QA or checkpoint rather than duplicating the complete specification.

Before revisiting: read the decision history and its sources, check the current registry and Golden checksum, inspect dependent journeys, and state what new evidence warrants a change. Preserve the approved artifact; any behavioral or visual change needs a separately reviewed version. TYPO-01 remains deferred until an explicit shared typography/readability pass.

The gate requires decision-history coverage for every Golden/current journey, checks the required fields and rendered/source consistency, and rechecks artifact locks. These are documentation-structure checks, not proof that every conversation or alternative was recovered. Future journeys cannot pass as current without a history source. Unstarted journeys are not filled with invented decisions.
<!-- JOURNEY_DECISION_HISTORY:END -->
