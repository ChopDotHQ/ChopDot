# ChopDot File Structure Guide

**Last Updated:** October 15, 2025  
**Purpose:** Navigate the codebase with confidence

---

## 📁 Project Root

```
chopdot/
├── App.tsx                    # 🎯 Main application entry point (1,200 lines)
├── main.tsx                   # React 18 root renderer
├── index.html                 # HTML entry point with loading spinner
├── nav.ts                     # Navigation state management (useNav hook)
├── package.json               # Dependencies & scripts
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
├── docker-compose.yml         # PostgreSQL + backend orchestration
├── Dockerfile.frontend        # Frontend container
├── nginx.conf                 # Production nginx config
```

---

## 📂 Directory Structure

### `/components/` - React Components (40+ files)

#### Custom UI Components
```
components/
├── BottomTabBar.tsx           # Main tab navigation (Pots | People | Activity | You)
├── BottomSheet.tsx            # Modal bottom sheet component
├── InputField.tsx             # Labeled input with error states
├── SelectField.tsx            # Labeled select with error states
├── PrimaryButton.tsx          # App-specific primary button (uses design tokens)
├── SecondaryButton.tsx        # App-specific secondary button
├── Toast.tsx                  # Toast notification component
├── TxToast.tsx                # Transaction-specific toast
├── TopBar.tsx                 # Screen header bar
├── SwipeableScreen.tsx        # Swipe-to-go-back wrapper
├── SwipeableExpenseRow.tsx    # Swipeable list item with actions
├── BatchConfirmSheet.tsx      # Batch expense confirmation modal
├── WalletConnectionSheet.tsx  # Wallet connection modal
├── YouSheet.tsx               # "You" tab action sheet
├── EmptyState.tsx             # Empty state illustrations
├── HelpSheet.tsx              # Help/tutorial modal
├── LinkButton.tsx             # Text-style link button
├── MemberChip.tsx             # Member badge/chip
├── ReceiptViewer.tsx          # Receipt image viewer
├── SettleSheet.tsx            # Settlement action sheet
├── SortFilterSheet.tsx        # Sort/filter modal
├── Stepper.tsx                # Multi-step form stepper
├── TrustDots.tsx              # Trust score visualization
├── TrustIndicator.tsx         # Trust score indicator
└── WalletBanner.tsx           # Wallet connection banner
```

#### `/components/screens/` - Full Screen Views (28 files)
```
screens/
├── ActivityHome.tsx           # Activity feed tab
├── PotsHome.tsx               # Pots tab (main pots list)
├── PeopleHome.tsx             # People tab (balances, settlements)
├── YouTab.tsx                 # You tab (profile, settings, insights)
├── PotHome.tsx                # Single pot detail screen
├── ExpenseDetail.tsx          # Single expense detail screen
├── AddExpense.tsx             # Add/edit expense form
├── CreatePot.tsx              # Create new pot form
├── SettleHome.tsx             # Settlement flow main screen
├── SettleSelection.tsx        # Choose person to settle with
├── SettlementHistory.tsx      # Past settlements list
├── SettlementConfirmation.tsx # Settlement success screen
├── CheckpointStatusScreen.tsx # Expense checkpoint status
├── InsightsScreen.tsx         # Spending insights & analytics
├── LoginScreen.tsx            # Authentication screen
├── Settings.tsx               # App settings
├── PaymentMethods.tsx         # Payment methods management
├── AddPaymentMethod.tsx       # Add payment method form
├── ViewPaymentMethod.tsx      # View/edit payment method
├── NotificationCenter.tsx     # Notifications drawer
├── MemberDetail.tsx           # Member profile view
├── AddMember.tsx              # Add member to pot
├── MyQR.tsx                   # Your QR code modal
├── ScanQR.tsx                 # QR scanner modal
├── ChoosePot.tsx              # Pot picker modal
├── RequestPayment.tsx         # Payment request screen
├── AddContribution.tsx        # Add to savings pot
├── WithdrawFunds.tsx          # Withdraw from savings pot
└── [Legacy tabs - unused]     # ExpensesTab, MembersTab, SavingsTab, etc.
```

