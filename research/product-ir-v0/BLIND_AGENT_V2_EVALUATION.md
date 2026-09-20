# Blind-agent V2 evaluation

## A/B result

### V1
- Input: Product IR packet + 9 manually bounded files.
- Outcome: strong core plan, but missed persistence, CRDT/sync, normalization/export and several readers.
- Classification: partial pass.

### V2
- Input: Product IR packet + automatically ranked V3 context.
- V3 discovery: 14 MUST, 15 REVIEW, 22 deferred from the scored candidate set; broad V2 discovery remains available separately.
- Outcome: plan now includes domain, persistence, CRDT/sync, operation, accounting, closeout, serialization, projection and regression boundaries without loading the broad 150-file neighborhood.

## Critical misses repaired

V2 initial context now includes:
- ExpenseRepository;
- CRDT types + automerge utilities;
- export serialization;
- app/domain shadow type;
- closeout calculation consumer;
- broader regression tests.

The UI surfaces are correctly available in REVIEW rather than forcing all projections into initial context.

## Precision finding

V3's MUST set contains 14 files. This is below the hard 25-file budget and is materially smaller than V2's 150-file broad discovery.

The MUST set still contains at least one item (`pvmCloseout.ts`) that needs semantic inspection before deciding whether it changes. That is acceptable: MUST means "must understand", not "must edit".

## Remaining weakness

V3 ranking is still lexical/structural heuristic code. It can rank false positives and may miss semantically relevant files that do not expose recognizable symbols. It is not yet a compiler-grade dependency analysis.

Do not add TypeScript compiler infrastructure unless another concrete blind test demonstrates that this limitation materially hurts planning or implementation.

## Decision

**PASS for context-selection experiment.**

Product IR + broad discovery + ranked progressive disclosure produced a materially better planning packet than V1 while staying inside the context budget.

Next useful test is not another discovery algorithm. It is a throwaway implementation slice: implement only the canonical domain + accounting core behind compatibility, with UI/Goldens untouched, and see whether Product IR laws plus compiler/tests catch the expected breakage.
