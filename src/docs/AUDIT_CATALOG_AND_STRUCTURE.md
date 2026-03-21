# Audit: Component Catalog & File Structure

**Date:** February 2026  
**Scope:** Verify FILE_STRUCTURE.md and COMPONENT_CATALOG.md against the codebase for accuracy.

---

## ✅ High-confidence verified (pass)

| Claim | Verification |
|-------|--------------|
| **ConnectWalletScreen orphan** | No imports; only defined in own file |
| **AttestationDetail never rendered** | ExpenseDetail has state but does not import or render it |
| **SettleSheet in ActivityHome dead** | AppRouter passes `topPersonToSettle={undefined}` |
| **checkpoint-status has no router case** | No `case "checkpoint-status"` in AppRouter |
| **PotHome overrides onAddExpense** | Passes `() => setKeypadOpen(true)` to ExpensesTab, not `push(add-expense)` |
| **EditMemberModal at components root** | `components/EditMemberModal.tsx`; modals/ has only AcceptInviteModal |
| **Router cases match nav.ts** | All 25 routed screen types have cases; checkpoint, settle-cash/bank/dot do not |
| **BatchConfirmSheet removed** | No file exists |
| **CheckpointStatusScreen missing** | No file exists |
| **Hooks list** | FILE_STRUCTURE correctly lists 9 hooks (matches src/hooks) |
| **Legacy table** | No longer references FILE_STRUCTURE for BatchConfirmSheet/CheckpointStatusScreen |

---

## ⚠️ Minor inaccuracies

### 1. COMPONENT_CATALOG – add-expense reachability

**Claim:** "Only reachable via URL"

**Finding:** useUrlSync and getInitialScreenFromLocation only map `/`, `/pots`, `/activity`, `/people`, `/you` and `?cid`. There is **no URL** for add-expense. The route exists, but no URL nor normal UI path leads to it.

**Suggested fix:** Replace with: "Route exists; no UI path or URL leads to it in normal use."

### 2. FILE_STRUCTURE – screens list incomplete

**Missing from screens list:** SignUpScreen, ResetPasswordScreen, ConnectWalletScreen, CrustAuthSetup

These files exist in `screens/` but are not listed in FILE_STRUCTURE.

### 3. FILE_STRUCTURE – utils section outdated

**Claim:** "9 files" with specific list

**Actual:** `src/utils/` has 38+ files (including identityResolver, delivery, normalization, currencyFormat, envValidation, etc.)

**Suggested fix:** Update count and/or add "see directory for full list" note.

### 4. FILE_STRUCTURE – components/auth not documented

**Reality:** `components/auth/` exists with SignInComponents, AuthFooter, panels (EmailLoginPanel, WalletLoginPanel, SignupPanel), hooks (useLoginState, useWalletAuth, useEmailAuth, useThemeHandler).

**Current state:** Not mentioned in FILE_STRUCTURE.

---

## 📋 Summary

| Document | Status | Action |
|----------|--------|--------|
| **COMPONENT_CATALOG** | 1 fix needed | Correct add-expense "reachable via URL" claim |
| **FILE_STRUCTURE** | 3 fixes needed | Add missing screens; update utils; add auth/ section or note |

Overall: Documentation is mostly accurate. Remaining issues were small gaps and wording, not incorrect assertions. Legacy/orphan claims are verified.

---

## Fixes applied (post-audit)

1. **COMPONENT_CATALOG** – Corrected add-expense claim: "No URL or UI path leads to it" (was "Only reachable via URL").
2. **FILE_STRUCTURE** – Added missing screens: CrustAuthSetup, SignUpScreen, ResetPasswordScreen, ConnectWalletScreen (with orphan note).
3. **FILE_STRUCTURE** – Updated utils section: removed "9 files" count; added note for 30+ more files.
4. **FILE_STRUCTURE** – Added `components/auth/` section (AuthFooter, SignInComponents, SignInThemes, panels, hooks).

**Status after fixes:** Both documents pass the confidence test.
