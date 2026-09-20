# Product IR V0 — Multi-payer A/B investigation

Date: 2026-09-20  
Branch: `research/product-ir-v0-expense-slice`  
Authority baseline: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`

## Test change

Hypothetical only:

```text
Expense.payer: ParticipantId
        ->
Expense.payers: Contribution[]
```

No production or Golden change is authorized or implemented.

## Result

**Promising, but V0 is not yet lossless.**

The Product IR made the first-order semantic blast radius substantially easier to state: payer conservation, beneficiary allocation conservation, create/edit behavior, and Position derivation are separate concerns. It also made a missing concept obvious: **payer contributions need their own conservation invariant and cannot be conflated with beneficiary split allocations.**

However, the repo investigation found important downstream authority outside the initial J05/J06/J08/J10 slice. A useful IR must expose these as dependency edges/projections rather than pretending the four-journey slice is complete.

## A — Current-repo investigation

### Authority/product surfaces inspected

Core:
- J05 Add Expense
- J06 Review / Correct Expense
- J08 Group Home
- J10 Overall Position

Downstream checks:
- J11 Settle Up
- J18 Activity / Notifications
- J24 Export / Portability
- J28 Failure / Recovery

Implementation evidence:
- `src/schema/pot.ts`
- `src/services/settlement/calc.ts`
- `src/components/QuickKeypadSheet.tsx`

### Concrete findings

1. **Current runtime schema is single-payer.**
   `ExpenseSchema.paidBy` is one member ID.

2. **Current settlement calculation is single-payer.**
   `computeBalances` credits the full expense amount to exactly one `expense.paidBy`.

3. **Current expense-entry component is single-payer.**
   `QuickKeypadSheet` owns one `paidBy` value and emits one `paidBy` in `onSave`.

4. **Beneficiary split and payer contribution are distinct dimensions.**
   Existing `expense.split` describes what participants owe. Multi-payer introduces a second allocation: who funded the expense. These must conserve independently:
   - sum(payer contributions) = expense total
   - sum(beneficiary allocations) = expense total

5. **Position is derived, not stored authority.**
   Multi-payer therefore changes the derivation inputs/algorithm rather than directly mutating a Position balance.

6. **Export is affected.**
   J24 exports expenses and splits while preserving money semantics. A new payer-contribution structure must be portable without flattening it back to one payer.

7. **Activity is affected.**
   Activity routes to canonical expense owners and must not invent mutation semantics. Event/copy projections may need to represent multiple payers.

8. **Settlement is affected indirectly but materially.**
   Settlement consumes derived obligations. If contribution accounting is wrong, settlement suggestions are wrong even if settlement UX itself does not edit payer contributions.

9. **Recovery/idempotency matters for create/edit.**
   A multi-payer edit cannot create duplicated contribution effects during uncertain retry/reconciliation.

### Current-repo blast radius

Confirmed semantic concepts:
- Expense
- payer contribution
- beneficiary Split
- Position derivation
- money/currency conservation
- permissions/edit
- export portability
- activity/history
- settlement input
- recovery/idempotency

Confirmed implementation seams:
- `src/schema/pot.ts`
- `src/services/settlement/calc.ts`
- `src/components/QuickKeypadSheet.tsx`

Likely additional implementation/test seams require a full production-lineage search before implementation. This experiment intentionally stops before implementation discovery becomes a production task.

## B — Product IR-assisted investigation

Starting from `MODEL.yaml`, the following impact is immediate:

### Existing affected invariants
- EXP-001 payer membership
- SPLIT-003 beneficiary allocation conservation
- POS-002 same-person/same-currency netting
- POS-003 source lineage

### Existing affected operations
- Expense.Create
- Expense.Edit
- Position.Recompute

### Existing affected projections
- J05
- J06
- J08
- J10

### Missing primitive exposed by the change

The initial V0 representation is too coarse because `Expense.payer` is a scalar. Multi-payer requires a first-class funding side:

```text
Contribution
├─ participant
└─ amount

Expense
├─ amount
├─ payer_contributions[]
└─ beneficiary_split
```

Required new invariants:

```text
FUND-001 sum(payer_contributions.amount) == expense.amount
FUND-002 payer_contribution currencies == expense.currency
FUND-003 every payer contributor belongs to the group
FUND-004 each contributor occurs at most once per expense, unless product law explicitly allows otherwise
```

The key insight is that **Funding and Split are dual ledgers around one Expense**:

```text
             Expense total
             /           \
     who funded it     who consumed/owes it
      Funding             Split
         |                  |
         +------ Position --+
```

Position should derive each participant's expense delta from:

```text
funded_amount - beneficiary_allocation
```

rather than from one payer receiving the full credit.

## What the IR missed

The initial model's `expected_impact` listed only J05/J06/J08/J10. Repo inspection shows that is incomplete.

Add downstream projection/dependency edges for at least:

- J11 settlement consumes Position/obligations;
- J18 activity/history represents expense changes;
- J24 export preserves expense/split/payment semantics;
- J28 recovery governs uncertain/idempotent operations.

This is a useful failure: the IR did not hide the miss. The A/B comparison gives us concrete information to improve the model.

## External sanity check

As a non-authoritative external comparison, TeilFair models multiple payers separately from expense splits: an Expense has one-to-many ExpensePayers and one-to-many ExpenseSplits, with payer amounts required to sum to the expense total. That independently supports the Funding-vs-Split distinction discovered above. It is evidence for the shape, not authority for ChopDot policy.

## A/B assessment

| Dimension | Current repo | Product IR V0 |
| --- | --- | --- |
| First-order domain impact | requires reading several specs/code surfaces | immediate from one small model |
| Funding vs beneficiary distinction | discoverable from code reasoning | becomes explicit structural concept |
| Downstream J11/J18/J24/J28 impact | found by broader repo inspection | missed by initial slice |
| Exact source/code ownership | strong | intentionally weak in V0 |
| Product invariants | distributed across specs/code | compact and inspectable |
| Risk of false completeness | repo is noisy but broad | higher unless coverage boundaries are explicit |
| Maintenance burden | existing | low so far; 3 research files only |

Quantitative time/token claims are intentionally not made from this single interactive run. We do not yet have a controlled repeated benchmark.

## Decision

**KEEP the experiment, but do not expand to the whole product.**

The next increment should improve the model in exactly two ways:

1. introduce `Funding / Contribution` as distinct from `Split / Allocation`;
2. add explicit downstream dependency/projection edges discovered in this test.

Then create one executable invariant harness from the IR:

- payer contributions conserve expense total;
- beneficiary allocations conserve expense total;
- per-participant delta = funded - allocated;
- all participant deltas sum to zero per expense/currency.

If that harness can generate useful cases including 10 CHF / 3 participants and a multi-payer example without duplicating product rules in test code, V0 earns the next experiment.

## Guardrail

Do not encode a new rounding/remainder policy here. The existing approved money authority must be located and bound first. The IR may expose the requirement; it may not invent the answer.
