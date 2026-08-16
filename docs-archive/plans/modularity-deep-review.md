# Modularity Deep Review — ChopDot

> **Handoff note:** This plan lives in the repo so any IDE or session can pick it up. Update the status section below as you complete phases.

---

## Current Status (update as you go)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ Done | Guardrails: `check-file-size.sh`, `modularity.mdc`, `lint:circular` |
| Phase 1 | ✅ Done | Clipboard migrations complete (18+ files). `formatRelativeTime`, `fiatToDot` exist. |
| Phase 2 | ✅ Done | `useSettlementTx`, `useFeeEstimate`, `useDotPrice` + tests |
| Phase 3 | ✅ Done | SettleHome decomposed |
| Phase 4 | ✅ Done | ExpensesTab decomposed |
| Phase 5 | 🔄 Partial | `AppLayout` extracted ✓. Hooks exist. **Remaining:** prop factories, App.tsx shrink, AppRouter thin |
| Phase 6 | ⏳ Pending | SignInScreen + AuthContext |
| Phase 7 | ⏳ Pending | PotHome, YouTab, AccountMenu, SupabaseSource |
| Phase 8 | ⏳ Pending | Circular dep audit, ADRs |

**Verification commands:** `npx tsc --noEmit && npm run build && npx vitest run && npx playwright test`

---

# ChopDot Modularity: Deep Review, Remediation Plan, and Prevention Strategy

---

## Part 1 — Root-Cause Analysis: How Did We Get Here?

The codebase followed a common React anti-pattern: **screens grew into orchestrators**. Each screen started as a simple view, then accumulated:

1. **Data fetching + transformation** — instead of hooks or services
2. **Business logic** — settlement execution, fee estimation, balance checks inline in handlers
3. **Cross-cutting concerns** — clipboard copy, toast feedback, haptic triggers, all duplicated per-file
4. **Layout + routing** — `App.tsx` became a "god component" that wires 40+ actions into `AppRouter`, which itself re-shapes data in every `case` branch

The prior refactoring (extracting `useBusinessActions`, `usePotState`, `useDerivedData`, etc.) was a good start but stopped at the orchestration layer. The screen layer was left untouched, so the debt migrated downward.

**Why it kept happening (the behavioural root cause):**

- No file size limit was enforced in CI or review. A 400-line file grew to 600, then 800, then 1000 — each PR adding 30-50 lines felt reasonable in isolation.
- No dependency direction rule existed. Screens imported chain services directly, so "just add the logic here" was always the path of least resistance.
- Decomposition was seen as a future task ("we'll refactor later") rather than a prerequisite for adding features.
- AI agents, when given a large file and asked to add a feature, default to appending to the existing file. Without explicit rules (`.cursor/rules/modularity.mdc`), they amplify the problem.

---

## Part 1b — Gaps in the Previous Analysis

The original plan missed:

1. **SignInScreen.tsx (907 lines)** and **AuthContext.tsx (693 lines)** — two files the developer actively works in, both over threshold. SignInScreen was partially decomposed (10 auth sub-modules exist under `src/components/auth/`) but the main file is still 907 lines, and `SignInComponents.tsx` is 545 lines — the decomposition just shifted the bulk.
2. **Zero unit test coverage for hooks** — only 1 of 15 hooks has a test (`useClientDevice`). Extracting logic into hooks without tests trades one problem (tangling) for another (untested shared logic).
3. **No migration safety strategy** — "extract X into Y" with no verification gate per phase.
4. **Performance implications** — more hooks can mean more re-renders without proper memoisation.
5. **Data layer migration collision** — `PotHome` is mid-migration between old props and new data layer (`usePot`, `useData`).
6. **Circular dependency risk** — splitting files without structural enforcement can create import cycles.
7. **Process/behavioural prevention** — the root cause is partly tooling (no CI check) and partly habits (no PR size awareness).

These are now addressed in the updated plan below.

---

## Part 2 — The 10 God Files

### 2.1 App.tsx (954 lines) — The Orchestrator

