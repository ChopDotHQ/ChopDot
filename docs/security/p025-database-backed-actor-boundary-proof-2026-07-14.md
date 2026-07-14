# P-025 Database-Backed Actor Boundary Proof

Date: 2026-07-14
Change: `p025-database-backed-actor-boundary-proof-v1`
Card: `P-025`
Environment: disposable local PostgreSQL 16 container
Production data or services used: none

> Status update: the settlement-state mismatch identified by this report is
> resolved by `p025-settlement-state-migration-alignment-v1`. See
> `docs/security/p025-settlement-state-migration-proof-2026-07-14.md`. This
> report remains the immutable pre-fix evidence.
>
> The later capture-link migration failure is resolved by
> `p025-capture-link-migration-repair-v1`. See
> `docs/security/p025-capture-link-migration-proof-2026-07-14.md`. The verdict
> table below remains the original historical result.

## Verdict

| Boundary | Result | Meaning |
| --- | --- | --- |
| Real PostgreSQL projected from `backend/prisma/schema.prisma` | **PASS** | The Express actor boundary works with persisted pot, member, settlement, payment, and event rows. |
| Repository Supabase migration chain | **FAIL** | The migration chain cannot currently produce the schema assumed by the backend routes. |
| Actor proof against migrations through `20260416000001` | **FAIL** | Negative authorization checks pass, but a legitimate payer cannot advance `pending -> paid` because the database constraint rejects `paid`. |

The actor authorization implementation is valid against the backend schema, but
the deployable database contract is not aligned. ChopDot must not treat these
routes as production payment authority until the migration-owned schema passes
the same proof.

## Preserved Product Truth

1. The server derives the actor from the authenticated principal.
2. Only active members can access pot-scoped commands.
3. Only the bound payer can mark paid.
4. Only the bound receiver can confirm received.
5. A rejected command produces no settlement, payment, event, or closeout side effect.
6. Confirming one payment does not close or alter another participant's open share.

## Proof Harness

Executable:

`backend/src/integration/p025-actor-boundary.database.ts`

Command:

```bash
cd backend
P025_DATABASE_URL='postgresql://.../disposable_database?schema=public' \
  npm run test:p025:database
```

The harness creates two pots and five identities, including an inactive member
and a member who belongs only to another pot. It then exercises the real Express
router through Supertest while Prisma reads and mutates real PostgreSQL rows.

## Result 1: Prisma-Projected PostgreSQL

Database setup:

```bash
DATABASE_URL='postgresql://.../chopdot_prisma?schema=public' \
  npx prisma db push --config prisma.config.ts
```

Result: **PASS**

```json
{
  "inactiveMemberRejected": true,
  "crossPotMemberRejected": true,
  "wrongPayerRejectedWithoutSideEffects": true,
  "payerMarkedOwnPayment": true,
  "payerCouldNotConfirm": true,
  "receiverConfirmed": true,
  "unrelatedShareRemainedOpen": true,
  "auditActorsMatchedVerifiedUsers": true
}
```

This proves the route and Prisma authorization behavior against a real database.
It does not prove the repository migration history or deployed RLS contract.

## Result 2: Supabase Migration Chain

The migrations were applied in filename order to a clean second PostgreSQL
database. Only Supabase-provided environment primitives were shimmed:

- roles `anon`, `authenticated`, and `service_role`;
- `auth.users`;
- `auth.uid()` and `auth.jwt()`;
- `extensions.uuid-ossp` and `pgcrypto`.

The chain applied through:

`supabase/migrations/20260416000001_settlement_idempotency.sql`

It then failed at:

`supabase/migrations/20260617120000_capture_link_tokens.sql`

PostgreSQL error:

```text
foreign key constraint "capture_link_tokens_pot_id_fkey" cannot be implemented
Key columns "pot_id" and "id" are of incompatible types: text and uuid.
```

The same migration also defines policies against `p.members`, but the canonical
`public.pots` table has no `members` column. Membership lives in
`public.pot_members`.

## Result 3: Actor Proof Against Migrated Schema

The actor proof was run against the clean migration database after all
migrations through `20260416000001` had applied.

The following checks completed before the positive payer transition:

- inactive member rejected;
- cross-pot member rejected;
- wrong active member rejected;
- wrong-role attempts left the settlement, payment, and event rows unchanged.

The legitimate payer transition then failed:

```text
new row for relation "settlements" violates check constraint
"settlements_status_check"
```

The migration-owned constraint allows:

```text
pending | broadcast | finalised | failed | cancelled
```

The backend route and Prisma contract use:

```text
pending | paid | confirmed
```

The route therefore returned `500` instead of advancing the payer's own
settlement. Confirmation could not be tested on the migration-owned schema
because the legitimate mark-paid transition cannot complete.

## Security Interpretation

The actor check is not bypassed by the database mismatch. The failure is still
launch-blocking because legitimate payment progress cannot complete and runtime
environments can behave differently depending on whether they were created by
Prisma projection or Supabase migrations.

Do not repair this by editing an already-applied historical migration. The next
change must add a forward-only migration and a repeatable migration-backed test.

## Exactly One Next Implementation

Change: `p025-settlement-state-migration-alignment-v1`

Scope:

1. Choose and document one canonical settlement state vocabulary for the
   current Express path.
2. Add a forward-only Supabase migration that replaces the old settlement
   status constraint without rewriting history.
3. Keep `paid` distinct from `confirmed`.
4. Run the same database proof from a clean full migration chain as far as the
   next independently tracked migration defect allows.
5. Do not combine capture-link schema repair, RLS redesign, atomic commands, or
   payment-intent persistence into this change.

Acceptance:

```text
GIVEN the repository migrations have been applied to a clean database
AND Leo is the authenticated payer for a pending settlement
WHEN Leo marks paid
THEN the database accepts the paid state
AND Mina alone can confirm received
AND Nina's unrelated share remains pending.
```

## Documentation Impact

This proof updates P-025 evidence and the security crosswalk. No user-facing UI
or generated product journey changed, so screenshots are not required.
