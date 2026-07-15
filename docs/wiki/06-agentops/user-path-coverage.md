---
title: User Path Coverage
status: current
owner: Dev
last_reviewed: 2026-07-15
review_frequency: weekly
source_of_truth: false
related_code:
  - scripts/generate-user-path-coverage.mjs
  - scripts/chopdot-product-cockpit.mjs
  - package.json
related_docs:
  - product/user-path-map.md
  - product/user-path-map.mmd
  - product/cards.md
  - product/decision-contracts.md
tags:
  - agentops
  - product-cockpit
  - user-path-map
---

# User Path Coverage

ChopDot uses `product/user-path-map.md` as the living source for user paths,
dead ends, surface coverage, and proof status.

This is an internal product/operator artifact. It is not normal-user UI.

## Source files

- `product/user-path-map.md`: source path map, dead-end register, actor maps,
  and surface matrix.
- `product/user-path-map.mmd`: lightweight Mermaid graph source.
- `scripts/generate-user-path-coverage.mjs`: deterministic generator.

## Generated files

- `product/generated/user-path-coverage.json`
- `product/generated/user-path-coverage.md`
- `product/generated/user-path-coverage.mmd`
- `product/generated/user-path-coverage.html`
- `product/evidence/user-path-coverage-latest.json`

## Commands

```bash
npm run product:path-map
npm run product:refresh
npm run product:validate
```

`npm run product:refresh` now refreshes the user path coverage before the
product cockpit. The cockpit links to `product/generated/user-path-coverage.html`.

`npm run product:path-map -- validate` is read-only. It checks the source map
and fails when generated coverage is missing or stale; use `refresh` to rewrite
the read models deliberately.

## Operating rule

When a path is implemented, do not mark it green manually. Update the path map
with:

- implementation status
- proof status
- surface status
- evidence links
- any dead-end register changes

Then run the product refresh so the coverage view updates from source.

## Review question

The coverage view should answer:

```text
Which user path is most likely to fail next, and what proof is missing?
```
