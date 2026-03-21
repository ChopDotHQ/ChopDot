# App Modularization P0 Baseline Snapshot

Status: Baseline captured  
Captured at: 2026-02-11 09:38:07 UTC  
Branch: `12-23-feat_add_usdc_implementation`  
Commit: `ce5cb8b`

## Snapshot Context

This baseline is for the independent app modularization initiative and is not tied to MVP feature scope. It records current shell/routing complexity and command-health before refactor phases begin.

## Structural Metrics

### Core file size

| File | Lines |
|---|---:|
| `src/App.tsx` | 2529 |
| `src/components/AppRouter.tsx` | 1180 |
| `src/components/screens/SignInScreen.tsx` | 1069 |

### App shell hook surface (`src/App.tsx`)

| Hook | Count |
|---|---:|
| `useState` | 13 |
| `useEffect` | 19 |
| `useMemo` | 11 |
| `useCallback` | 39 |
| `useRef` | 1 |

### Router complexity (`src/components/AppRouter.tsx`)

| Metric | Count |
|---|---:|
| Route `case` branches | 25 |
| Handler props in route rendering (`onX={...}`) | 101 |
| Screen imports (lazy + direct) | 25 |
| `AppRouterProps.data` keys | 27 |
| `AppRouterProps.userState` keys | 7 |
| `AppRouterProps.uiState` keys | 9 |
| `AppRouterProps.actions` keys | 36 |

### Navigation type breadth (`src/nav.ts`)

| Metric | Count |
|---|---:|
| `Screen` union variants | 29 |

## Verification Command Baseline

Commands executed for baseline:

```bash
npm run type-check
npm run lint
npm run build
```

### Results

| Command | Result | Notes |
|---|---|---|
| `npm run type-check` | FAIL | 78 TS errors |
| `npm run lint` | PASS | No lint errors reported |
| `npm run build` | FAIL | 78 TS errors (same error class as type-check) |

### Type-check/build error concentration

Top failing files by error volume:

| File | Error count |
|---|---:|
| `src/App.tsx` | 35 |
| `src/components/AppRouter.tsx` | 35 |
| `src/utils/settlements.test.ts` | 4 |
| `src/services/data/services/SettlementService.ts` | 2 |
| `src/services/chain/remark.ts` | 1 |
| `src/components/screens/ExpensesTab.tsx` | 1 |

## Baseline Challenges Observed

1. Type-check/build are currently red due to shell/router/type coupling.
2. Core orchestration concerns remain concentrated in `App.tsx` and `AppRouter.tsx`.
3. Route handler surface area is broad, increasing refactor risk without explicit contracts.

## Baseline Use

This file is the comparison anchor for phases `P1` to `P5`. Update this snapshot only at major phase boundaries to keep trend deltas clear.

