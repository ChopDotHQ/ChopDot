# Future Tech Replacement Map

<discovery_plan>
- Capture the extracted “tech replacement strategy” doctrine in repo form
- Reframe future-tech choices around layers instead of chain theater
- Keep the recommendations subordinate to current product proof
</discovery_plan>

## FACTS

- ChopDot needs to stay future-ready.
- Future-ready does not mean betting the product on one chain.
- The shared chat surfaced five underweighted future layers:
  - account abstraction / embedded wallets
  - credentials
  - modular interoperability
  - portable action surfaces
  - local execution rails

## INFERENCES

- The right future-tech frame is a layered trust stack.
- This gives ChopDot a better replacement logic than:
  - ETH versus ICP versus Polkadot

## ASSUMPTIONS

- These layers are not all current implementation scope.
- Current proof slice remains chapter / closeout recovery first.

## Layered Trust Stack

### 1. Commitment engine

Owns:
- commitments
- participants
- states
- policy
- history

Current best fit:
- TypeScript services
- Postgres
- queues / workers

### 2. User abstraction layer

Purpose:
- reduce wallet and identity friction
- separate user intent from raw chain UX

Current direction:
- auth / authority split

Future technologies to study:
- embedded wallets
- account abstraction
- passkeys + wallet coexistence

### 3. Local execution layer

Purpose:
- meet real user payment behavior where it already exists

Current direction:
- coordination first
- manual / fiat-safe proof slice

Future direction:
- local processors
- phone-number / QR-first local rails
- market-specific execution adapters

### 4. Credentials and privacy layer

Purpose:
- prove bounded facts without overexposure

Future direction:
- verifiable credentials
- selective disclosure
- bounded operator / auditor / agent permissions

### 5. Selective enforcement layer

Purpose:
- only harden the parts that benefit from programmable enforcement

Future direction:
- EVM / smart-account-compatible enforcement where earned
- approval thresholds
- constrained releases
- rights logic

### 6. Interoperability layer

Purpose:
- route or message across ecosystems only when necessary

Future direction:
- modular interoperability
- app-level messaging frameworks
- avoid becoming a bridge company

### 7. Portable action surfaces

Purpose:
- make commitment actions previewable and executable across surfaces

Future direction:
- action links
- QR flows
- bot / agent surfaces
- wallet / web / app-agnostic action patterns

## What this changes

When a new technology appears, the question becomes:

- which layer does it improve?
- what problem does it solve better than the current option?
- does it strengthen the commitment engine or distract from it?

## Practical rule

Do not adopt technology because:
- investors like it
- it is fashionable
- it looks more crypto-native

Adopt it only if it clearly improves:
- trust
- usability
- local execution
- policy enforcement
- portability
- future API / ecosystem leverage

## Next move

- Use this document with `BUILD_MATRIX_V1.md` whenever evaluating future stack changes.
