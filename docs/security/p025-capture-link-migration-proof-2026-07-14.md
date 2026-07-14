# P-025 Capture-Link Migration Proof

Date: 2026-07-14
Change: `p025-capture-link-migration-repair-v1`
Environment: disposable local PostgreSQL 16 container
Production data or services used: none

## Verdict

**PASS for the bounded migration and minimum pot-membership RLS repair.**

The repository migration chain now applies in filename order through:

```text
20260714170000_capture_link_tokens_repair.sql
```

`capture_link_tokens.pot_id` is UUID-backed, references `pots.id`, and no
policy references the nonexistent `pots.members` field. This does not make a
capture token payment authority or complete the guest-capability contract.

## Migration Strategy

The local Supabase migration ledger did not contain the defective capture-link
migration and had no `capture_link_tokens` table. The source migration is
therefore corrected for clean installs.

Because no claim is made about every external environment, the separate
forward migration also converges an already-existing legacy table:

- valid text UUID references convert to UUID without row deletion;
- malformed values stop with an explicit diagnostic;
- the failed transaction preserves the malformed row for operator repair;
- policies and grants are recreated idempotently.

No production or shared local Supabase database was mutated by this proof.

## Access Boundary

- Pot creators and active members can insert and read their pot's token rows.
- New authenticated inserts record `created_by = auth.uid()`.
- Pending, removed, unrelated, and anonymous actors cannot insert or read.
- Authenticated users cannot enumerate unrelated token rows.
- Authenticated updates are limited to `consumed_at`.
- An unrelated authenticated user cannot consume another pot's token.
- Token payload mutation is denied through the authenticated table grant.

An active member can still consume a token for their pot. That is only the
minimum pot boundary; it is not proof that the member owns a payment action.

## Repeatable Proof

```bash
cd backend
P025_ALLOW_DATABASE_RESET=true \
P025_DATABASE_URL='postgresql://.../chopdot_p025_capture?schema=public' \
npm run test:p025:migrated-database
```

The harness refuses non-local databases or names without the
`chopdot_p025_` prefix.

## Results

```json
{
  "cleanMigrationChainPassed": true,
  "validLegacyCaptureRowPreserved": true,
  "malformedLegacyCaptureRowFailedWithoutDeletion": true,
  "capturePotIdUsesUuidForeignKey": true,
  "creatorAndActiveMemberAccessPassed": true,
  "pendingRemovedUnrelatedAndAnonDenied": true,
  "unrelatedTokenEnumerationBlocked": true,
  "tokenPayloadMutationBlocked": true,
  "settlementActorAndReplayProofPassed": true
}
```

## Remaining Security Boundary

P-025 remains incomplete. In particular:

- confirm-link possession is not receiver authentication;
- guest actions are not scoped, revocable capabilities;
- financial table policies still allow overly broad direct client mutation;
- settlement, payment, event, and closeout writes are not one atomic command;
- durable payment intents and evidence matching are absent;
- cross-host state is not yet one backend-owned truth.

ChopDot must not expose this database as production shared-money authority yet.

## Exactly One Next Change

`p025-financial-table-rls-authority-lockdown-v1`

Inventory browser writes to settlement, payment, event, and closeout tables;
then revoke direct client mutation that bypasses payer/receiver command checks.
Do not combine that change with guest capabilities, atomic commands, or payment
intent design.

## Verification And Documentation Impact

| Check | Result | Meaning |
| --- | --- | --- |
| `npm run test:p025:migrated-database` | PASS | Full chain, conversion, RLS, actor, and replay proof pass on PostgreSQL. |
| `backend: npm test` | PASS, 46 tests | Protected route and middleware behavior remains covered. |
| `backend: npm run type-check` | PASS | Migration and actor harnesses typecheck. |
| `backend: npm run build` | PASS | The protected API compiles. |
| `npm test` | PASS, 22 tests | Existing root unit tests pass. |
| Runtime `x-user-id` scan | PASS | No normal runtime authority reads remain. |
| `git diff --check` | PASS | No whitespace errors. |
| `npm run build` | BASELINE FAIL | The isolated base retains unrelated `.dot`, capture, missing-module, and application-type errors. |

The repository-wide build failure is not waived and prevents a release-ready
claim. It is outside this migration and RLS change's files.

P-025 evidence, the security crosswalk, backend guidance, and predecessor
reports are updated. No user-facing UI changed, so screenshots are not required.

This isolated baseline contains older product files but no P-025 card and no
`product:validate` or `product:checkpoint` package commands. No checkpoint was
fabricated against that stale view or the concurrently dirty shared root.
