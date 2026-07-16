# P-025 Financial Table Authority Lockdown Proof

Date: 2026-07-16

Change: `p025-financial-table-rls-authority-lockdown-v1`

Card: `P-025`
Status: **fixed for settlement, payment, event, and closeout direct-client mutation**

## Finding

The authenticated browser role had `INSERT`, `UPDATE`, and `DELETE` grants on
`public.settlements` and `public.payments`. Membership-only RLS policies allowed
any active group member to use those grants. A member could therefore bypass
the backend payer/receiver checks and directly change shared payment truth.

`public.pot_events` had a member insert policy but no authenticated table grant
in the reproduced migration chain. It was not directly writable, but the
dormant insert policy would become active if a later grant were added.

## Red Proof

The dedicated regression test was run against the unmodified canonical
migration chain. An active authenticated member successfully changed a
settlement from `pending` to `confirmed`, so the test failed with:

```text
AssertionError: expected PostgreSQL to deny the direct client write
```

The reproduced privilege map also showed authenticated
`DELETE,INSERT,SELECT,UPDATE` grants on both settlements and payments.

## Patch

Forward migration
`supabase/migrations/20260716130000_financial_table_authority_lockdown.sql`:

- preserves authenticated `SELECT` on settlements and payments;
- revokes authenticated mutation privileges on settlements, payments, and pot
  events;
- drops member mutation policies on those tables;
- blocks authenticated clients from creating or transitioning a pot with a
  non-active backend-owned status while preserving ordinary pot edits;
- preserves service/backend database authority;
- is safe to re-run.

The browser write inventory found direct Supabase writes for groups, expenses,
and expense splits, but none for settlements, payments, or pot events. Those
capture and group-management paths were intentionally left unchanged.

## Green Proof

The clean 16-migration chain and the repeated authority migration passed on a
disposable local PostgreSQL 16 database. The focused proof established:

- member settlement and payment reads remain available;
- no authenticated mutation privilege remains on the three authority tables;
- no mutation policy remains on the three authority tables;
- direct settlement update is denied with PostgreSQL `42501`;
- direct payment insertion is denied with PostgreSQL `42501`;
- direct event insertion is denied with PostgreSQL `42501`;
- ordinary authenticated pot editing still works;
- direct pot closeout and creation of a pre-closed pot are denied with
  PostgreSQL `42501`;
- rejected writes leave settlement, payment, and event state unchanged.

The existing backend database proof then established:

- inactive, unrelated, and wrong-role actors are rejected;
- only the payer marks paid;
- only the receiver confirms;
- replay creates no duplicate payment or event effects;
- unrelated shares remain open;
- audit actors match verified users.
- the backend closes the group only after the final payer marks paid and the
  receiver confirms, proving the status guard does not block server authority.

## Commands

```bash
cd backend
npm run type-check
P025_DATABASE_URL='postgresql://.../chopdot_p025_financial_rls' \
DATABASE_URL="$P025_DATABASE_URL" \
P025_ALLOW_DATABASE_RESET=true \
npm run test:p025:migrated-database
```

The disposable database used no production data, credentials, or services.

## Repository Verification

All executable checks used Node.js `v22.23.1`, matching the repository engine.

| Check | Result |
| --- | --- |
| Frontend unit tests | PASS, 31/31 |
| Frontend type-check and lint | PASS |
| Frontend production build | PASS with non-secret Supabase placeholders |
| Backend unit tests | PASS, 46/46 |
| Backend type-check and build | PASS |
| Clean migration chain | PASS, 16 migrations |
| Migration/data/RLS checks | PASS, 11/11 |
| Financial authority checks | PASS, 10/10 |
| Backend actor/role/replay/closeout checks | PASS, 10/10 |
| Product cockpit refresh | PASS, 0 errors and 10 pre-existing warnings |
| AI product-manager validation | PASS with the existing SmartScan quarantine warning |

Known baseline debt was not changed or hidden:

- wiki validation still reports the 27 missing root-local, portable-worktree,
  or Cursor-rule references recorded by the canonical baseline;
- journey review validation still reports absent historical screenshot packets;
- production dependency audit remains at 2 high advisories in the root and 5
  moderate plus 2 high advisories in the backend;
- no dependency changed in this patch.

## Scope Boundary

This proof does not claim P-025 is complete. Remaining material risks include:

- multi-step settlement/payment/event/closeout writes are not atomic;
- durable backend-owned payment intents are incomplete;
- guest capabilities and capture-token authority remain incomplete;
- exception states are incomplete;
- browser, API, Telegram, and host surfaces do not yet share one canonical
  state authority.

## Documentation Impact

Updated:

- the P-025 crosswalk;
- the Universal Chop Core implementation status;
- ADR-0004 consequences and verification;
- the payment-state source wiki page;
- P-025 card evidence and next action.

No normal user-facing UI or language changed, so no screenshot proof was
required.
