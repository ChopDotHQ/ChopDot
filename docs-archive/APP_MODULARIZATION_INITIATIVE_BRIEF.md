# App Modularization Initiative Brief (Independent Program)

Status: In progress  
Last updated: 2026-02-11  
Owner: DEV  
Program type: Platform and architecture (not tied to MVP feature delivery)

## Problem Statement

`src/App.tsx` remains a high-coupling orchestration point with large state/effect surfaces and mixed concerns (routing, business logic, invite flow, settlement flow, demo data). This slows safe iteration, increases regression risk, and makes blockchain settlement UX harder to standardize.

## Initiative Goal

Improve maintainability, delivery velocity, and release confidence by modularizing app orchestration, state/effects, and routing while preserving current behavior.

## Success Criteria

- App shell logic is organized into focused hooks/modules with stable interfaces.
- `src/App.tsx` becomes orchestration-first, not logic-heavy.
- Route handling is easier to reason about and test.
- DOT and USDC settlement UX pathways are represented in a shared transaction-state model.
- Regression rate does not increase during refactor rollout.

## Scope

In scope:
- Extract static/demo data and constants out of `src/App.tsx`.
- Extract state/effect domains into hooks (URL sync, invites, pot actions, settlement actions).
- Define and enforce interface contracts for router inputs/actions.
- Split routing implementation into smaller route-group modules.
- Standardize blockchain transaction state handling in UI (`idle`, `preparing`, `signing`, `broadcast`, `inBlock`, `finalized`, `failed`).

Out of scope:
- Net-new product features.
- Visual redesign.
- Changes to business requirements for existing user flows.
- Forced context proliferation without proven need.

## Constraints

- Preserve behavior and data integrity.
- Keep changes incremental and reviewable.
- Do not block existing release cadence.
- Avoid unnecessary dependency additions.
- Maintain feature-flag compatibility.

## Dependencies

- Stable type contracts across:
  - `src/App.tsx`
  - `src/components/AppRouter.tsx`
  - `src/nav.ts`
  - `src/services/chain/polkadot.ts`
- Existing testing stack (type-check, lint, build, unit/integration/Cypress).
- Owner availability for architecture review and merge sequencing.

## Risks and Challenges

- Side-effect ordering regressions when moving `useEffect` logic.
- Hidden coupling between routing and business actions.
- Wallet and chain-specific behavior drift during settlement refactor.
- Merge conflicts due to broad touch points in app shell files.

## Benefits

- Faster onboarding and clearer ownership boundaries.
- Lower change-failure risk in core orchestration code.
- Better testability and release confidence.
- Easier extension of multi-chain settlement UX including USDC.

## KPI Baseline and Targets

Track baseline at kickoff and monitor per phase:
- `src/App.tsx` LOC and complexity.
- `src/components/AppRouter.tsx` route-switch complexity.
- CI pass rate and mean time to fix failing checks.
- Regression defects per release in shell/routing/settlement areas.

Target direction:
- Decrease shell complexity and review surface area.
- Maintain or improve CI reliability and release stability.

## Definition of Done (Program)

- Planned phases completed or explicitly deferred with rationale.
- Interface contracts documented and adopted.
- Verification gates pass at each phase.
- Post-refactor behavior parity confirmed.
- Open risk items logged with owners and follow-up actions.

## Progress Snapshot

- `P0` complete:
  - Baseline captured
  - Contracts documented
- `P1` complete:
  - Builder/demo data moved out of `src/App.tsx` into `src/data/builder-party.ts`
- `P2` complete:
  - URL sync extracted to `src/hooks/useUrlSync.ts`
  - Invite lifecycle extracted to `src/hooks/useInviteFlow.ts`
- `P3` in progress:
  - Core business actions extracted to `src/hooks/useBusinessActions.ts` and re-wired through `App.tsx`
  - Settlement confirmation write flow extracted to `src/hooks/useSettlementActions.ts` and routed through `AppRouter` actions
  - Router/type-debt cleanup completed for extracted paths (`AppRouter`, `PotHome`, settlement-related type imports)
- Verification status:
  - `npm run lint`: pass
  - `npm run type-check`: pass
  - `npm run build`: pass
