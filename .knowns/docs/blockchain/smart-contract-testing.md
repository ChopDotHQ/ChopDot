# Smart Contract Testing Guide for ChopDot
## Based on Parity Smart Contracts Tutorial

**Source:** https://data.parity.io/smart-contracts-tutorial  
**Date:** 2025-01-14  
**Purpose:** Guide for building first smart contract test for ChopDot

---

## Overview

This tutorial provides a step-by-step guide for developing, testing, and deploying smart contracts on Polkadot using **Foundry** (Polkadot fork) and a local development node. This is perfect for testing ChopDot's settlement functionality with smart contracts.

---

## Key Components

### 1. **Foundry (Polkadot Fork)**
- Development framework for smart contracts
- Uses `resolc` compiler for PVM (Polkadot Virtual Machine) support
- Provides `forge` (build/test) and `cast` (interact) tools

### 2. **Local Development Node**
- `revive-dev-node`: Local Polkadot node for testing
- `pallet-revive-eth-rpc`: Ethereum-compatible RPC server
- Pre-funded test accounts included

### 3. **Testing Workflow**
- Write contracts in Solidity
- Deploy to local node
- Test interactions using `cast` commands
- Verify functionality before mainnet deployment

---

## Step-by-Step Setup

### Step 1: Install Foundry (Polkadot Fork)

```bash
# Install Foundry
curl -L https://raw.githubusercontent.com/paritytech/foundry-polkadot/refs/heads/master/foundryup/install | bash

# Download precompiled binaries
foundryup-polkadot

# Build with PVM support
forge build --resolc
```

**Reference:** https://docs.polkadot.com/develop/smart-contracts/dev-environments/foundry/

---

### Step 2: Install Local Development Node

```bash
# Clone polkadot-sdk and checkout PVM branch
git clone https://github.com/paritytech/polkadot-sdk.git
cd polkadot-sdk
git checkout pba/bali

# Build revive-dev-node (release mode)
cargo build -p revive-dev-node --bin revive-dev-node --release

# Build eth-rpc server (release mode)
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
```

**Troubleshooting (macOS):**
If you get `librocksdb-sys` error:
```bash
brew install llvm
export LIBCLANG_PATH="/opt/homebrew/opt/llvm/lib"
export DYLD_LIBRARY_PATH="/opt/homebrew/opt/llvm/lib:$DYLD_LIBRARY_PATH"
```

**Run the local node:**
```bash
# Terminal 1: Run local node
./target/release/revive-dev-node --dev

# Terminal 2: Run RPC server
./target/release/eth-rpc --dev
```

**Note:** The node only produces blocks when there are transactions, so it may appear stuck on block #0.

**Reference:** https://docs.polkadot.com/develop/smart-contracts/local-development-node/

---

### Step 3: Create Test Project

```bash
# Create new Foundry project
forge init my-polkadot-project
cd my-polkadot-project
```

**Pre-funded Test Accounts:**
- **Alith:** `0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac`
  - Private key: Use official Substrate/Frontier dev keys from docs. Never commit real keys.
- **Baltathar:** `0x3Cd0A705a2DC65e5b1E1205896BAa2be8A07c6e0`
  - Private key: Use official Substrate/Frontier dev keys from docs. Never commit real keys.

---

## Example: Counter Contract

### Deploy Contract

```bash
forge create Counter \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY \
  --resolc \
  --broadcast
```

**Output:** Contract address (e.g., `0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3`)

---

### Interact with Contract

**Read data (call):**
```bash
cast call 0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3 "number()" \
  --rpc-url http://127.0.0.1:8545
```

**Write data (send):**
```bash
# Increment counter
cast send 0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3 "increment()" \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY

# Set counter to specific value
cast send 0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3 "setNumber(uint256)" 42 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY
```

**Key distinction:**
- `cast call`: Read-only operations (no gas cost)
- `cast send`: State-changing operations (requires private key, costs gas)

---

## Useful Commands

### Contract Inspection
```bash
# Get contract ABI
forge inspect Counter abi
```

### Transaction Info
```bash
# Get transaction receipt
cast receipt 0x44908f638852f3d4289cf84a5ae6427d3ffa0f517b63ea402c429a4d110c25c6 \
  --rpc-url http://127.0.0.1:8545
```

### Account Management
```bash
# Check account balance
cast balance 0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac \
  --rpc-url http://127.0.0.1:8545
```

