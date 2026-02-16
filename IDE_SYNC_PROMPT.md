# ChopDot Project Sync Prompt

Use this prompt to sync your IDE with the current state of the ChopDot project.

---

## Project Context

**ChopDot** is an expense-sharing and settlement app built with React, TypeScript, and Supabase. It supports multiple authentication methods (Polkadot wallets, MetaMask, email/password), expense tracking with custom splits, attestations, settlements, and savings pots.

## Current Project State

Please read and understand the following changelog to get up to speed on what's been implemented:

---

# 📋 Changelog

All notable changes to ChopDot are documented here.

---

## [Unreleased]

### Added
- Feature flags `VITE_ENABLE_LUNOKIT` and `VITE_ENABLE_EMBEDDED_WALLET`, plus placeholder providers (`AccountContextLuno`, `EvmAccountContext`) and env typings to wire future wallet work without behaviour changes.
- Feature flag `VITE_ENABLE_LOGIN_PANEL_UI` to flip between the legacy login flow and a Privy-inspired panel layout without touching wallet logic.

---

## [1.2.0] - 2025-10-14

### 🆘 Help & Support System

#### Minimal Onboarding (Option A)
- ✅ **HelpSheet component** - Clean iOS accordion with 10 FAQ items
- ✅ **You tab integration** - "Help & Support" button with pink accent icon
- ✅ **Non-intrusive design** - Always accessible, never forced
- ✅ **Comprehensive FAQs** - Covers pots, expenses, attestations, checkpoints, settlements, DOT
- ✅ **No tutorial overlays** - Respects user intelligence
- ✅ **Quick implementation** - 15 minutes, minimal code

#### FAQ Topics
1. What is ChopDot?
2. What are pots?
3. How do I add an expense?
4. What are attestations?
5. What are checkpoints?
6. How do I settle up?
7. What is DOT?
8. How do savings pots work?
9. Can I use ChopDot without crypto?
10. How do I invite someone to a pot?

### 🐛 Performance Fixes

#### Loading Freeze Resolution (CRITICAL)
- 🐛 **FIXED: App freezing on startup** - Complete localStorage refactor
  - Made all localStorage loading non-blocking (setTimeout chunks)
  - Removed `isRestoringData` blocking state
  - App renders immediately, data loads in background
  - Added size limits (1MB pots, 500KB settlements, 100KB notifications)
  - Performance monitoring with timing logs
  - 6-12x faster load time (800ms vs 5-10s)

#### Debug Helpers Enhanced
- ✅ **window.ChopDot.diagnosePerformance()** - Detailed timing analysis
- ✅ **window.ChopDot.archiveOldExpenses()** - Archive expenses > 30 days
- ✅ **window.ChopDot.emergencyFix()** - Force clear if frozen
- ✅ **window.ChopDot.checkStorageSize()** - localStorage usage stats
- ✅ **Always available** - Synchronous loading, no dev-only conditionals

#### Console Logging
- All ChopDot logs now show regardless of environment
- Clear prefixes: `[ChopDot]`, `[Storage]`, `[Performance]`, `[Auth]`
- Performance warnings for operations > 10ms

### 📚 Documentation Cleanup

#### Consolidated Documentation
- ✅ **Updated CURRENT_STATE.md** - Accurate project status
- ✅ **Cleaned main README.md** - Clear overview and roadmap
- ✅ **Created docs/README.md** - Documentation index
- ✅ **Archived historical docs** - MIGRATION_AND_DEBUG_HISTORY.md
- ✅ **Removed duplicates** - AUTH_AND_DATABASE_README merged into AUTH_SYSTEM

#### Documentation Structure
```
/
├── README.md                    # Main project overview
├── CHANGELOG.md                 # This file
├── Attributions.md              # Credits
docs/
├── README.md                    # Documentation index
├── CURRENT_STATE.md             # Current status
├── SETUP_GUIDE.md               # How to run
├── DATABASE_SCHEMA.md           # PostgreSQL schema
├── BACKEND_API.md               # API reference
├── AUTH_SYSTEM.md               # Authentication
├── implementation/              # Feature docs (11 files)
└── archive/                     # Historical notes
    └── MIGRATION_AND_DEBUG_HISTORY.md
```

