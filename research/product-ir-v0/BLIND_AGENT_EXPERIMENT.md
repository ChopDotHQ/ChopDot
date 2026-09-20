# Blind-agent experiment — multi-payer planning

Status: research only  
Branch: `research/product-ir-v0-blind-agent`

## Purpose

Test whether a coding agent can produce a high-quality implementation plan from a compact Product IR change packet plus a bounded implementation neighborhood, without being given ChopDot's full history or an unrestricted repo-reading mandate.

## Isolation

This branch must not implement multi-payer support. It exists only to produce and evaluate a plan.

## Input packet

Generate with:

```bash
node research/product-ir-v0/agent-change-packet.mjs
```

The packet supplies:

- semantic change;
- laws;
- composition;
- affected operations;
- derived state;
- core/boundary journeys;
- candidate implementation ownership;
- acceptance conditions;
- do-not-change boundaries;
- open questions.

## Bounded source allowance

The blind planning pass may inspect only the strongest implementation neighborhood identified by the packet and its direct type/import dependencies. Initial allowance:

- `src/schema/pot.ts`
- `src/services/data/types/dto.ts`
- `src/services/data/services/ExpenseService.ts`
- `src/services/settlement/calc.ts`
- `src/services/settlement/calc.test.ts`
- `src/hooks/usePotBalances.ts`
- `src/components/screens/AddExpense.tsx`
- `src/components/QuickKeypadSheet.tsx`
- `src/routing/screen-props/pot-screens.tsx`

It may not browse journey specs, repository history, issue threads, unrelated docs, or the rest of the implementation unless it records a specific missing fact that the packet/neighborhood cannot answer.

## Blind task

Produce an implementation plan for:

```text
Expense funding:
single payer -> one-or-more contributions
```

Do not implement it.

The plan must identify:

1. canonical domain/schema migration;
2. create/update DTO effects;
3. business-service effects;
4. balance/Position algorithm changes;
5. UI input/edit effects;
6. compatibility/migration handling for existing `paidBy` records;
7. tests required;
8. unknowns that require product authority rather than invention;
9. rollout order;
10. likely failure modes.

## Evaluation

An independent full-repository pass will compare the blind plan against broader authority/code discovery.

Measure:

- critical dependencies found;
- critical dependencies missed;
- false-positive files/concepts;
- product-policy invention;
- number of source files needed;
- questions correctly left unresolved;
- whether plan ordering respects semantic dependency order.

## Pass condition

The blind packet approach earns continuation if it captures the critical implementation path and semantic boundaries with materially less context than unrestricted repo discovery, without inventing product policy.

## Failure condition

Shrink or redesign if the agent must repeatedly escape the bounded neighborhood, misses major dependencies, or requires a large manually maintained ownership map.
