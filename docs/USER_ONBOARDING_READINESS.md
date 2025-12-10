# User Onboarding Readiness Plan

Status lamps: 🟢 done | 🟡 in progress | 🔴 open  
Owners: **DEV** = primary (you/me). **Open** = unassigned (Teddy can take).

## Goals
- Ship a stable login + data experience for new users (WC auth, Supabase CRUD, clear UX).
- Keep risky features gated behind flags; avoid breaking existing UX while we onboard.

## Auth & WalletConnect
- 🟢 Logout should also disconnect WC — **TEDDY**  
  - Current: logout clears Supabase only; WC session persists.  
  - Needed: call `AccountContext.disconnect()` and clear WC storage on logout.
- 🟡 Mobile WC stability — **DEV**  
  - Current: ipfsAuth import fixed; signer import may still fail on mobile.  
  - Needed: preload/guard WC signer import; retest on mobile; capture first error if any.
- 🔴 CSP headers — **Open**  
  - Current: CSP via meta; `frame-ancestors` ignored.  
  - Needed: set CSP in HTTP headers (Vercel/nginx); remove/adjust meta.
- 🟢 Waiting-for-signature state / no auto-launch — **DEV**.
- 🟢 Wallet email format fixed (no “+”) — **DEV**.
- 🟢 ipfsAuth WC import dynamic — **DEV**.
- 🟡 WC Modal (ether.fi-style) behind `VITE_ENABLE_WC_MODAL` — **DEV**  
  - Current: wired, flag off by default.  
  - Needed: test polkadot namespace; keep legacy as default.
- 🟡 Auth UI refactor — **DEV**  
  - Current: `SignInScreen.tsx` ~2k lines with duplicated signup logic.  
  - Needed: split into subcomponents/hooks (wallet auth, email auth), unify signup flow.
- 🟢 Secure wallet auth (nonce/signature) — **DEV**  
  - Added `auth_nonces` table + `wallet-auth` edge function; frontend uses nonce → sign → verify → `setSession`; address-as-password path removed. Rotation scripts available for dormant accounts.

## Data & Sync (Supabase)
- 🟢 Profiles schema/upsert — **TEDDY**  
  - Confirmed `wallet_address` alignment and upsert working.
- 🟡 Migration verification — **TEDDY**  
  - Current: not documented for prod/preview.  
  - Needed: list expected migrations; confirm applied; fix gaps.