#### Removed/Archived
- ❌ DEBUGGING_STEPS.md (archived)
- ❌ LOADING_ISSUE_FIX.md (archived)
- ❌ PERFORMANCE_FINAL_FIX.md (archived)
- ❌ INSTALL_GOOGLE_LOGIN.md (archived)
- ❌ MIGRATION_SUCCESS.md (archived)
- ❌ REORGANIZATION_SUMMARY.md (archived)
- ❌ All /docs/status/*.md files (consolidated)

### 🔧 Technical Improvements
- Debug helpers load synchronously (always available)
- Performance monitoring for localStorage operations
- Chunked loading prevents UI blocking
- Request idle callback for saves (non-blocking)
- Size limits with warnings for large data

---

## [1.1.0] - 2025-10-13

### 🔐 Authentication System (Major Update)

#### Multi-Method Authentication
- ✅ **Polkadot wallet authentication** - Polkadot.js, SubWallet, Talisman support
- ✅ **MetaMask authentication** - Direct browser extension integration
- ✅ **Rainbow & WalletConnect** - Mobile-friendly wallet support with QR codes
- ✅ **Email/password authentication** - Traditional login with bcrypt hashing
- ✅ **LoginScreen component** - Beautiful auth UI with all options
- ✅ **AuthContext provider** - Central auth state management
- ✅ **JWT token sessions** - Secure, stateless authentication
- ✅ **Persistent sessions** - Survives page refreshes via localStorage

#### Fixed Issues
- 🐛 **FIXED: Signout method** - Now properly logs out and redirects to login
  - Clears authentication token
  - Removes user session
  - Updates app state
  - Redirects to login screen
- 🐛 **FIXED: No authentication** - App now requires login to access

#### Security Features
- Message signing for wallet authentication
- Server-side signature verification (Polkadot & EVM)
- Password hashing with bcrypt
- JWT tokens with expiration
- Protected routes and API endpoints

### 🗄️ Database Schema

#### Complete PostgreSQL/SQLite Schema
- ✅ **users** - Multi-method auth support (wallet OR email)
- ✅ **sessions** - JWT session management
- ✅ **pots** - Expense and savings pots
- ✅ **pot_members** - Pot membership with roles
- ✅ **expenses** - Expense tracking with splits
- ✅ **expense_splits** - Custom split logic
- ✅ **attestations** - Expense confirmations
- ✅ **checkpoints** - Batch confirmation system
- ✅ **settlements** - Settlement history
- ✅ **payment_methods** - User payment details
- ✅ **contributions** - Savings pot contributions
- ✅ **notifications** - In-app notifications

#### Database Features
- UUID primary keys
- Foreign key constraints
- Indexes for performance
- Check constraints for data integrity
- Triggers for auto-updating timestamps
- Support for both PostgreSQL and SQLite

### 🐳 Docker Configuration

#### Complete Docker Setup
- ✅ **docker-compose.yml** - Full service orchestration
- ✅ **PostgreSQL** - Database with health checks
- ✅ **Backend API** - Express server with hot reload
- ✅ **Frontend** - React dev server
- ✅ **Redis** - Caching and session storage
- ✅ **pgAdmin** - Database management UI (optional)

#### Docker Features
- One-command deployment
- Volume persistence
- Health checks for all services
- Network isolation
- Auto-restart policies
- Multi-stage builds for production

### 📚 Documentation

#### New Documentation Files
- ✅ **/docs/SETUP_GUIDE.md** - Complete setup instructions (Docker + local)
- ✅ **/docs/AUTH_SYSTEM.md** - Authentication architecture and security
- ✅ **/docs/DATABASE_SCHEMA.md** - Full schema documentation
- ✅ **/docs/BACKEND_API.md** - Complete API reference
- ✅ **/docs/IMPLEMENTATION_SUMMARY.md** - What was implemented
- ✅ **/docs/AUTH_AND_DATABASE_README.md** - Quick start guide
- ✅ **/.env.example** - Environment variable template

#### Backend Specifications
- Complete API endpoint documentation
- Authentication flow diagrams
- Security best practices
- Error handling standards
- Rate limiting guidelines

