# Funding-core repair experiment

Research only. This checkpoint supersedes the earlier optional-schema rollout.
Audited parent: `3d2b4e30e9a2edcdd9aa5d12e104ab9fd22f75ec`.

## Boundary

The application Expense schema is restored byte-for-byte to the pre-experiment
blob `c8a150fd55f635adda3d8f19f1eb917037901dae`. Native funding is a validated
read/calculation experiment, NOT a newly supported persistence format.

One dependency-free module, `src/domain/expenseFunding.ts`, owns the funding
read adapter, value validation and the explicit unsupported-write guard.
The calculator, service and repository consume that module. No native funding
can be silently accepted and discarded by the scalar-payer repository mapping.

## Guarantees exercised

- Legacy `paidBy` adapts to one full contribution.
- Explicit malformed/empty funding is rejected instead of becoming legacy data.
- Non-finite, non-numeric, zero and negative contributions are rejected.
- Funding conservation is exact on the canonical decimal spellings of the
  supplied finite numbers. There is no `1e-9` equality tolerance.
- Group membership is checked where group context is available.
- Native calculations require explicit conserving beneficiary allocations and
  cannot silently mix their currency with the calculation currency.
- Per-person attribution is asserted, not merely the sum of all balances.
- Service and direct repository native creates/updates are explicitly rejected.
- A native record cannot be converted to a legacy write by deleting funding in
  an update. Unsupported updates are rejected before service metadata writes.
- Legacy writes validate the full proposed funding/explicit-allocation state.
  Existing legacy no-allocation/equal-split calculation behavior is unchanged.
- Existing service test assertions are retained; fixtures now supply the
  required group membership and existing-expense read result.

## What exactness does NOT mean here

The adapter does not restore digits lost before a JavaScript number arrived.
It does not decide currency scales, ledger quantization, contributor uniqueness,
asset limits or who receives a division remainder. Authoritative remainder
policy was not located in the bounded branch-local J05/shared/contract inspection;
this is NOT a claim that the repository contains no such policy.
The existing Decimal calculation/output-number limitations and legacy equal-split
fallback are not represented as a fully qualified MoneyV1 engine.

## Verification

`FundingCore.test.ts` imports the actual core, calculator, ExpenseService and
ExpenseRepository. Only the external data source is an in-memory fixture.
It exercises malformed inputs, exact-value conservation, attribution,
compatibility, unsupported writes, update validation and no-effect failures.
The local pure-module checks execute the same TypeScript source, not copied
function bodies. Full repository verification must be read from CI on the exact
repair commit; this document is not a green-check substitute.

These are implementation regression tests, not model-generated tests and not
an independent/blind-agent performance experiment. The earlier same-conversation
planning exercises do not establish controlled A/B performance results.

## Explicit non-goals

No UI/Golden/journey redesign, database or CRDT migration, export format change,
payment execution, live database access, model platform, discovery V4, or agent
infrastructure. No concurrency/atomic-storage guarantee is claimed. No merge or
production deployment is authorized by this research checkpoint.
