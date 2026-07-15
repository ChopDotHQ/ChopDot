---
title: Spend Capture Journey
status: draft
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - src/components/screens/SpendCardScreen.tsx
  - src/services/capture/types.ts
related_docs:
  - product/journey-reviews/J-000-dinner-split-pay-moment-capture.md
  - product/journey-reviews/J-009-receipt-capture-without-manual-first-entry.md
tags:
  - journeys
  - spend-capture
---

# Spend Capture Journey

Spend capture should reduce typing at the payment moment.

## Rule

Capture starts from photo, link, import, or payment context. Manual entry is a fallback or correction path, not the default.

## Source Truth

- `product/journey-reviews/J-000-dinner-split-pay-moment-capture.md`
- `product/journey-reviews/J-009-receipt-capture-without-manual-first-entry.md`