### Gas Estimation
```bash
# Estimate gas for transaction
cast estimate 0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3 "increment()" \
  --rpc-url http://127.0.0.1:8545
```

---

## How to Use This for ChopDot

### Why Pot Rules Are the Best First Test

**Pot rules** encode ChopDot's core business logic and are more valuable than simple settlement contracts because they:

1. **Test Multiple Features at Once**
   - Budget limits and enforcement
   - Checkpoint confirmation workflows
   - Expense attestation rules
   - Member role permissions
   - Pot mode behavior (casual vs. auditable)

2. **Represent Real User Flows**
   - Users interact with pots, not just settlements
   - Rules govern how pots behave
   - Validates complex state transitions

3. **Unique Business Logic**
   - Settlement contracts are generic (any app can do this)
   - Pot rules are specific to ChopDot's value proposition
   - Tests the "why use ChopDot" features

4. **Better Test Coverage**
   - Validates business rules before mainnet
   - Catches edge cases in rule enforcement
   - Tests gas costs for rule checks

### Recommended First Test: Pot Rules Contract

**What to Test:**

1. **Budget Enforcement**
   ```solidity
   // Rule: Cannot add expense if it exceeds budget
   function addExpense(uint256 amount) {
     require(totalExpenses + amount <= budget, "Over budget");
     // ... add expense
   }
   ```

2. **Checkpoint Rules**
   ```solidity
   // Rule: All members must confirm before settling
   function confirmCheckpoint() {
     require(!hasConfirmed[msg.sender], "Already confirmed");
     confirmations[msg.sender] = true;
     if (allConfirmed()) {
       enableSettlement();
     }
   }
   ```

3. **Attestation Rules**
   ```solidity
   // Rule: Cannot attest your own expenses
   function attestExpense(uint256 expenseId) {
     require(expenses[expenseId].paidBy != msg.sender, "Cannot attest own");
     require(!attestations[expenseId][msg.sender], "Already attested");
     attestations[expenseId][msg.sender] = true;
   }
   ```

4. **Member Role Permissions**
   ```solidity
   // Rule: Only owner can modify pot settings
   function updateBudget(uint256 newBudget) {
     require(members[msg.sender].role == Role.Owner, "Not owner");
     budget = newBudget;
   }
   ```

5. **Pot Mode Behavior**
   ```solidity
   // Rule: Auditable mode requires attestations for all expenses
   function addExpense(uint256 amount) {
     if (mode == Mode.Auditable) {
       require(attestations[expenseId].length >= minAttestations, "Need attestations");
     }
     // ... add expense
   }
   ```

