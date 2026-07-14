# P-025 Settlement-State Migration Alignment

Date: 2026-07-14
Change: `p025-settlement-state-migration-alignment-v1`
Owner: Codex, isolated worktree `codex/p025-settlement-state-alignment`

## Product Gate

User journey: "I am Leo, the authenticated payer, I need to mark my exact
obligation paid, so Mina can confirm receipt while Nina's unrelated obligation
remains open."

One next action: `Mark paid`

Score: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Current Truth To Preserve

- Express derives the actor from a verified Supabase bearer token.
- Only active members can use pot-scoped commands.
- Only the payer can mark paid and only the receiver can confirm.
- `paid` is distinct from `confirmed`.
- Rejected commands have no settlement, payment, event, or closeout effects.
- The Prisma-projected database proof passes.
- The migration-owned status constraint currently rejects `paid`.

## Scope In

- Define the current Express vocabulary as `pending`, `paid`, and `confirmed`.
- Keep legacy database values readable without rewriting historical rows.
- Add one forward-only migration and a repeatable migration-backed proof.
- Update P-025 evidence after executable verification.

## Scope Out

- Capture-link schema repair.
- RLS redesign, atomic commands, payment intents, and guest capabilities.
- UI, portable-shell, Telegram, `.dot`, deployment, or wallet activity.

## Implementation

1. Add a new migration that replaces `settlements_status_check`.
2. Permit the canonical runtime values and the existing legacy values.
3. Do not update settlement rows during migration.
4. Apply the clean migration chain through settlement idempotency, then apply
   the new migration directly because the later capture-link migration remains
   independently broken.
5. Run the real HTTP actor-boundary proof against that migrated database.
6. Report the later capture-link failure separately and stop there.

## Acceptance

```text
GIVEN the applicable repository migrations are applied to a clean database
AND Leo is the authenticated payer for a pending settlement
WHEN Leo marks paid
THEN the database accepts paid
AND Mina alone can confirm received
AND Nina's unrelated share remains pending.
```

## Documentation Impact

Update the P-025 database proof, security crosswalk, actor ADR when necessary,
and product-card evidence. No normal UI changes or screenshots are required.
