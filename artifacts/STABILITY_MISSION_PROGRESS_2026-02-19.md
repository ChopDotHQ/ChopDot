# ChopDot Stability Mission Progress (2026-02-19)

## Branch
- Branch: `12-23-feat_add_usdc_implementation`
- New commits added today (clean, scoped):
  - `4abf47a` - fix(data): skip remote writes for local-only pot ids
  - `335a302` - fix(invites): harden auth user resolution during session warmup
  - `ad2b2e7` - fix(chain): isolate tx status callback failures from settlement flow
  - `be67c44` - fix(invites): reuse pending invite tokens instead of duplicate failures

## What This Fixed

### 1) Local-only pot IDs no longer trigger noisy service write errors
- File: `src/hooks/useBusinessActions.ts`
- Before: Local/temp pot IDs in Supabase mode could throw `Pot with id "-4" not found` and show confusing fallback toasts.
- After: Remote writes are skipped for local-only IDs; not-found messaging is clearer (`remote pot unavailable`).

### 2) Invite creation is resilient during auth/session warmup
- File: `src/services/InviteService.ts`
- Before: transient auth timing caused `Must be logged in to invite` despite active sign-in flow.
- After: service resolves session user first, then getUser fallback, with clearer initialization message.

### 3) Duplicate invites do not block user flow
- File: `src/services/InviteService.ts`
- Before: existing pending invite produced a hard duplicate error.
- After: existing token is reused (`alreadyExists: true`) so share/resend keeps working.

### 4) Tx status callback exceptions no longer break settlement flow
- Files:
  - `src/services/chain/polkadot.ts`
  - `src/services/chain/sim.ts`
- Before: callback exceptions in tx lifecycle updates could bubble into settlement failures.
- After: lifecycle status emission is wrapped with safe error boundaries and logged without breaking tx flow.

## Verification Evidence

### Automated checks
- `npm run type-check` -> PASS
- `npx vitest run` -> PASS (`20 files`, `242 tests`)
- `npm run build` -> PASS

### Flow smoke checks
- `node scripts/smoke-five-flows.cjs` -> PASS (`PASS=5 FAIL=0`)
- `node scripts/smoke-guest-invite-guard.cjs` -> PASS
- 5x repeated full smoke loop -> PASS each run (no reproduced DOT settlement crash)

## New/Updated Tests
- Added: `src/services/InviteService.test.ts`
  - session fallback in createInvite
  - clear auth-init error behavior
  - pending invite loading via session email
  - duplicate invite token reuse
- Updated: `src/services/chain/sim.test.ts`
  - tx remains successful even if `onStatus` callback throws

## Remaining High-Risk Areas (Still Worth Tackling)
1. `src/components/AppRouter.tsx` remains high-coupling and hard to reason about quickly.
2. Some critical screens still combine mock and production paths (UI behavior is stable but architecture is mixed).
3. Very large production chunks remain; not breaking, but release risk/perf can improve with targeted split strategy.

