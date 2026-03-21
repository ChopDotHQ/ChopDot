# ChopDot

ChopDot is a group expense app for Polkadot-native settlement.

ChopDot has evolved across multiple hackathon iterations.

The product story stays consistent:

- everyday expense coordination stays simple and offchain
- settlement can stay familiar for normal users
- smart contracts are introduced only at the final settlement step, where they add verifiable tracking and proof

**Strategy (ICP, roadmap narrative, competitors):** see [`docs/CHOPDOT_2030_STRATEGIC_PLAN.md`](docs/CHOPDOT_2030_STRATEGIC_PLAN.md) (search the repo for `CHOPDOT_2030_STRATEGIC_PLAN`).

For the current release, ChopDot keeps everyday expense coordination offchain and adds an onchain closeout layer on Polkadot Hub:

- final closeout snapshots are anchored onchain
- settlement proof is recorded onchain
- DOT and USDC are both supported in the closeout-driven settlement flow

For this build, the live contract path is implemented with an **EVM smart contract on Polkadot Hub testnet**.
Earlier hackathon work around PVM/closeout experimentation is still preserved in the repo as background context and implementation history.

Important release note:

- the previously deployed contract at `0xBD55c27D3f9c2c832B50e4bAD289f5e03F65a142` must now be treated as **demo-only**
- a launch-intended build must use a newly redeployed contract from the current access-controlled `CloseoutRegistry.sol`
- frontend and wallet-auth rollout should happen in lockstep with that redeploy

## Hackathon Submission Summary

