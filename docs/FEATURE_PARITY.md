# Feature Parity: ChopDot vs Splitwise & Tricount

**Last Updated:** 2025-01-15  
**Purpose:** Baseline comparison of ChopDot features against Splitwise and Tricount to identify gaps and define minimum parity requirements.

---

## Table of Contents

1. [Existing Parity/Competitor Mentions](#existing-paritycompetitor-mentions)
2. [Current ChopDot Features Inventory](#current-chopdot-features-inventory)
3. [Parity Matrix](#parity-matrix)
4. [Minimum Parity Baseline (P0)](#minimum-parity-baseline-p0)
5. [Gaps and Quick Wins](#gaps-and-quick-wins)
6. [Open Questions / Assumptions](#open-questions--assumptions)

---

## Existing Parity/Competitor Mentions

The following files explicitly mention Splitwise or Tricount as competitors or design references:

| File Path | Context | Quote/Reference |
|-----------|---------|-----------------|
| `src/README.md` | Direct comparison table | "What Makes ChopDot Different?" table comparing Splitwise/Tricount vs ChopDot on Savings Pots, Settlement, Receipts, UI/UX |
| `TECHNICAL_SYNC_ANALYSIS.md` | Competitive analysis | "Splitwise/Tricount have real-time sync" as competitive advantage (line 201) |
| `TECHNICAL_SYNC_ANALYSIS.md` | Solution reference | "Proven approach (Splitwise, Tricount)" for centralized server sync (line 217) |
| `docs/GEMINI_POLISH_PLAN.md` | Competitive goal | "leapfrog Splitwise-style apps" in context of Receipt OCR pipeline (line 64) |
| `src/components/screens/ExpenseDetail.tsx` | UI inspiration | Code comment: `{/* Main Info - Two column layout like Tricount */}` (line 231) |

---

## Current ChopDot Features Inventory

### Core Expense Management ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Add expenses | ✅ Present | `src/components/screens/AddExpense.tsx` |
| Edit expenses | ✅ Present | `src/components/screens/AddExpense.tsx` (edit mode) |
| Delete expenses | ✅ Present | `src/components/screens/ExpenseDetail.tsx` (delete handler) |
| Expense splitting (equal) | ✅ Present | `src/components/screens/AddExpense.tsx` (splitType === "equal") |
| Expense splitting (shares-based) | ✅ Present | `src/components/screens/AddExpense.tsx` (splitType === "shares") |
| Expense splitting (percentage) | ✅ Present | `src/components/screens/AddExpense.tsx` (splitType === "custom", percentage-based) |
| Expense memo/description | ✅ Present | `src/components/screens/AddExpense.tsx` (memo field) |
| Expense date | ✅ Present | `src/components/screens/AddExpense.tsx` (date picker) |
| Expense currency | ⚠️ Partial | `src/components/screens/AddExpense.tsx` (selector present, but saves baseCurrency only) |
| Receipt upload | ✅ Present | `src/services/storage/receipt.ts`, `src/components/ReceiptViewer.tsx` |
| Receipt viewing | ✅ Present | `src/components/ReceiptViewer.tsx` |
| Receipt storage (IPFS) | ✅ Present | `src/services/storage/receipt.ts`, `docs/IPFS_CRUST_GUIDE.md` |
| Receipt OCR | ❌ Missing | Mentioned in `docs/GEMINI_POLISH_PLAN.md` as future feature |

### Pot Management ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Multi-pot system | ✅ Present | `src/services/data/services/PotService.ts`, `src/components/screens/PotsHome.tsx` |
| Expense pots | ✅ Present | Pot type: "expense" in `src/schema/pot.ts` |
| Savings pots | ✅ Present | Pot type: "savings" in `src/schema/pot.ts`, DeFi yield (mock) |
| Pot members | ✅ Present | `src/services/data/services/MemberService.ts`, `src/components/screens/MembersTab.tsx` |
| Add/remove members | ✅ Present | `src/components/screens/MembersTab.tsx` (add/remove buttons) |
| Pot budgets | ✅ Present | `src/components/screens/PotHome.tsx` (budget tracking) |
| Pot archiving | ⚠️ Partial | `src/schema/pot.ts` (archived field only; no UI or service logic found) |
| Pot sharing (IPFS link) | ⚠️ Partial | `src/services/sharing/potShare.ts`, `src/components/screens/ImportPot.tsx` (SharePotSheet not wired in App; snapshot-only import) |
| Pot export/import | ✅ Present | `src/utils/crypto/exportEncrypt.ts` (password-protected .chop files) |
| Pot auto-backup (IPFS) | ⚠️ Partial | `src/services/backup/autoBackup.ts` (no call sites; gated by VITE_ENABLE_CRUST) |
| Pot restore (IPFS) | ✅ Present | `src/services/restore/autoRestore.ts` |

### Settlement System ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Balance calculations | ✅ Present | `src/services/settlement/calc.ts` (computeBalances, suggestSettlements) |
| Pot-scoped settlement | ✅ Present | `src/components/screens/SettleHome.tsx`, `src/WORKFLOW_GUIDE.md` |
| Global settlement | ✅ Present | `src/components/screens/SettleHome.tsx`, `src/WORKFLOW_GUIDE.md` |
| Settlement methods (Cash) | ✅ Present | `src/components/screens/SettleHome.tsx` (method tabs) |
| Settlement methods (Bank) | ✅ Present | `src/components/screens/SettleHome.tsx` (method tabs) |
| Settlement methods (PayPal) | ✅ Present | `src/components/screens/SettleHome.tsx` (method tabs) |
| Settlement methods (TWINT) | ✅ Present | `src/components/screens/SettleHome.tsx` (method tabs) |
| Settlement methods (DOT) | ✅ Present | `src/services/chain/polkadot.ts` (sendDot), `src/components/screens/SettleHome.tsx` |
| Settlement methods (USDC) | ✅ Present | `src/services/chain/polkadot.ts` (sendUsdc), `docs/CURRENCY_PLAN_REVIEW.md` |
| Settlement history | ✅ Present | `src/components/screens/ExpensesTab.tsx` (recent settlements), `src/App.tsx` (history entries) |
| Settlement tracking (Subscan links) | ✅ Present | `src/components/screens/SettleHome.tsx` (on-chain tx hashes) |
| Payment requests | ⚠️ Partial | `src/components/screens/RequestPayment.tsx`, `src/App.tsx` (local notification only) |
| Fee estimation (network fees) | ✅ Present | `src/services/chain/polkadot.ts` (estimateDotFee, estimateUsdcFee) |
| Fee display (platform fees) | ✅ Present | `src/utils/platformFee.ts` (display-only, 0.20% default) |

### People & Balances ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| People list | ✅ Present | `src/components/screens/PeopleHome.tsx` |
| Balance tracking (per pot) | ✅ Present | `src/components/screens/MembersTab.tsx` (balance display) |
| Balance tracking (global) | ✅ Present | `src/components/screens/PeopleHome.tsx` (cross-pot balances) |
| Trust metrics | ⚠️ Partial | `src/components/TrustDots.tsx`, `src/components/screens/MembersTab.tsx` (mock trust scores) |
| Settlement history (per person) | ⚠️ Partial | `src/components/screens/SettlementHistory.tsx`, `src/App.tsx` (personId filter available; no dedicated per-person history entry from PeopleView) |
| Member addresses (SS58) | ✅ Present | `src/components/screens/MembersTab.tsx` (wallet addresses) |

### Activity Feed ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Unified timeline | ✅ Present | `src/components/screens/ActivityHome.tsx` |
| Expense activities | ✅ Present | `src/components/screens/ActivityHome.tsx` (expense entries) |
| Settlement activities | ✅ Present | `src/components/screens/ActivityHome.tsx` (settlement entries) |
| Sort/filter options | ✅ Present | `src/components/SortFilterSheet.tsx` |

### Authentication & User Management ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Email/password auth | ✅ Present | `src/contexts/AuthContext.tsx`, Supabase integration |
| Wallet auth (Polkadot) | ✅ Present | `src/utils/walletAuth.ts`, `src/contexts/AccountContext.tsx` |
| Wallet auth (WalletConnect) | ✅ Present | `src/services/chain/walletconnect.ts` |
| Guest mode | ✅ Present | "Continue as guest" in `src/components/screens/SignInScreen.tsx` |
| Signup flow | ✅ Present | `src/components/screens/SignInScreen.tsx` (swipeable signup panel) |
| Email/password update | ✅ Present | `src/components/screens/YouTab.tsx` (Security section) |
| Session persistence | ✅ Present | `src/contexts/AuthContext.tsx` (localStorage persistence) |

### Data & Sync ⚠️

| Feature | Status | Evidence |
|---------|--------|----------|
| LocalStorage persistence | ✅ Present | `src/services/data/sources/LocalStorageSource.ts` |
| Supabase persistence | ✅ Present | `src/services/data/sources/SupabaseSource.ts` |
| Cross-device sync (Supabase) | ⚠️ Partial | `src/services/data/sources/SupabaseSource.ts` (feature-flagged; requires configured keys, no realtime subscriptions) |
| Real-time multi-user sync | ⚠️ Partial | `src/services/crdt/realtimeSync.ts`, `src/hooks/usePotSync.ts` (CRDT sync implemented but not integrated into main components) |
| IPFS sharing (snapshot) | ⚠️ Partial | `src/services/sharing/potShare.ts` (share flow not wired; import-only in UI) |
| Auto-backup (IPFS) | ⚠️ Partial | `src/services/backup/autoBackup.ts` (no call sites) |
| Data export (CSV) | ✅ Present | `src/utils/export.ts` (exportPotExpensesToCSV, exportPotsSummaryToCSV) |
| Data import (encrypted) | ✅ Present | `src/utils/crypto/exportEncrypt.ts` (password-protected .chop files) |

### Notifications & Reminders ⚠️

| Feature | Status | Evidence |
|---------|--------|----------|
| In-app notifications | ⚠️ Partial | `src/components/screens/NotificationCenter.tsx` (mock exists) |
| Push notifications | ❌ Missing | `spec.md` (line 116: "mock NotificationCenter exists", line 446: "No push notifications") |
| Settlement reminders | ❌ Missing | `spec.md` (Future Roadmap: "Push notifications - Settlement reminders") |
| Expense confirmation requests | ❌ Missing | Notifications exist in schema (`src/database/init/01-schema.sql` line 227) but not implemented |

### Currency & Multi-Currency ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Multi-currency support | ✅ Present | `src/services/prices/types.ts` (CRYPTO_CURRENCY_CODES, FIAT_CURRENCY_CODES) |
| Currency conversion | ✅ Present | `src/services/prices/coingecko.ts`, `src/services/prices/currencyService.ts` |
| DOT support | ✅ Present | `src/services/chain/polkadot.ts`, `src/schema/pot.ts` |
| USDC support | ✅ Present | `docs/CURRENCY_PLAN_REVIEW.md`, `src/services/chain/polkadot.ts` (sendUsdc) |
| Fiat currencies | ✅ Present | `src/services/prices/types.ts` (USD, EUR, GBP, CHF, etc.) |
| Currency formatting | ✅ Present | `src/utils/currencyFormat.ts` (formatCurrencyAmount) |

### UI/UX ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Mobile-first PWA | ✅ Present | `README.md` (line 24: "iPhone 15 viewport optimized") |
| iOS-style design | ✅ Present | `src/guidelines/Guidelines.md`, `spec.md` (line 72) |
| Dark mode | ✅ Present | `src/utils/useTheme.ts`, `spec.md` (line 73) |
| Empty states | ✅ Present | `src/components/EmptyState.tsx` |
| Loading states (skeletons) | ⚠️ Partial | `src/components/Skeleton.tsx` (components exist; gap noted in `docs/USER_ONBOARDING_READINESS.md`) |
| Toast notifications | ✅ Present | `src/App.tsx` (showToast helper) |
| Help & Support (FAQ) | ✅ Present | `src/components/HelpSheet.tsx` (10 FAQ items) |
| QR code generation | ⚠️ Partial | `src/components/screens/ReceiveQR.tsx` (real), `src/components/screens/MyQR.tsx` (static mock) |
| QR code scanning | ⚠️ Partial | `src/components/screens/ScanQR.tsx` (static mock; no camera integration) |
| Quick actions (FAB) | ✅ Present | `src/components/screens/ActivityHome.tsx` (context-sensitive FAB) |

### Advanced Features ⚠️

| Feature | Status | Evidence |
|---------|--------|----------|
| Recurring expenses | ❌ Missing | `spec.md` (Future Roadmap: "Smart Features - Recurring expenses") |
| Expense templates | ❌ Missing | `spec.md` (Future Roadmap: "Smart Features - Templates") |
| Auto-split suggestions | ❌ Missing | `spec.md` (Future Roadmap: "Smart Features - Auto-split") |
| DeFi yield (Acala) | ⚠️ Mock | `spec.md` (line 225: "DeFi yield (mock)", line 130: "❌ DeFi yield (Acala integration placeholder)") |
| Insights dashboard | ⚠️ Partial | `src/components/screens/InsightsScreen.tsx`, `src/App.tsx` (mock data) |
| Budget tracking | ✅ Present | `src/components/screens/PotHome.tsx` (budget progress) |

---

## Parity Matrix

| Feature | Splitwise | Tricount | ChopDot Status | Evidence | Notes | Priority | Effort | Dependencies |
|---------|-----------|----------|----------------|----------|-------|----------|--------|--------------|
| **Core Expense Management** |
| Add/edit/delete expenses | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Full CRUD support | P0 | - | - |
| Equal split | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Default split type | P0 | - | - |
| Shares-based split | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Shares-based (third branch) | P0 | - | - |
| Percentage split | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Custom percentages (splitType === "custom") | P0 | - | - |
| Expense memo/description | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Text field | P0 | - | - |
| Expense date | ✅ | ✅ | ✅ Present | `src/components/screens/AddExpense.tsx` | Date picker | P0 | - | - |
| Receipt upload | ✅ | ✅ | ✅ Present | `src/services/storage/receipt.ts` | IPFS storage | P0 | - | - |
| Receipt viewing | ✅ | ✅ | ✅ Present | `src/components/ReceiptViewer.tsx` | Image viewer | P0 | - | - |
| Receipt OCR | ✅ | ⚠️ Partial | ❌ Missing | `docs/GEMINI_POLISH_PLAN.md` | Planned feature | P1 | M | OCR library/API |
| **Pot/Group Management** |
| Multiple groups/pots | ✅ | ✅ | ✅ Present | `src/services/data/services/PotService.ts` | Multi-pot system | P0 | - | - |
| Add/remove members | ✅ | ✅ | ✅ Present | `src/components/screens/MembersTab.tsx` | Member management | P0 | - | - |
| Member roles/permissions | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | `src/schema/pot.ts` | Schema fields only; no UI/RLS enforcement found | P0 | - | - |
| Group/pot sharing | ✅ | ✅ | ⚠️ Partial | `src/services/sharing/potShare.ts`, `src/components/screens/SettingsTab.tsx`, `src/components/screens/PotHome.tsx` | IPFS share service exists, but SharePotSheet not wired; current "Share Pot" action copies invite link, not IPFS snapshot | P0 | M | Wire SharePotSheet + UX decision on share vs invite |
| **Settlement** |
| Balance calculations | ✅ | ✅ | ✅ Present | `src/services/settlement/calc.ts` | Real-time balances | P0 | - | - |
| Settlement suggestions | ✅ | ✅ | ✅ Present | `src/services/settlement/calc.ts` | suggestSettlements | P0 | - | - |
| Multiple payment methods | ✅ | ✅ | ✅ Present | `src/components/screens/SettleHome.tsx` | Cash, Bank, PayPal, TWINT, DOT, USDC | P0 | - | - |
| Settlement history | ✅ | ✅ | ✅ Present | `src/components/screens/ExpensesTab.tsx` | Complete history | P0 | - | - |
| Payment requests | ✅ | ⚠️ Partial | ⚠️ Partial | `src/components/screens/RequestPayment.tsx`, `src/App.tsx` | Local-only notification, no cross-user delivery | P0 | - | - |
| On-chain settlements | ❌ | ❌ | ✅ Present | `src/services/chain/polkadot.ts` | DOT/USDC via Asset Hub | P1 | - | - |
| **People & Balances** |
| People list | ✅ | ✅ | ✅ Present | `src/components/screens/PeopleHome.tsx` | All people view | P0 | - | - |
| Per-pot balances | ✅ | ✅ | ✅ Present | `src/components/screens/MembersTab.tsx` | Pot-scoped balances | P0 | - | - |
| Global balances | ✅ | ✅ | ✅ Present | `src/components/screens/PeopleHome.tsx` | Cross-pot aggregation | P0 | - | - |
| Settlement history (per person) | ✅ | ✅ | ⚠️ Partial | `src/components/screens/SettlementHistory.tsx` | Person filter supported, but entry points are limited | P0 | - | - |
| **Activity Feed** |
| Unified timeline | ✅ | ✅ | ✅ Present | `src/components/screens/ActivityHome.tsx` | All activities | P0 | - | - |
| Sort/filter | ✅ | ✅ | ✅ Present | `src/components/SortFilterSheet.tsx` | Multiple options | P0 | - | - |
| **Multi-User Sync** |
| Real-time sync | ✅ | ✅ | ⚠️ Partial | `src/services/crdt/realtimeSync.ts`, `src/hooks/usePotSync.ts` | CRDT sync prototype exists but not integrated; experimental/not production-ready | P0 | M | Component integration, testing |
| Cross-device sync | ✅ | ✅ | ⚠️ Partial | `src/services/data/sources/SupabaseSource.ts` | Feature-flagged Supabase sync (single user, cross-device); no realtime subscriptions | P0 | M | Multi-user sync |
| **Notifications** |
| Push notifications | ✅ | ✅ | ❌ Missing | `spec.md` (line 446) | Mock exists, not implemented | P1 | M | Push service |
| In-app notifications | ✅ | ✅ | ⚠️ Partial | `src/components/screens/NotificationCenter.tsx` | Mock implementation | P1 | S | Notification service |
| Settlement reminders | ✅ | ⚠️ Partial | ❌ Missing | `spec.md` (Future Roadmap) | Planned feature | P2 | M | Push notifications |
| **Currency** |
| Multi-currency | ✅ | ✅ | ✅ Present | `src/services/prices/types.ts` | DOT, USDC, fiat | P0 | - | - |
| Currency conversion | ✅ | ✅ | ✅ Present | `src/services/prices/coingecko.ts` | Real-time rates | P0 | - | - |
| **Advanced Features** |
| Recurring expenses | ✅ | ❌ | ❌ Missing | `spec.md` (Future Roadmap) | Planned feature | P2 | M | Recurrence engine |
| Expense templates | ✅ | ⚠️ Partial | ❌ Missing | `spec.md` (Future Roadmap) | Planned feature | P2 | S | Template storage |
| Auto-split suggestions | ⚠️ Partial | ❌ | ❌ Missing | `spec.md` (Future Roadmap) | Planned feature | P2 | M | ML/heuristics |
| Budget tracking | ✅ | ✅ | ✅ Present | `src/components/screens/PotHome.tsx` | Per-pot budgets | P1 | - | - |
| Insights/analytics | ✅ | ⚠️ Partial | ⚠️ Partial | `src/components/screens/InsightsScreen.tsx` | Mock data and placeholder totals | P1 | - | - |
| **Export/Import** |
| CSV export | ✅ | ✅ | ✅ Present | `src/utils/export.ts` | exportPotExpensesToCSV | P0 | - | - |
| Data import | ✅ | ✅ | ✅ Present | `src/utils/crypto/exportEncrypt.ts` | Password-protected .chop files | P0 | - | - |
| **UI/UX** |
| Mobile app | ✅ | ✅ | ⚠️ Partial | `README.md` | PWA (mobile-first), no native apps | P1 | L | Native app dev |
| Dark mode | ✅ | ✅ | ✅ Present | `src/utils/useTheme.ts` | System + manual toggle | P0 | - | - |
| Help/FAQ | ✅ | ✅ | ✅ Present | `src/components/HelpSheet.tsx` | 10 FAQ items | P0 | - | - |

**Legend:**
- ✅ = Fully implemented
- ⚠️ = Partially implemented or mock
- ❌ = Missing
- P0 = Critical (blocks parity)
- P1 = Important (competitive parity)
- P2 = Nice to have (differentiation)
- S = Small effort (1-3 days)
- M = Medium effort (1-2 weeks)
- L = Large effort (2-4 weeks+)

---

## Minimum Parity Baseline (P0)

These features are **critical** for ChopDot to achieve basic parity with Splitwise/Tricount. Without these, ChopDot cannot compete effectively.

### ✅ Already Implemented (P0 Complete)

1. **Core Expense Management**
   - Add/edit/delete expenses ✅
   - Split types (equal, shares-based, percentage) ✅
   - Expense memo, date ✅ (currency selection partial)
   - Receipt upload/view ✅

2. **Pot/Group Management**
   - Multiple pots ✅
   - Add/remove members ✅

3. **Settlement System**
   - Balance calculations ✅
   - Settlement suggestions ✅
   - Multiple payment methods ✅
   - Settlement history ✅
   - Payment requests ⚠️ (local-only delivery)

4. **People & Balances**
   - People list ✅
   - Per-pot and global balances ✅
   - Settlement history (per person) ⚠️

5. **Activity Feed**
   - Unified timeline ✅
   - Sort/filter ✅

6. **Multi-Currency**
   - Multi-currency support ✅
   - Currency conversion ✅

7. **Export/Import**
   - CSV export ✅
   - Data import ✅

8. **UI/UX**
   - Mobile-first PWA ✅
   - Dark mode ✅
   - Help/FAQ ✅

### ⚠️ Partial (P0 Critical Gaps)

1. **Real-Time Multi-User Sync** ⚠️
   - **Current State:** CRDT-based real-time sync **prototype exists** (`src/services/crdt/realtimeSync.ts`, `src/hooks/usePotSync.ts`) but **not integrated** into main app components and likely experimental/not production-ready
   - **Required:** Integrate `usePotSync` hook into `PotHome`, `ExpensesTab`, and other components
   - **Evidence:** 
     - ✅ Implementation: `CRDT_SYNC_IMPLEMENTATION.md` (Nov 13, 2025 - "Implementation Complete")
     - ✅ Code: `src/services/crdt/realtimeSync.ts` (PotRealtimeSync class with WebSocket)
     - ✅ Hook: `src/hooks/usePotSync.ts` (React hook for CRDT sync)
     - ❌ Integration: No components use `usePotSync` (grep shows no matches in `src/components`)
   - **Impact:** HIGH - Core collaboration feature exists but not accessible to users
   - **Effort:** M (1-2 weeks for component integration)
   - **Dependencies:** Replace `usePot` / `SupabaseSource` calls with `usePotSync` in components

2. **Cross-Device Multi-User Sync** ⚠️
   - **Current State:** Supabase sync works for single user across devices. CRDT sync supports multi-user but not integrated.
   - **Required:** Integrate CRDT sync so multiple users can collaborate on same pot with live updates
   - **Evidence:** `spec.md` (line 445: "Multi-user sync not implemented") - outdated, CRDT sync exists but not used
   - **Impact:** HIGH - Users can't collaborate effectively until integration complete
   - **Effort:** M (1-2 weeks, same as above - part of CRDT integration)
   - **Dependencies:** Real-time sync integration (see above)

---

## Gaps and Quick Wins

### Critical Gaps (P0)

1. **Real-Time Multi-User Sync Integration** (M effort)
   - **Problem:** CRDT-based real-time sync prototype exists but not integrated into main app components. Components still use old `SupabaseSource` / `usePot` hooks. Prototype status unclear - needs testing/validation.
   - **Solution:** Replace `usePot` / `SupabaseSource` calls with `usePotSync` hook in components:
     - `src/components/screens/PotHome.tsx`
     - `src/components/screens/ExpensesTab.tsx`
     - `src/components/screens/MembersTab.tsx`
     - `src/App.tsx` (pot loading logic)
   - **Status:** ✅ Implementation complete (`CRDT_SYNC_IMPLEMENTATION.md`), ❌ Integration pending
   - **Files to modify:** Component files listed above, replace data source hooks
   - **Reference:** `QUICK_START_CRDT.md` for integration examples

2. **Cross-Device Multi-User Sync** (M effort)
   - **Problem:** Same as above - CRDT sync supports multi-user but not integrated.
   - **Solution:** Same integration work as above.
   - **Files to modify:** Same component files

### Important Gaps (P1)

1. **Push Notifications** (M effort)
   - **Current:** Mock `NotificationCenter` exists, but no actual push notifications
   - **Quick Win:** Implement basic in-app notifications first (S effort), then add push (M effort)
   - **Files:** `src/components/screens/NotificationCenter.tsx`, notification service

2. **Receipt OCR** (M effort)
   - **Current:** Manual receipt entry only
   - **Quick Win:** Integrate Tesseract.js or OCR API for auto-fill
   - **Files:** `src/components/screens/AddExpense.tsx`, new OCR service
   - **Reference:** `docs/GEMINI_POLISH_PLAN.md` (line 64)

### Nice-to-Have Gaps (P2)

1. **Recurring Expenses** (M effort)
   - **Current:** Manual entry for recurring expenses
   - **Quick Win:** Add recurrence pattern (daily, weekly, monthly) to expense creation
   - **Files:** `src/components/screens/AddExpense.tsx`, `src/schema/pot.ts`

2. **Expense Templates** (S effort)
   - **Current:** No templates
   - **Quick Win:** Save common expense patterns as templates
   - **Files:** `src/components/screens/AddExpense.tsx`, template storage

3. **Auto-Split Suggestions** (M effort)
   - **Current:** Manual split configuration
   - **Quick Win:** Suggest splits based on historical patterns or ML
   - **Files:** `src/components/screens/AddExpense.tsx`, suggestion engine

### Quick Wins (Low Effort, High Impact)

1. **In-App Notifications** (S effort)
   - Convert mock `NotificationCenter` to real implementation
   - Use existing notification schema (`src/database/init/01-schema.sql`)
   - Files: `src/components/screens/NotificationCenter.tsx`

2. **Receipt OCR Integration** (M effort)
   - Add OCR to receipt upload flow
   - Auto-fill amount/date from receipt image
   - Files: `src/components/screens/AddExpense.tsx`, OCR service

3. **Expense Templates** (S effort)
   - Save common expense patterns
   - Quick-add from templates
   - Files: `src/components/screens/AddExpense.tsx`

---

## Open Questions / Assumptions

### Assumptions (Need Verification)

1. **Splitwise/Tricount Feature Set**
   - **Assumption:** Splitwise has recurring expenses, templates, and auto-split suggestions
   - **Verification Needed:** Confirm exact feature set of Splitwise/Tricount (especially Tricount, which may have fewer features)
   - **Action:** Research Splitwise/Tricount feature lists to confirm parity matrix accuracy

2. **Tricount UI Inspiration**
   - **Assumption:** `ExpenseDetail.tsx` comment references Tricount's "two column layout" as design inspiration
   - **Verification Needed:** Confirm if this is accurate or if it's a generic comment
   - **Action:** Review `src/components/screens/ExpenseDetail.tsx` line 231

3. **Multi-User Sync Integration Priority**
   - **Status:** CRDT sync is implemented (`CRDT_SYNC_IMPLEMENTATION.md`) but not integrated into components
   - **Verification Needed:** Confirm integration priority - is it acceptable to ship with CRDT sync available but not integrated, or must it be integrated before launch?
   - **Action:** Product decision on integration timeline vs. launch date

4. **Push Notifications Priority**
   - **Assumption:** Push notifications are P1 (important but not blocking)
   - **Verification Needed:** Confirm if in-app notifications are sufficient for MVP
   - **Action:** Product decision on notification requirements

5. **Receipt OCR Priority**
   - **Assumption:** Receipt OCR is P1 based on competitive analysis
   - **Verification Needed:** Confirm if manual entry is acceptable for MVP
   - **Action:** Product decision on OCR priority

### Open Questions

1. **Multi-User Sync Approach**
   - **Question:** Should ChopDot prioritize centralized sync (fastest parity) or decentralized sync (aligns with Polkadot ethos)?
   - **Context:** `TECHNICAL_SYNC_ANALYSIS.md` recommends centralized server first, then decentralize
   - **Decision Needed:** Product/engineering alignment on sync strategy

2. **Native Mobile Apps**
   - **Question:** Is PWA sufficient, or are native iOS/Android apps required for parity?
   - **Context:** Splitwise/Tricount have native apps
   - **Decision Needed:** Product decision on mobile strategy

3. **DeFi Yield Integration**
   - **Question:** Is mock DeFi yield sufficient, or is real Acala integration required?
   - **Context:** `spec.md` lists DeFi yield as mock, Acala integration as future
   - **Decision Needed:** Product decision on DeFi feature completeness

4. **Expense Attestation System**
   - **Question:** Does ChopDot's attestation system match Splitwise/Tricount's confirmation flow?
   - **Context:** `src/WORKFLOW_GUIDE.md` describes attestation workflow, but checkpoint system was removed
   - **Verification Needed:** Compare ChopDot's attestation with competitors' confirmation systems

5. **Currency Support Scope**
   - **Question:** How many fiat currencies does Splitwise/Tricount support?
   - **Context:** ChopDot supports DOT, USDC, and multiple fiat currencies
   - **Verification Needed:** Research competitor currency support

---

## Summary

### Parity Status

- **Core Features:** ✅ **~90% Complete** - Most core expense management, settlement, and UI features are implemented
- **Critical Gap:** ⚠️ **Real-Time Multi-User Sync Integration** - CRDT sync is implemented but not integrated into components
- **Important Gaps:** ⚠️ **Push Notifications, Receipt OCR** - Competitive features but not blocking
- **Differentiation:** ✅ **On-Chain Settlements, IPFS Storage, DeFi Savings, CRDT Sync** - Unique features not in competitors

### Recommended Next Steps

1. **Immediate (P0):**
   - Integrate `usePotSync` hook into main components (`PotHome`, `ExpensesTab`, `MembersTab`, `App.tsx`)
   - Replace `usePot` / `SupabaseSource` calls with CRDT sync hook
   - Test multi-user collaboration scenarios

2. **Short-term (P1):**
   - Implement in-app notifications (convert mock to real)
   - Add receipt OCR integration

3. **Medium-term (P2):**
   - Add recurring expenses
   - Add expense templates
   - Evaluate auto-split suggestions

### Key Files for Parity Work

- **Sync Integration:** `src/components/screens/PotHome.tsx`, `src/components/screens/ExpensesTab.tsx`, `src/components/screens/MembersTab.tsx`, `src/App.tsx` (replace `usePot` with `usePotSync`)
- **Sync Implementation (already done):** `src/services/crdt/realtimeSync.ts`, `src/hooks/usePotSync.ts`, `CRDT_SYNC_IMPLEMENTATION.md`
- **Notifications:** `src/components/screens/NotificationCenter.tsx`, notification service
- **Receipt OCR:** `src/components/screens/AddExpense.tsx`, OCR service
- **Templates:** `src/components/screens/AddExpense.tsx`, template storage

---

**Document Maintained By:** Development Team  
**Last Review:** 2025-01-15  
**Next Review:** After sync implementation completion
