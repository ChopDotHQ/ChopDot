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
