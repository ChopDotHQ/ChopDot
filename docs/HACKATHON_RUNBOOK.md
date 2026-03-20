# Hackathon Runbook

## Goal

Run one stable judge demo path:

1. open the seeded demo pot
2. show readiness
3. anchor closeout
4. continue to settlement
5. show history and proof status

Keep simulation and live-chain rehearsals separate.

## Demo Modes

### Rehearsal mode

Use this when you want the full app flow without wallets or live writes:

```bash
npm run demo:hackathon:sim
```

This enables:

- guest auto-login
- hackathon seed data
- simulated closeout anchor
- simulated payment rail
- simulated proof rail

### Live mode

Use this when you want to rehearse the actual contract and wallet flow:

```bash
VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS=0x... \
VITE_PVM_CLOSEOUT_RPC_URL=https://services.polkadothub-rpc.com/testnet \
VITE_PVM_CLOSEOUT_CHAIN_ID=420420417 \
VITE_PVM_CLOSEOUT_CHAIN_NAME="Polkadot Hub Testnet" \
npm run demo:hackathon:live
```

This keeps the seeded demo pots, but uses the real contract config you provide.

## Seeded Demo Data

When `VITE_HACKATHON_DEMO_MODE=1`, the app seeds two pots in local mode:

- `Hackathon Demo: Builder Dinner`
  - ready to anchor and settle
- `Hackathon Demo: Proof Recovery`
  - active closeout with a proof-pending settlement

The app also seeds a large mock DOT balance for simulation mode.

## Required Live Demo Inputs

- funded Polkadot wallet for the payment rail
- funded 0x wallet for the proof rail
- deployed `CloseoutRegistry` address
- correct Polkadot Hub RPC and chain id
- valid SS58 member payment wallets
- valid 0x member proof wallets

## Wallet Model

ChopDot uses one member identity with two optional onchain rails:

- `Payment rail`
  - Polkadot SS58 wallet
  - receives or sends the DOT settlement
- `Proof rail`
  - 0x wallet on Polkadot Hub
  - anchors the closeout and records settlement proof

For the live demo, show this as:

1. DOT payment goes to the member's Polkadot wallet
2. ChopDot records proof on Polkadot Hub with the proof wallet

Do not explain this as "Ethereum settlement." The 0x wallet is only the contract-proof rail.

## Preflight Before Judges Arrive

1. Run the browser suite in Docker:

```bash
docker compose -f docker-compose.e2e.yml run --rm e2e --spec cypress/e2e/closeout_pvm.cy.ts
```

2. Run the closeout unit tests:

```bash
npm run test:unit:closeout
```

3. If you have the deployed contract and a funded EVM key, run the live smoke:

```bash
PVM_CLOSEOUT_PRIVATE_KEY=0x... \
PVM_CLOSEOUT_CONTRACT_ADDRESS=0x... \
PVM_CLOSEOUT_RPC_URL=https://services.polkadothub-rpc.com/testnet \
npm run smoke:pvm-closeout:live
```

The smoke report is written to `artifacts/LIVE_PVM_CLOSEOUT_SMOKE.md`.

## Judge Demo Sequence

### Primary path

1. Open `Hackathon Demo: Builder Dinner`
2. Point out the hackathon readiness card
3. Click `Closeout onchain`
4. Show the preflight checklist and point out payment rail vs proof rail
5. Anchor the closeout
6. Continue to settlement
7. Complete one DOT payment
8. Show the proof rail attaching to the closeout
9. Open history and show proof status

### Recovery path

1. Open `Hackathon Demo: Proof Recovery`
2. Click `Settle Up`
3. Open `History`
4. Click `Retry proof recording`
5. Show proof status transition to `completed`

## Failure Recovery

- If the proof write fails but payment succeeded:
  - open history
  - use `Retry proof recording`
- If the live contract looks wrong:
  - rerun `npm run smoke:pvm-closeout:live`
- If wallet UX is flaky:
  - fall back to `npm run demo:hackathon:sim`
  - explain that the same UX path is being exercised with simulated chain confirmation
