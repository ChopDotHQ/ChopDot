# Polkadot Hub Smart Contract Lab

Isolated sandbox for experimenting with Polkadot Hub's smart contract support without touching ChopDot runtime code.

## What this lab includes

- Hardhat + `@parity/hardhat-polkadot` configuration
- Minimal Solidity contract (`Storage.sol`)
- Hackathon closeout registry contract (`CloseoutRegistry.sol`)
- Testnet-only escrow vault contract (`ChopDotEscrowVault.sol`)
- Mock ERC20-style token contract (`ChopDotMockToken.sol`)
- Ignition deployment module
- RPC health check script

## Prerequisites

- Node.js 22+
- A funded EVM account on Polkadot Hub TestNet

## Safety model

- End users should never provide private keys to ChopDot.
- Contract deployment is a developer/admin task only.
- For manual testnet deploys, prefer an injected browser wallet signer.
- If you use the optional Hardhat `PRIVATE_KEY` flow, use a disposable deployer key only.
- Treat previously deployed closeout registry versions without leg-level authorization as demo-only.
- Before any real launch, redeploy from the current access-controlled contract build.

## Recommended testnet deploy

Use a funded EVM browser wallet on Polkadot Hub TestNet / Paseo Hub (smart contracts) and deploy the contract with a browser-wallet signer. After deployment, copy the deployed contract address into ChopDot:

```bash
VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS=0x...
```

## Optional Hardhat deploy (deployer-only)

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
npm install
npm run rpc:check
npx hardhat vars set PRIVATE_KEY
npm run compile
npm run deploy:closeout:testnet
```

The deploy command prints the deployed contract address. Keep it for interaction tests.
Use this path only with a dedicated disposable deployer key.

## Validate before redeploy

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
npm run test
```

## Escrow / atomicity lab

Local verification:

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
npm run test
```

Current coverage:

- native-value group expense deposits, approval, and release
- savings-circle release gating
- emergency-pot two-approver release gating
- community-pot mock `TEST_USDC` release
- duplicate deposit, wrong actor, early release, early refund, refund-after-deadline, and void authority

Testnet deploy commands:

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
npx hardhat vars set PRIVATE_KEY
npm run deploy:escrow:testnet
npm run deploy:mock-usdc:testnet
```

Use only a disposable funded Polkadot Hub TestNet EVM key. The official Polkadot docs state that Hardhat local tests run in Hardhat's own EVM, not the real Polkadot node, so a local green test is contract-semantics evidence but not live-chain proof.

Direct public-testnet deploy path used by the ChopDot escrow lab:

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
POLKADOT_HUB_TESTNET_PRIVATE_KEY=<funded-testnet-key> npm run deploy:escrow-direct:testnet
```

Public testnet scenario runner:

```bash
cd /Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab
CHOPDOT_USE_PUBLIC_HARDHAT_TEST_KEYS=1 npm run scenario:escrow-public:testnet
```

The scenario runner uses well-known public Hardhat dev keys only when explicitly enabled. This is acceptable for public testnet evidence and unsafe for any production or private-value environment.

## Network config used by default

- `polkadotHubTestnet`
  - RPC: `https://services.polkadothub-rpc.com/testnet`
  - Chain ID: `420420417`
- `polkadotHubMainnet`
  - RPC: `https://services.polkadothub-rpc.com/mainnet`
  - Chain ID: `420420419`

If these values change, update `hardhat.config.ts`.

## Optional: verify RPC endpoint manually

```bash
POLKADOT_HUB_RPC_URL=https://services.polkadothub-rpc.com/testnet node ./scripts/chain-health.mjs
```

## Files

- `contracts/Storage.sol` - test contract with read/write/double
- `contracts/CloseoutRegistry.sol` - closeout registry contract for anchoring settlement packages and proof, with leg-level authorization checks
- `contracts/ChopDotEscrowVault.sol` - testnet-only escrow/atomicity vault for ChopDot lab scenarios
- `contracts/ChopDotMockToken.sol` - minimal mock token for `TEST_USDC` style lab flows
- `ignition/modules/Storage.ts` - deployment module
- `ignition/modules/CloseoutRegistry.ts` - deployment module for the closeout registry
- `ignition/modules/ChopDotEscrowVault.ts` - deployment module for the escrow vault
- `ignition/modules/ChopDotMockUSDC.ts` - deployment module for mock `TEST_USDC`
- `hardhat.config.ts` - Polkadot Hub network config
- `scripts/chain-health.mjs` - RPC smoke check

## References

- [Polkadot smart contracts docs](https://docs.polkadot.com/smart-contracts/overview/)
- [Connect to Polkadot Hub](https://docs.polkadot.com/smart-contracts/connect/)
- [Use Hardhat with Polkadot Hub](https://docs.polkadot.com/smart-contracts/dev-environments/hardhat/)
- [Hardhat Polkadot plugin docs](https://hardhat-polkadot.com/)
