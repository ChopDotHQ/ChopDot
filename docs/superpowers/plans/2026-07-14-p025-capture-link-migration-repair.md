# P-025 Capture-Link Migration Repair

Date: 2026-07-14
Change: `p025-capture-link-migration-repair-v1`
Owner: Codex, isolated worktree `codex/p025-settlement-state-alignment`

## Product Gate

User journey: "I am an authenticated group member, I need to open or create a
group-scoped link, so I can continue the correct group-money action without
gaining access to another group."

One next action: `Open link`

Score: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Current Truth To Preserve

- Pot identifiers and pot-member references are UUIDs.
- Pot creators and active pot members can access their pot.
- Token possession is not payment actor authority.
- Protected settlement commands remain payer-only and receiver-only.
- The settlement lifecycle remains `pending -> paid -> confirmed`.
- P-025 remains incomplete after this migration repair.

## Scope In

- Correct the defective clean-install capture-link migration.
- Add a forward convergence migration for an already-existing legacy table.
- Convert valid text pot identifiers to UUID without deleting rows.
- Fail explicitly on malformed historical pot identifiers.
- Replace `pots.members` policy references with creator-or-active-member checks.
- Remove unrestricted authenticated token-table reads.
- Add migration and RLS proof against disposable PostgreSQL.
- Update bounded P-025 evidence.

## Scope Out

- Anonymous or guest capabilities.
- Token action scopes, revocation, payment intents, and evidence matching.
- Settlement atomicity or general RLS redesign.
- Capture UI, Telegram, `.dot`, wallet, deployment, or pilot activity.
- Production database mutation.

## Implementation

1. Repair `20260617120000_capture_link_tokens.sql` for clean installs.
2. Add an idempotent forward repair migration for existing table shapes.
3. Extend the disposable migration harness through both capture migrations.
4. Prove creator/member success and unrelated/pending/removed/anonymous denial.
5. Prove valid legacy-row preservation and malformed-row safe failure.
6. Rerun the existing settlement actor and replay proof.
7. Record verification and remaining security limits without claiming launch readiness.

## Stop Conditions

- Do not retain `using (true)` to make a link lookup work.
- Do not invent guest access or treat token possession as receiver identity.
- Do not silently delete or rewrite malformed historical rows.
- Do not mutate production or the dirty shared root.
- Stop as blocked if safe conversion or membership semantics cannot be proven.

## Documentation Impact

Update the P-025 capture-link proof, security crosswalk, ADR/security guidance,
and backend verification instructions. No user-facing UI changes are planned,
so screenshots are not required.