- Current track: `EVM Smart Contracts`
- Category: `Applications using Polkadot native assets`
- Product model: offchain expense management plus onchain final closeout proof
- Website: [chopdot.xyz](https://www.chopdot.xyz/)

## What We Shipped In This Release

- real EVM closeout contract deployed on Polkadot Hub testnet
- real DOT smart-settlement flow from the payer wallet
- real proof-recording transaction attached to the settlement package
- guided `Settle Up` flow with:
  - `Pay normally`
  - `Smart settle`
- account-picker support for multi-account Polkadot wallet users
- confirmation UI that exposes both payment and proof details for judges and advanced users

## Phase 0 Release Checklist

Before calling the Smart settle flow launch-ready, complete this release order:

1. Deploy the updated `wallet-auth` edge function.
2. Redeploy the closeout contract from the current contract lab source.
3. Set `VITE_ENABLE_PVM_CLOSEOUT=1`.
4. Set `VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS` to the new deployed contract address.
5. Deploy the frontend with the same wallet-auth message format and contract address.
6. Run one manual end-to-end smart-settle smoke test against the new contract.

Required app/runtime checklist:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_ENABLE_PVM_CLOSEOUT=1`
- `VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS=<new redeployed address>`
- wallet-auth edge function deployed with one-time, short-lived, rate-limited nonces
- allowed production/staging origins configured for wallet auth

Expected wallet requirements:

- a Polkadot-compatible wallet for DOT or USDC asset settlement
- an EVM-compatible wallet for Polkadot Hub contract writes

Smoke-test path:

1. Open a DOT or USDC pot with final balances.
2. Start `Smart settle`.
3. Approve package creation.
4. Approve payment.
5. Approve proof recording.
6. Verify the app lands on confirmation and shows the payment tx plus proof tx.

## What Is Offchain vs Onchain

### Offchain in ChopDot

- pot creation and member management
- expense entry and split calculation
- balances and settlement recommendations
- normal app persistence and collaboration flows

### Onchain in the closeout contract

- `createCloseout` anchors the final closeout snapshot and settlement legs
- `recordSettlementProof` records proof that a settlement leg was paid
- `markLegAcknowledged` marks a leg acknowledged
- `getCloseout` and `getLeg` expose closeout state for reads

The contract does not execute payouts, hold escrow, calculate balances, or replace ChopDot's offchain expense logic.

## Wallet Model

This release uses a hybrid wallet model:

- injected EVM wallet for Polkadot Hub closeout anchor and proof writes
- existing Polkadot asset rail for DOT and USDC settlement

That means judges and users should expect two related wallet capabilities in the full closeout path:

- an EVM-compatible wallet for Polkadot Hub contract interaction
- a Polkadot-compatible wallet for asset transfers

## User Flows Shipped

### Current smart-settlement flow

1. Open a pot with final balances.
2. Tap `Settle Up`.
3. Choose the person to settle with.
4. Choose one of two paths:
   - `Pay normally`
   - `Smart settle`
5. If `Smart settle` is chosen:
   - confirm the tab is final
   - start the smart settlement package onchain
   - complete settlement in DOT or USDC
   - record proof onchain against that settlement package
6. See the payment tx, settlement package id, proof tx, and final confirmation status in the app.

### DOT smart-settlement flow

1. Open a DOT pot with final balances.
2. Start `Smart settle`.
3. Approve the settlement-package creation onchain.
4. Approve the DOT payment.
5. Approve the proof-recording transaction.
6. Review the final confirmation screen with payment tx and proof tx.

### USDC smart-settlement flow

1. Open a USDC pot with final balances.
2. Start `Smart settle`.
3. Create the settlement package onchain.
4. Complete settlement in USDC.
5. Record the proof transaction onchain.
6. Review the final confirmation metadata in-app.

## Relationship To Earlier Hackathon Work

This repository contains both:

- the current **EVM smart-contract release path** on Polkadot Hub
- earlier **PVM/closeout exploration work**, simulated judge paths, and implementation notes from prior hackathon iterations

We keep both because they show the evolution of ChopDot:

- first, exploring the right settlement/finality model
- then, shipping a real browser-wallet-based EVM contract flow on Polkadot Hub testnet

The historical materials are useful context, but the primary live contract story for this release is the **EVM closeout contract**.

## Judge Quick Start

### Option 1: Run the app locally

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env
```

3. Fill in these required values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

### Option 2: Run the simulated Docker judge path

This is a simulated validation path from an earlier hackathon/dev flow. It is useful for fast judging and smoke testing, but it should not be confused with the current real EVM contract-backed flow.

```bash
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit
```

### Option 3: Run the Playwright smoke check

Start the app locally, then run:

```bash
node scripts/smoke-pvm-closeout.cjs
```

The smoke script writes a Markdown report to `artifacts/SMOKE_PVM_CLOSEOUT.md`.
The script name is historical; the current shipped live contract path is the EVM smart-settlement flow described above.

## Local Development

### Commands

```bash
npm run dev
npm run build
npx tsc --noEmit
npx vitest run
npx playwright test
npm run ci:fast
```

### Setup notes

- `vite.config.ts` validates required env vars at build time
- local mode is supported
- Supabase-backed mode is supported
- closeout behavior is feature-flagged behind `VITE_ENABLE_PVM_CLOSEOUT`
- secure smart-settlement releases also require `VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS`

## Smart Contract Lab

The isolated Polkadot Hub contract lab lives in [`scripts/polkadot-contract-lab`](scripts/polkadot-contract-lab).

Important:

- ChopDot users should never enter private keys anywhere in the product.
- Contract deployment is a developer/admin operation, not a user workflow.
- For demos and manual testnet deploys, prefer a browser-wallet deployment flow.
- The Hardhat `PRIVATE_KEY` path is only for disposable deployer accounts or CI, never for end users.

Recommended testnet deploy flow:

- use a funded EVM browser wallet on Polkadot Hub Testnet / Paseo Hub (smart contracts)
- deploy `CloseoutRegistry.sol` with an injected wallet signer
- copy the deployed contract address into `VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS`
- do not continue using older unauthenticated closeout deployments; treat them as demo-only

Optional Hardhat deploy flow (deployer-only):

```bash
cd scripts/polkadot-contract-lab
npm install
npm run rpc:check
npx hardhat vars set PRIVATE_KEY
npm run compile
npm run deploy:closeout:testnet
```

Use the Hardhat path only with a dedicated disposable deployer key.

Relevant contract files:

- `scripts/polkadot-contract-lab/contracts/CloseoutRegistry.sol`
- `scripts/polkadot-contract-lab/ignition/modules/CloseoutRegistry.ts`

## Evidence And What To Look At

For the current release, the strongest evidence artifacts are:

- demo video of the full smart-settlement flow
- in-app confirmation showing:
  - payment transaction
  - settlement package id
  - proof transaction
  - proof status
- Routescan proof transaction for the EVM contract write on Polkadot Hub testnet

Direct links:

- Demo video: [https://youtu.be/H-MhUNmsVf0](https://youtu.be/H-MhUNmsVf0)
- Proof transaction (Routescan): [https://polkadot.testnet.routescan.io/tx/0xca3f92db67343bed938971d168dc121a10f13364adf7ab4eb1c4275f1662bc4c](https://polkadot.testnet.routescan.io/tx/0xca3f92db67343bed938971d168dc121a10f13364adf7ab4eb1c4275f1662bc4c)
- Superseded demo-only contract: `0xBD55c27D3f9c2c832B50e4bAD289f5e03F65a142`
- Launch-intended contract: `0xfC4D75c8a56Caa6aDc9dD28d5879D6C1fF9467f7`

Historical simulation/evidence files from earlier hackathon work are still included below as supporting context.

## Verification

The minimum repo verification for this release is:

```bash
npx tsc --noEmit
npm run build
```

Recommended additional checks:

```bash
npm --prefix scripts/polkadot-contract-lab run test
npx vitest run
npx playwright test
node scripts/smoke-pvm-closeout.cjs
```

Manual verification should cover:

- DOT authenticated closeout flow
- USDC authenticated closeout flow
- guest/local closeout flow
- refresh persistence of closeout state and proof metadata
- one end-to-end smart-settle run against the newly redeployed contract address

## Demo and Evidence Artifacts

- Hackathon brief: [`docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md`](docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md)
- Contract lab README: [`scripts/polkadot-contract-lab/README.md`](scripts/polkadot-contract-lab/README.md)
- Background experiments: [`docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md`](docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md)
- Historical USDC notes: [`docs/USDC_IMPLEMENTATION_COMPLETE.md`](docs/USDC_IMPLEMENTATION_COMPLETE.md)
- Cypress simulated path: [`cypress/e2e/closeout_pvm.cy.ts`](cypress/e2e/closeout_pvm.cy.ts)
- Docker simulated path: [`docker-compose.e2e.yml`](docker-compose.e2e.yml)

## QA and testing documentation

- Exploratory QA matrix and defect register: [`docs/QA_EXPLORATION_LOG.md`](docs/QA_EXPLORATION_LOG.md)
- **Rolling synthesis** (where we excel, gaps, immediate fixes): [`docs/QA_EXPLORATION_LOG.md#synthesis-exceeds-gaps-immediate-fixes-rolling`](docs/QA_EXPLORATION_LOG.md#synthesis-exceeds-gaps-immediate-fixes-rolling)
- Automation sweep / fixes archive (for agents and engineers): [`docs/QA_AUTOMATION_AND_FIXES_LOG.md`](docs/QA_AUTOMATION_AND_FIXES_LOG.md)
- Commands and project conventions: [`AGENTS.md`](AGENTS.md)

## Current Release Notes

This release is intended to be submission-ready for the hackathon. It is not presented here as a fully generalized production banking system.

The strongest claims we make are:

- ChopDot is the offchain expense app
- final closeout is anchored onchain
- settlement proof is recorded onchain
- DOT and USDC are both supported in the closeout-driven settlement flow
- the live contract path in this release is an **EVM smart contract on Polkadot Hub**

The Docker and Cypress judge paths are simulated and are documented as such.
They are retained as part of the project’s earlier hackathon history, not as the main proof path for the current release.
