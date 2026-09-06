# ChopDot Prototype Workflow

## Journey pipeline

1. Define the user goal, entry, exit, and boundaries.
2. Update the canonical registry before building.
3. Inherit the Golden frame, tokens, components, copy, and icons.
4. Build the review artifact and structured source.
5. Render at 393 × 852 and 430 × 890.
6. Inspect actual screenshots against Golden references.
7. Test happy, empty, loading, offline, permission, conflict, and failure states as relevant.
8. Validate links, overflow, frame overlap, IDs, icons, and semantic variants.
9. Update feature and edge-case coverage.
10. Run `npm run gate`.
11. User reviews.
12. Freeze as Golden only after approval.

## Control rule

The visual map may never be shortened manually. It is generated from `registry/journeys.json`.

`feature-coverage.html` and `edge-case-ledger.html` are generated from the same fingerprint.

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
- registry/map fingerprint mismatch.

If the gate fails, the journey is not ready to freeze.

## Generated-file rule

Do not hand-edit:

- `journey-map.html`
- `feature-coverage.html`
- `edge-case-ledger.html`
- `registry/map-fingerprint.json`

Update the registries, then rerun the gate.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history and future revisits

Before bringing a new or revised journey for review, record its consequential decisions in `journeys/<id>-<slug>/source/decision-history.md`. Use `templates/decision-history.md`. The gate renders that small source section into the existing `spec.md#decision-history` after historical bundles run; do not edit the managed spec copy directly.

Each entry needs a stable ID, decision, why, alternatives considered, tradeoffs, revisit trigger, approval/version and source references. Distinguish the date a decision was made (only when known) from the date it was recorded or backfilled. Capture new choices and rejected options while discussing them, not after they are forgotten.

Backfill only what inspected sources support. Write **Not recorded in inspected sources** for missing rationale or alternatives. Do not invent discussions, treat a plausible explanation as a past decision, or turn a candidate policy into approval. Revisit triggers added later are labelled maintenance notes, not historical reasoning or authority to redesign.

Append later decisions with new IDs and link any superseded entry; never silently rewrite the historical reason. Use registry/approval records for current approval truth when old candidate-stage prose remains in a spec. Link the relevant scope, state/action mapping, test, QA or checkpoint rather than duplicating the complete specification.

Before revisiting: read the decision history and its sources, check the current registry and Golden checksum, inspect dependent journeys, and state what new evidence warrants a change. Preserve the approved artifact; any behavioral or visual change needs a separately reviewed version. TYPO-01 remains deferred until an explicit shared typography/readability pass.

The gate requires decision-history coverage for every Golden/current journey, checks the required fields and rendered/source consistency, and rechecks artifact locks. These are documentation-structure checks, not proof that every conversation or alternative was recovered. Future journeys cannot pass as current without a history source. Unstarted journeys are not filled with invented decisions.
<!-- JOURNEY_DECISION_HISTORY:END -->