**Problem:** 25+ distinct concerns. Owns tab logic, FAB state, overlay handlers, screen validation, layout, and passes 40+ actions to `AppRouter`.

**Extraction targets:**

| Extract to                 | What moves                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `useTabNavigation` hook    | `getActiveTab`, `handleTabChange`, `shouldShowTabBar`, `canSwipeBack` (lines 223-391)                      |
| `useFabState` hook         | `getFabState` — 86-line callback with complex branching (lines 292-378)                                   |
| `useScreenValidation` hook | Screen guard/redirect effect (lines 520-597)                                                               |
| `AppLayout` component      | `SwipeableScreen` + `BottomTabBar` + `AppOverlays` composition (lines 631-749)                             |
| Collapse overlay handlers  | Move 20 event handlers into `useOverlayState` itself, returning ready-made handlers instead of raw setters |

**Net effect:** `AppContent` shrinks from ~950 to ~250 lines (context setup + hook composition + render).

---

### 2.2 AppRouter.tsx (1134 lines) — The Routing God

**Problem:** 24-case switch with inline data transformation, business logic, and callback wiring in every branch.

**Extraction targets:**

| Extract to                                    | What moves                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Per-screen prop factory                       | Each `case` body becomes a function in `src/routing/screenProps/<screen>.ts` that takes `(data, userState, uiState, actions, flags)` and returns typed props |
| `useScreenProps` hook or `getScreenProps` map | Single dispatch that calls the correct factory, replacing the switch                                                                                         |
| Remove inline computation                     | `potSummaries`, `reMappedSettlements`, `insightsMonthlyData` become `useMemo` in their respective screens                                                    |

**Net effect:** `AppRouter` becomes a thin `<Suspense>` + lazy-component lookup (~100 lines). Each screen owns its own prop preparation.

---

### 2.3 SettleHome.tsx (1051 lines) — Settlement God

**Problem:** Fee estimation, fiat-to-DOT conversion, transaction execution, clipboard copy, and 7 payment method forms all in one component.

**Extraction targets:**

| Extract to                                                             | What moves                                                                                                                     | Lines saved |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `useFeeEstimate(from, to, amountDot, enabled)` hook                    | `estimateNetworkFee` + its effect + state (lines 178-240)                                                                      | ~70         |
| `useDotPrice(enabled)` hook                                            | Price fetch effect (lines 146-159)                                                                                             | ~15         |
| `useFiatToDot(totalFiat, dotPriceUsd)` util                            | Duplicated conversion (lines 192-196, 289-302, 313-316)                                                                        | ~30         |
| `useSettlementTx` hook                                                 | `handleConfirm` / `performSettlement` — wallet check, balance validation, `sendDot`, toasts, `refreshBalance` (lines 257-406) | ~150        |
| `BankForm`, `PayPalForm`, `TWINTForm`, `DotSettlementPanel` components | Method-specific UI (lines 491-1000)                                                                                            | ~500        |
| Shared `copyWithToast` util                                            | 5 duplicated clipboard blocks                                                                                                  | ~50         |

**Net effect:** SettleHome becomes ~250 lines of layout, tab selection, and hook composition.

---

### 2.4 ExpensesTab.tsx (841 lines) — Dashboard God

**Problem:** Balance calc, settlement execution, activity generation, expense grouping, and 5 UI sections in one file.

**Extraction targets:**

| Extract to                                                                               | What moves                                                                                |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `usePotBalances(expenses, members, potId, baseCurrency)` hook                            | Pot schema conversion + `computeBalances` + `suggestSettlements` + budget (lines 147-213) |
| `useActivityFeed(expenses, attestations, contributions)` hook                            | Activity generation + `formatActivityTime` (lines 288-357)                                |
| `useExpenseGroups(expenses)` hook                                                        | Date grouping (lines 264-286)                                                             |
| `useSettlementTx` hook (shared with SettleHome)                                          | `handleSettleConfirm` (lines 359-384)                                                     |
| `HeroDashboard`, `SettlementSuggestions`, `RecentSettlements`, `QuickActions` components | UI sections                                                                               |

