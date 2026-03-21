# ADR-001: Modularity Refactor

## Status

Accepted (March 2026)

## Context

Ten files exceeded 500 lines, making the codebase hard to test, review, and maintain. The largest offenders were:

| File | Lines |
|------|-------|
| `AppRouter.tsx` | 1134 |
| `SupabaseSource.ts` | 986 |
| `SignInScreen.tsx` | 906 |
| `PotHome.tsx` | 917 |
| `YouTab.tsx` | 868 |
| `AccountMenu.tsx` | 744 |
| `App.tsx` | 688 |
| `AuthContext.tsx` | 692 |
| `SignInComponents.tsx` | 545 |

These files combined UI, state logic, and orchestration, leading to tight coupling and circular dependency risks.

## Decision

Adopt a **bottom-up decomposition approach**: extract leaf dependencies first, then the auth hub, then top-level orchestrators.

### Patterns Applied

1. **Custom hooks for state logic** — e.g. `useOverlayHandlers`, `useOverlayState`, `usePotDataMerge`, `usePotSummary`, `useCheckpointState`, `useSignInHandlers`, `useLoginState`, `useEmailAuth`
2. **Single-responsibility components** — e.g. `ChopDotMark`, `WalletOption`, `MobileWalletConnectPanel`, `DevToggles`, `ProfileCard`, `GeneralSettingsSection`
3. **Data-layer facade pattern** — `SupabaseSource.ts` delegates to `SupabasePotSource.ts` and `SupabaseExpenseSource.ts`
4. **Shared types to break circular deps** — `src/types/auth.ts` and `src/routing/screen-props/types.ts`
5. **Barrel re-exports** — `SignInComponents.tsx` became a barrel, preserving backward compatibility
6. **Prop factory functions** — `src/routing/screen-props/` contains render functions per screen, invoked by a thin `AppRouter` dispatcher

### Results

| File | Before | After |
|------|--------|-------|
| `App.tsx` | 688 | 439 |
| `AppRouter.tsx` | 1134 | 37 |
| `AuthContext.tsx` | 692 | 254 |
| `SignInScreen.tsx` | 906 | 340 |
| `SignInComponents.tsx` | 545 | 5 (barrel) |
| `PotHome.tsx` | 917 | 355 |
| `YouTab.tsx` | 868 | reduced via section components |
| `AccountMenu.tsx` | 744 | reduced via hooks + modals |
| `SupabaseSource.ts` | 986 | reduced via entity-split sub-sources |

## Consequences

**Positive**

- Improved testability — hooks can be unit-tested in isolation
- Faster code review — smaller, focused files
- Clearer ownership boundaries
- Zero circular dependencies (verified via madge)

**Negative**

- More files to navigate; mitigated by consistent naming and barrel re-exports

**Neutral**

- Some types duplicated across interfaces for locality; could be consolidated later