**Test Flow:**
1. Deploy pot rules contract to local node
2. Create a pot with budget limit
3. Add expenses (test budget enforcement)
4. Test checkpoint confirmation workflow
5. Test attestation rules (can't attest own)
6. Test role-based permissions
7. Verify gas costs for each operation
8. Compare on-chain vs. off-chain rule enforcement

### Other Potential Use Cases

1. **Settlement Smart Contract**
   - Test DOT/USDC settlement logic
   - Verify multi-party payment splitting
   - Test gas costs before mainnet deployment
   - **Note:** Simpler, but less unique to ChopDot

2. **Receipt Storage Contract**
   - Test IPFS hash storage
   - Verify receipt verification logic
   - Test gas-efficient storage patterns

### Why Pot Rules > Settlement Contract

**Settlement Contract Issues:**
- ❌ Generic functionality (any app can do this)
- ❌ Doesn't test ChopDot's unique features
- ❌ Simple payment splitting (not complex business logic)
- ❌ Doesn't validate user workflows

**Pot Rules Advantages:**
- ✅ **Tests ChopDot's core value proposition**
  - Budget enforcement
  - Checkpoint workflows
  - Attestation rules
  - Member permissions
- ✅ **Validates complex state transitions**
  - Casual vs. auditable modes
  - Checkpoint confirmations
  - Expense validation
- ✅ **Tests multiple features at once**
  - One contract tests many rules
  - Better test coverage
  - Catches edge cases
- ✅ **More representative of user experience**
  - Users interact with pots, not just settlements
  - Rules govern how pots behave
  - Validates the "why use ChopDot" features

### ChopDot Pot Rules to Test

Based on the codebase, here are the key rules:

1. **Budget Rules**
   - `budgetEnabled`: Boolean flag
   - `budget`: Maximum spending limit
   - Rule: Cannot add expense if `totalExpenses + amount > budget`

2. **Checkpoint Rules**
   - `checkpointEnabled`: Boolean flag
   - `currentCheckpoint.status`: 'pending' | 'confirmed' | 'bypassed'
   - Rule: All members must confirm before settling
   - Rule: Adding expense after confirmation resets that member's confirmation

3. **Attestation Rules**
   - `expense.attestations`: Array of member IDs
   - Rule: Cannot attest your own expenses
   - Rule: Cannot attest twice
   - Rule: More attestations = more trust

4. **Pot Mode Rules**
   - `mode`: 'casual' | 'auditable'
   - Casual: No confirmations required
   - Auditable: Requires attestations for expenses

5. **Member Role Rules**
   - `member.role`: 'Owner' | 'Member'
   - Rule: Only owner can modify pot settings
   - Rule: All members can add expenses (if not over budget)

6. **Expense Validation Rules**
   - `expense.paidBy` must be valid member ID
   - `expense.amount` must be >= minimum (0.01 USD or 0.000001 DOT)
   - `expense.memo` must not be empty

### Integration Points

**ChopDot Services to Test:**
- `src/schema/pot.ts` - Pot schema and validation rules
- `src/services/data/services/PotService.ts` - Business logic layer
- `src/services/settlement/calc.ts` - Settlement calculations
- `src/services/crdt/checkpointManager.ts` - Checkpoint storage
- `src/App.tsx` - Attestation and checkpoint workflows

**Test Flow:**
1. Deploy pot rules contract to local node
2. Create pot with budget and checkpoint enabled
3. Add members with different roles
4. Test adding expenses (budget enforcement)
5. Test checkpoint confirmation workflow
6. Test attestation rules (can't attest own)
7. Test role-based permissions
8. Compare gas costs vs. off-chain validation
9. Verify rules match TypeScript implementation

---

## JAM Alignment Assessment

### What is JAM?

**Join-Accumulate Machine (JAM)** is the transformative redesign of Polkadot's core architecture, planned as the successor to the current relay chain. Key improvements include:

1. **Permissionless Code Execution**
   - Services can be deployed without governance approval
   - More flexible and generic execution model
   - Removes opinions and constraints while maintaining security

2. **More Effective Block Time Utilization**
   - Efficient pipeline processing model
   - Prior state root in block headers (instead of posterior)
   - Better utilization of block time for computations

3. **Single Complete Upgrade**
   - Rolled out as one complete upgrade (not stream of updates)
   - Minimizes developer overhead for breaking changes
   - Clean migration path

**Reference:** [JAM and the Road Ahead](https://docs.polkadot.com/reference/polkadot-hub/consensus-and-security/relay-chain/#jam-and-the-road-ahead)

---

### Current ChopDot Architecture

**How ChopDot Uses Polkadot Today:**

1. **Direct Chain Interactions** (via `@polkadot/api`)
   - Sends DOT/USDC via extrinsics
   - Uses `ApiPromise` for RPC connections
   - Wallet integration (Polkadot.js, SubWallet, Talisman, WalletConnect)

2. **Off-Chain Logic** (Current State)
   - Pot rules enforced in TypeScript (`src/schema/pot.ts`)
   - Data stored in localStorage/Supabase
   - Settlement calculations off-chain
   - Checkpoint and attestation logic in app layer

3. **Smart Contracts** (Planned, Not Yet Implemented)
   - Pot rules contracts (this guide's focus)
   - Settlement contracts (future)
   - Receipt storage contracts (future)

**Current Files:**
- `src/services/chain/polkadot.ts` - Direct chain interactions
- `src/services/chain/adapter.ts` - Settlement sending
- `src/services/chain/walletconnect.ts` - Wallet connections

---

### JAM Alignment Analysis

#### ✅ **Well-Aligned Areas**

1. **Permissionless Deployment**
   - **Current:** ChopDot doesn't use smart contracts yet (no governance needed)
   - **With JAM:** Pot rules contracts can be deployed permissionlessly
   - **Benefit:** No governance approval needed for ChopDot's business logic contracts
   - **Action:** Design contracts to be deployable without governance

2. **Generic Execution Model**
   - **Current:** Uses standard Polkadot API patterns
   - **With JAM:** More flexible execution model supports various contract types
   - **Benefit:** Pot rules contracts can use generic execution patterns
   - **Action:** Design contracts to be generic and reusable

3. **Efficient Block Time**
   - **Current:** Direct extrinsics (already efficient)
   - **With JAM:** Even more efficient block utilization
   - **Benefit:** Lower gas costs for settlement transactions
   - **Action:** Test gas costs on JAM testnet when available

#### ⚠️ **Areas Requiring Attention**

1. **Migration Path**
   - **Current:** No smart contracts deployed yet
   - **With JAM:** Single complete upgrade (not incremental)
   - **Benefit:** Clean slate - no migration needed
   - **Action:** Wait for JAM testnet before deploying production contracts

2. **Breaking Changes**
   - **Current:** Using `@polkadot/api` (may need updates)
   - **With JAM:** API changes expected
   - **Benefit:** Single upgrade minimizes migration work
   - **Action:** Monitor JAM development, test on testnet first

3. **Contract Architecture**
   - **Current:** Planning pot rules contracts
   - **With JAM:** Need to ensure contracts are JAM-compatible
   - **Benefit:** Permissionless deployment model
   - **Action:** Design contracts with JAM's execution model in mind

---

### Recommended Approach for JAM

#### Phase 1: Current (Pre-JAM)
1. ✅ **Continue with direct extrinsics** for settlements
2. ✅ **Keep pot rules off-chain** (TypeScript validation)
3. ✅ **Test smart contracts on local node** (this guide)
4. ✅ **Design contracts to be JAM-compatible**

#### Phase 2: JAM Testnet (When Available)
1. 🔄 **Deploy pot rules contracts to JAM testnet**
2. 🔄 **Test permissionless deployment**
3. 🔄 **Verify gas costs and efficiency**
4. 🔄 **Test migration from off-chain to on-chain rules**

#### Phase 3: JAM Mainnet (Post-Launch)
1. 🎯 **Deploy pot rules contracts permissionlessly**
2. 🎯 **Migrate critical rules on-chain**
3. 🎯 **Keep optional features off-chain** (for flexibility)
4. 🎯 **Monitor gas costs and optimize**

---

### JAM-Specific Recommendations

1. **Design Contracts for Permissionless Deployment**
   ```solidity
   // Good: Generic contract that can be deployed by anyone
   contract PotRules {
       // No governance dependencies
       // Self-contained logic
   }
   ```

2. **Use Generic Execution Patterns**
   - Avoid Polkadot-specific assumptions
   - Design for JAM's generic execution model
   - Test on both current and JAM testnets

3. **Plan for Single Upgrade**
   - Design contracts to be future-proof
   - Avoid dependencies on current relay chain specifics
   - Use standard Solidity patterns

4. **Test Gas Efficiency**
   - JAM's efficient block time = lower gas costs
   - Test gas costs on JAM testnet
   - Optimize for JAM's execution model

---

### Alignment Score: ✅ **8/10**

**Strengths:**
- ✅ No existing contracts to migrate (clean slate)
- ✅ Using standard Polkadot API patterns
- ✅ Planning smart contracts (can design for JAM)
- ✅ Off-chain logic provides flexibility

**Areas to Watch:**
- ⚠️ `@polkadot/api` may need updates for JAM
- ⚠️ Wait for JAM testnet before production deployment
- ⚠️ Monitor JAM development timeline

**Recommendation:** 
ChopDot is well-positioned for JAM. The current architecture (off-chain rules, direct extrinsics) provides flexibility. When JAM launches, ChopDot can deploy pot rules contracts permissionlessly without migration overhead. The key is to design contracts now with JAM's execution model in mind.

---

## Next Steps

1. **Set up local environment** (Steps 1-2)
2. **Create test project** (Step 3)
3. **Write first contract** (pot rules contract, JAM-compatible)
4. **Deploy and test** using `cast` commands
5. **Design for JAM** (permissionless, generic execution)
6. **Test on JAM testnet** (when available)
7. **Integrate with ChopDot** TypeScript services

---

## Resources

- **Foundry Docs:** https://docs.polkadot.com/develop/smart-contracts/dev-environments/foundry/
- **Local Node Docs:** https://docs.polkadot.com/develop/smart-contracts/local-development-node/
- **Tutorial Source:** https://data.parity.io/smart-contracts-tutorial
- **JAM Overview:** https://docs.polkadot.com/reference/polkadot-hub/consensus-and-security/relay-chain/#jam-and-the-road-ahead

---

## Notes

- Local node only produces blocks when there are transactions
- Use `--resolc` flag for PVM support
- Pre-funded accounts available for testing
- RPC endpoint: `http://127.0.0.1:8545`
- Test thoroughly on local node before mainnet deployment
- **Design contracts for JAM compatibility** (permissionless, generic execution)

---

**Ready to build! 🚀**
