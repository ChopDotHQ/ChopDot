# Blind-agent plan — multi-payer Expense

**Method:** This plan is intentionally constrained to the generated Product IR change packet and the bounded implementation neighborhood defined in `BLIND_AGENT_EXPERIMENT.md`. It does not claim whole-repository completeness.

## 1. Domain migration

Current core shape is single-payer through `ExpenseSchema.paidBy: string`.

Target semantic shape is a funding collection distinct from beneficiary split:

```text
Expense
  amount
  funding[]      # who paid
  split[]        # who owes/consumed
```

Introduce a contribution representation with participant/member identity and amount. Preserve exact expense currency semantics. Do not decide duplicate-contributor normalization or remainder policy in implementation.

Compatibility should be read-first: existing records containing `paidBy` must remain interpretable as one funding contribution for the full expense amount. Whether/when stored records are rewritten requires explicit migration authority.

## 2. DTO boundary

`CreateExpenseDTOSchema` and `UpdateExpenseDTOSchema` currently inherit/pick the single `paidBy` field from `ExpenseSchema`.

The DTO layer must expose the new funding representation consistently. During compatibility, avoid accepting two contradictory authorities (`paidBy` and `funding`) without an explicit precedence/error rule.

## 3. Business service

`ExpenseService.addExpense` and `updateExpense` explicitly validate `dto.paidBy`.

Replace single-payer validation with funding validation derived from the semantic laws:

- contributions conserve the expense total;
- contributors are valid group members;
- contribution currency matches expense currency.

The service currently loads the Pot, so membership validation belongs naturally at or below this boundary. Do not duplicate a different funding law in UI-only validation.

Checkpoint invalidation behavior is orthogonal and should remain unchanged unless product authority says otherwise.

## 4. Position/balance derivation

`computeBalances` currently credits the full amount to exactly one `expense.paidBy`, then debits beneficiary split allocations.

Change the accounting model to:

```text
participant delta = funded amount - beneficiary allocation
```

For every expense/currency:

```text
sum(funding) == expense amount
sum(split allocations) == expense amount
sum(participant deltas) == 0
```

Do not solve this by treating multiple payers as multiple synthetic expenses; that would lose funding provenance and could distort edit/export/activity semantics.

The existing no-split fallback divides equally across members using Decimal. The Product IR has explicitly not authorized a persisted minor-unit remainder policy, so that policy remains an open product question rather than something this change should silently redefine.

## 5. Position consumers

`usePotBalances` reconstructs `PotExpense` values and currently copies `paidBy`. It must preserve/pass funding data into the canonical calculation path.

Settlement suggestions should remain consumers of computed balances. They should not gain independent multi-payer logic if Position computation already produces correct balances.

## 6. Create/edit UI

Both `AddExpense.tsx` and `QuickKeypadSheet.tsx` currently model one payer and emit one `paidBy`.

The UI change should expose one-or-more funding contributions while keeping Funding distinct from Split.

Edit must round-trip existing funding provenance. A multi-payer expense must not collapse back to one payer merely because the edit screen uses a legacy local interface.

The two components currently implement split calculations differently; do not use this feature as permission to invent or normalize the unresolved remainder policy.

## 7. Routing/action boundary

`pot-screens.tsx` routes Add Expense and Quick Add through action callbacks. Update callback data contracts only as required to carry the canonical funding shape. Keep routing semantics unchanged.

## 8. Tests

Extend `calc.test.ts` with at least:

- two funders / three beneficiaries;
- same participant both funds and consumes;
- funding contributions sum exactly to expense;
- funding short/over total rejected before Position derivation;
- invalid contributor rejected;
- funding and split produce zero-sum participant deltas;
- existing single-payer record maps to equivalent one-contribution accounting;
- multiple expenses with different funding patterns;
- small crypto amounts without loss of accounting conservation.

Add schema/DTO/service tests for compatibility and invalid funding. UI tests should prove create/edit round-trip and that funding is not conflated with beneficiary split.

## 9. Rollout order

1. Define canonical funding domain representation and compatibility read rule.
2. Add schema/DTO validation without removing legacy read compatibility.
3. Update balance derivation and tests.
4. Update service create/edit validation.
5. Update `usePotBalances` adaptation.
6. Update full Add/Edit Expense UI.
7. Update Quick Add.
8. Update routing/action data contracts.
9. Run existing expense, balance and settlement regressions.
10. Only after broader authority review, inspect Activity/Export/Recovery projections identified by Product IR.

## 10. Open product questions — do not invent

- authoritative minor-unit/remainder allocation policy;
- duplicate contributor semantics;
- whether persisted legacy `paidBy` is migrated eagerly or adapted on read;
- exact Activity wording/provenance for multiple funders;
- exact Export representation/versioning for funding;
- whether review status changes specifically because funding contributors change.

## Likely failure modes

- one UI path still emits legacy `paidBy`;
- edit collapses multiple funders;
- DTO/schema accepts contradictory legacy/new payer representations;
- balance calculator double-credits payer funding during compatibility;
- funding and beneficiary allocation are accidentally treated as one concept;
- settlement duplicates multi-payer logic instead of consuming Position;
- legacy records become unreadable;
- floating-point/remainder behavior changes accidentally;
- local Expense interfaces drift from canonical domain type.

## Bounded-context gaps

The bounded neighborhood is sufficient to plan the core schema -> DTO -> service -> calculation -> UI path.

It is **not** sufficient to specify Activity, Export, Recovery, repository persistence/migration mechanics, or approved review-status behavior. Those should be escalated to the independent full-repository/authority pass rather than guessed here.
