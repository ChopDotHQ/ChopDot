# P-025 Security Foundation Integration Manifest

Date: 2026-07-14
Change: `p025-security-foundation-integration-checkpoint-v1`
Branch: `codex/p025-settlement-state-alignment`
Base commit: `12e3df1e85bcf0029d42c38f2127f01dc9f3ee55`

## Outcome

**Needs integration.**

The P-025 security foundation is ready for a local checkpoint on its owned
branch. It is not merged into the canonical root because that root contains
concurrent uncommitted product, `.dot`, portable-shell, backend, and cockpit
changes. No shared-root file is overwritten by this checkpoint.

## Product Gate

User journey: "I am operating ChopDot across several hosts, so I need every
security boundary to come from one reviewable source before real people or
agents move money."

One next action: `Integrate security boundary`

Score: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Included File Classification

### Server-derived actor foundation

- `backend/package-lock.json`
- `backend/prisma/schema.prisma`
- `backend/src/__tests__/actor-boundary.routes.test.ts`
- `backend/src/__tests__/auth.middleware.test.ts`
- `backend/src/__tests__/settlements.routes.test.ts`
- `backend/src/__tests__/users.routes.test.ts`
- `backend/src/auth/authenticate.ts`
- `backend/src/auth/authorizePotMember.ts`
- `backend/src/index.ts`
- `backend/src/lib/prisma.ts`
- `backend/src/routes/ai.ts`
- `backend/src/routes/settlements.ts`
- `backend/src/routes/users.ts`
- `src/hooks/usePendingActions.ts`
- `src/services/data/repositories/SettlementRepository.ts`
- `src/utils/apiAuthHeaders.ts`
- `docs/security/universal-chop-core-security-architecture.md`

### Settlement and capture-link migration hardening

- `backend/README.md`
- `backend/package.json`
- `backend/src/integration/p025-actor-boundary.database.ts`
- `backend/src/integration/p025-migration-chain.database.ts`
- `supabase/migrations/20260617120000_capture_link_tokens.sql`
- `supabase/migrations/20260714160000_settlement_status_alignment.sql`
- `supabase/migrations/20260714170000_capture_link_tokens_repair.sql`

### Decision and executable evidence

- `docs/adr/0004-server-derived-payment-actor.md`
- `docs/security/p025-capture-link-migration-proof-2026-07-14.md`
- `docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md`
- `docs/security/p025-security-foundation-crosswalk-2026-07-14.md`
- `docs/security/p025-settlement-state-migration-proof-2026-07-14.md`
- `docs/superpowers/plans/2026-07-14-p025-capture-link-migration-repair.md`
- `docs/superpowers/plans/2026-07-14-p025-settlement-state-migration-alignment.md`
- `docs/security/p025-security-foundation-integration-manifest-2026-07-14.md`

No unrelated UI, `.dot`, portable-shell, pilot, wallet, deployment, environment,
or generated build file is included.

## Shared-Root Compatibility

Exact SHA-256 comparisons before staging found:

- 17 P-025 foundation files identical to the shared root;
- 7 paths with later additive P-025 proof or migration changes;
- 7 P-025 migration/proof files absent from the shared root before this manifest;
- this manifest is also absent from the shared root.

The differing paths are:

- `backend/README.md`
- `backend/package.json`
- `backend/src/integration/p025-actor-boundary.database.ts`
- `docs/adr/0004-server-derived-payment-actor.md`
- `docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md`
- `docs/security/p025-security-foundation-crosswalk-2026-07-14.md`
- `supabase/migrations/20260617120000_capture_link_tokens.sql`

These differences are attributable to replay proof, settlement-state alignment,
capture-link migration repair, and updated evidence. They must still be merged
against the eventual committed root rather than copied over unreviewed.

## Verification Matrix

| Check | Result |
| --- | --- |
| Disposable PostgreSQL full migration, conversion, RLS, actor, and replay proof | PASS |
| Backend tests | PASS, 46/46 |
| Backend typecheck | PASS |
| Backend build | PASS |
| Root tests | PASS, 22/22 |
| Runtime `x-user-id` authority scan | PASS, no normal-runtime matches |
| Secret and prohibited-artifact scan | PASS |
| `git diff --check` | PASS |
| Root build | BASELINE FAIL outside P-025 files |

The root build failure consists of pre-existing `.dot`, capture, removed test
module, and application-type drift. It is not waived and prevents any
release-ready claim.

## Remaining P-025 Risks

- direct client mutation of financial tables;
- guest links are not fully scoped and revocable capabilities;
- settlement, payment, event, and closeout writes are not atomic;
- durable payment intents and evidence matching are absent;
- cross-host truth is not yet backend-owned end to end;
- dependency audit findings remain untriaged.

## Non-Destructive Reconciliation Procedure

1. Let the shared-root owners preserve or commit their current work first.
2. Create a clean integration branch from that committed canonical tip.
3. Cherry-pick the P-025 checkpoint SHA reported in the execution closeout.
4. Resolve only the seven documented overlapping paths; do not replace them wholesale.
5. Update P-025 in `product/cards.md` with the three proof reports and migration harness.
6. Set its next action to: `Inventory and close direct financial-table mutation paths.`
7. Run `npm run product:refresh`, `npm run product:validate`, and the complete
   verification matrix from the integrated branch.
8. Record a P-025 product checkpoint only after those integrated checks pass.

## Exactly One Next Action

Reconcile this local checkpoint onto a clean committed canonical tip. Do not
start `p025-financial-table-rls-authority-lockdown-v1` until that integration is
verified.
