# Inconsistencies And Watchouts

This note tracks places where the repo can still mislead a reader even though the current direction is now much clearer.

## 1. Wedge vs first recovery slice

### Current truth

- strongest wedge: **group deposits**
- first technical recovery slice: **expense closeout chapter**

### Why this matters

A reader can mistake the first implementation slice for the full product center.

### What to remember

Expense closeout is the easiest way to restore the commitment loop.
It is not the long-term headline story.

## 2. API readiness vs API-first business

### Current truth

- architecture should be **API-ready now**
- business should **not** become API-first yet

### Why this matters

Some docs emphasize builders and future APIs.
Finance and product direction still say subscriptions and operator value come first.

### What to remember

Build as if the API will exist.
Do not force the company to lead with API monetization before the kernel is proven.

## 3. Hackathon / builder language still exists in current docs

### Current truth

- private founder validation comes before external builders
- hackathon motion is deferred until after internal proof

### Why this matters

Some current docs still mention a future builder package or hackathon kernel.

### What to remember

That is a future packaging goal, not the current execution target.

## 4. Legacy chain / wallet docs still exist

### Current truth

- coordination-first shared commitment is the active direction
- chain, wallet, and anchor layers are deferred or additive

### Why this matters

The repo still contains older docs about wallet auth, USDC, PVM closeout, and chain-specific experiments.

### What to remember

Those documents are not automatically wrong, but many are historical or exploratory rather than the active product center.

## 5. Data-layer API docs are older than the new kernel framing

### Current truth

- `docs/API_REFERENCE.md` reflects the existing data-layer abstraction
- `docs/API_READINESS_PLAN.md` reflects the newer shared-commitment-kernel direction

### Why this matters

A reader may assume the older API reference already expresses the final kernel contract.

### What to remember

The older API/data-layer docs should eventually be reconciled with the newer kernel and action-contract docs.

## 6. Finance model is useful, but still scenario-based

### Current truth

- the financial workbook is good enough for planning
- it is not a live accounting system
- it is not a guaranteed forecast

### Why this matters

The model can be mistaken for proof of market fit or profitability.

### What to remember

It is a planning model that needs to be updated as pricing, hiring, and user behavior become real.

## 7. Root README still presents a more chain-forward story than the current docs package

### Current truth

- the root README still emphasizes:
  - Polkadot-native closeout
  - wallet and settlement flows
  - testnet release context
- the current docs branch now emphasizes:
  - shared commitment kernel
  - coordination first
  - proof second
  - modular future stack

### Why this matters

A new reader can still land on the README and form an older mental model before they ever reach the current docs branch.

### What to remember

The docs branch is the current instruction layer.
The README should be treated as older release framing until it is reconciled with the shared commitment kernel reset.
