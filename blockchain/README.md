# ChopDot Blockchain MVP

This directory provides an initial smart-contract and local-network foundation for the `.knowns` blockchain task.

## Included

- `contracts/ChopDotPotManager.sol`
  - Pot creation
  - Member enrollment
  - Settlement event recording
- `contracts/SettlementEscrow.sol`
  - Escrow-style payment flow for settlement confirmation/refund
- `docker-compose.local-chain.yml`
  - Local Anvil node (default)
  - Optional Polkadot dev node profile (defaults to `parity/polkadot:latest`)

## Start local chain(s)

```bash
docker compose -f blockchain/docker-compose.local-chain.yml up -d
```

Start optional Polkadot dev node too:

```bash
docker compose -f blockchain/docker-compose.local-chain.yml --profile polkadot up -d

# Optional: override image in CI or if you have access to a revive node image
# REVIVE_DEV_NODE_IMAGE=ghcr.io/paritytech/revive-dev-node:latest
```

## Stop

```bash
docker compose -f blockchain/docker-compose.local-chain.yml down
```

## Foundry setup

This repo does not vendor Foundry binaries. Install Foundry locally, then:

```bash
cd blockchain
forge build
forge test
```

## App integration notes

- Web + Expo can continue using existing wallet/address flows.
- The `ChopDotPotManager` events are suitable for indexing settlement history and cross-client notifications.
- Multi-chain settlement support (ETH/Solana/Polkadot finality confirmation) can be added by introducing chain adapters that map into the `recordSettlement` event model.
