# Blind-agent V2 plan — ranked-context multi-payer Expense

Status: research only. No implementation authorization.

## Context supplied

Product IR semantic packet plus V3 ranked implementation context.

V3 selected **14 MUST**, **15 REVIEW**, and deferred the remaining lower-confidence candidates. This plan begins from MUST and uses REVIEW only where the semantic change crosses that boundary.

## Plan

### 1. Canonical domain and compatibility

Primary owners:
- `src/schema/pot.ts`
- `src/services/data/types/dto.ts`
- `src/types/app.ts`

Replace the semantic assumption that one expense has one `paidBy` with a canonical funding contribution collection. Keep Funding separate from beneficiary Split.

Define a compatibility adapter for legacy single-payer records: interpret `paidBy` as one full-amount contribution. Do not allow legacy and new fields to become two conflicting authorities.

Do not decide eager persistence migration, duplicate contributor policy, or remainder policy without product authority.

### 2. Persistence boundary

Primary owner:
- `src/services/data/repositories/ExpenseRepository.ts`

Inspect create/read/update mapping before changing DTOs. Persistence must round-trip funding provenance and preserve legacy records during compatibility. Add/extend repository tests before removing any legacy write path.

This is a critical improvement over Blind V1: persistence is now in initial MUST context rather than discovered later.

### 3. Sync / CRDT boundary

Primary owners:
- `src/services/crdt/types.ts`
- `src/services/crdt/automergeUtils.ts`

Funding must survive merge/sync as structured expense data. Determine whether CRDT expense types duplicate the domain representation and eliminate/adapt that duplication rather than inventing a separate multi-payer shape.

Compatibility must prevent an older `paidBy` representation and newer `funding` representation from merging into contradictory payer truth.

### 4. Business operations

Primary owner:
- `src/services/data/services/ExpenseService.ts`

Update Create/Edit validation around Product IR laws:

- funding conserves expense total;
- funding currency matches expense currency;
- contributors belong to the group.

Checkpoint invalidation remains orthogonal.

### 5. Accounting / Position

Primary owners:
- `src/services/settlement/calc.ts`
- `src/hooks/usePotBalances.ts`
- `src/services/settlement/calc.test.ts`
- inspect `src/services/closeout/pvmCloseout.ts` because V3 found direct calculation/payer coupling.

Replace full-credit-to-`paidBy` with:

```text
participant delta = sum(funding contributions) - beneficiary allocation
```

Settlement/closeout should consume correct derived balances rather than independently reinterpret multi-payer semantics.

Required conservation:
- sum funding = expense amount;
- sum beneficiary allocation = expense amount;
- sum participant deltas = zero per currency.

### 6. Serialization / portability

Primary owner:
- `src/utils/export.ts`
- REVIEW: `src/utils/export.test.ts`

Funding provenance must not be flattened back to one payer during export. Exact portable schema/version implications require J24/product-authority review before implementation.

### 7. User projections

REVIEW on demand:
- `src/components/screens/AddExpense.tsx`
- `src/components/QuickKeypadSheet.tsx`
- `src/components/screens/ExpenseDetail.tsx`
- `src/components/screens/ExpensesTab.tsx`
- relevant routing/action contracts.

Create and Edit need one-or-more funding inputs. Expense Detail must represent all funders. Quick Add must either support the same canonical funding shape or intentionally remain a one-funder shortcut that emits a one-element funding collection.

Do not let local UI Expense interfaces become a second domain model.

### 8. Derived/action consumers

REVIEW:
- `src/hooks/useBusinessActions.ts`
- `src/hooks/useSettlementActions.ts`
- settlement/export tests and routing types.

Inspect only if their data contracts or legacy `paidBy` access crosses the changed canonical representation.

### 9. Regression strategy

MUST tests already surfaced:
- `calc.test.ts`
- `ActionFlows.test.ts`
- `MajorFlows.test.ts`

REVIEW:
- `ExpenseService.test.ts`
- `export.test.ts`
- `settlements.test.ts`

Add cases for:
- 2 funders / 3 beneficiaries;
- participant both funds and consumes;
- invalid funding total;
- invalid contributor;
- legacy `paidBy` equivalence;
- repository round-trip;
- CRDT round-trip/merge compatibility;
- export preservation;
- Position zero-sum;
- create/edit round-trip.

### 10. Rollout order

1. Confirm canonical funding representation and unresolved product-policy questions.
2. Implement compatibility adapter at domain/read boundary.
3. Update persistence + sync representations and tests.
4. Update DTO/service validation.
5. Update Position calculation and accounting tests.
6. Update derived consumers.
7. Update create/edit/detail projections.
8. Update export representation only after J24 authority check.
9. Run settlement/closeout regressions.
10. Remove legacy `paidBy` writes only when compatibility evidence proves safe.

## Open questions to escalate, not invent

- authoritative minor-unit remainder policy;
- duplicate contributor semantics;
- persistence migration strategy;
- J24 portable schema/version behavior;
- J18 Activity wording/provenance;
- J28 unknown/retry semantics if funding edits have possible effects;
- review-status behavior after funding contributor changes.

## Likely failure modes

- persistence writes funding but reads only `paidBy`;
- CRDT peers produce conflicting legacy/new payer fields;
- one UI path collapses funding back to a scalar;
- balance code double-credits compatibility data;
- export loses funding provenance;
- closeout/settlement reimplements payer assumptions;
- local duplicated Expense interfaces drift from canonical schema;
- legacy records become invalid before migration;
- unresolved rounding policy is accidentally changed as part of multi-payer work.

## V2 conclusion

The ranked context is sufficient to produce an implementation-ready **core topology** without loading the 150-file V2 discovery set. Product-authority questions remain intentionally unresolved.
