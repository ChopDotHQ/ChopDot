# Feature Flags & Env Toggles

Cheat sheet for the main env flags/toggles we use. Defaults are what the app does when the flag is unset.

## Core connectivity
- `VITE_DATA_SOURCE` (default: `local`) — `local` keeps data in localStorage; `supabase` uses Supabase CRUD.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — required when `VITE_DATA_SOURCE=supabase`.
- `VITE_SUPABASE_STRICT` (default: off) — when `true`, throw if Supabase is misconfigured instead of falling back to local storage.
- `VITE_WALLETCONNECT_PROJECT_ID` — required for WalletConnect; app has a fallback dev ID but set your own in prod.
- `VITE_API_URL` (default: `/api`) — backend proxy base for IPFS uploads when using the backend.

## WalletConnect / auth UI
- `VITE_ENABLE_WC_MODAL` (default: on) — ether.fi-style WC modal. Leave on unless testing legacy flow.
- `VITE_ENABLE_MOBILE_WC_UI` (default: off) — alternate mobile WC login UI.
- `VITE_WALLET_EMAIL_DOMAIN` (default: `chopdot.app`) — domain used to build wallet-based email for Supabase auth.
- `VITE_ENABLE_LOGIN_PANEL_UI` (default: off) — alternate login panel layout (Privy-inspired), logic unchanged.

## Wallet providers (experimental)
- `VITE_ENABLE_LUNOKIT` (default: off) — switches Polkadot account provider to LunoKit.
- `VITE_ENABLE_EMBEDDED_WALLET` (default: off) — enables EVM embedded wallet provider.
- `VITE_ENABLE_POLKADOT_BALANCE_UI` (default: off) — show Polkadot balance UI in WalletBanner.

## Chain/settlements
- `VITE_CHAIN_NETWORK` (default: `assethub`) — active chain config.
- `VITE_SIMULATE_CHAIN` (default: off) — simulation mode for chain interactions.
- `VITE_ENABLE_PRICE_API` (default: on) — enable CoinGecko price fetches.
- `VITE_REQUIRE_CONFIRMATIONS_DEFAULT` (default: off) — if `1`, new pots default to requiring confirmations.
- Platform fee (legacy/disabled by default): `VITE_SHOW_PLATFORM_FEE`, `VITE_COLLECT_PLATFORM_FEE`, `VITE_TREASURY_ADDRESS`.

## Data/CRDT
- `VITE_DL_READS` (default: off) — prefer data-layer reads (used during migration).
- `VITE_CHECKPOINT_INTERVAL` (default: `50`) — CRDT checkpoint batch size.

## IPFS / backups
- `VITE_ENABLE_CRUST` (default: off unless set to `1`) — if not `1`, auto-backup to Crust/IPFS is skipped.
- `VITE_IPFS_GATEWAY` (default: `https://ipfs.io`) — override gateway for reads.
- `VITE_USE_IPFS_PROXY` (default: on) — if `0`, frontend calls IPFS directly instead of backend proxy.

## Misc / tests
- `VITE_API_URL` — API base (duplicated here for completeness).
- `VITE_WEB3AUTH_CLIENT_ID` / `VITE_WEB3AUTH_NETWORK` — only needed if testing the Web3Auth Google login doc.
