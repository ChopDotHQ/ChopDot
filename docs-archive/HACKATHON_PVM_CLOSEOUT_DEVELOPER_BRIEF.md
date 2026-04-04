# ChopDot PVM Closeout Developer Brief

## Document Purpose

This document is the single source of truth for the hackathon build brief.

Its job is to give one developer enough context to:

- understand what we are building
- understand why this is the right scope for ChopDot
- know which current systems to reuse
- know which new systems to add
- know what is explicitly out of scope
- implement a stable first version that can be handed back for product polish and demo preparation

This is a developer handoff document, not a pitch deck.

## Plain English Summary

This section exists so the product intent is obvious before the technical detail begins.

### Are we creating a smart contract?

Yes, but it should be a small one.

We are not putting the whole app onchain.

We are creating a smart contract that acts like a shared closeout record for final settlement.

In plain English, the contract should say:

- these are the final balances for this group
- this settlement leg was paid
- this group closeout is complete

### What is ChopDot doing versus what is the contract doing?

ChopDot still does the normal product work:

- create pots
- add expenses
- manage members
- calculate who owes whom
- guide the user through settlement

The contract only handles the final trust layer:

- store the final closeout record
- store proof that settlement happened
- mark the closeout completed

### Where does the smart contract live?

It lives in two places:

1. In the repo as source code
   - under the existing contract lab in `scripts/polkadot-contract-lab/`
2. Onchain after deployment
   - deployed to a Polkadot Hub / PVM testnet for the hackathon

### What should the user experience feel like?

The user should feel like they are using ChopDot, not a blockchain dashboard.

The ideal experience is:

1. add expenses normally
2. review final balances normally
3. tap a simple action like `Closeout onchain` or `Record settlement`
4. ChopDot handles the contract step in the background
5. the app shows simple results such as:
   - `Settled`
   - `Recorded onchain`
   - `View proof`

The user should not need to understand:

- PVM
- contract addresses
- hashes
- chain internals

Those details should only appear in an optional details or proof section.

### How do we reduce user friction?

We reduce friction by following these rules:

- only use the contract at the very end of the flow
- do not put everyday expense entry onchain
- do not require users to understand the contract
- do not force users to interact with many blockchain-specific steps
- keep the closeout action simple and clearly labeled
- hide tx hashes and technical proof details unless the user wants them
- preserve the current ChopDot flow as much as possible

### What product should we expect if this is implemented correctly?

The finished product should feel like:

ChopDot with a smart-contract-backed final settlement proof.

Or even more simply:

ChopDot stays the app, and the smart contract quietly proves that the final group settlement really happened.

## Project Decision

### Project Name

ChopDot PVM Closeout

### Hackathon Track

Track 2: PVM Smart Contracts

### Track Category

Applications using Polkadot native Assets

### One Sentence Summary

ChopDot remains the offchain expense-splitting app, while final group settlement is anchored in a PVM smart contract that records closeout state, settlement proof, and completion status.

## Why This Project

This is the best balance of:

- feasible in hackathon time
- aligned with ChopDot's current product
- materially improved by a smart contract
- credible for a Polkadot-native submission

### Why this fits ChopDot

ChopDot already does the hard consumer-app work:

- pot creation
- expense entry
- group balances
- settlement recommendation UI
- native asset settlement flows

The current app is already good at day-to-day social finance UX. The missing piece is a shared, tamper-resistant, onchain closeout state for final settlement.

That is what the PVM contract adds.

### What not to do

Do not move the full expense app onchain.

That would hurt:

- feasibility
- UX
- scope control
- demo stability

The contract should anchor final state, not replace the product.

## Product Thesis

People do not want to log every dinner split or taxi receipt onchain.

People do care that final balances are:

- mutually visible
- harder to tamper with
- provable after payment
- auditable later

So the correct architecture is:

- offchain for collaborative expense management
- onchain for final closeout and proof

