# ChopDot

> Status: Work in Progress (MVP). Features, architecture, and integrations are evolving. Some product choices are not final; wallet flows and on‑chain anchoring are planned but not yet finalised.

Mobile-first expense splitting and group financial management app prototype.

This repository consolidates the ChopDot Mobile Wireframe codebase and the existing GitHub repository metadata (README and license).

## Why ChopDot

ChopDot brings familiar group-expense flows to a world where fairness and verifiability are the default. It marries a polished, mobile‑first UX with optional Web3 proofs so friends, teams and communities can settle up confidently—no spreadsheets, no guesswork.

### Core principles
- Transparency by default – optional, verifiable proofs when it matters
- Fairness built‑in – clear splits, no hidden fees
- Interoperability – works great without a wallet; even better with one
- Ownership – your data lives with you

## What's in the MVP today
- Mobile‑first PWA matching the wireframes (iPhone 15 viewport)
- Group ledger UI: add expenses, see balances, prototype settlement flows
- Local‑first persistence to keep state between sessions
- Clean design system (CSS variables) and fast, modern stack (Vite + TS)
- Member wallet addresses: Members can have an optional Polkadot wallet address. Any SS58 address is accepted; addresses are normalized to SS58-0 (Polkadot format) for display and settlements.

## What’s next
- Wallet connection (Polkadot.js / SubWallet) with smooth onboarding
- On‑chain anchoring on Asset Hub for accountable settlements
- Multi‑wallet options and exploration towards JAM‑native patterns

## Built for Polkadot
Designed for composability and multi‑chain collaboration. We start off‑chain for speed, and add on‑chain verification where it delivers real value.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- ShadCN UI components

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

- Temporary page to test a real DOT transfer on Polkadot mainnet.
- Open `/chain-test` (e.g., `http://localhost:5173/chain-test`). You need a Substrate wallet extension (SubWallet, Talisman, or Polkadot.js) and real DOT.
- Suggested test amount: 0.01 DOT. Network fees apply.
- After sending, view the transaction on Polkadot Subscan: `https://polkadot.subscan.io/extrinsic/<txHash>`.

### Demo Mode

For safe public demos, you can enable a restricted mode that disables wallet connections and message signing.

- Set the feature flag in the browser:
  - Open DevTools Console and run: `localStorage.setItem('flag_DEMO_MODE', 'true')` then reload.
- Behaviour:
  - Wallet UI buttons will show a harmless toast and not open the wallet sheet.
  - Debug helpers are not exposed in production builds.

## Notes

- Source originated from the ChopDot Mobile Wireframe export (see design reference) and is adapted for local development.

