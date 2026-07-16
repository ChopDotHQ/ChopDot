---
title: User Path Coverage
status: current
owner: Dev
last_reviewed: 2026-07-15
review_frequency: weekly
source_of_truth: false
related_code:
  - product/path-model.yaml
  - scripts/generate-product-behavior-map.mjs
  - scripts/chopdot-product-cockpit.mjs
  - package.json
related_docs:
  - product/user-path-map.md
  - product/user-path-map.mmd
  - product/generated/product-routing-queue.md
  - product/cards.md
  - product/decision-contracts.md
tags:
  - agentops
  - product-cockpit
  - user-path-map
---

# User Path Coverage

ChopDot uses `product/path-model.yaml` as the structured source for user paths,
dead ends, surface-scoped proof, lane ownership, and unowned-next routing.
`product/user-path-map.md` remains the readable narrative companion.

This is an internal product/operator artifact. It is not normal-user UI.

## Source files

- `product/path-model.yaml`: structured behavior, proof, and routing source.
- `product/user-path-map.md`: readable narrative path map.
- `product/user-path-map.mmd`: lightweight Mermaid graph source.
- `scripts/generate-product-behavior-map.mjs`: deterministic generator and
  lane validation.

## Generated files

- `product/generated/product-behavior-map.json`
- `product/generated/product-behavior-map.md`
- `product/generated/product-routing-queue.json`
- `product/generated/product-routing-queue.md`
- `product/generated/product-behavior-dashboard.html`
- `product/generated/user-path-coverage.json`
- `product/generated/user-path-coverage.md`
- `product/generated/user-path-coverage.mmd`
- `product/generated/user-path-coverage.html`
- `product/evidence/user-path-coverage-latest.json`

## Commands

```bash
npm run product:path-map
npm run product:behavior-map -- validate
npm run product:refresh
npm run product:validate
```

`npm run product:refresh` refreshes the behavior map and routing queue before
the product cockpit.

`npm run product:behavior-map -- validate` is read-only. It checks state,
surface, evidence, blocker, recommendation, and active-lane invariants; use
`refresh` to rewrite read models deliberately.

## Operating rule

When proof or ownership changes, update the structured model with:

- implementation status
- proof status
- surface status
- evidence links
- lane status and active owner
- any dead-end register changes

Then run the product refresh so the coverage view updates from source.

## Review question

The coverage view should answer:

```text
What is proven, active elsewhere, blocked externally, and the single
highest-risk unowned journey?
```