## Core Product Definition

### What we are building

An end-to-end ChopDot flow where:

1. users create a pot and add expenses
2. ChopDot computes final net settlement legs
3. a PVM smart contract stores an onchain closeout record
4. users complete settlement using native Polkadot assets
5. ChopDot records proof of those payments against the closeout
6. the app shows closeout status and settlement proof in history and confirmation views

### What stays offchain

These remain in ChopDot and do not belong in the smart contract:

- pot creation
- member management
- expense entry
- split editing
- running totals
- balance calculation UI
- activity feed
- normal app persistence

### What moves onchain

These become PVM closeout responsibilities:

- create a closeout record
- anchor a hash of the final settlement package
- optionally store participant approvals
- record completed settlement legs
- mark the closeout completed
- emit events for proof and history

## The Smart Contract Role

The smart contract is the closeout layer.

It is not:

- the expense ledger
- the split calculation engine
- an escrow vault in MVP
- the full payment router

The right mental model is:

ChopDot handles the social coordination.

The PVM contract handles final settlement truth.

## Demo Story

### Judge-friendly demo flow

1. Open an existing pot in ChopDot
2. Show that the group has several expenses and non-zero balances
3. Tap a new CTA such as `Closeout onchain`
4. Review the computed settlement legs
5. Anchor the closeout in the PVM contract
6. Complete one or more native asset settlement legs
7. Show that ChopDot records proof against the closeout
8. Open the success screen and history to show:
   - payment tx hash
   - closeout id
   - proof tx hash
   - closeout status
9. Explain that daily expense collaboration stays offchain, but final settlement becomes shared and auditable onchain

## Scope Decision

### MVP scope

The MVP should deliver one strong happy path:

- create closeout
- anchor closeout onchain
- complete native asset settlement
- record settlement proof
- surface proof in app UI
- show completed closeout state

### Out of scope for MVP

Do not build these unless the core flow is already stable:

- full onchain expense tracking
- escrowed group vaults
- automatic dispute resolution
- major backend rewrite
- AI features
- complex bridge-first flow
- mandatory wallet architecture rewrite across the whole app
- contract-based balance calculation

## Existing Codebase Assets To Reuse

The implementation should reuse current ChopDot systems wherever possible.

### Current settlement and chain assets

- `src/services/chain/polkadot.ts`
  - native chain transaction logic
  - DOT and USDC send flow
- `src/services/chain/adapter.ts`
  - chain service interface boundary
- `src/services/chain/index.ts`
  - chain service loader
- `src/utils/settlements.ts`
  - settlement calculations
- `src/services/data/services/SettlementService.ts`
  - settlement history write path
- `src/components/screens/SettleHome.tsx`
  - settlement screen and transaction UX
- `src/components/screens/ExpensesTab.tsx`
  - settlement suggestion and history integration
- `src/components/screens/SettlementConfirmation.tsx`
  - post-settlement success UI
- `src/components/screens/SettlementHistory.tsx`
  - settlement history view
- `src/schema/pot.ts`
  - pot schema and history schema
- `src/types/app.ts`
  - pot and settlement runtime types

### Current contract lab

- `scripts/polkadot-contract-lab/contracts/Storage.sol`
- `scripts/polkadot-contract-lab/README.md`

This existing lab should be the starting point for the new PVM contract work.

## Key Constraint

ChopDot today is more mature on the native asset and Substrate side than on the dedicated EVM wallet side.

This means the contract integration must be:

- feature flagged
- additive
- non-destructive
- isolated from existing settlement flow

The MVP should not require rebuilding the app's wallet architecture.

## Feature Flag Requirement

All new closeout logic must be behind a feature flag.

### Add environment variable

`VITE_ENABLE_PVM_CLOSEOUT=1`

### Behavioral requirement

If the flag is off:

- the app should behave exactly as it does today
- no closeout UI should appear
- no closeout service should load

## Product Model