**Net effect:** ExpensesTab becomes ~200 lines of hook composition + section layout.

---

### 2.5 PotHome.tsx (940 lines) — Data Merge God

**Extraction targets:**

| Extract to                       | What moves                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `usePotDataMerge` hook           | DL/props merge logic (lines 172-241)                                           |
| `usePotSummary` hook             | `myExpenses`, `totalExpenses`, `myShare`, budget, `quickPicks` (lines 342-412) |
| `useCheckpointState` hook        | Hash comparison, backup CID, checkpoint history (lines 283-402)                |
| `PotCheckpointSection` component | Checkpoint UI (currently disabled, lines 447-579)                              |

---

### 2.6 YouTab.tsx (868 lines) — Settings Monolith

**Extraction targets:**

| Extract to                              | What moves                                            |
| --------------------------------------- | ----------------------------------------------------- |
| `useEmailUpdate` hook                   | Form state, validation, Supabase call (lines 116-149) |
| `usePasswordUpdate` hook                | Form state, validation, Supabase call (lines 150-203) |
| `ProfileCard` component                 | Avatar, name, action buttons (lines 204-281)          |
| `GeneralSettingsSection` component      | Currency, language, theme, brand (lines 318-410)      |
| `NotificationSettingsSection` component | Toggle rows (lines 430-434)                           |
| `SecuritySettingsSection` component     | Email/password forms, export, Crust (lines 436-531)   |
| `AdvancedSettingsSection` component     | Dev mode, clear cache, version (lines 533-578)        |

---

### 2.7 SupabaseSource.ts (986 lines) — Data Access Monolith

**Extraction targets:**

| Extract to                                                     | What moves                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `supabase-auth-helper.ts`                                      | `isGuestSession`, `getOptionalUserId`, `requireAuthenticatedUser` |
| `pot-row-mapper.ts`                                            | `mapRow`, `buildMetadata`                                         |
| `expense-row-mapper.ts`                                        | `mapExpenseRow`                                                   |
| Split into `SupabasePotSource.ts` / `SupabaseExpenseSource.ts` | CRUD operations by entity                                         |

---

### 2.8 AccountMenu.tsx (741 lines) — Wallet Connection God

**Extraction targets:**

| Extract to                         | What moves                                            |
| ---------------------------------- | ----------------------------------------------------- |
| `useExtensionConnect` hook         | Extension discovery, account selection (lines 95-205) |
| `useWalletConnectFlow` hook        | URI, QR, mobile deep links (lines 206-294)            |
| `ExtensionSelectorModal` component | Extension picker (lines 428-441)                      |
| `WalletConnectQRModal` component   | QR / mobile wallet sheet (lines 444-534)              |
| `ConnectedAccountMenu` component   | Connected state menu (lines 336-421)                  |

---

### 2.9 SignInScreen.tsx (907 lines) — Auth Orchestrator (Partially Decomposed)

**Current state:** Already has 10 sub-modules under `src/components/auth/`:

- Hooks: `useLoginState` (89), `useWalletAuth` (221), `useEmailAuth` (210), `useThemeHandler` (98)
- Panels: `WalletLoginPanel` (228), `EmailLoginPanel` (138), `SignupPanel` (210)
- Shared: `SignInComponents` (545), `SignInThemes` (276), `AuthFooter` (65)

**Problem:** Despite the decomposition, the main file is still 907 lines because it owns all handler wiring, theme configuration dispatch, and the wallet option config array. `SignInComponents.tsx` at 545 lines is itself a god file.

**Extraction targets:**

- Move wallet option config array (`walletOptionConfigs`) into a separate `src/components/auth/wallet-options.ts` data file
- Break `SignInComponents.tsx` (545 lines) into individual components: `ChopDotMark`, `ViewModeToggle`, `LoginVariantToggle`, `WalletConnectModalToggle`
- Move the `handleWalletConnectModal` dual-chain flow (currently ~60 lines) into `useWalletAuth` where it belongs
- Move theme dispatch logic into `useThemeHandler` (it already exists but SignInScreen still does theme selection)