- 🟢 Env validation — **DEV**  
  - Done: startup check for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WALLETCONNECT_PROJECT_ID` with clear error messages at both build-time (vite.config.ts) and runtime (main.tsx).
- 🔴 Cross-user pots & invites — **DEV**  
  - Current: `VITE_DATA_SOURCE=local`; invites are local-only UI and never reach other users. No `invites` table/email/link flow.  
  - Needed: switch to Supabase data source, add `invites` table + RLS + email/join link, route AddMember/Invite through Supabase, test two-account send/accept/reject/expire.

## UX & Polish
- 🔴 Safari keyboard issue — **DEV**  
  - Current: keyboard dismiss after first char on mobile Safari; needs repro detail.  
  - Needed: document steps/versions; fix focus/viewport behavior.
- 🔴 Loading states audit — **DEV**  
  - Ensure Skeleton/loader used in PotsHome/PeopleHome/ExpenseDetail.
- 🔴 Status clarity — **DEV**  
  - Ensure signing/waiting visible; no dead buttons on mobile.

## Payments & Flows
- 🟡 Pot create/settle smoke test — **DEV**  
  - Re-run on mobile/desktop; fix regressions.
- 🔴 Financial precision — **DEV**  
  - Current: JS `number` math with partial rounding; risk of drift in settlements.  
  - Needed: move to decimal/integer math or consistent rounding at every step; cover with tests.
- 🟢 DOT balance display retained — **DEV**.
- 🟢 Receive QR — **TEDDY**  
  - Receive QR/copy implemented and tested; transactions require DOT to fully validate transfer.

## Activity/Notifications
- 🔴 ChopDot-only activity feed — **Open**  
  - Build a simple feed for settlements/requests; no chain-wide tx spam.
- 🟢 Error toasts consistency — **DEV**  
  - Standardize messaging (ties to toast task).  
  - Update: switched WalletConnect errors/clipboard failures (AccountMenu, SignInScreen) and copy flows (ReceiveQR, CrustAuthSetup, AddExpense validation) to Sonner toasts; CRDT demo alerts remain (dev-only).  
  - Verification: UI test run confirmed Sonner Toaster present and success toasts firing (e.g., Copy handle); no console errors.

## Stability & Performance
- 🟢 Toast systems — **TEDDY**  
  - Pick one or document use (Toast vs TxToast vs sonner).  
  - Update: Teddy picked Sonner for production flows; legacy TxToast stays for on-chain status; CRDT demo still uses alerts (dev-only).
- 🟢 Console warning audit — **DEV**  
  - Report: `docs/CONSOLE_WARNING_AUDIT.md` (2025-01-27).  
  - Quick wins (optional): add toasts for clipboard failures and WC timeouts; wrap dev logs in `if (import.meta.env.DEV)`.
- 🟡 Pagination / large-data handling — **DEV**  
  - Current: fetch-all for pots/expenses; will degrade with history.  
  - Needed: cursor/offset pagination in data layer + UI “load more”/infinite scroll.
- 🔴 Test coverage gaps — **DEV**  
  - Current: minimal tests for settlements/data layer.  
  - Needed: unit tests for calc/settlements (rounding, multi-party), integration tests for data source/repo basics.

## Safety & Security
- 🟢 Logout completeness / WC storage cleared — **TEDDY**  
  - Ensure AuthContext + AccountContext cleared and WC session/storage removed on logout.
- 🟢 Wallet auth hardened — **DEV**  
  - Address-as-password removed; nonce/signature verification via edge function; passwords rotated on login; bulk rotation script available for dormant accounts.

## Ops
- 🟢 Feature flags doc (internal) — **DEV**  
  - FEATURE_FLAGS.md: name | purpose | default (e.g., `VITE_ENABLE_MOBILE_WC_UI`, `VITE_ENABLE_WC_MODAL`, `VITE_ENABLE_POLKADOT_BALANCE_UI`, `VITE_ENABLE_LUNOKIT`, `VITE_ENABLE_EMBEDDED_WALLET`, `VITE_ENABLE_CRUST`, `VITE_ENABLE_PRICE_API`, etc.).  
  - Update: Added `docs/FEATURE_FLAGS.md` with the current flags, defaults, and intent.
- 🟢 Env validation — **DEV** (see Data & Sync).
- 🟡 Prod/preview parity checks — **DEV**  
  - Checklist to verify both environments before go-live:  
    - Env: `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WALLETCONNECT_PROJECT_ID` present; planned feature flags set as intended.  
    - Schema/migrations: expected migrations applied; `profiles.wallet_address` exists with correct type; tables match `SUPABASE_SCHEMA_INVENTORY.md`.  
    - Flags: `VITE_ENABLE_WC_MODAL` on by default; experimental flags off unless testing.  
    - CSP: header-based CSP in place; no frame-ancestors warnings.  
    - Smoke: WC login succeeds (signature completes); CRUD (pots/expenses) works.

## Wallet Home Lite (integrated task)
- 🔴 Build a “Wallet Home Lite” screen behind a flag — **TEDDY**  
  - Scope: connected wallet DOT balance (+ fiat), receive QR, ChopDot activity only. No multi-chain, no growth charts, no send/swap. Flagged so it can be turned off; legacy UX untouched.  
  - Purpose: small, safe step toward a wallet home without derailing core.

## Future (parked)
- Full “Home Wallet” / multi-chain (balances, price history, tx feed, send/swap) — out of current scope; requires additional infra and product decisions. Reference brief: https://www.notion.so/Home-Wallet-brief-proposal-2b97ca876ac380e7a21dd311a0d27688?pvs=21

## Ready-to-Push (definition of done)
- Mobile WC login on prod/preview works: no import/CSP errors; signature completes; Supabase accepts wallet email.  
- Logout clears AuthContext + AccountContext and disconnects WC (session/storage gone).  
- Supabase in sync: CRUD works; profiles schema matches; migrations applied.  
- CSP via headers; no frame-ancestors warnings.  
- Mobile login usable: Safari keyboard fixed; loading states present; no dead buttons.  
- Console mostly clean; toast usage standardized/documented.  
- Flags/envs correct: required envs validated; flags documented; optional features behind flags can be turned off instantly.

## Cross-User Pots & Invites Tracker
- ✅ Supabase data source live (`VITE_DATA_SOURCE=supabase`, URL/anon key set)
- ✅ Invites table + policies applied
- ✅ Pot access via `can_access_pot` (members can read pots; creator-only updates)
- ⬜ Make invites migration idempotent (add `drop policy if exists` guards)
- ⬜ Invite acceptance endpoint (Edge Function/RPC): token → mark accepted → insert `pot_members`
- ⬜ Client send: AddMember writes to `invites` (Supabase), returns/copies join link
- ⬜ Client accept: join route + call acceptance endpoint; handle invalid/expired/duplicate
- ⬜ Show pending/accepted invites in UI (pull from `invites`)
- ⬜ QA: two-account send/accept; invalid/expired/duplicate/self-invite cases
