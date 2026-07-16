# P-025 Financial Table RLS Authority Lockdown V1

## Change name

`p025-financial-table-rls-authority-lockdown-v1`

## User journey

I am a group member, I need payment records to change only through approved
payment actions, so the group can trust balances, confirmations, and history.

## One next action

Unchanged. This is an invisible authority-boundary correction; the normal UI
and its primary actions must not change.

## Current truth to preserve

- The backend settlement commands derive the actor from the authenticated
  principal.
- Only a payer can mark their own settlement paid.
- Only the receiver can confirm receipt.
- Replayed commands do not create duplicate payment or event effects.
- Authenticated browser clients still create and edit groups, expenses, and
  expense splits directly through Supabase.
- Group members need read access to their settlement, payment, and event data.
- The P-026 behavior-map lane and the portable-shell Programme A lane are
  independently owned and must not be changed.

## Problem

The browser does not call Supabase directly for settlement, payment, or event
mutations. However, the migration chain grants authenticated clients broad
write authority on settlements and payments and retains membership-only write
policies. A member can therefore bypass the backend payer/receiver command
checks by writing financial truth directly.

## Scope in

- Inventory direct browser writes to financial authority tables.
- Add executable proof for authenticated direct-table mutation attempts.
- Add one forward-only migration that removes client mutation authority from
  settlement and payment tables while preserving member reads.
- Verify event-table mutation remains unavailable to authenticated clients.
- Prevent authenticated clients from directly changing the backend-owned pot
  closeout status while preserving ordinary group edits.
- Preserve backend/service database command behavior.
- Record security and documentation evidence.

## Scope out

- UI, copy, navigation, and screenshots.
- Group and expense capture permissions.
- Broad `pots` update restrictions or closeout redesign.
- Payment-intent, guest-link, wallet, and receipt/OCR work.
- P-026 product behavior maps and portable-shell host proof.
- Dependency upgrades and unrelated refactors.

## Requirements

1. Authenticated browser clients SHALL retain their existing member-scoped
   read access to settlements and payments. Event reads SHALL continue through
   the authenticated backend; this change SHALL NOT add a new direct event
   grant.
2. Authenticated browser clients SHALL NOT insert, update, or delete
   settlements.
3. Authenticated browser clients SHALL NOT insert, update, or delete payments.
4. Authenticated browser clients SHALL NOT insert, update, or delete pot
   events.
5. The backend database authority SHALL continue to mark paid, record one
   payment, append actor-attributed events, confirm receipt, and close a fully
   confirmed group.
6. Existing browser group, expense, and split creation SHALL remain unchanged.
7. Authenticated browser clients SHALL NOT set or change the backend-owned
   `pots.status` closeout field, while ordinary pot edits SHALL continue.
8. The migration SHALL be forward-only, repeatable, and limited to financial
   table grants/policies plus one pot-status guard trigger.
9. Completion SHALL require both negative direct-client proof and positive
   backend command proof on a clean migrated disposable database.

## Scenarios

### Direct settlement mutation is denied

GIVEN Leo is an active member with an open settlement
WHEN Leo uses the authenticated database role to update the settlement status
directly
THEN PostgreSQL denies the write
AND the settlement remains open.

### Direct payment fabrication is denied

GIVEN Leo can read his settlement
WHEN Leo uses the authenticated database role to insert a payment directly
THEN PostgreSQL denies the insert
AND no payment row is created.

### Direct event fabrication is denied

GIVEN Leo is an active group member
WHEN Leo uses the authenticated database role to insert a confirmation event
directly
THEN PostgreSQL denies the insert
AND no event row is created.

### Direct closeout is denied without breaking group edits

GIVEN Mina owns an active group
WHEN Mina edits the group name through the authenticated database role
THEN the edit succeeds
WHEN Mina directly changes the backend-owned group status to completed
THEN PostgreSQL denies the closeout transition
AND the group remains active.

### Legitimate command path still works

GIVEN Leo is the payer and Mina is the receiver
WHEN Leo marks paid through the backend and Mina confirms through the backend
THEN one payment and the correct actor-attributed events are stored
AND unrelated settlements remain open
AND a group closes only when all settlements are confirmed.

## Product gate

- Friction: 3/3 - no user-visible step added.
- Trust: 3/3 - browser membership no longer grants payment-authority writes.
- Clarity: 3/3 - existing user actions remain the only visible commands.
- Language: 1/1 - no user-facing language changes.
- Total: 10/10.
- Decision: PASS.

## Proof

- A dedicated migrated-database financial-authority regression test.
- Existing migrated-database actor-boundary proof.
- Backend unit tests, type checks, production build, and security baseline.
- Grant and policy assertions against the final migration chain.

## Documentation impact

- Update the P-025 security crosswalk and add a dated security proof report.
- Update ADR-0004 only if the authority model changes; no ADR update is
  expected because this enforces the already-decided backend command boundary.
- No user-facing wiki page is required because visible behavior is unchanged.