We need a new app concept: `Closeout`.

### Closeout definition

A closeout is the final settlement package for one pot at one point in time.

It packages:

- who owes whom
- in what asset
- for how much
- under what snapshot of the pot state
- whether those legs have been completed

### Settlement leg definition

A settlement leg is one directed payment obligation in a closeout.

Example:

- Alice pays Bob 12.50 USDC
- Alice pays Carla 4.20 USDC

That produces:

- 1 closeout
- 2 settlement legs

## New App Data Model

The app should add a `CloseoutRecord`.

Suggested TypeScript shape:

```ts
export type CloseoutRecord = {
  id: string;
  potId: string;
  asset: 'DOT' | 'USDC';
  snapshotHash: string;
  metadataHash?: string;
  contractAddress?: string;
  closeoutId?: string;
  contractTxHash?: string;
  status: 'draft' | 'anchored' | 'active' | 'partially_settled' | 'completed' | 'cancelled';
  createdByMemberId: string;
  createdAt: number;
  participantMemberIds: string[];
  participantAddresses: string[];
  settledLegCount: number;
  totalLegCount: number;
  legs: Array<{
    index: number;
    fromMemberId: string;
    toMemberId: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    asset: 'DOT' | 'USDC';
    settlementTxHash?: string;
    proofTxHash?: string;
    status: 'pending' | 'paid' | 'proven' | 'acknowledged';
  }>;
};
```

## Schema Strategy

### Recommendation

For hackathon speed, add closeouts directly to the pot model.

Add:

- `closeouts?: CloseoutRecord[]`

to the pot schema and runtime type.

This is faster than introducing a separate persistence system.

### Required schema work

Update:

- `src/schema/pot.ts`
- `src/types/app.ts`

Also extend settlement history records with optional proof metadata.

Suggested optional settlement history fields:

- `closeoutId?: string`
- `proofTxHash?: string`
- `proofStatus?: 'anchored' | 'recorded' | 'completed'`
- `proofContract?: string`

## Navigation and Screen Changes

We should introduce one new screen:

- `CloseoutReview`

### Purpose

This screen lets the user review the final settlement package before anchoring it onchain.

### Suggested flow

- PotHome or ExpensesTab
- CloseoutReview
- Anchor closeout
- Existing settlement flow
- SettlementConfirmation with proof data

### Suggested nav addition

Add a screen like:

```ts
| { type: "closeout-review"; potId: string }
```

to `src/nav.ts`, then route it in the app router.

## Screen-by-Screen Responsibilities

### PotHome / ExpensesTab

Add a CTA:

- `Closeout onchain`

Only show when:

- the pot is an expense pot
- the base currency is `DOT` or `USDC`
- there are non-zero settlement legs
- required member addresses exist

If addresses are missing, show a clear warning and block closeout creation.

### CloseoutReview

This screen should show:

- pot name
- base asset
- list of settlement legs
- participant addresses
- snapshot hash preview
- simple explanation of what onchain closeout means

Primary CTA:

- `Anchor closeout`

Secondary CTA:

- `Cancel`

### SettleHome

If the user is settling a leg that belongs to a closeout, show:

- closeout id
- leg index
- proof status

After native asset transfer succeeds:

- record the settlement leg against the contract
- persist proof details locally

### SettlementConfirmation

Extend to display:

- payment tx hash
- closeout id
- proof tx hash
- proof contract address or proof link
- closeout status

### SettlementHistory

Show:

- which settlement entries belong to a closeout
- partial vs completed closeout state
- proof state in human-readable form

## SettlementResult Extension

The navigation result model should be extended so the success screen can display proof details.

Suggested additions to `SettlementResult` in `src/nav.ts`:

```ts
closeoutId?: string;
proofTxHash?: string;
proofContract?: string;
proofStatus?: 'anchored' | 'recorded' | 'completed';
```

## Contract Architecture

### Contract name

`ChopDotCloseoutRegistry`