**Net effect:** SignInScreen shrinks to ~300 lines (layout + hook composition). SignInComponents splits into 4 focused files under 100 lines each.

---

### 2.10 AuthContext.tsx (693 lines) — Auth State Monolith

**Problem:** Contains user mapping, session management, 6 login methods, OAuth redirect handling, wallet auth verification, profile upsert, token refresh, and logout — all in one context.

**Extraction targets:**

- `mapSupabaseSessionUser` is a pure function (lines 33-68) — move to `src/utils/auth-mapping.ts`
- `loginWithWallet` logic (signature verification via edge function) — move to `src/services/auth/wallet-login.ts`
- `loginWithOAuth` + `handleOAuthCallback` — move to `src/services/auth/oauth-login.ts`
- `loginAsGuest` (anonymous sign-in) — move to `src/services/auth/guest-login.ts`
- Session listener + token refresh — move to `src/services/auth/session-manager.ts`

**Net effect:** AuthContext becomes a thin provider (~200 lines) that composes auth services and exposes state + actions.

---

## Part 3 — Cross-Cutting Deduplication

### 3.1 Clipboard

Use `copyWithToast` from `src/utils/clipboard.ts`. Migrate all `navigator.clipboard.writeText` call sites.

### 3.2 Settlement Execution

`src/hooks/useSettlementTx.ts` — shared by SettleHome + ExpensesTab.

### 3.3 Fee Estimation

`src/hooks/useFeeEstimate.ts` — shared by SettleHome + SettlementConfirmModal.

### 3.4 DOT Price

`src/hooks/useDotPrice.ts`. Standardise on `currencyService.getDotPriceInFiat` everywhere.

### 3.5 Relative Time Formatting

`src/utils/formatRelativeTime.ts`.

---

## Part 4 — Guardrails to Prevent Regression

- **File size:** `scripts/check-file-size.sh`, `npm run lint:size`
- **Modularity rule:** `.cursor/rules/modularity.mdc`
- **Circular deps:** `npm run lint:circular` (madge)
- **Dependency direction:** Screens → hooks → services. Screens never import `services/chain/*` or `services/data/*` directly.

---

## Part 5 — Benefits

- Smaller files fit in editor/AI context
- Parallel work without merge conflicts
- Hooks are unit-testable
- Roadmap unblocking (batch settlement, fee abstraction, XCM)
- Bug isolation via clear boundaries

---

## Part 6 — Execution Order

### Phase 0: Guardrails First ✅

- `scripts/check-file-size.sh`, `lint:size`, `lint:circular`
- `.cursor/rules/modularity.mdc`

### Phase 1: Cross-Cutting Utilities ✅

- `clipboard.ts`, `formatRelativeTime.ts`, `fiatToDot.ts`
- Migrate 22+ clipboard call sites

### Phase 2: Settlement Hooks ✅

- `useSettlementTx`, `useFeeEstimate`, `useDotPrice` + tests

### Phase 3: SettleHome Decomposition ✅

- BankForm, PayPalForm, TWINTForm, DotSettlementPanel

### Phase 4: ExpensesTab Decomposition ✅

- usePotBalances, useActivityFeed, useExpenseGroups + section components

### Phase 5: App.tsx + AppRouter (partial)

- ✅ useTabNavigation, useFabState, useScreenValidation
- ✅ AppLayout component
- ⏳ Per-screen prop factories (`src/routing/screen-props/`)
- ⏳ App.tsx < 300 lines, AppRouter < 150 lines

### Phase 6: SignInScreen + AuthContext

- Move handleWalletConnectModal into useWalletAuth
- Break SignInComponents.tsx into 4 files
- Wallet option config data file
- AuthContext: extract auth services

### Phase 7: Remaining Files

- PotHome, YouTab, AccountMenu, SupabaseSource

### Phase 8: Dependency Audit + ADRs

- Fix circular deps, write ADRs, update AGENTS.md

---

**Final verify:** `npx tsc --noEmit && npm run build && npx vitest run && npx playwright test && npm run lint:size && npm run lint:circular`
