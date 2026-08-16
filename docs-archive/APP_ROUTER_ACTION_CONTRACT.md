# App Router and Action Contract (P0)

Status: Draft contract  
Purpose: Define stable boundaries before modularization extraction work.

## Why this contract exists

`src/App.tsx` and `src/components/AppRouter.tsx` currently carry high coupling across routing, state orchestration, and action side-effects. This contract freezes expected interfaces so phases `P1`–`P5` can refactor internals without changing behavior.

## Scope

In scope:
- `useNav` screen transitions and screen payload types.
- `AppRouterProps` domain slices (`data`, `userState`, `uiState`, `actions`, `flags`).
- Behavioral guarantees for route rendering and action dispatch.

Out of scope:
- New user-facing features.
- Route renaming/redefinition.
- Blockchain protocol changes in chain services.

## Boundary Model

### AppContent (`src/App.tsx`)

Responsibilities:
1. Orchestrate state domains and hooks.
2. Build and pass typed domain slices to router.
3. Own side-effect integration (auth/data/wallet/URL), not view rendering.

Must not:
1. Contain route-level rendering logic after router decomposition phases.
2. Expand action surface without contract update.

### AppRouter (`src/components/AppRouter.tsx`)

Responsibilities:
1. Map `screen.type` to screen component.
2. Bind view-level callbacks to action contracts.
3. Keep routing decisions deterministic from inputs.

Must not:
1. Create new business state outside provided contracts.
2. Introduce hidden side effects that bypass action contracts.

### Screen Components

Responsibilities:
1. Render view and collect user intent.
2. Emit intent through callback props.

Must not:
1. Reach directly into global app orchestration concerns.
2. Re-implement app-level routing or settlement state machines.

## Navigation Contract

Source: `src/nav.ts`

`useNav` exposes:
1. `push(screen)`
2. `replace(screen)`
3. `back()`
4. `reset(screen)`

Rules:
1. `screen` must be one of the `Screen` union variants.
2. No phase may rename existing `Screen.type` values without explicit migration plan.
3. Route payload shapes must remain backward compatible during this initiative.

## AppRouterProps Contract

Source: `src/components/AppRouter.tsx`

Top-level domains:
1. `data`
2. `userState`
3. `uiState`
4. `actions`
5. `flags`

Stability rules:
1. Preserve key names and semantic meaning across phases.
2. Internal implementation can move to hooks/services if domain contract remains stable.
3. If a field is deprecated, introduce transitional adapters and update this contract.

## Action Surface Contract

`actions` currently includes state setters and business actions. During modularization:

1. State setters remain available until router decomposition completes.
2. Business actions should be moved into hooks/services behind same call signatures first.
3. Any signature change requires:
   - contract update in this file
   - calling-site migration in same PR
   - verification gate pass

Suggested grouping (for extraction, not behavior change):
1. Navigation-affecting actions
2. Pot actions
3. Expense actions
4. Invite actions
5. Settlement actions
6. Wallet/notification/UI actions

## Blockchain Settlement UX Contract

For settlement-capable flows, UI states should converge to a shared lifecycle:
1. `idle`
2. `preparing`
3. `signing`
4. `broadcast`
5. `inBlock`
6. `finalized`
7. `failed`

Rules:
1. DOT settlement uses this lifecycle consistently.
2. USDC path must be state-model ready even if UI entry is staged.
3. Errors must be explicit and user-facing; no silent fail states.

## Invariants (Do not break)

1. Existing tab navigation behavior.
2. Existing screen payload compatibility.
3. Existing invite accept/decline lifecycle behavior.
4. Existing create/edit/delete expense behavior.
5. Existing settlement completion semantics.

## Verification Gate (Required on each refactor phase)

```bash
npm run type-check
npm run lint
npm run build
```

Targeted regressions to run:
1. Route transitions (`push`, `replace`, `back`, `reset`)
2. Invite lifecycle
3. Pot and expense CRUD/attest
4. Settlement flow method selection and completion
5. Wallet connect/disconnect + chain error states

## Change Control

When this contract changes:
1. Update this file in the same PR.
2. Document rationale and migration impact.
3. Re-baseline affected metrics in `docs/APP_MODULARIZATION_P0_BASELINE.md` at phase boundary.

