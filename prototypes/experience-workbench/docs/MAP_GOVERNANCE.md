# Journey Map Governance

## Problem solved

The visual map previously became shorter than the actual journey registry. Seventeen secondary journeys were collapsed into one summary row. Nothing was deleted, but the control surface stopped showing the whole product.

## Source of truth

`registry/journeys.json` is now the canonical journey registry.

The visual `journey-map.html` is generated from it. Do not edit the map directly.

Related registries:

- `registry/features.json`
- `registry/edge-cases.json`
- `registry/progress.json`

## Required gate

Before a journey can be frozen:

```bash
npm run gate
```

The gate rebuilds the map and validates:

- exactly 28 unique journeys;
- exactly one current journey;
- Golden and remaining counts match;
- every journey has an entry and exit contract;
- every connection points to a real journey;
- unapproved dead ends fail;
- Golden journeys have version, approval date, prototype, spec, and QA paths;
- every feature and edge case maps to a real journey;
- every journey appears in the visual map;
- the visual map fingerprint matches the registries;
- journeys without inbound connections declare a valid entry mode.

## Update order

1. Update the relevant journey record.
2. Update feature and edge-case coverage.
3. Update `progress.json`.
4. Run `npm run gate`.
5. Inspect `journey-map.html`.
6. Only then update Golden documentation and checkpoint files.

## Rule

A hand-edited map is invalid, even when it looks correct. The registry generates the map; the validator protects it.
