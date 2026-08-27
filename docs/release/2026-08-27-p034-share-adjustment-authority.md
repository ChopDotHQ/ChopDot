# P-034 exact share-adjustment authority evidence

**Kind:** measurement
**Status:** accepted slice; P-034 remains building
**Owner:** core authority
**Measured:** 2026-08-27
**Worktree:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch:** `codex/chopdot-v1-launch`
**Source commit:** `bf6a54ecdfba99a8e0ea02595d2881ae44f973b0`

## Expected outcome

Refund, fee, partial-payment, waiver, dispute, and exact reversal proposals use
one signed `ChopEventV1` authority path. The event is signature-checked,
deterministically replayed, and compare-and-swap persisted before its projection
is visible. Invalid actor, currency, adjustment semantics, reversal target, or
frontier changes no accepted state.

## Accepted evidence

- `src/core/moneyEventKernel.ts` enforces the expense accounting equation,
  adjustment status rules, exact reversal target and negation, double-reversal
  denial, nonzero exact waivers, and resolved-share close safety.
- `src/core/authority/productionAuthority.ts` exposes a typed exact-money
  command, signs it, replays it, persists it by frontier CAS, and only then
  returns the projection.
- `src/state/AppStateContext.tsx` serializes the command on the production
  authority queue and replaces the projection only after durable acceptance.
- Historical V1 correction adjustment events remain replayable, while the new
  production command rejects correction injection and requires the dedicated
  reviewed expense-correction route.

## Verification newly executed

```text
npx tsc --noEmit
PASS

node --import tsx --test \
  tests/candidate-batch3-money-foundation.test.ts \
  src/core/authority/productionAuthority.test.ts \
  tests/candidate-batch3-money-convergence.test.ts \
  tests/candidate-batch3-recovery.test.ts \
  tests/one-chop-core-contract.test.ts
35 passed, 0 failed

npm run test:node
351 passed, 0 failed

npm run build
PASS

git diff --check
PASS
```

Independent review first returned BLOCK for resolved-status, legacy replay, and
unbound reversal defects. After repair, the independent re-review returned
PASS with no remaining P0, P1, or P2 finding in this slice.

## Remaining P-034 work

This evidence does not close Gate 9 or P-034. Production closeout-successor
commands, fail-closed legacy migration/quarantine entry, exact PAS/wallet
initiation, secret-bearing legacy session retirement, reducer parity, and
`src/main.tsx` replay proof remain open.

## Documentation impact

The source state-model page `docs/wiki/03-state-models/one-chop-core.md` was
updated. ADR 0001 did not require a decision change because the slice implements
its existing participant-held signed-event authority boundary.