### 🏗️ Infrastructure

#### Backend API Structure
- Express.js REST API
- JWT authentication middleware
- Input validation with Zod
- Error handling middleware
- Rate limiting support
- CORS configuration
- Health check endpoint

#### File Structure
```
/contexts/AuthContext.tsx           # Auth state management
/utils/walletAuth.ts               # Wallet connection utilities
/components/screens/LoginScreen.tsx # Login UI
/docker-compose.yml                # Docker orchestration
/backend/Dockerfile                # Backend container
/Dockerfile.frontend               # Frontend container
/nginx.conf                        # Production nginx config
/.env.example                      # Environment template
/database/init/01-schema.sql       # PostgreSQL schema
```

### 🔧 Technical Improvements

- TypeScript strict mode compliance
- Proper error handling throughout
- Loading states for async operations
- Responsive error messages
- Haptic feedback for auth actions
- Secure token storage
- Protected route implementation

### 📦 New Dependencies

#### Frontend
```json
{
  "@polkadot/extension-dapp": "^0.47.0",
  "@polkadot/util": "^12.0.0",
  "@polkadot/util-crypto": "^12.0.0",
  "@walletconnect/ethereum-provider": "^2.0.0",
  "ethers": "^6.0.0"
}
```

#### Backend (Recommended)
```json
{
  "express": "^4.18.0",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "pg": "^8.11.0",
  "zod": "^3.22.0",
  "cors": "^2.8.5",
  "helmet": "^7.1.0"
}
```

---

## [1.0.0-beta] - 2025-10-10

### 🎉 Major Features

#### Gamification System
- **Badge Ring Avatar** - Triple ring design showing achievement progress
  - 🤝 Active Participant (5+ confirmations)
  - 💰 Good Settler (3+ settlements)
  - 🌟 Community Builder (2+ groups)
- Badge rings display in all navigation tab headers
- Badge progress cards in You tab with emoji labels
- Unlock toasts with haptic feedback

#### Unified Header Pattern
- Consistent header design across all navigation tabs
- Left: Screen title
- Right: Badge ring avatar + notification bell
- Same spacing, borders, and styling everywhere
- Documentation in `/components/UnifiedHeader.tsx`

#### Theme System
- Full light/dark mode support
- System preference detection
- Manual toggle with localStorage persistence
- Theme switcher in You tab with haptic feedback
- All components tested in both modes

### ✨ Enhancements

#### Navigation & UX
- Renamed "Settle" tab to "People" tab
- Changed default view from "Balances" to "All" (directory view)
- Social-first approach to expense tracking
- Improved segmented control readability in dark mode

#### Settlement System
- Pot-scoped settlements (within one pot)
- Global settlements (across all pots with a person)
- Clear scope indicators ("📍 Settling: SF Roommates")
- Context-aware toast messages
- Smart navigation (returns to appropriate screen)

#### Code Organization
- Added comprehensive section comments to App.tsx
- JSDoc headers for all utility files
- Created documentation:
  - `/README.md` - Project overview
  - `/PROJECT_STATUS.md` - Current status
  - `/CODE_STYLE.md` - Style guide
  - `/CHANGELOG.md` - This file

### 🐛 Bug Fixes

- Fixed pot-scoped settlement amounts (was showing global totals)
- Fixed badge ring avatar missing from Pots/People headers
- Fixed segmented control text readability in dark mode
- Fixed InsightsScreen prop mismatches causing crashes
- Removed console.log from ExpenseDetail component

### 🧹 Code Cleanup

- Removed all debug console.logs
- Added organizational comments throughout codebase
- Consolidated documentation files
- Ensured consistent naming conventions
- Verified TypeScript types across all components

---

## [0.9.0] - 2025-10-09

### Core Features Released

#### Pot Management
- Create expense pots (roommates, trips, etc.)
- Create savings pots with DeFi yield tracking
- Multi-member support with invitations
- Budget tracking (optional)
- Member management

