# ChopDot - Migration & Debug History

**Archive Date:** October 14, 2025

This document consolidates all historical migration, debugging, and reorganization notes. These are kept for reference but are no longer actively maintained.

---

## 📦 Major Migrations

### Typography Migration (October 11, 2025)
- **What:** Moved from font-size utility classes to semantic HTML defaults
- **Why:** Cleaner code, better maintainability, Figma alignment
- **Impact:** All typography now uses default styles unless explicitly overridden
- **Files:** `styles/globals.css`, all `.tsx` components
- **Status:** ✅ Complete

### Tailwind V4 Migration (October 10, 2025)
- **What:** Upgraded from Tailwind V3 to V4 (CSS custom properties)
- **Why:** Modern CSS, better theming, design token system
- **Impact:** New design tokens, shadow system (sh-l1/l2/l3), clean iOS style
- **Files:** `tailwind.config.js` → `styles/globals.css`
- **Status:** ✅ Complete

### Component Reorganization (October 9, 2025)
- **What:** Consolidated duplicate components, cleaned file structure
- **Why:** Too many duplicate/unused files, confusing organization
- **Impact:** Cleaner `/components` folder, removed 15+ unused files
- **Files:** See `REORGANIZATION_SUMMARY.md` (archived)
- **Status:** ✅ Complete

---

## 🐛 Performance Fixes

### Loading Freeze Fix (October 14, 2025)
**Issue:** App freezing on startup due to blocking localStorage operations

**Root Cause:**
- Large JSON.parse calls blocking main thread
- Synchronous localStorage reads preventing UI render
- 800ms+ parse time for pots data

**Solution:**
1. Made localStorage loading completely non-blocking
2. Chunked loading with setTimeout to break up parsing
3. Removed `isRestoringData` blocking state
4. Added performance monitoring with timing logs
5. Implemented size limits (1MB pots, 500KB settlements, 100KB notifications)

**Impact:**
- ✅ App renders immediately (no loading screen)
- ✅ Data loads in background (~800ms total)
- ✅ No UI blocking
- ✅ Performance monitoring for future issues

**Files Changed:**
- `/App.tsx` - localStorage loading logic
- `/utils/debugHelpers.ts` - Added performance diagnosis

**See Also:**
- `/LOADING_ISSUE_FIX.md` (archived)
- `/PERFORMANCE_FINAL_FIX.md` (archived)

---

## 🔐 Authentication System Implementation

### Initial Setup (October 12, 2025)
**What:** Built comprehensive auth system with wallet + email/password support

**Components Created:**
- `AuthContext.tsx` - React context for auth state
- `walletAuth.ts` - Polkadot/MetaMask wallet authentication
- `web3auth.ts` - Web3Auth integration (Google login)
- `LoginScreen.tsx` - Full login UI with multiple auth methods

**Features:**
- Email/password authentication
- Wallet-based auth (Polkadot, MetaMask, Rainbow)
- Google OAuth via Web3Auth
- Guest mode for testing
- Session persistence
- Protected routes

**Database Schema:**
- PostgreSQL tables: users, sessions, wallets
- Docker setup with init scripts
- Full backend API documentation

**Status:** ✅ Frontend complete, backend ready but not connected

**Files:**
- `/contexts/AuthContext.tsx`
- `/utils/walletAuth.ts`
- `/utils/web3auth.ts`
- `/components/screens/LoginScreen.tsx`
- `/database/init/01-schema.sql`
- `/docs/AUTH_SYSTEM.md`

---

## 📝 Feature Implementations

### Help & Support System (October 14, 2025)
**What:** Minimal onboarding via FAQ accordion in You tab

**Approach:** Option A (non-intrusive)
- Single help sheet with 10 FAQ items
- Accessible from You tab
- No forced tutorials or tooltips
- Clean iOS accordion design

**Why This Works:**
- Respects user intelligence
- Help available when needed, not forced
- Easy to maintain and expand
- Quick implementation (15 minutes)

**Files:**
- `/components/HelpSheet.tsx`
- `/components/screens/YouTab.tsx`
- `/docs/implementation/help-section.md`

### CSV Export (October 13, 2025)
**What:** Export expenses to CSV for backup/accounting

**Features:**
- Pot-scoped or global export
- All expense data included
- Properly formatted CSV
- Download via browser

**Files:**
- `/utils/export.ts`
- `/components/screens/PotHome.tsx` (export button)
- `/docs/implementation/csv-export.md`

### Batch Confirmations (October 12, 2025)
**What:** Confirm multiple pending expenses at once

**Features:**
- Preview sheet showing all expenses
- Confirm all with one tap
- Grouped by pot
- Smart FAB integration

**Files:**
- `/components/BatchConfirmSheet.tsx`
- `/App.tsx` (batch attest logic)
- `/docs/implementation/batch-confirm-preview.md`

### Context-Sensitive FAB (October 11, 2025)
**What:** Smart floating action button that changes based on context

**Behavior:**
- Activity tab: "Confirm All" if pending, else "Add Expense"
- Pots tab: Always "Add Expense"
- People/You tabs: Hidden

**Files:**
- `/App.tsx` (getFabState function)
- `/components/BottomTabBar.tsx`
- `/docs/implementation/context-sensitive-fab.md`

### Checkpoint System (October 10, 2025)
**What:** Pre-settlement verification (all expenses entered correctly?)

