# ChopDot – Hackathon Context & Guardrails

## Core principles

- **No centralized auth, DB, or threshold custody.** Wallet = identity.

- **No hosted RPC by default.** Use a browser light client (Substrate Connect / smoldot).

- **Local-first data.** Pots/expenses live in IndexedDB via Yjs. P2P sync with y-webrtc.

- **On-chain only for settlements + optional checkpoints.** Use a Tx button to send DOT on Asset Hub/Westend; verify inclusion via light client; (optional) `system.remark` with `{potId, stateHash}` on pot close.

## What stays (from current repo)

- UI kit (Radix), Tailwind, all **screens** under `src/components/screens/`.

- Helpers: calculation logic under `src/utils/*`, `AddressDisplay`, `polkadot-config`, identicons.

- Polkadot deps (`@polkadot/extension-dapp`, `@polkadot/util(-crypto)`), EVM deps may remain but unused.

## What goes (or is disabled for MVP)

- **Supabase auth and tables**: remove runtime usage (`AuthContext`, `supabase-client`, `profiles repo`). Keep files around if needed, but **do not import/use** in the app.

- **Web3Auth / MPC / threshold services**: not permitted.

- **Polling explorers by default**: verify settlements using light client RPC; only soft-poll when a settlement screen is active.

## Target architecture (MVP)

- `src/wallet/` – wallet connect + selected account context (Polkadot extensions).

- `src/chain/` – light client provider (Substrate Connect/smoldot) + simple RPC helpers.

- `src/repos/` – **local repo layer** (Yjs-based) for:

  - `potsRepo` (create/get/list, members)

  - `expensesRepo` (add/list within pot)

  - `settlementsRepo` (record/list; DOT txs verified via light client)

- `src/components/polkadot/TxSend.tsx` – small `TxButton`-like component.

## UX rules

- Show “Initializing light client…” skeleton on cold load.

- Explicit toggle (off by default) for a public RPC fallback in Dev Settings.

- Account address is the user’s identity; show identicon + SS58; allow user to set a local nickname (stored per-pot via Yjs).

## Branch plan

- `feat/wallet-auth` – remove Supabase auth; add wallet connect + account context.

- `feat/light-client` – Substrate Connect provider + RPC helpers.

- `feat/crdt-storage` – Yjs store with IndexedDB + y-webrtc transport; wire screens.

- `feat/settlement-tx` – DOT send + inclusion verification; optional `system.remark`.

## Done criteria for MVP demo

- Connect wallet (SubWallet/Talisman/Polkadot.js).

- Create pot, add members (invite link/QR = signed payload), add expenses.

- See balances (client math).

- Settle via DOT on Westend/Asset Hub using TxSend; show tx hash + inclusion confirmation.

- Everything works offline-first; data persists locally; P2P sync works between two browsers.


