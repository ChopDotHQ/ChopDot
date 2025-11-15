# ChopDot

> Status: **Production Ready** 🚀  
> Version: **1.4.0**  
> Data Layer: **v0.9.0-data-layer-stable**

Mobile-first expense splitting and group financial management app with Polkadot blockchain integration.

ChopDot enables groups to track expenses, settle balances, and optionally use blockchain for verifiable settlements. Built with a clean architecture, comprehensive Data Layer, and production-ready UX.

## Why ChopDot

ChopDot brings familiar group-expense flows to a world where fairness and verifiability are the default. It marries a polished, mobile‑first UX with optional Web3 proofs so friends, teams and communities can settle up confidently—no spreadsheets, no guesswork.

### Core principles
- Transparency by default – optional, verifiable proofs when it matters
- Fairness built‑in – clear splits, no hidden fees
- Interoperability – works great without a wallet; even better with one
- Ownership – your data lives with you

## What's Built

### Core Features ✅
- **Mobile-first PWA** - iPhone 15 viewport optimized, iOS-style design
- **Expense Management** - Add, edit, delete expenses with flexible split logic
- **Settlement System** - Pot-scoped and global settlements with multiple payment methods
- **Pot Management** - Expense pots and savings pots with budgets
- **People & Balances** - Track balances across pots, trust metrics, settlement history
- **Activity Feed** - Unified timeline of expenses and settlements

### Data Layer Architecture ✅
- **Service/Repository Pattern** - Clean separation of concerns
- **Feature Flags** - Safe gradual rollout (`VITE_DL_READS`, `VITE_DATA_SOURCE`, `VITE_ENABLE_MOBILE_WC_UI`)
- **Multiple Data Sources** - localStorage (current) + HTTP stub (ready for API)
- **Error Handling** - Graceful fallbacks, error boundaries, non-blocking writes

### Blockchain Integration ✅
- **Wallet Connection** - Polkadot.js, SubWallet, Talisman, MetaMask, WalletConnect
- **Settlement Tracking** - Complete payment history with Subscan links
- **Member Addresses** - SS58 address support (normalized to SS58-0)

### UX/UI ✅
- **Design System** - Comprehensive guidelines, design tokens, typography
- **Dark Mode** - System preference + manual toggle
- **Empty States** - Helpful prompts and CTAs
- **Loading States** - Skeleton components for smooth loading
- **Error Messages** - User-friendly, actionable feedback

## What's Next

### Immediate (API Layer Branch)
- **Backend API Integration** - Connect HttpSource to real PostgreSQL backend
- **JAM Integration** - Wire to JAM local node for decentralized data
- **Real-time Sync** - Multi-device synchronization

### Near-term
- **Push Notifications** - Settlement reminders
- **Receipt Management** - IPFS/Arweave storage, camera capture
- **Multi-currency** - Real exchange rates, currency conversion

### Future
- **Smart Features** - Recurring expenses, templates, auto-split
- **DeFi Integration** - Real yield from Acala
- **Mobile Apps** - Native iOS/Android apps

## Built for Polkadot
Designed for composability and multi‑chain collaboration. We start off‑chain for speed, and add on‑chain verification where it delivers real value.

## Tech Stack

### Frontend
- **React 19.2.0** + **TypeScript 5.6.3**
- **Vite 6.0.3** - Fast build tool
- **Tailwind CSS 4.0.0** - Utility-first CSS with design tokens
- **ShadCN UI** - Accessible component library

### Blockchain
- **@polkadot/api** - Polkadot blockchain integration
- **@polkadot/extension-dapp** - Wallet connection
- **ethers.js** - EVM support
- **WalletConnect** - Multi-wallet support

### Data & State
- **Zod** - Schema validation
- **Data Layer** - Service/Repository pattern with feature flags
- **localStorage** - Local persistence with migration support
- **React Context** - Global state management

### Development
- **ESLint** - Code linting
- **TypeScript** - Strict type checking
- **npm** - Package management

## Run locally

