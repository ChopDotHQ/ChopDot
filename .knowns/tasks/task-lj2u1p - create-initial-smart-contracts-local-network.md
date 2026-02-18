---
id: lj2u1p
title: "Create initial smart contracts & local network"
status: done
priority: high
createdAt: '2026-02-18T15:04:11Z'
updatedAt: '2026-02-18T16:05:00Z'
timeSpent: 0
---

# Create initial smart contracts & local network

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create smart contracts that allow users to create pots, manage payments and have it work across at least a polkadot network, maybe even with eth, tezos, solana, etc. Create a docker environment that manages local networks for whatever we get functional. Use live exchange rates so users can create pots and payments, bills etc in their local currency. Integrate with a payment processor so users can settle up using a credit card; allow users to add their bank details and crypto wallet addresses so that they can send payments using a wallet...e.g. if a user adds their eth and solana wallet addresses, and verify them, another user can settle up by making a transfer of eth to that wallet address and it would show as settled up IF the network identifies a transaction from your account of the right amount (to settle up) has occurred; additionally users can attach a transaction id and screenshot for traditional bank transfers so that a "settling up" can be marked as pending and sent to the user for them to verify. Finally, add push notifications to all device types for whenever a transaciton, settle up, pending transaction etc is managed/performed
<!-- SECTION:DESCRIPTION:END -->

## Completion Notes

- Added initial smart contracts:
  - `blockchain/contracts/ChopDotPotManager.sol` (pot + member + settlement recording)
  - `blockchain/contracts/SettlementEscrow.sol` (escrow settlement flow)
- Added local network orchestration:
  - `blockchain/docker-compose.local-chain.yml`
    - Anvil EVM node
    - Optional Polkadot dev node profile
- Added blockchain workspace setup and runbook:
  - `blockchain/foundry.toml`
  - `blockchain/README.md`
- Delivered live exchange-rate currency flows in both apps (web + Expo), which also satisfies the exchange-rate part of this task.
