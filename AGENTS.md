# ChopDot

Expense splitting and group financial management with Polkadot blockchain settlement.

## Quick Commands

```bash
npm run dev              # Supabase start + Vite dev server (localhost:5173)
npm run build            # tsc --noEmit + vite build
npx tsc --noEmit         # type-check only
npx vitest run           # unit tests
npx playwright test      # E2E smoke tests
npm run ci:fast          # lint + type-check + test + build + audit
```

## Setup

1. Copy `.env.example` to `.env`, fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WALLETCONNECT_PROJECT_ID`
2. `npm install && npm run dev`
3. `vite.config.ts` validates required env vars at build time — build will fail with clear messages if missing

## Architecture

- React SPA (Vite + TypeScript strict), deployed on Vercel
- Supabase: auth (OAuth PKCE, Web3 wallet-auth edge fn, email/password), Postgres, edge functions
- Edge functions: `wallet-auth` (Polkadot + EVM signature verify), `accept-invite`, `decline-invite`
- Polkadot.js extensions + WalletConnect (dual-chain: `polkadot` + `eip155` namespaces)
- Entry: `src/App.tsx` → `AuthContext` → `AppContent` → `AppLayout` + `AppRouter`
- Chain service: `src/services/chain/*` (adapter, polkadot, walletconnect, config)
- ESLint: `eslint.config.js` ignores TS files; use `npm run lint` which passes CLI flags

### Key Directories (post-modularity refactor)

```
src/
├── hooks/                      # App-level hooks (useAppActions, useOverlayState, usePotState, useDerivedData, …)
├── contexts/                   # AuthContext (thin orchestrator), AccountContext, FeatureFlagsContext
├── types/                      # Shared types (auth.ts, app.ts)
├── utils/                      # Pure utilities (auth-mapping.ts, clipboard.ts, haptics.ts, …)
├── services/
│   ├── auth/                   # Auth modules: session-manager, wallet-login, oauth-login, guest-login
│   ├── chain/                  # Chain adapter, polkadot, walletconnect, config
│   └── data/
│       ├── sources/            # SupabaseSource (facade → SupabasePotSource, SupabaseExpenseSource)
│       ├── services/           # PotService, ExpenseService, MemberService, SettlementService
│       └── repositories/       # PotRepository, ExpenseRepository, etc.
├── routing/
│   └── screen-props/           # AppRouter prop factories: tab-screens, pot-screens, settle-screens, misc-screens, types
├── components/
│   ├── app/                    # AppLayout (shell + overlays)
│   ├── auth/                   # Sign-in UI: ChopDotMark, WalletOption, DevToggles, EmailLoginDrawer, WalletConnectQROverlay
│   │   ├── hooks/              # useLoginState, useWalletAuth, useThemeHandler, useEmailAuth, useSignInHandlers
│   │   └── panels/            # WalletLoginPanel, EmailLoginPanel, SignupPanel
│   ├── expenses/               # HeroDashboard, ActivityHistory
│   ├── settle/                 # SettlementSummaryCard, PaymentMethodSelector, CashConfirmation, SettleFooter
│   ├── screens/                # Thin orchestrators: PotHome, ExpensesTab, SettleHome, SignInScreen, YouTab, …
│   ├── wallet/                 # ConnectedAccountMenu, ExtensionSelectorModal, WalletConnectQRModal
│   ├── you/                    # ProfileCard, GeneralSettings, NotificationSettings, SecuritySettings, AdvancedSettings
│   └── modals/                 # AcceptInviteModal, ConfirmModal, etc.
```

## Coding Conventions

- Functional components with hooks; no class components
- kebab-case files, PascalCase components/types, camelCase variables/functions
- No `any` — explicit types for all inputs/outputs (`tsconfig.json` has `strict: true`)
- Guard clauses and early returns over nested conditionals
- Single quotes for strings; arrow functions for callbacks; 2-space indent
- Prefix intentionally unused destructured vars with `_` (e.g. `_setFoo`)

## Before Modifying UI

- Check `src/docs/COMPONENT_CATALOG.md` for component purpose, entry points, and related components
- Check `src/FILE_STRUCTURE.md` for directory layout (note: may be stale post-refactor)

## Product Roadmap (priority order)

1. Batch settlement (one signature, many payouts — Utility.batchAll)
2. Fee abstraction (pay tx fees in stablecoins via AssetTxPayment)
3. In-app swaps (AssetConversion pallet for "swap to cover fees")
4. XCM cross-chain settlement (ParaSpell SDK, dry-run + fee estimate)
5. People Chain identity display (verified names next to addresses)
6. Auth hardening (SIWE-style domain binding, passkeys)
7. VC-based verified membership (OID4VP + KILT — only with clear market need)

## Planned Instrumentation

When building new features, add tracking hooks for:
- Wallet connect success rate (extension vs WalletConnect, by chain type)
- First on-chain settlement completion rate
- Median time-to-settle (tap to finalized)
- Batch failure rate and primary failure reasons
- % of failed txs due to insufficient fee balance

## Verification (run after every change)

1. `npx tsc --noEmit` — 0 errors
2. `npm run build` — succeeds
3. `npx playwright test` — smoke tests pass
