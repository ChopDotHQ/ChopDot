# Product IR V0 — checkpoint 1

## Evidence so far

The experiment has moved through four increasingly strong stages without changing product/runtime authority:

1. **Structured model** — Expense/Funding/Split/Position represented separately.
2. **Executable invariants** — model descriptors drive conservation/currency/membership checks.
3. **Mutation diagnosis** — deliberate corruptions identify violated laws and affected projections.
4. **Composition/query** — ExpenseAccounting can be decomposed, recomposed, traced forward for impact and backward for explanation.

Dedicated Product IR workflow was green through composition commit `136284df6e8e145fb75ce93c8dededd92fe3f53b`.

## What has been learned

### Useful

- Funding and beneficiary Split are distinct semantic dimensions.
- Position is naturally derived from their difference.
- Invariants can sit above UI implementations and expose contradictory implementation behavior.
- A compact composition contract is easier to reason about than rereading several journey artifacts for the same accounting question.
- Bidirectional explanation is possible with a very small vocabulary.

### Risks

- The first model missed downstream J11/J18/J24/J28, demonstrating false-completeness risk.
- Hand-maintained impact edges can become graph maintenance if allowed to grow unchecked.
- YAML is currently a research carrier, not a proven long-term representation.
- We have not yet demonstrated automatic implementation generation or automatic extraction of code ownership.
- We have not run a controlled repeated timing/token benchmark.

## Complexity budget

V0 remains intentionally bounded to:

- one model file;
- one composition contract;
- six executable rule descriptors;
- one tiny query surface;
- research-only probes;
- one CI workflow.

Do not add a database, server, MCP layer, editor, generalized graph engine, code generator, or second product slice before the query experiment is reviewed.

## Current decision

**KEEP — conditional.**

The experiment has produced capabilities not present in prose specs alone, but has not yet earned whole-product expansion.

## Next falsification gate

Use the tiny query surface for three practical questions:

1. `decompose ExpenseAccounting`
2. `why-untrusted Position SPLIT-003`
3. `impact Expense.funding FUND-001,FUND-002,FUND-003`

Then compare the answers with a manual authority/code investigation.

If the query output is incomplete, repair the smallest missing semantic link. If repeated repairs require broad manual edge maintenance, SHRINK or REMOVE rather than building infrastructure around it.
