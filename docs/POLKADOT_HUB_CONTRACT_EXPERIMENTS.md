# Polkadot Hub Contract Experiments for ChopDot

This is a practical plan for testing Polkadot Hub smart contracts in parallel with the ongoing `App.tsx` modularization work.

## Goal

Validate whether ChopDot should move selected business rules from app logic to contracts.

## Lab location

- `/Users/devinsonpena/ChopDot/scripts/polkadot-contract-lab`

## Experiment track

1. Baseline deploy
- Deploy `Storage.sol` to confirm end-to-end tooling and wallet funding.
- Capture deployment metadata (address, tx hash, block, deployer).

2. Pot rules prototype
- Build a minimal `PotRules.sol` contract with:
  - `setBudget(uint256)`
  - `addExpense(uint256 amount, address payer)`
  - `isOverBudget()`
- Keep this contract isolated from app code at first.

3. Attestation checkpoint prototype
- Add checkpoint confirmation functions:
  - `startCheckpoint(bytes32 expenseSetHash)`
  - `confirmCheckpoint(bytes32 expenseSetHash)`
  - `isCheckpointFinalized(bytes32 expenseSetHash)`
- Compare contract-state outcomes with existing app rules.

4. Read-only integration spike in ChopDot
- Add a non-blocking read path in chain services that queries contract state.
- Do not gate UX flows on contract writes yet.

## Success criteria

- One contract deployed on testnet and readable from script.
- At least one ChopDot rule represented on-chain and validated against existing behavior.
- No regressions in current app flows (keep contract integration optional behind a feature flag).

## Risks and controls

- Contract risk: Keep prototypes isolated under `scripts/polkadot-contract-lab`.
- Refactor collision risk: Avoid changes in `App.tsx` while that workstream is active.
- Network/config drift: Verify RPC + chain IDs before each deploy (`npm run rpc:check`).

## Official references

- https://docs.polkadot.com/develop/smart-contracts/
- https://docs.polkadot.com/develop/smart-contracts/connect-to-polkadot/
- https://hardhat-polkadot.com/
