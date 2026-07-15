---
title: Payment State Model
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: monthly
source_of_truth: false
related_code:
  - src/services/capture/types.ts
  - src/utils/confirmedLegAdjustments.ts
  - backend/src/auth/authenticate.ts
  - backend/src/auth/authorizePotMember.ts
  - backend/src/routes/settlements.ts
related_docs:
  - product/product-principles.md
  - docs/wiki/02-user-journeys/settlement.md
  - docs/adr/0004-server-derived-payment-actor.md
  - docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md
  - docs/security/p025-security-foundation-crosswalk-2026-07-14.md
tags:
  - state-model
  - payment
---

# Payment State Model

Payment states must stay explicit.

## Product Law

Paid does not automatically mean confirmed. Confirmed does not automatically close unrelated shares.

## Authority Boundary

- The API derives the actor from a server-verified bearer access token.
- Client identity headers, paths, URLs, host launch data, and wallet events do
  not select the actor.
- The verified user must be an active member of the pot.
- Only the bound payer may mark paid.
- Only the bound receiver may confirm received.
- Rejected commands must not change settlement, payment, event, or closeout
  state.

This is the current Express boundary, not proof that every ChopDot state store
or direct database path has been unified under one authority.

The database proof currently passes against the Prisma-projected schema and
fails against the migration-owned schema because its status constraint does not
allow `paid` or `confirmed`.

## User Language

- Mark paid.
- Confirm received.
- Waiting on.
- Ready to close.

## Source Truth

- `product/product-principles.md`
- `src/services/capture/types.ts`
- `docs/adr/0004-server-derived-payment-actor.md`