#### `/components/ui/` - ShadCN Components (40 files)
```
ui/
├── button.tsx                 # Base button component
├── input.tsx                  # Base input component
├── select.tsx                 # Base select component
├── dialog.tsx                 # Dialog/modal component
├── sheet.tsx                  # Bottom sheet component
├── toast.tsx                  # Toast component
├── accordion.tsx              # Accordion component
├── alert.tsx                  # Alert component
├── avatar.tsx                 # Avatar component
├── badge.tsx                  # Badge component
├── card.tsx                   # Card component
├── checkbox.tsx               # Checkbox component
├── dropdown-menu.tsx          # Dropdown menu
├── form.tsx                   # Form helpers
├── label.tsx                  # Label component
├── popover.tsx                # Popover component
├── progress.tsx               # Progress bar
├── radio-group.tsx            # Radio group
├── separator.tsx              # Separator line
├── slider.tsx                 # Slider component
├── switch.tsx                 # Toggle switch
├── tabs.tsx                   # Tabs component
├── textarea.tsx               # Textarea component
├── tooltip.tsx                # Tooltip component
└── [30+ more ShadCN components]
```

**⚠️ IMPORTANT:** 
- `/components/ui/` is **ONLY for ShadCN components** - Do not add custom components here
- Custom components go in `/components/` root or `/components/screens/`

#### `/components/polkadot/` - Blockchain Integration
```
polkadot/
├── ConnectWallet.tsx          # Wallet connection component
└── README.md                  # Polkadot integration docs
```

#### `/components/figma/` - Figma Make Utilities
```
figma/
└── ImageWithFallback.tsx      # 🔒 PROTECTED - Image component with fallback
```
**⚠️ DO NOT MODIFY** - This file is managed by Figma Make

---

### `/contexts/` - React Context Providers (2 files)

```
contexts/
├── AuthContext.tsx            # Authentication state management
└── FeatureFlagsContext.tsx    # Feature flags system
```

**Purpose:** Global state management for auth and feature toggles

---

### `/hooks/` - Custom React Hooks (1 file)

```
hooks/
└── useTxToasts.ts             # Transaction toast notifications
```

---

### `/utils/` - Helper Functions (9 files)

```
utils/
├── settlements.ts             # Balance & settlement calculations
├── debugHelpers.ts            # Emergency debug tools (window.ChopDot.*)
├── haptics.ts                 # Haptic feedback
├── useTheme.ts                # Theme management (light/dark)
├── walletAuth.ts              # Wallet authentication
├── web3auth.ts                # Web3 authentication
├── usePullToRefresh.ts        # Pull-to-refresh hook
├── export.ts                  # Data export utilities
└── flags.ts                   # Feature flags helpers
```

---

### `/styles/` - CSS (1 file)

```
styles/
└── globals.css                # 🎨 Design system (Tailwind V4 config + tokens)
```

**See [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) for token documentation**

---

### `/docs/` - Documentation (11 files)

```
docs/
├── README.md                  # Main documentation hub
├── QUICK_REFERENCE.md         # Quick command reference
├── SETUP_GUIDE.md             # Setup & deployment guide
├── CURRENT_STATE.md           # Project status snapshot
├── AUTH_SYSTEM.md             # Authentication documentation
├── BACKEND_API.md             # API documentation
├── DATABASE_SCHEMA.md         # PostgreSQL schema docs
├── implementation/            # Feature implementation docs
│   ├── attestation-detail.md
│   ├── batch-confirm-preview.md
│   ├── checkpoint-system.md
│   ├── context-sensitive-fab.md
│   ├── csv-export.md
│   ├── dot-fee.md
│   ├── help-section.md
│   ├── pending-mutation-states.md
│   ├── quick-actions.md
│   ├── request-payment.md
│   └── web3auth-google-login.md
└── archive/                   # Historical docs
    ├── DOCUMENTATION_CLEANUP_SUMMARY.md
    └── MIGRATION_AND_DEBUG_HISTORY.md
```

---

### `/guidelines/` - Design Guidelines (3 files)

```
guidelines/
├── Guidelines.md              # Design system guidelines
├── QUICK_REFERENCE.md         # Quick design reference
└── Typography.md              # Typography guidelines
```

---

### `/database/` - Database Schema

```
database/
└── init/
    └── 01-schema.sql          # PostgreSQL schema definition
```

---

### `/scripts/` - Setup Scripts

```
scripts/
├── setup.sh                   # Initial setup script
└── reset-database.sh          # Database reset script
```

---

## 🎯 Key Files Explained

### `App.tsx` - Main Application Logic
- 1,200+ lines
- Contains all navigation logic
- Manages pots, expenses, settlements state
- Handles localStorage persistence
- Performance optimized with lazy initialization