**Features:**
- Created before settling
- All members must confirm
- 48-hour auto-confirm timeout
- Bypass option for flexibility
- Invalidates on new/edited expense

**Files:**
- `/components/screens/CheckpointStatusScreen.tsx`
- `/App.tsx` (checkpoint logic)
- `/docs/implementation/checkpoint-system.md`

---

## 🗂️ Documentation Cleanup

### October 14, 2025 Cleanup
**Consolidated:**
- All migration docs → This file
- All debug docs → This file
- All status docs → This file
- Removed duplicate READMEs

**Archived:**
- `/DEBUGGING_STEPS.md`
- `/LOADING_ISSUE_FIX.md`
- `/PERFORMANCE_FINAL_FIX.md`
- `/INSTALL_GOOGLE_LOGIN.md`
- `/docs/MIGRATION_SUCCESS.md`
- `/docs/REORGANIZATION_SUMMARY.md`
- `/docs/IMPLEMENTATION_SUMMARY.md`
- `/docs/AUTH_AND_DATABASE_README.md` (merged into AUTH_SYSTEM.md)
- All `/docs/status/*.md` files

**Kept:**
- `/README.md` - Main project overview
- `/CHANGELOG.md` - Version history
- `/Attributions.md` - Credits
- `/docs/CURRENT_STATE.md` - Current status (updated)
- `/docs/SETUP_GUIDE.md` - How to run
- `/docs/DATABASE_SCHEMA.md` - DB reference
- `/docs/BACKEND_API.md` - API reference
- `/docs/AUTH_SYSTEM.md` - Auth implementation
- `/docs/implementation/*.md` - Feature docs

---

## 🔍 Debugging Notes

### Common Issues & Solutions

**Issue: App won't load / blank screen**
- Solution: Check browser console for errors
- Solution: Run `window.ChopDot.emergencyFix()` then reload
- Solution: Clear localStorage: `window.ChopDot.clearAll()`

**Issue: App feels slow**
- Solution: Run `window.ChopDot.diagnosePerformance()`
- Solution: Check localStorage size: `window.ChopDot.checkStorageSize()`
- Solution: Archive old data: `window.ChopDot.archiveOldExpenses()`

**Issue: Data not persisting**
- Cause: Using Figma Make (browser-based, no server)
- Solution: Connect to real backend (see SETUP_GUIDE.md)

**Issue: Wallet not connecting**
- Cause: Wallet connection is UI-only (mock)
- Solution: Implement real Polkadot integration

---

## 📊 Performance Benchmarks

### LocalStorage Loading (After Fix)
- **Before:** 5-10 seconds, blocking UI
- **After:** ~800ms, non-blocking
- **Improvement:** 6-12x faster, no freeze

### Pots Data
- **Size:** Varies (typically 10-50 KB)
- **Parse time:** 10-50ms per chunk
- **Load strategy:** Chunked with setTimeout
- **Safe limit:** 1 MB (warning shown if exceeded)

### Settlements Data
- **Size:** Smaller (5-20 KB)
- **Parse time:** 5-20ms
- **Safe limit:** 500 KB

### Notifications Data
- **Size:** Very small (1-5 KB)
- **Parse time:** 1-5ms
- **Safe limit:** 100 KB

---

## 🛠️ Development Tools

### Debug Helpers
Available via `window.ChopDot.*`:

```javascript
// Performance
diagnosePerformance()  // Show detailed timing analysis
checkStorageSize()     // Check localStorage usage

// Data management
showState()            // View current app state
archiveOldExpenses()   // Archive expenses > 30 days old

// Emergency
emergencyFix()         // Force clear if frozen
clearAll()             // Clear all data (reset)
```

### Console Logging
All ChopDot logs prefixed with:
- `🚨 [ChopDot]` - Critical
- `📦 [Storage]` - Data loading
- `✅ [ChopDot]` - Success
- `⏱️ [Performance]` - Timing warnings
- `🔐 [Auth]` - Authentication

---

## 📜 Git History (Major Milestones)

**October 14, 2025**
- Fixed loading freeze issue
- Added Help & Support system
- Documentation cleanup

**October 13, 2025**
- CSV export implementation
- Payment request flow

**October 12, 2025**
- Batch confirmations
- Authentication system
- Database schema

**October 11, 2025**
- Typography migration
- Context-sensitive FAB
- Attestation detail screen

**October 10, 2025**
- Tailwind V4 migration
- Checkpoint system
- DOT fee calculator

**October 9, 2025**
- Component reorganization
- File structure cleanup

---

## 🔮 Lessons Learned

### What Worked Well
- **Incremental migrations** - Small changes, one at a time
- **Debug helpers** - Essential for diagnosing issues
- **Performance monitoring** - Caught loading freeze early
- **Clean documentation** - Easy to track changes

### What We'd Do Differently
- **Earlier backend integration** - Too much mock data complexity
- **Earlier performance testing** - Loading freeze should have been caught sooner
- **Simpler state management** - Too much logic in App.tsx

### Best Practices Established
- Always log performance timing for operations > 10ms
- Use chunked loading for large JSON data
- Never block UI for data loading
- Keep debug helpers available in production
- Document everything as you go

---

**End of Archive**

For current status, see `/docs/CURRENT_STATE.md`
