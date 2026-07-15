---
title: Evidence Levels
status: current
owner: Dev
last_reviewed: 2026-07-05
review_frequency: monthly
source_of_truth: false
related_code:
  - scripts/chopdot-product-cockpit.mjs
related_docs:
  - product/product-principles.md
  - product/generated/readiness-scorecard.md
tags:
  - product-truth
  - evidence
---

# Evidence Levels

Keep product claims honest.

## Levels

```text
local-code
browser-agent
human-reviewed
testnet-payment
production-payment
blocked-live
```

## Rule

Do not promote a journey beyond its evidence. Browser-agent evidence supports review; it does not replace operator approval.

## Source Truth

- `product/product-principles.md`
- `product/generated/readiness-scorecard.md`

