# Funding-core implementation experiment

Status: research-only implementation slice  
Branch: `research/product-ir-v0-funding-core`

## Scope implemented

Only:

- optional Expense `funding[]` domain shape;
- legacy `paidBy` compatibility adapter;
- funding membership + total validation helper;
- Position/balance calculation using funding contributions;
- focused accounting compatibility tests.

## Explicitly not implemented

- UI changes;
- DTO/service migration;
- repository persistence migration;
- CRDT migration;
- export schema changes;
- Activity/Recovery behavior;
- removal of `paidBy`;
- rounding/remainder policy changes;
- Golden/journey changes.

## Compatibility strategy

During this experiment:

```text
native expense with funding[]
        -> use funding[]

legacy expense with paidBy
        -> [{ memberId: paidBy, amount: expense.amount }]
```

`paidBy` remains required by the existing schema so the research slice does not force unrelated callers to migrate.

## Accounting law

```text
participant delta
  = sum(funding contributions)
  - beneficiary allocation
```

The experiment does not alter beneficiary split semantics.

## Success criteria

- legacy balance tests remain green;
- native multi-funder test produces +50 / -10 / -40 for 70+30 funding and 20/40/40 allocation;
- native one-contribution funding is accounting-equivalent to legacy `paidBy`;
- compiler/CI exposes any assumptions we failed to account for;
- no UI or product-authority artifact changes.

## Interpretation

This branch is evidence about whether Product IR-guided bounded implementation works. It is not a proposal to merge the multi-payer feature as-is.