### Contract responsibility

The contract records:

- closeout creation
- participant approval state
- leg completion state
- final closeout completion

### Contract responsibility boundaries

The contract should not:

- store full expense details
- calculate balances
- store arbitrary long metadata strings
- act as the only payment mechanism

## Contract Data Structures

Suggested contract enums and structs:

```solidity
enum AssetKind {
    DOT,
    USDC
}

enum CloseoutStatus {
    Proposed,
    Active,
    Completed,
    Cancelled
}

struct Closeout {
    bytes32 id;
    bytes32 potIdHash;
    bytes32 snapshotHash;
    bytes32 metadataHash;
    address creator;
    AssetKind assetKind;
    CloseoutStatus status;
    uint40 createdAt;
    uint16 participantCount;
    uint16 totalLegCount;
    uint16 settledLegCount;
}

struct Leg {
    address payer;
    address payee;
    uint128 amount;
    bytes32 substrateTxHash;
    bool payerConfirmed;
    bool payeeAcknowledged;
}
```

## Recommended Contract Methods

Full target contract API:

```solidity
function createCloseout(
    bytes32 closeoutId,
    bytes32 potIdHash,
    bytes32 snapshotHash,
    bytes32 metadataHash,
    AssetKind assetKind,
    address[] calldata participants,
    address[] calldata payers,
    address[] calldata payees,
    uint128[] calldata amounts
) external;

function approveCloseout(bytes32 closeoutId) external;

function confirmLeg(
    bytes32 closeoutId,
    uint256 legIndex,
    bytes32 substrateTxHash
) external;

function acknowledgeLeg(
    bytes32 closeoutId,
    uint256 legIndex
) external;

function finalizeCloseout(bytes32 closeoutId) external;

function cancelCloseout(bytes32 closeoutId) external;

function getCloseout(bytes32 closeoutId) external view returns (Closeout memory);

function getLeg(bytes32 closeoutId, uint256 legIndex) external view returns (Leg memory);

function isApproved(bytes32 closeoutId, address participant) external view returns (bool);
```

## MVP Contract Simplification

To keep delivery realistic, the first contract version should likely be simpler.

### MVP contract API

```solidity
function createCloseout(...) external;

function recordLegSettlement(
    bytes32 closeoutId,
    uint256 legIndex,
    bytes32 substrateTxHash
) external;

function finalizeCloseout(bytes32 closeoutId) external;
```

### MVP behavior

- creator anchors closeout
- app records each settled leg as proof
- contract marks closeout complete when all legs are recorded

### Phase 2 behavior

After MVP is stable, add:

- `approveCloseout`
- `acknowledgeLeg`
- participant approval UI

## Contract Events

Recommended events:

```solidity
event CloseoutCreated(
    bytes32 indexed closeoutId,
    bytes32 indexed potIdHash,
    address indexed creator,
    uint8 assetKind,
    bytes32 snapshotHash
);

event CloseoutApproved(
    bytes32 indexed closeoutId,
    address indexed participant
);

event LegConfirmed(
    bytes32 indexed closeoutId,
    uint256 indexed legIndex,
    address indexed payer,
    bytes32 substrateTxHash
);

event LegAcknowledged(
    bytes32 indexed closeoutId,
    uint256 indexed legIndex,
    address indexed payee
);

event CloseoutCompleted(
    bytes32 indexed closeoutId
);

event CloseoutCancelled(
    bytes32 indexed closeoutId
);
```

## Hashing Rules

This is important.

Do not hash arbitrary JavaScript objects directly.

We need deterministic, canonical hashing.

### Canonical closeout snapshot

Create a canonical snapshot shaped like:

```ts
{
  version: 1,
  scope: 'pot-closeout',
  potId,
  asset,
  participants: [...sortedParticipants],
  legs: [...sortedLegs],
  createdAt
}
```

### Sorting rules