1. Install dependencies:
   
   ```bash
   npm install
   ```

2. Start the dev server:
   
   ```bash
   npm run dev
   ```

Then open `http://localhost:5173`.

### Mainnet transfer test

- Temporary page to test a real DOT transfer on Polkadot Asset Hub.
- Open `/chain-test` (e.g., `http://localhost:5173/chain-test`). You need a Substrate wallet extension (SubWallet, Talisman, or Polkadot.js) and real DOT.
- Suggested test amount: 0.01 DOT. Network fees apply.
- After sending, view the transaction on Asset Hub Subscan: `https://assethub-polkadot.subscan.io/extrinsic/<txHash>`.

### Demo Mode

For safe public demos, you can enable a restricted mode that disables wallet connections and message signing.

- Set the feature flag in the browser:
  - Open DevTools Console and run: `localStorage.setItem('flag_DEMO_MODE', 'true')` then reload.
- Behaviour:
  - Wallet UI buttons will show a harmless toast and not open the wallet sheet.
  - Debug helpers are not exposed in production builds.

## Documentation

- **Specification:** [`spec.md`](spec.md) - Complete app specification and changelog
- **UX/UI Guidelines:** [`src/guidelines/Guidelines.md`](src/guidelines/Guidelines.md) - Design system reference
- **API Reference:** [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Data Layer API documentation
- **Release Notes:** [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) - v0.9.0-data-layer-stable release details

## Feature Flags

### Data Layer Reads (`VITE_DL_READS`)
- **Default:** `off` (uses existing UI state)
- **Set to `on`:** Enables Data Layer reads across the app
- **Toggle:** Use `scripts/toggle-dl-reads.sh on|off` (requires dev server restart)

### Data Source (`VITE_DATA_SOURCE`)
- **Default:** `local` (uses localStorage)
- **Set to `api`:** Uses HttpSource stub (ready for backend integration)

### LunoKit Wallet Rail (`VITE_ENABLE_LUNOKIT`)
- **Default:** `0` (legacy `AccountContext` remains active)
- **Set to `1`:** Switches the root provider to `AccountContextLuno` (currently an alias, future LunoKit home).

### Embedded Wallet Rail (`VITE_ENABLE_EMBEDDED_WALLET`)
- **Default:** `0` (embedded wallet context stays disabled)
- **Set to `1`:** Enables the placeholder `EvmAccountProvider` so MetaMask Embedded can drop in later without touching App wiring.

### Polkadot Balance UI (`VITE_ENABLE_POLKADOT_BALANCE_UI`)
- **Default:** `0` (legacy `WalletBanner` rendering remains)
- **Set to `1`:** Switches the balance card to the new Polkadot-style `BalanceDisplay` component. Logic (refresh/get DOT) stays the same, but turning the flag off reverts the UI immediately.

### Mobile WalletConnect Panel (`VITE_ENABLE_MOBILE_WC_UI`)
- **Default:** `0` (desktop QR rail only)
- **Set to `1`:** Enables the on-device WalletConnect wallet picker plus the desktop/mobile view toggle in `LoginScreen`. Desktop users can still force the QR modal; mobile/touch users get deep links, copy/share actions, and SubWallet/Talisman/Nova quick buttons.

## Login & Signup Flows

- The login rail is a Privy-style frosted panel with wallet buttons, an inline email/password form, “Continue as guest,” and a manual toggle to preview either desktop (QR) or mobile (device) views.
- Tapping **Email & password** expands the inline form. The **Need an account?** link shows the swipeable signup panel, which collects email, optional username, password confirmation, and ToS consent before calling Supabase `auth.signUp`.
- The new signup panel lives inside the same login scaffold, so QA/designers can swipe between “Sign in” and “Create account” states without leaving the screen.
- Email users can later update their email or password from the **You** tab’s Security section (wired to Supabase `auth.updateUser`).

## Release Information

**Current Release:** v1.4.0  
**Release Date:** January 15, 2025  
**Status:** ✅ Stable and production-ready

See [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) for full release details.