#### Expense Tracking
- Add expenses with receipt support
- Custom split logic (equal, percentage, custom)
- Attestation system (confirm others' expenses)
- Edit/delete expenses
- Real-time balance calculations
- ExpensesTab inside pot detail

#### Settlement Flows
- Calculate balances per person
- Multiple settlement methods:
  - 💵 Cash
  - 🏦 Bank transfer
  - 🔗 DOT wallet (UI only, pending blockchain)
- Settlement history
- Breakdown by pot

#### Activity Feed
- Unified timeline of all actions
- Expense activities
- Attestation activities
- Settlement activities
- Pull-to-refresh support
- Sort and filter options

#### You Tab
- User profile with stats
- Monthly spending insights
- Active pots count
- Total settled amount
- Payment methods management
- Settings and preferences
- QR code generation/scanning (UI only)

### Design System
- Tailwind V4 with CSS custom properties
- 8-pt grid spacing system
- 12-pt border radius standard
- SF Pro typography (6 semantic sizes)
- iOS-style components
- Minimal shadows and borders
- Clean card-based UI

### Technical Foundation
- React 18 with TypeScript
- Custom stack-based navigation
- Settlement calculation engine
- Theme management system
- Haptic feedback utilities
- Pull-to-refresh hook
- shadcn/ui component library

---

## Coming Soon

### [1.3.0] - Polkadot Integration
- [ ] DOT wallet connection
- [ ] On-chain settlement transactions
- [ ] Transaction signing
- [ ] Network selection (Polkadot/Kusama)
- [ ] Gas fee estimation
- [ ] Transaction history

### [1.2.0] - Enhanced Features
- [ ] Multi-currency support
- [ ] Real-time exchange rates
- [ ] Recurring expenses
- [ ] Expense categories
- [ ] Export data (CSV, PDF)
- [ ] Push notifications

### [2.0.0] - Platform Expansion
- [ ] Web responsive version
- [ ] Android app
- [ ] API for third-party integrations
- [ ] Advanced analytics
- [ ] Team collaboration features

---

## Version History

- **1.2.0** (2025-10-14) - Help system, performance fixes, documentation cleanup
- **1.1.0** (2025-10-13) - Authentication system, database schema, Docker setup
- **1.0.0-beta** (2025-10-10) - Gamification, unified headers, code cleanup
- **0.9.0** (2025-10-09) - Core features complete
- **0.8.0** (2025-10-08) - Settlement system implemented
- **0.7.0** (2025-10-07) - Expense tracking working
- **0.6.0** (2025-10-06) - Pot management complete
- **0.5.0** (2025-10-05) - Navigation system finalized
- **0.1.0** (2025-10-01) - Initial prototype

---

## Key Technical Details

### Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + PostgreSQL/Supabase
- **Authentication**: Multi-method (Polkadot, MetaMask, email/password)
- **State Management**: React Context API
- **Styling**: Tailwind CSS V4
- **Database**: Supabase (PostgreSQL)

### Current Status
- ✅ Core features implemented and working
- ✅ Authentication system complete
- ✅ Performance optimizations applied
- ✅ Documentation consolidated
- 🔄 Polkadot integration in progress (feature flags ready)

### Important Files
- `src/CHANGELOG.md` - Full changelog
- `docs/CURRENT_STATE.md` - Current project status
- `docs/AUTH_SYSTEM.md` - Authentication architecture
- `docs/DATABASE_SCHEMA.md` - Database structure
- `src/App.tsx` - Main application component

---

## Instructions for IDE

1. **Read the changelog above** to understand what's been implemented
2. **Review key files** mentioned in the changelog to understand the codebase structure
3. **Note the current version** is 1.2.0 with unreleased feature flags for future wallet work
4. **Understand the architecture** - React frontend, Supabase backend, multi-auth system
5. **Be aware of performance optimizations** - localStorage refactoring, chunked loading, debug helpers
6. **Check documentation structure** - Most docs are in `/docs/` with some archived files

When making changes or suggestions, please:
- Follow the existing code style (TypeScript strict, camelCase/PascalCase conventions)
- Respect the feature flag system for new wallet integrations
- Maintain the performance optimizations already in place
- Update the changelog if adding significant features

---

**Last Updated**: 2026-02-02 (Today) - Based on changelog version 1.2.0