- sort participants by normalized address or member id
- sort legs by payer address, then payee address, then amount, then index
- use stable key ordering in the serialized object

### Hash outputs

Compute:

- `metadataHash = keccak256(canonicalJsonBytes)`
- `potIdHash = keccak256(bytes(pot.id))`
- `closeoutId = keccak256(abi.encode(potIdHash, metadataHash, creator, createdAt))`

Use `ethers` for hashing utilities since it already exists in the repo.

## Contract Integration Service

Create a dedicated frontend service for the contract layer.

Do not merge this into the existing Substrate native asset chain service.

### New service responsibilities

- connect to the contract
- create closeout
- approve closeout
- record leg settlement
- acknowledge leg
- finalize closeout
- read closeout state
- read leg state

### Suggested new files

- `src/services/contracts/closeoutRegistry.ts`
- `src/services/contracts/closeoutTypes.ts`
- `src/utils/closeoutHash.ts`
- `src/utils/closeoutSnapshot.ts`

### Suggested environment variables

```bash
VITE_ENABLE_PVM_CLOSEOUT=1
VITE_PVM_RPC_URL=...
VITE_PVM_CHAIN_ID=...
VITE_PVM_CLOSEOUT_REGISTRY_ADDRESS=...
```

## Contract Lab Deliverables

Use the existing contract lab as the development base.

### Add these files

- `scripts/polkadot-contract-lab/contracts/ChopDotCloseoutRegistry.sol`
- `scripts/polkadot-contract-lab/ignition/modules/ChopDotCloseoutRegistry.ts`
- contract tests covering:
  - create closeout
  - record leg settlement
  - finalize closeout
  - approval flow if implemented

## Integration Strategy With Existing Settlement Flow

The current app already has native settlement logic.

We should wrap the new closeout layer around that logic, not replace it.

### Integration sequence

1. compute settlement legs from current calculation engine
2. create canonical closeout snapshot
3. anchor closeout in the PVM contract
4. complete native asset transfer through current chain service
5. record leg settlement proof against the closeout
6. persist proof metadata in pot state/history
7. surface proof in confirmation and history UI

## Recommended File Touches

### Existing files likely to change

- `src/nav.ts`
- `src/components/AppRouter.tsx`
- `src/components/screens/PotHome.tsx`
- `src/components/screens/ExpensesTab.tsx`
- `src/components/screens/SettleHome.tsx`
- `src/components/screens/SettlementConfirmation.tsx`
- `src/components/screens/SettlementHistory.tsx`
- `src/schema/pot.ts`
- `src/types/app.ts`
- `src/services/data/services/SettlementService.ts`

### New files likely to be added

- `src/components/screens/CloseoutReview.tsx`
- `src/services/contracts/closeoutRegistry.ts`
- `src/services/contracts/closeoutTypes.ts`
- `src/utils/closeoutHash.ts`
- `src/utils/closeoutSnapshot.ts`
- `scripts/polkadot-contract-lab/contracts/ChopDotCloseoutRegistry.sol`
- `scripts/polkadot-contract-lab/ignition/modules/ChopDotCloseoutRegistry.ts`

## Implementation Order

### Phase 0: Foundations

Deliver:

- feature flag
- closeout types
- closeout schema additions
- snapshot and hash utilities
- contract scaffold in lab

### Phase 1: Contract MVP

Deliver:

- `createCloseout`
- `recordLegSettlement`
- `finalizeCloseout`
- testnet deployment
- frontend contract service wrapper

### Phase 2: App Integration

Deliver:

- `CloseoutReview` screen
- CTA from settlement context
- anchor closeout from UI
- attach proof metadata to settlement result
- show proof in confirmation and history

### Phase 3: Multi-party Trust Layer

Deliver:

- participant approval
- payee acknowledgment
- UI for approval states
- improved closeout status rendering

### Phase 4: Polish and Demo Hardening

Deliver:

