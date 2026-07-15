# ChopDot Backend API

Express and Prisma API for ChopDot's current settlement reference path.

This backend is **not yet production-ready shared-money authority**. It now has
a server-derived authenticated actor boundary, but P-025 still tracks database
policy, state-migration, command-atomicity, guest-capability, payment-intent,
and canonical cross-host state work.

## Protected Routes

- `GET /api/pots/:potId/settlements`
- `POST /api/pots/:potId/settlements`
- `PATCH /api/pots/:potId/settlements/:id/pay`
- `PATCH /api/pots/:potId/settlements/:id/confirm`
- `GET /api/pots/:potId/events`
- `POST /api/pots/:potId/ai/parse-receipt`
- `GET /api/users/:userId/pending-actions`

All routes above require:

```http
Authorization: Bearer <supabase-access-token>
```

The server verifies the access token with Supabase Auth and resolves the user
to an active pot member. `x-user-id`, URL parameters, request bodies, and host
launch data are not identity authority.

## Environment

Copy the secret-free template and supply values locally or through the deploy
environment:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`: PostgreSQL connection used by Prisma.
- `SUPABASE_URL`: Supabase project URL used for server-side token verification.
- `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`: public project key sent to
  Supabase Auth alongside the user's bearer token. Never use a service-role key
  in the browser.

Optional:

- `PORT`: API port, default `3001`.
- `NODE_ENV`: `development`, `test`, or `production`.
- `CORS_ORIGIN`: comma-separated allowed origins. Defaults only to local Vite
  development origins.
- `LLM_API_KEY`: reserved for the unfinished receipt-parser integration.

If Auth configuration is missing or unavailable, protected routes fail closed
with `503`. A missing or invalid user access token returns `401`.

## Development

```bash
npm install
npm run db:generate
npm run dev
```

Server health is available at `GET /health`. The health route does not prove
database, Auth, or migration readiness.

## Verification

```bash
npm run type-check
npm test
npm run build
```

The unit and HTTP integration suite mocks Prisma. The P-025 database harness
also runs against disposable PostgreSQL. It currently passes against the
Prisma-projected schema but fails against the migration-owned schema because
the settlement status constraint rejects `paid`. See the database proof report
before treating these routes as deployable shared-money authority.

## Security Boundary

- Missing or invalid bearer token: `401`, no route mutation.
- Missing Auth configuration or unavailable Auth service: `503`, fail closed.
- Inactive or unrelated pot member: `403`.
- Only the bound payer can mark paid.
- Only the bound receiver can confirm received.
- Pending actions are self-only.
- Audit actors come from the verified token.

See:

- `docs/adr/0004-server-derived-payment-actor.md`
- `docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md`
- `docs/security/p025-security-foundation-crosswalk-2026-07-14.md`
- `docs/security/universal-chop-core-security-architecture.md`
