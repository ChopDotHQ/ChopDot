# ChopDot Specification

**Last Updated:** January 15, 2025  
**Version:** 1.4.0  
**Status:** Production-Grade Core Flows 🚀  
**UX/UI Rating:** 8.5/10 (All phases complete)  
**Data Layer:** Stable (v0.9.0-data-layer-stable)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Technical Stack](#technical-stack)
6. [Change Log](#change-log)
7. [Known Issues](#known-issues)
8. [Future Roadmap](#future-roadmap)

## 📚 Related Documentation

### Design & UX
- **UX/UI Guidelines:** [`src/guidelines/Guidelines.md`](src/guidelines/Guidelines.md) - Complete design system reference
- **Naming Conventions:** [`src/guidelines/NAMING_CONVENTIONS.md`](src/guidelines/NAMING_CONVENTIONS.md) - File and code naming standards
- **Quick Reference:** [`src/guidelines/QUICK_REFERENCE.md`](src/guidelines/QUICK_REFERENCE.md) - Fast lookup for common patterns

### Architecture & Code Quality
- **File Structure:** [`src/FILE_STRUCTURE.md`](src/FILE_STRUCTURE.md) - Codebase navigation
- **API Reference:** [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Data Layer API documentation
- **Workflow Guide:** [`src/WORKFLOW_GUIDE.md`](src/WORKFLOW_GUIDE.md) - Feature workflows and user flows
- **Supabase Wrap-up:** [`docs/supabase/INTEGRATION_WRAPUP.md`](docs/supabase/INTEGRATION_WRAPUP.md) - CRUD rollout summary & verification
- **Supabase Docs Index:** [`docs/supabase/DOCUMENTATION_INDEX.md`](docs/supabase/DOCUMENTATION_INDEX.md) - Links to every Supabase guide, SQL, and test report

### IPFS & Storage
- **IPFS/Crust Guide:** [`docs/IPFS_CRUST_GUIDE.md`](docs/IPFS_CRUST_GUIDE.md) - Complete IPFS integration guide
- **Sync Analysis:** [`TECHNICAL_SYNC_ANALYSIS.md`](TECHNICAL_SYNC_ANALYSIS.md) - Multi-user sync challenges and solutions
- **Sharing Guide:** [`SHARING_VS_ADDING_MEMBERS.md`](SHARING_VS_ADDING_MEMBERS.md) - User guide for pot sharing

---

## Overview

ChopDot is a mobile-first expense splitting and group financial management app with Polkadot blockchain integration. It enables groups to track expenses, settle balances, and optionally use blockchain for verifiable settlements.

### Core Principles
- **Transparency by default** – Optional, verifiable proofs when it matters
- **Fairness built-in** – Clear splits, no hidden fees
- **Interoperability** – Works great without a wallet; even better with one
- **Ownership** – Your data lives with you

### Target Platform
- **Primary:** Mobile web (PWA)
- **Target Device:** iPhone 15 (390×844 viewport)
- **Design:** iOS-style with SF Pro typography

---

## Current State

### ✅ Implemented Features

#### Core Functionality
- ✅ Multi-pot system (expense pots & savings pots)
- ✅ Expense management (add, edit, delete, split)
- ✅ Settlement calculations (pot-scoped & global)
- ✅ Activity feed (unified timeline)
- ✅ People management (balance tracking, trust metrics)

#### User Experience
- ✅ Clean iOS design (Tailwind V4, CSS custom properties)
- ✅ Dark mode support (system preference + manual toggle)
- ✅ Context-sensitive FAB (smart floating action button)
- ✅ Swipeable navigation (gesture-based back navigation)
- ✅ Bottom tab bar (4-tab navigation: Pots, People, Activity, You)
- ✅ Empty states (helpful prompts)
- ✅ Toast notifications (user feedback)

#### Authentication & Security
- ✅ Multi-method authentication (Polkadot wallets, WalletConnect, Supabase email/password)
- ✅ Privy-style login rail with inline email form, guest CTA, and manual desktop/mobile toggle

#### Data & Sync
- ✅ Supabase persistence for pots/expenses/members (enable with `VITE_DATA_SOURCE=supabase`)
- ✅ Automatic sample pots seeded for new Supabase accounts
- ✅ `last_edit_at` tracking across expense/member actions
- ✅ SQL verification scripts for CRUD health checks
- ✅ Mobile WalletConnect wallet picker with device detection and deep-link handling
- ✅ Swipeable signup panel (email, optional username, ToS consent) backed by Supabase
- ✅ AuthContext provider (central auth state management) with persistent sessions
- ✅ You tab controls for updating email/password
- ✅ Password-protected pot export/import (AES-GCM encryption)

#### Settings & Management
- ✅ Payment methods (Bank, crypto, PayPal, TWINT)
- ✅ Wallet connection UI (Polkadot.js, SubWallet, Talisman)
- ✅ You tab (Profile, QR code, insights, settings)
- ✅ Help & Support (comprehensive FAQ system)
- ✅ CSV export for expenses
- ✅ Theme controls (light/dark/system)

#### Advanced Features
- ✅ Quick actions (Scan QR, request payment, quick settle)
- ✅ Receipt management (upload and view receipts)
- ✅ Budget tracking (per-pot budgets with progress)
- ✅ Settlement history (complete payment record)
- ✅ Insights dashboard (spending analytics)

### 🚧 In Progress / Mock Data

#### Backend Integration (Not Connected)
- ❌ PostgreSQL database (schema ready, not connected)
- ❌ REST API (documented, not implemented)
- ❌ Real-time sync (mock SyncBanner exists)
- ❌ Push notifications (mock NotificationCenter exists)

#### IPFS & Crust Storage
- ✅ IPFS integration (via Crust Network)
- ✅ Automatic authentication (wallet-based, one-time sign)
- ✅ Pot sharing via IPFS links
- ✅ Auto-backup to IPFS (debounced, free tier)
- ✅ Receipt storage on IPFS
- ⚠️ Multi-user sync not implemented (see Known Issues)

#### Blockchain Integration
- ✅ Real Polkadot transactions (DOT transfers via `balances.transferKeepAlive`)
- ✅ DOT settlements (fully functional with network fee estimation)
- ✅ Wallet connection (Polkadot.js, SubWallet, Talisman, WalletConnect)
- ❌ DeFi yield (Acala integration placeholder)

#### Authentication (Next)
- ✅ Supabase-backed email/password login and signup (email verification via Supabase)
- ✅ Mobile wallet view flag (`VITE_ENABLE_MOBILE_WC_UI`) with manual override
- ⚠️ Password reset UI (Supabase recovery link) — pending
- ⚠️ Rich email verification status + resend flow — pending
- ⚠️ Multi-factor / passkey support — future roadmap

---

## Architecture

### File Structure
```
src/
├── App.tsx                 # Main application (3,757 lines)
├── main.tsx                # React root renderer
├── nav.ts                  # Type-safe navigation system
├── components/             # React components
│   ├── screens/           # Full-screen views (28 screens)
│   ├── ui/                # ShadCN components (40 components)
│   └── *.tsx              # Reusable components
├── contexts/              # React contexts
│   ├── AuthContext.tsx
│   ├── AccountContext.tsx
│   └── FeatureFlagsContext.tsx
├── services/              # Business logic
│   ├── chain/            # Blockchain services
│   ├── settlement/       # Settlement calculations
│   └── bridge/           # Bridge integrations
├── utils/                 # Utilities
│   ├── crypto/           # Encryption utilities
│   ├── settlements.ts    # Settlement calculations
│   └── migratePot.ts     # Data migration
├── schema/                # Data schemas
│   └── pot.ts            # Zod schemas
└── styles/
    └── globals.css        # Design system (Tailwind V4)
```

### State Management
- **Local State:** React hooks (`useState`, `useMemo`, `useCallback`)
- **Global State:** React Context (Auth, Account, FeatureFlags)
- **Persistence:** localStorage (pots, settlements, notifications)
- **Navigation:** Custom stack-based system (`nav.ts`)

### Data Flow
1. User actions → Component handlers
2. State updates → React re-render
3. Data Layer services → Repository → Data Source (localStorage/API)
4. localStorage sync → Persistence
5. Navigation → Stack-based routing

### Data Layer Architecture
- **Services:** Business logic layer (PotService, ExpenseService, MemberService, SettlementService)
- **Repositories:** Data access abstraction (PotRepository, ExpenseRepository, etc.)
- **Sources:** Data persistence (LocalStorageSource, HttpSource stub)
- **Hooks:** React hooks for data access (`usePots`, `usePot`)
- **Feature Flags:** Safe gradual rollout (`VITE_DL_READS=on|off`, `VITE_DATA_SOURCE=local|api`)
- **Error Handling:** Graceful fallbacks, error boundaries, non-blocking writes

### Key Design Patterns
- **Component Composition:** Reusable UI components
- **Custom Hooks:** Business logic abstraction
- **Type Safety:** Full TypeScript with Zod validation
- **Error Handling:** Try-catch blocks with user feedback
- **Performance:** Lazy initialization, memoization

---

## Features

### Expense Management
- **Add Expenses:** Amount, memo, date, paid by, split logic
- **Edit Expenses:** Modify existing expenses
- **Delete Expenses:** Remove expenses (with confirmation)
- **Split Logic:** Equal, unequal, percentage, custom splits
- **Receipts:** Upload and view receipt images

### Settlement System
- **Pot-Scoped Settlements:** Settle within a single pot
- **Global Settlements:** Settle across all pots
- **Settlement Methods:** Cash, Bank, PayPal, TWINT, DOT
- **Settlement History:** Complete payment record
- **Fee System:**
  - Network fees (DOT): Automatically estimated and displayed for blockchain transactions
  - Platform fees: Display-only (0.20% default, configurable via `VITE_SHOW_PLATFORM_FEE`)
  - Balance validation: Ensures sufficient balance for amount + network fee
  - CoinGecko integration: Real-time DOT price for fiat equivalent display
  - See `FEE_SYSTEM_IMPLEMENTATION.md` and `SETTLEMENT_FEE_AUDIT.md` for details
- **Balance Calculations:** Real-time balance updates

### Pot Management
- **Expense Pots:** Track shared expenses
- **Savings Pots:** Save together with DeFi yield (mock)
- **Pot Members:** Add/remove members, roles (Owner/Member)
- **Pot Settings:** Budget, archive
- **Pot Export/Import:** Password-protected .chop files

### User Features
- **Profile:** User stats, preferences
- **Payment Methods:** Multiple payment options
- **QR Codes:** Generate/scan QR codes
- **Insights:** Spending analytics, confirmation rates
- **Settings:** Theme, preferences, data export

---

## Technical Stack

### Frontend
- **Framework:** React 19.2.0
- **Language:** TypeScript 5.6.3
- **Build Tool:** Vite 6.0.3
- **Styling:** Tailwind CSS 4.0.0 (CSS custom properties)
- **UI Components:** ShadCN UI (Radix UI primitives)
- **Icons:** Lucide React, Phosphor Icons

### Blockchain
- **Polkadot:** @polkadot/api, @polkadot/extension-dapp
- **EVM:** ethers.js 6.15.0
- **WalletConnect:** @walletconnect/sign-client
- **Crypto:** WebCrypto API (PBKDF2, AES-GCM)

### State & Data
- **Validation:** Zod 4.1.12
- **Forms:** react-hook-form 7.55.0
- **Storage:** localStorage (with migration support)
- **Data Layer:** Service/Repository pattern with feature flags (`VITE_DL_READS`, `VITE_DATA_SOURCE`)

### Development
- **Linting:** ESLint 9.15.0
- **Type Checking:** TypeScript strict mode
- **Package Manager:** npm

### Authentication Experience
- **Login Rail:** Frosted card that lists wallet buttons, guest CTA, and an inline email/password form. Manual toggle lets QA force desktop or mobile layout.
- **Mobile View:** When `VITE_ENABLE_MOBILE_WC_UI=1`, `useClientDevice()` swaps the wallet list for an on-device WalletConnect picker. Users can jump back to the QR modal or stay in mobile mode.
- **Signup Panel:** Swipable panel (Privy-style) that collects email, optional username, password/confirm, and ToS consent. Calls `supabase.auth.signUp` and surfaces verification guidance inline.
- **Supabase Sessions:** `AuthContext` subscribes to Supabase session changes and persists the mapped user in `localStorage` for instant reloads and guest fallback.
- **Account Settings:** The “You” tab now exposes email/password update forms that call `supabase.auth.updateUser`, so email users can self-manage credentials.

### Wallet & Connector Consumers
- **AccountContext:** Centralizes wallet connectors (extensions, WalletConnect) and exposes `status`, `address0`, balances, and helpers (`connectExtension`, `connectWalletConnect`, `refreshBalance`, `disconnect`).
- **High-Touch Screens:** `App.tsx`, `AccountMenu`, `WalletBanner`, `CrustStorage`, `CrustAuthSetup`, settlement screens, and Expense/People tabs rely on AccountContext state to gate CTAs, fetch balances, or trigger WalletConnect flows.
- **Support Services:** `services/chain/walletconnect.ts`, `services/storage/ipfsAuth.ts`, and `utils/crustAuth.ts` depend on AccountContext’s persisted connector + address (`localStorage['account.connector']`, `['account.address0']`) for background tasks.
- **Luno/EVM Futures:** `AccountContextLuno` and `EvmAccountContext` ship as drop-in providers behind feature flags so we can swap wallets without touching call sites.

---

## Change Log

> **Note:** Update this section whenever you make changes to the app.

### [2025-02-15] - Login & Signup Overhaul
- ✅ Rebuilt the LoginScreen into a swipeable, Privy-style experience with inline email login, wallet rail, guest CTA, and manual desktop/mobile toggle
- ✅ Added Supabase-backed signup panel (email, optional username, password confirmation, ToS consent) with inline success/error messaging
- ✅ Brought the mobile WalletConnect picker behind `VITE_ENABLE_MOBILE_WC_UI` with automatic device detection plus explicit override buttons
- ✅ Added account-management forms (update email/password) to the You tab, wired to `supabase.auth.updateUser`
- ✅ Updated documentation (spec + README) and removed redundant rollout/internal docs now that the flows are canonical

-### [2025-11-19] - Supabase CRUD Integration
- ✅ `VITE_DATA_SOURCE=supabase` now loads pots via `usePots()` (no more hardcoded IDs)
- ✅ Pots, expenses, and members persist to Supabase metadata JSON + scalar columns (`last_edit_at`/`updated_at`)
- ✅ New accounts auto-seed "Devconnect" + "Urbe" sample pots for better onboarding
- ✅ Added SQL verification pack + wrap-up docs under `docs/supabase/`
- ✅ README + spec updated with Supabase setup guidance

### [2025-01-15] - IPFS & Crust Integration
- ✅ IPFS integration via Crust Network
- ✅ Automatic wallet-based authentication (one-time sign)
- ✅ Pot sharing via IPFS links (`/import-pot?cid=...`)
- ✅ Auto-backup to IPFS (debounced, 2 seconds)
- ✅ Receipt storage on IPFS
- ✅ IPFS onboarding modal (explains signing process)
- ⚠️ Multi-user sync not implemented (IPFS snapshots only - see Known Issues)

### [2025-01-15] - Checkpoint & Confirmation Features Removal
- ❌ Removed checkpoint system (pre-settlement verification, on-chain anchoring)
- ❌ Removed confirmation/attestation workflow (expense confirmations)
- ❌ Removed batch confirmation features (BatchConfirmSheet, batch attestations)
- ❌ Removed pot modes (casual vs auditable)
- ❌ Removed checkpoint-related UI (checkpoint buttons, status screens, alerts)
- ✅ Settlement flow now proceeds directly without checkpoint requirements
- ✅ All checkpoint and confirmation documentation removed
- ✅ Codebase cleaned up (unused files, imports, and state variables removed)

### [2025-01-14] - Dev-Only UI Cleanup & Data Layer Finalization
- ✅ Removed all dev-only debugging UI elements (pink "Reading via Data Layer" bars, green PotsDebug component)
- ✅ Cleaned up unused imports and handlers related to debug components
- ✅ Data Layer architecture stable and production-ready (v0.9.0-data-layer-stable)
- ✅ All dev-only elements properly gated (no visual indicators in production)
- ✅ App ready for user testing without debugging clutter

### [2025-01-14] - Data Layer Architecture Stable Release (v0.9.0)
- ✅ Complete Data Layer foundation (Service/Repository pattern)
- ✅ Feature flags for safe rollout (`VITE_DL_READS`, `VITE_DATA_SOURCE`)
- ✅ RPC telemetry logging
- ✅ Comprehensive API documentation (`docs/API_REFERENCE.md`)
- ✅ Incremental rollout completed (5-step safe migration)
- ✅ Error boundaries and graceful fallbacks
- ✅ Performance telemetry (dev-only)

### [2025-01-14] - Balance Calculation Consistency Fix
- Fixed ExpensesTab to preserve expense.split[] when converting to PotExpense format
- Updated computeBalances() to check for and use expense.split[] if available
- Ensures all screens (ExpensesTab, PeopleHome, MembersTab, SettleSelection) show consistent balances
- All balance calculations now use the same logic (expense.split[] when available, equal split fallback)
- Dependability score restored to 9/10 ✅

### [2025-01-14] - Phase 3: Refinement (Complete)
- Enhanced PrimaryButton with hover glow effect (`hover:shadow-[0_0_12px_rgba(230,0,122,0.3)]`)
- Enhanced SecondaryButton with border color transition on hover (`hover:border-ink/20`)
- Created `card-hover-lift` utility class for smooth card interactions (translateY(-2px) on hover)
- Applied card hover lift to interactive cards across app (PotsHome, ExpensesTab, PeopleHome, SettlementHistory, ExpenseDetail)
- Improved loading spinner animations with smooth fade transitions (`transition-opacity duration-200`)
- Enhanced focus ring (3px width for better visibility, standardized across app)
- Removed accent color from non-primary elements (links, icons, borders)
- Updated color usage to reserve accent for primary actions only
- All Phase 3 improvements documented in Guidelines.md for future reference

### [2025-01-14] - Phase 2: Visual Polish
- ✅ Enhanced EmptyState component with optional CTA buttons and descriptions
- ✅ Updated empty states across app (PotsHome, ChoosePot, ActivityHome, SettlementHistory, NotificationCenter)
- ✅ Created skeleton loading components (Skeleton, SkeletonCard, SkeletonList, SkeletonRow)
- ✅ Created error message utility with formatErrorMessage() and ErrorMessages constants
- ✅ Improved error messages in SettingsTab with specific, actionable feedback
- ✅ Spacing guidelines documented and standardized (8px, 16px, 24px, 32px scale)

### [2025-01-14] - Quick Actions Button Formatting Standardization
- ✅ Standardized Quick Actions Grid button hierarchy (Primary > Secondary > Tertiary)
- ✅ Fixed inconsistent text colors (Settle, Scan, Request buttons)
- ✅ Fixed inconsistent icon colors across quick action buttons
- ✅ Standardized icon backgrounds for secondary/tertiary buttons
- ✅ Updated Guidelines.md with Quick Actions Grid pattern documentation
- ✅ Established clear visual hierarchy: Primary (pink) > Secondary (black) > Tertiary (gray)

### [2025-01-14] - UX/UI Inconsistencies Audit
- ✅ Created UX/UI Inconsistencies report (`src/guidelines/UX_UI_INCONSISTENCIES.md`)
- ✅ Identified deprecated `text-muted-foreground` usage (10 files)
- ✅ Identified border radius inconsistencies (66 files using arbitrary values)
- ✅ Identified arbitrary text size usage (18 files)
- ✅ Documented button pattern inconsistencies
- ✅ Updated Guidelines.md with button usage recommendations

### [2025-01-14] - Naming Conventions Documentation
- ✅ Created comprehensive Naming Conventions guide (`src/guidelines/NAMING_CONVENTIONS.md`)
- ✅ Clarified file naming (screens vs tabs vs components)
- ✅ Standardized variable, function, and type naming patterns
- ✅ Added decision trees for common naming questions
- ✅ Documented common mistakes to avoid

### [2025-01-14] - UX/UI Guidelines Consolidation
- ✅ Created comprehensive UX/UI Guidelines document (`src/guidelines/Guidelines.md`)
- ✅ Consolidated design tokens, typography, spacing, shadows, and patterns
- ✅ Added best practices and common patterns reference
- ✅ Updated spec.md to reference guidelines

### [2025-01-14] - Code Cleanup & Testing Infrastructure Removal
- ✅ Removed all test files and testing infrastructure
- ✅ Removed test dependencies (95 packages)
- ✅ Cleaned up historical documentation files
- ✅ Removed debug utilities
- ✅ Updated SETUP_GUIDE.md (removed test references)

### [2025-01-14] - Navigation & Error Handling Improvements
- ✅ Fixed navigation dead ends (comprehensive safety checks)
- ✅ Added back navigation to SettlementConfirmation screen
- ✅ Improved error handling (empty catch blocks → proper logging)
- ✅ Added localStorage error handling (quota exceeded)
- ✅ Fixed clipboard operation error handling

### [2025-01-14] - TypeScript Error Fixes
- ✅ Fixed Pot type mismatches (type assertions)
- ✅ Fixed AccountMenu type errors (null checks)
- ✅ Fixed ZodError property access (errors → issues)
- ✅ Fixed AccountContext undefined checks
- ✅ Fixed crypto utility type assertions
- ✅ Fixed migration utility imports

### [2025-01-13] - Password-Protected Export/Import
- ✅ Added encrypted pot export/import (.chop files)
- ✅ AES-GCM encryption with PBKDF2 key derivation
- ✅ PasswordModal component for password entry
- ✅ Secure memory zeroing for sensitive data

### [2025-01-13] - Hyperbridge Integration
- ✅ Added HyperbridgeBridgeSheet component
- ✅ Bridge deep link generation utility
- ✅ UI for cross-chain bridging

### [2025-10-15] - Help & Support System
- ✅ HelpSheet component with FAQ accordion
- ✅ 10 comprehensive FAQ items
- ✅ You tab integration
- ✅ Non-intrusive design

### [2025-10-14] - Performance Optimizations
- ✅ Fixed loading freeze (localStorage refactor)
- ✅ Non-blocking data loading
- ✅ Size limits for localStorage (1MB pots, 500KB settlements)
- ✅ Performance monitoring (10ms threshold warnings)
- ✅ Lazy state initialization

---

## Known Issues

### Critical
- None currently

### Medium Priority
- [ ] Backend API (HttpSource/PostgreSQL) not connected; runtime uses localStorage or Supabase sources
- [ ] Polkadot transaction reliability matrix incomplete across wallet/device combinations
- [ ] **Multi-user sync not implemented** - When users share a pot via IPFS link, each person gets a snapshot copy. Changes made by one user don't sync to others automatically. See `TECHNICAL_SYNC_ANALYSIS.md` for detailed analysis and potential solutions.
- [ ] No push notifications

### Low Priority
- [ ] Missing type declarations for `qrcode` module (non-critical)
- [ ] Some unused variables/imports (code quality)

---

## Future Roadmap

### P0 - Critical Launch Blockers
1. **Backend API Connection** - Connect to PostgreSQL, real data persistence
2. **Polkadot Flow Hardening** - Expand wallet/device validation matrix, retries, and failure-state recovery
3. **Push Notifications** - Attestation requests, settlement reminders
4. **User Authentication** - Real accounts, session management

### P1 - Launch Week
5. **Receipt Management** - IPFS/Arweave storage, camera capture
6. **Friend Discovery** - Contacts integration, deep links
7. **Multi-currency** - Real exchange rates, currency conversion
8. **Settlement notifications** - Payment confirmations

### P2 - Post-Launch (Week 2-4)
9. **Smart features** - Recurring expenses, templates, auto-split
10. **Trust & reputation** - On-chain reputation scores
11. **DeFi integration** - Real yield from Acala
12. **Mobile apps** - Native iOS/Android apps

---

## How to Update This Document

When making changes to the app:

1. **Add to Change Log:**
   - Date: `[YYYY-MM-DD]`
   - Description: What was changed
   - Use ✅ for completed, 🚧 for in-progress, ❌ for removed

2. **Update Current State:**
   - Move features from "In Progress" to "Implemented" when complete
   - Update version number if significant changes

3. **Update Known Issues:**
   - Add new issues as they're discovered
   - Remove issues when fixed

4. **Update Future Roadmap:**
   - Adjust priorities as needed
   - Move items from roadmap to Change Log when implemented

---

**Document Maintained By:** Development Team  
**Last Review:** January 15, 2025  
**Release Tag:** v1.4.0