### `main.tsx` - React Root
- Renders `<App />` with StrictMode
- Imports global styles
- Hides loading spinner

### `nav.ts` - Navigation System
- `useNav()` hook for screen management
- Stack-based navigation
- Handles back/forward navigation

### `globals.css` - Design System
- Tailwind V4 configuration
- CSS custom properties (design tokens)
- Light/dark mode
- Typography hierarchy
- Shadow system
- Utility classes

---

## 📝 File Naming Conventions

### Components
- **PascalCase.tsx** - All React components
- **Descriptive names** - `AddExpense.tsx`, not `Form.tsx`
- **Screen suffix** - Screens don't need suffix, but could use `*Screen.tsx` for clarity

### Utilities
- **camelCase.ts** - All utility files
- **Descriptive names** - `settlements.ts`, `debugHelpers.ts`

### Documentation
- **UPPERCASE.md** - Important docs (`README.md`, `SETUP_GUIDE.md`)
- **lowercase.md** - Feature docs (`attestation-detail.md`)

---

## 🚫 What NOT to Modify

### Protected Files (Managed by Figma Make)
```
/components/figma/ImageWithFallback.tsx
```

### Auto-Generated Files (Managed by Build Tools)
```
node_modules/
dist/
.vite/
```

---

## 🔍 Finding Things

### "Where is the design system?"
→ `/styles/globals.css` + `/DESIGN_TOKENS.md`

### "Where are the screen components?"
→ `/components/screens/`

### "Where is the navigation logic?"
→ `App.tsx` (main switch statement) + `nav.ts` (hook)

### "Where is state management?"
→ `App.tsx` (main app state) + `/contexts/` (global contexts)

### "Where are the API docs?"
→ `/docs/BACKEND_API.md`

### "Where is authentication?"
→ `/contexts/AuthContext.tsx` + `/components/screens/LoginScreen.tsx`

### "Where are settlements calculated?"
→ `/utils/settlements.ts`

### "Where is the database schema?"
→ `/database/init/01-schema.sql`

---

## 📊 File Count Summary

| Category | Count | Notes |
|----------|-------|-------|
| Total Files | 89 | Active files (zero dead code) |
| Components | 40+ | Custom UI components |
| Screens | 28 | Full-screen views |
| ShadCN Components | 40 | UI library components |
| Utils | 9 | Helper functions |
| Contexts | 2 | Global state |
| Hooks | 1 | Custom hooks |
| Documentation | 11+ | Markdown files |
| Build Config | 5 | package.json, vite.config.ts, etc. |

---

## 🎨 Component Organization

### When to create a new component?

**Create in `/components/` if:**
- ✅ Reusable across multiple screens
- ✅ Has complex logic
- ✅ Could be extracted to a library

**Create in `/components/screens/` if:**
- ✅ Full-screen view
- ✅ Represents a navigation destination
- ✅ Has unique layout

**DO NOT create in `/components/ui/` unless:**
- ❌ It's a ShadCN component (you shouldn't be creating these)

---

## 🔧 Import Path Examples

```tsx
// ✅ Screens
import { ActivityHome } from "./components/screens/ActivityHome";

// ✅ Custom components
import { PrimaryButton } from "./components/PrimaryButton";
import { Toast } from "./components/Toast";

// ✅ ShadCN components
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";

// ✅ Contexts
import { useAuth } from "./contexts/AuthContext";

// ✅ Utils
import { calculateSettlements } from "./utils/settlements";
import { triggerHaptic } from "./utils/haptics";

// ✅ Hooks
import { useNav } from "./nav";
```

---

## 📦 Export Structure

When you export from Figma Make, you'll get:

```
chopdot-export.zip
├── components/       # All React components
├── contexts/         # Auth & feature flags
├── hooks/            # Custom hooks
├── utils/            # Helper functions
├── styles/           # globals.css
├── docs/             # Documentation
├── database/         # Schema
├── scripts/          # Setup scripts
├── App.tsx           # Main app
├── main.tsx          # React root
├── index.html        # HTML entry
├── package.json      # Dependencies
├── vite.config.ts    # Build config
└── tsconfig.json     # TypeScript config
```

**Everything you need to run locally!**

---

**Questions?** See:
- [README_EXPORT.md](./README_EXPORT.md) - Setup guide
- [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) - Design system
- [docs/README.md](./docs/README.md) - Full documentation
