# P-025 Settlement-State Migration Proof

Date: 2026-07-14
Change: `p025-settlement-state-migration-alignment-v1`
Environment: disposable local PostgreSQL 16 container
Production data or services used: none

## Verdict

**PASS for the bounded settlement-state alignment.**

The migration-owned schema now accepts the canonical Express lifecycle:

```text
pending -> paid -> confirmed
```

The migration retains the legacy values `broadcast`, `finalised`, `failed`,
and `cancelled` so existing rows are not rewritten. Application code must use
only the canonical lifecycle above.

This does not make the full migration chain or P-025 production-ready. The
independently tracked capture-link migration still fails on its `text` to
`uuid` foreign key before later migrations can apply normally.

## Change

Forward-only migration:

`supabase/migrations/20260714160000_settlement_status_alignment.sql`

No historical migration or settlement row was changed.

## Repeatable Proof

Harnesses:

- `backend/src/integration/p025-migration-chain.database.ts`
- `backend/src/integration/p025-actor-boundary.database.ts`

Command:

```bash
cd backend
P025_ALLOW_DATABASE_RESET=true \
P025_DATABASE_URL='postgresql://.../chopdot_p025_status?schema=public' \
npm run test:p025:migrated-database
```

The migration harness refuses to reset non-local databases or databases whose
name does not start with `chopdot_p025_`.

## Migration Results

Applied to a clean database:

- all repository migrations through `20260416000001_settlement_idempotency.sql`;
- `20260714160000_settlement_status_alignment.sql`.

Checks:

- canonical states are accepted by the real database constraint;
- a seeded `broadcast` row remains `broadcast` after migration;
- no historical migration is edited;
- the later capture-link migration is reported separately and rolled back.

The known next migration failure remains:

```text
20260617120000_capture_link_tokens.sql
foreign key constraint "capture_link_tokens_pot_id_fkey" cannot be implemented
```

## Actor Results

The real Express router and Prisma client ran against the migrated database.

```json
{
  "inactiveMemberRejected": true,
  "crossPotMemberRejected": true,
  "wrongPayerRejectedWithoutSideEffects": true,
  "payerMarkedOwnPayment": true,
  "repeatedCommandsCreatedNoDuplicateEffects": true,
  "payerCouldNotConfirm": true,
  "receiverConfirmed": true,
  "unrelatedShareRemainedOpen": true,
  "auditActorsMatchedVerifiedUsers": true
}
```

Leo's legitimate `pending -> paid` transition persisted. Mina alone advanced
`paid -> confirmed`. Nina remained `pending`. Repeating either successful
command returned a conflict and did not add another payment or event.

## Verification Matrix

| Check | Result | Meaning |
| --- | --- | --- |
| `backend: npm test` | PASS, 46 tests | Route and middleware behavior remains covered. |
| `backend: npm run type-check` | PASS | The protected API and proof harness typecheck. |
| `backend: npm run build` | PASS | The protected API compiles. |
| `npm test` | PASS, 22 tests | Existing root unit tests pass on this isolated base. |
| Runtime `x-user-id` scan | PASS | Normal frontend requests use the Supabase bearer token; `x-user-id` remains only in adversarial tests. |
| `npm run build` / `npx tsc --noEmit` | BASELINE FAIL | This isolated base has unrelated pre-existing `.dot`, capture, screen-module, and application-type failures outside the changed files. |
| `git diff --check` | PASS | The change has no whitespace errors. |

The repository-wide build failure is not waived. It prevents a claim that the
entire product branch is release-ready, but it does not invalidate the
database-backed result for this bounded migration and API boundary.

## Security Boundary

This change removes state-vocabulary drift from the normal Express path. The
following launch blockers remain outside this change:

- capture-link schema and capability defects;
- broad direct database mutation authority;
- non-atomic settlement, payment, event, and closeout writes;
- missing durable payment intents and full evidence matching;
- multiple cross-host truth stores.

ChopDot must not expose these routes as production shared-money authority yet.

## Completed Successor Change

`p025-capture-link-migration-repair-v1`

The capture-link schema and migration-chain defect is now repaired and proven.
See `docs/security/p025-capture-link-migration-proof-2026-07-14.md`.

## Documentation Impact

P-025 evidence, the security crosswalk, ADR 0004, and backend verification
guidance are updated. No user-facing UI changed, so screenshots are not needed.

## Cockpit Evidence Status

The isolated base contains older product files but not the current P-025 card
or the `product:validate` and `product:checkpoint` package commands from the
shared root. The shared root is concurrently dirty, so this change deliberately
does not mutate it or synthesize a checkpoint against stale cockpit truth. The
technical evidence is complete in this report; the P-025 product checkpoint
remains a controlled integration step after this branch is reconciled with the
current cockpit source.
