# Blind-agent evaluation — multi-payer planning

## Result

**Partial pass.**

The generated packet plus bounded implementation neighborhood produced a coherent core plan with correct semantic ordering and correctly preserved unresolved product questions.

However, an independent broader repository search found important implementation surfaces outside the bounded neighborhood. This is useful evidence that semantic impact is ahead of implementation ownership discovery.

## What the blind plan got right

- canonical Expense schema must change;
- DTO create/update contracts inherit the payer assumption;
- ExpenseService explicitly validates one payer;
- Position calculation credits one payer and must become funding-minus-allocation;
- usePotBalances adapts expense data into the calculation path;
- AddExpense and QuickKeypadSheet each carry single-payer UI state;
- legacy single payer can be interpreted as one full-amount contribution as a migration hypothesis, not silently declared product law;
- remainder policy remains unresolved;
- Activity/Export/Recovery were correctly flagged as outside the bounded context rather than invented;
- rollout order follows domain -> DTO -> calculation/service -> UI -> regression.

## What the bounded packet missed

Broader code search found concrete `paidBy` consumers in:

### Persistence
- `src/services/data/repositories/ExpenseRepository.ts`
- repository tests

### CRDT / sync
- `src/services/crdt/types.ts`
- `src/services/crdt/automergeUtils.ts`

### Export
- `src/utils/export.ts`
- export tests

### Normalization / derived utilities
- `src/utils/normalization.ts`
- `src/utils/settlements.ts`
- settlement utility tests

### Hooks / projections
- `src/hooks/useActivityFeed.ts`
- `src/hooks/usePotDataMerge.ts`
- `src/hooks/useBusinessActions.ts`
- `src/hooks/useDerivedData.ts`
- `src/hooks/usePotSummary.ts`
- `src/hooks/useCheckpointState.ts`
- `src/hooks/useSettlementActions.ts`

### UI readers
- `src/components/screens/ExpenseDetail.tsx`
- `src/components/screens/ExpensesTab.tsx`
- `src/components/screens/MembersTab.tsx`
- `src/components/screens/PotsHome.tsx`
- `src/components/screens/PotHome.tsx`

Not every textual consumer necessarily requires semantic modification, but persistence, CRDT/sync, normalization, export, and ExpenseDetail are sufficiently important that a real implementation plan must inspect them.

## Diagnosis

The Product IR semantic graph correctly warned about J18/J24/J28 boundaries, but the first implementation-discovery heuristic was intentionally narrow and ranked only a few strong symbol patterns.

That means the right repair is **not** to add all missed files manually to Product IR.

The next implementation-discovery iteration should derive a second ring from:

1. canonical schema/type references;
2. `paidBy` field access;
3. imports/calls from first-ring owners;
4. persistence/serialization boundaries;
5. tests colocated with discovered owners.

Then classify candidates by role: domain, persistence, operation, projection, derived calculation, serialization, sync, test.

## Context result

The bounded packet was enough to produce the core implementation strategy, but not enough for implementation-ready completeness.

This is still a useful outcome: it identifies a concrete missing capability—automatic second-ring code discovery—without requiring more Product IR semantics.

## Decision

**KEEP, refine implementation discovery.**

Do not expand the semantic ontology. Improve source-derived ownership discovery instead.
