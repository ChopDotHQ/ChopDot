# App Modularization Execution Board

Status: In progress  
Last updated: 2026-02-11  
Program: Independent architecture initiative

## Progress Log

- 2026-02-11:
  - `P0` complete (baseline + contracts).
  - `P1` complete (builder/demo data extraction to `src/data/builder-party.ts`).
  - `P2` complete (URL/invite effect extraction to `src/hooks/useUrlSync.ts` and `src/hooks/useInviteFlow.ts`).
  - `P3` started:
    - extracted core business actions from `src/App.tsx` into `src/hooks/useBusinessActions.ts`
    - wired stable action signatures back into router props from `App.tsx`
    - extracted settlement write-path from `AppRouter` into `src/hooks/useSettlementActions.ts`
  - Verification rerun:
    - `npm run lint`: pass
    - `npm run type-check`: pass
    - `npm run build`: pass
  - TS cleanup follow-up completed:
    - unified `PotHistory` typing to `src/types/app` in settlement-related modules
    - reduced router unused-variable debt and removed dead settle-home mapping block
    - fixed settlement service DTO amount typing and settlement test assertions

## Phase Plan

| Phase | Objective | Primary Deliverables | Owner | Dependencies | Key Challenges | Constraints |
|---|---|---|---|---|---|---|
| P0 | Baseline and contracts | Baseline metrics, router/action contracts, refactor guardrails | DEV | Access to current CI + local test environment | Capturing realistic baseline before touching code | No behavior changes |
| P1 | Low-risk extraction | Move demo/static builder data from `src/App.tsx` into data modules | DEV | Contract map from P0 | Avoid hidden assumptions on IDs/dates/defaults | No runtime behavior changes |
| P2 | Effect domain extraction | `useUrlSync`, `useInviteFlow` (or equivalent) extracted into hooks | DEV | P0 contracts, P1 stable build | Side-effect ordering and stale closure bugs | Preserve current navigation and invite behavior |
| P3 | Business action extraction | `usePotActions`, `useExpenseActions`, `useSettlementActions` extracted | DEV | P2 stable orchestration interfaces | Untangling coupled action chains | Keep existing action signatures consumed by router |
| P4 | Router decomposition | Split `AppRouter` by route groups/config modules | DEV | P3 stabilized action interfaces | Route regressions and navigation edge cases | No screen/route renaming during phase |
| P5 | Blockchain UX state normalization | Shared tx-state model wired for settlement UX (DOT now, USDC-ready path) | DEV + CHAIN | P3 action layer, chain service stability | Chain async states and error parity across methods | No chain-service behavior regressions |

## Task Breakdown

### P0: Baseline and Contracts

- Capture baseline metrics:
  - `src/App.tsx` LOC and complexity snapshot.
  - `src/components/AppRouter.tsx` route-switch complexity snapshot.
  - Current CI health snapshot (type-check/lint/build/tests).
- Define typed contracts for:
  - Router props and action signatures.
  - Navigation interface usage boundaries.
- Publish guardrails:
  - No feature expansion.
  - No route naming changes.
  - Incremental PR policy.

### P1: Low-Risk Extraction

- Extract builder/demo data and static constants from `src/App.tsx` to `src/data/*`.
- Keep imports explicit and avoid transitive side effects.
- Validate data parity for local/dev bootstrapping behavior.

### P2: Effect Domain Extraction

- Move URL synchronization effects into dedicated hook.
- Move invite acceptance/decline/pending-token lifecycle into dedicated hook.
- Keep hook APIs typed and dependency-safe (avoid implicit globals).

### P3: Business Action Extraction

- Extract create/update/delete/attest logic into action hooks.
- Isolate settlement write actions from UI event handlers.
- Keep router-facing API stable until P4.

### P4: Router Decomposition

- Replace monolithic route switch ownership with route-group modules:
  - core tabs
  - pot flows
  - settlement flows
  - settings and utility screens
- Preserve `push`, `replace`, `reset`, and back behavior.

### P5: Blockchain UX State Normalization

- Introduce shared transaction-state machine for settlement UI:
  - `idle`
  - `preparing`
  - `signing`
  - `broadcast`
  - `inBlock`
  - `finalized`
  - `failed`
- Ensure DOT flow uses this consistently.
- Add USDC-ready UI state path even if settlement tab exposure is staged.

## Verification Gate (Required Per Phase)

Run before merge for every phase:

```bash
npm run type-check
npm run lint
npm run build
```

Then run targeted regression checks:

1. Route sanity checks:
   - tab changes
   - screen back/replace/reset behavior
2. Invite lifecycle checks:
   - pending invite detection
   - accept/decline behavior
3. Pot and expense action checks:
   - create pot
   - add/edit/delete expense
   - attest expense
4. Settlement checks:
   - cash/bank/paypal/twint routing and completion
   - DOT settlement path including tx-state messaging
   - USDC readiness checks where staged

Recommended manual checks for blockchain-sensitive phases:

1. Wallet connect/disconnect transitions
2. Recipient address missing states
3. Fee estimation and copy consistency
4. Error-state messaging parity across methods

## Exit Criteria by Phase

- P0 complete: contract doc approved and baselines captured.
- P1 complete: `App.tsx` static data extracted with no behavior changes.
- P2 complete: URL + invite effect domains extracted and stable.
- P3 complete: action logic moved out of shell and covered by tests.
- P4 complete: routing decomposition merged with parity.
- P5 complete: settlement UX uses shared tx-state model and USDC-ready path documented.

## Ownership and Operating Cadence

- Weekly check-in:
  - Completed tasks
  - New risks
  - KPI movement
- PR sizing target:
  - small/medium only
  - single-phase scoped changes
- Release safety:
  - do not batch multiple phases into one release unless explicitly approved
