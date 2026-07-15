---
title: Server-Derived Payment Actor Boundary
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: quarterly
source_of_truth: true
related_code:
  - backend/src/auth/authenticate.ts
  - backend/src/auth/authorizePotMember.ts
  - backend/src/routes/settlements.ts
  - backend/src/routes/users.ts
  - backend/src/routes/ai.ts
  - src/utils/apiAuthHeaders.ts
related_docs:
  - docs/security/p025-security-foundation-crosswalk-2026-07-14.md
  - docs/security/universal-chop-core-security-architecture.md
  - docs/wiki/03-state-models/payment-state.md
tags:
  - adr
  - security
  - authentication
  - payment
---

# ADR 0004: Server-Derived Payment Actor Boundary

## Decision

Every protected ChopDot API route derives its actor from a server-verified
Supabase bearer access token. Client headers, request bodies, path parameters,
URLs, wallet events, and host launch data are inputs only and never select the
authenticated actor.

The API resolves the verified user to an active pot member before reading or
changing pot-scoped data. Money-state commands then enforce the participant
role stored on the settlement:

- only the bound payer may mark a payment paid;
- only the bound receiver may confirm receipt;
- only the authenticated user may read their pending actions;
- only an owner or the bound receiver may propose the current settlement shape;
- audit events use the verified user id.

The legacy `x-user-id` header has no authority. Supplying or forging it cannot
change the principal or command outcome.

## Context

The previous Express routes accepted a caller-controlled `x-user-id` header for
event attribution, allowed requests without identity, and did not compare the
caller with the payer or receiver stored on a settlement. That contradicted
P-025 and made every later payment-intent, evidence, guest-link, and host
control bypassable at the first network boundary.

ChopDot has several host surfaces. A web browser, Telegram Mini App, `.dot`
host, or future adapter may help establish context, but no host is trusted to
declare who performed a money-state action.

## Consequences

- Browser API calls must send the current Supabase access token as
  `Authorization: Bearer <token>`.
- Missing or invalid authentication fails closed with `401`; missing auth
  configuration or an unavailable verification service fails closed with
  `503`.
- Active membership and payer/receiver authorization failures return `403`
  before any settlement, payment, event, or closeout mutation.
- Local guest/prototype flows without a Supabase session cannot use protected
  shared-state routes. They remain local proof surfaces until an explicit guest
  capability design is implemented.
- Token verification currently calls the Supabase Auth user endpoint on each
  protected request. A future cached JWKS verifier may reduce latency, but it
  must preserve server verification and revocation/expiry behavior.
- This decision does not make the full P-025 architecture complete. Direct
  database policies, guest links, command atomicity, state vocabulary,
  payment-intent persistence, and one canonical cross-host state remain open.

## Verification

- `backend/src/__tests__/auth.middleware.test.ts`
- `backend/src/__tests__/actor-boundary.routes.test.ts`
- `backend/src/__tests__/settlements.routes.test.ts`
- `backend/src/__tests__/users.routes.test.ts`
- runtime scan contains no non-test `x-user-id` authority reads
- backend typecheck and test suite pass

Database-backed authorization proof passes against PostgreSQL projected from
the Prisma schema. It fails against the repository migration-owned schema
because the settlement constraint rejects the route's `paid` state. See
`docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md`.
