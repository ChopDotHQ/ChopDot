# P-034 immutable closeout-successor authority evidence

**Kind:** measurement
**Status:** accepted slice; P-034 remains building
**Owner:** core authority
**Measured:** 2026-08-27
**Worktree:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch:** `codex/chopdot-v1-launch`
**Source commit:** `dbbede09c7f7d9ad4e082541ab754c87fdbe929f`
**Source tree:** `ceafb4ffd9085fc61334a72d875b82d408e416be`

## Expected outcome

Only the accepted current organizer may append a signed successor to an already
closed record. The predecessor, successor identifier, reason, actor, account
key, version, and frontier are bound to one `SUCCESSOR_RECORD_CREATED` event.
The original close and saved totals remain immutable. A failed delivery after
durability can retry the exact command without a second event, signer ceremony,
or frontier change; conflicting identifier reuse fails closed.

## Accepted evidence

- `src/core/authority/productionAuthority.ts` validates closed state, current
  organizer authority, exact predecessor, actor account binding, signed replay,
  and compare-and-swap durability before returning an applied successor.
- An exact retry resolves the already signature-verified durable event before
  signer resolution and returns that original event with `outcome: duplicate`.
  Different actor, account key, predecessor, record identifier, or reason is
  not a retry and is rejected.
- `src/state/AppStateContext.tsx` exposes the successor command on the serialized
  production authority queue and routes both applied and duplicate results to
  the same delivery function before replacing the local projection.
- `src/core/authority/productionAuthority.test.ts` proves nonclosed, wrong-actor,
  wrong-predecessor, stale-CAS, identifier-conflict, and signer-unavailable
  retry behavior; it also proves the original close/saved record is unchanged,
  the durable event count does not grow on retry, and the frontier is stable.

## Verification newly executed

```text
npx tsc --noEmit
PASS

node --import tsx --test \
  src/core/authority/productionAuthority.test.ts \
  tests/candidate-batch3-money-foundation.test.ts \
  tests/candidate-batch3-money-convergence.test.ts \
  tests/one-chop-core-contract.test.ts
30 passed, 0 failed

npm run test:node
353 passed, 0 failed

npm run build
PASS

git diff --check
PASS
```

The first independent review blocked the slice because a delivery failure after
the durable CAS could strand a retry. The repair made exact retries return the
same durable event. A second review passed that P1 and found the retry still
unnecessarily required the original signer; the repair moved durable retry
validation before signer resolution. The final independent review returned
PASS with no P0 or P1.

One non-blocking P2 evidence item remains for Gate 9 production-entrypoint
assurance: inject a canonical publication failure after CAS through
`AppStateContext`, retry from the UI, and prove the same event is re-enqueued,
the projection and error recover, and the journal does not grow.

## Hosted governance

Exact-source-commit governance run `33029578636` completed successfully for
`dbbede09c7f7d9ad4e082541ab754c87fdbe929f`: 7 jobs succeeded, 0 failed, and
the release-enforcement job was correctly skipped because this source slice is
not a frozen release candidate. This proves PR governance at the exact source
commit; it is not deployment or release approval.

## Remaining P-034 work

This evidence does not close Gate 9 or P-034. Fail-closed legacy
migration/quarantine, production-entrypoint replay and successor-retry proof,
exact PAS initiation, reusable-session-secret retirement, and final reducer
parity remain open.

## Documentation impact

The source state-model page `docs/wiki/03-state-models/one-chop-core.md` was
updated. ADR 0001 did not require a decision change because this slice
implements its existing immutable signed-event history boundary.
