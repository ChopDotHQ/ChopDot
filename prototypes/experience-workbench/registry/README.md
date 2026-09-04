# Workbench Registry

## Canonical sources

- `journeys.json` — all 28 journeys, paths, statuses, versions, and entry/exit connections.
- `features.json` — every tracked capability and its journey owners.
- `edge-cases.json` — recovery and failure coverage.
- `progress.json` — current counts and active journey.
- `map-fingerprint.json` — generated proof that the visual control surfaces match the registries.

`state-snapshot.json` is only a compact current index. It does not duplicate the full registry.

## Required command

```bash
npm run gate
```

This regenerates and validates:

- `journey-map.html`
- `feature-coverage.html`
- `edge-case-ledger.html`

Do not hand-edit generated control surfaces.