- loading and error states
- proof labels and links
- demo-friendly copy
- stable happy path on testnet

## Acceptance Criteria

The implementation is considered complete for the first handoff when all of the following are true:

- I can create a closeout for a pot with real settlement legs
- the app can anchor that closeout in the PVM contract
- I can complete a native asset settlement leg
- the app records that leg against the closeout
- the settlement confirmation screen shows payment and proof data
- settlement history shows that the payment belongs to an onchain closeout
- the happy path works on testnet without manual patching

## Testing Requirements

### Contract tests

Required:

- create closeout success
- duplicate closeout rejection
- mismatched array input rejection
- record leg settlement success
- finalize closeout success
- cannot finalize incomplete closeout

If approvals are included:

- approve success
- duplicate approval behavior
- finalization only after required approvals

### Frontend verification

Required:

- create pot with supported asset
- add expenses
- compute settlement legs
- anchor closeout
- complete native asset settlement
- proof appears in confirmation
- proof appears in history

### Failure modes to handle

- missing member address
- contract write failure
- native payment succeeds but proof write fails
- proof write succeeds but local persistence fails
- unsupported asset for closeout

## Failure Handling Rules

### Rule 1

Do not corrupt existing settlement flow.

### Rule 2

If closeout anchoring fails, keep the user in a recoverable state.

### Rule 3

If payment succeeds but proof recording fails:

- show that payment succeeded
- show that proof recording is pending or failed
- do not lose the payment tx hash
- allow retry for proof recording if possible

### Rule 4

If the feature flag is off, all closeout logic must disappear cleanly.

## Risks and Mitigations

### Risk 1: Wallet architecture mismatch

The app is more mature for native asset flow than dedicated contract wallet flow.

Mitigation:

- keep PVM closeout additive
- feature flag it
- do not require an app-wide wallet refactor for MVP

### Risk 2: Trying to verify native payment onchain

True onchain verification of substrate txs may be too heavy for MVP.

Mitigation:

- store substrate tx hash as settlement evidence
- use contract state as registry and proof log, not as full verifier

### Risk 3: Overbuilding

The project could turn into a protocol instead of an app.

Mitigation:

- keep expense capture offchain
- keep contract focused on closeout state

### Risk 4: UI complexity

Too many chain concepts can make the app look bolted on.

Mitigation:

- introduce one clean concept: `Closeout onchain`
- use human-readable proof language

## What I Want In The First Developer Handoff

The first handoff should include:

- contract scaffold and deployed testnet contract
- frontend contract service
- closeout data model and schema updates
- one UI path to create and anchor a closeout
- settlement confirmation showing proof fields
- one working happy-path demo

## Product Copy Guidance

Avoid protocol-heavy wording in the UI.

Preferred user-facing phrases:

- `Closeout onchain`
- `Settlement proof`
- `Closeout status`
- `Recorded onchain`
- `Closeout complete`

Avoid:

- `state machine`
- `registry`
- `metadata hash`
- `canonicalized snapshot`

Those are implementation concepts, not UX copy.

## Optional Enhancements After MVP

Only after the main flow is stable:

- member approvals before settlement
- payee acknowledgment after settlement
- shared closeout receipt export
- dedicated proof detail screen
- optional bridge funding path

## Final Guidance

Optimize for a believable product demo, not architectural purity.

The winning story is:

ChopDot already makes group expense settlement usable.

The PVM contract makes final settlement shared, auditable, and verifiable.

That is the product improvement the hackathon submission should prove.

## Open Questions For Developer Review

Please review this document and come back with questions specifically on:

- whether the MVP contract should include approvals immediately or defer them to phase 2
- what wallet approach is safest for contract interaction in the current app architecture
- whether closeouts should live directly on `pot.closeouts` or in a separate app-level store
- whether DOT-only MVP is safer than DOT+USDC MVP for the first working path
- what can be reliably deployed and tested on the chosen Polkadot Hub environment within hackathon time
