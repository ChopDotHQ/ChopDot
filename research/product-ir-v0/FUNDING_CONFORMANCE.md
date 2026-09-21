# One bounded model-to-implementation conformance experiment

Research only. Parent repair: `33a09dbbe789884b3d1ad3abc8c44b6153ee0718`.
No change to MODEL.yaml, its executable rule vocabulary, the original probe,
application source, approved journeys, storage or dependencies is part of this
experiment. The workflow runs only on `research/product-ir-v0-conformance`.

## Question

Does the existing executable IR agree with the actual repaired funding and
balance-calculation modules on the same bounded inputs, and can this connection
detect meaningful implementation regressions even when balances still sum to zero?

## Method fixed before the first run

`funding-conformance-cases.json` is one hand-authored, frozen corpus: 16 cases
inside the explicitly shared domain, plus three coverage diagnostics selected
from static inspection. This is not an independent or blind experiment.

The 16 shared cases exercise contributor attribution, funding conservation,
contributor membership, contribution/allocation currency consistency, allocation
conservation, two different explicitly supplied conserving allocations, a funder
who is not a beneficiary, zero balances, decimal inputs, ordering, valid legacy
single-payer adaptation, and a zero beneficiary allocation.

The three diagnostics ask whether executable model checks enforce nonnegative
funding and beneficiary membership, and whether model and code agree about a
zero funding contribution. They are not silently excluded from the strict result.
A disagreement remains visible, exits nonzero, and needs interpretation rather
than a change to the expected result or a new unapproved product policy.

The exact MODEL.yaml and original `model-driven-probe.mjs` are read from the
checkout. A temporary copy appends an export for the probe's existing `validate`,
`deltas` and `rules` bindings. Its evaluator, self-tests and handwritten delta
function are otherwise unchanged. The source model is not compiled automatically
into application code; declared-but-non-executable laws remain a real limitation.

The implementation side executes the entire actual `expenseFunding.ts` and
`settlement/calc.ts` modules after Node's type erasure. Only import paths are
resolved for the temporary workspace. It uses the installed, lock-matching
`decimal.js` package, not a test double or a copied arithmetic implementation.

Fixtures use explicit integer hundredths. Their conversion to the current
numeric API must round-trip exactly; outputs are never rounded into agreement.
This does not establish cryptocurrency scales or choose a division remainder.
For accepted inputs, compare every participant's balance. For rejected inputs,
the implementation's first error must be among the model's failed rules; full
error-list equality is not required of a fail-fast implementation.

## Deliberate throwaway regressions

Six mutations, each applied afresh to original source in a separate temporary
module directory: collapse funding attribution, bypass funding conservation,
bypass membership, bypass funding currency equality, bypass allocation
conservation, and reverse all balance signs. Mutation output never replaces the
original source. An unchanged-behavior comment edit is a positive control.

A mutation is detected only by a semantic mismatch on a case that conformed in
the baseline. The three diagnostic differences cannot kill a mutant. Import,
syntax and harness errors are experiment errors, never successful detections.
These selected mutants are not an exhaustive mutation score or security audit.

## Run and inspect

With the repository's locked dependencies installed and Node 22.16 or compatible:

```sh
node research/product-ir-v0/funding-conformance.mjs --output artifacts/funding-conformance
```

Exit codes: **0** all cases conform and mutation controls pass; **1** semantic
nonconformance or a surviving mutant; **2** a harness/setup failure. No expected
failure is waived to give the strict workflow a green result.

The output includes `report.json`, `SUMMARY.md`, input Git blob/SHA-256 hashes,
exact dependency provenance, individual baseline/mutant observations and a
partial reproduction snapshot. The snapshot includes the real Decimal package
and requires no dependency download for this one command. It is not the full app.

Read the exact run's report before making any result claim. Prior repair CI
success is not evidence that this new model-conformance check passes.

## Not claimed

No model expansion, persistence support, UI or settlement-execution coverage,
transaction/concurrency guarantee, autonomous-agent improvement, formal proof,
or authority to merge or deploy. Any model gaps are findings to bring back for
review; this experiment does not fix them by redefining product semantics.

## Observed checkpoint — 2026-09-21

**Strict result: NONCONFORMING (exit 1), not an all-green model contract.**

Tested source: `0dc7c656834856a148c3095b030d34981a745753`.
[GitHub Actions run 35589661201](https://github.com/ChopDotHQ/ChopDot/actions/runs/35589661201),
job `106300923648`, completed the experiment and preserved its report.
The workflow failed at the comparison step, with no setup/import failure.

- 16 of 19 cases conformed; the 16 predeclared shared-domain cases all matched.
- Three coverage diagnostics diverged: D01 negative contribution, D02 outsider
  beneficiary, and D03 zero contribution. The executable model accepted all
  three; the implementation rejected them with `FUNDING_AMOUNT`, `SPLIT-001`,
  and `FUNDING_AMOUNT`, respectively.
- All six targeted throwaway implementation mutations were detected by
  previously conforming cases. The unchanged-behavior comment control produced
  exactly the baseline observations, including the same three divergences.

For C01, funding A 70/B 30 and allocation A 20/B 40/C 40 gives balances
A +50/B -10/C -40. M01 collapsed attribution and returned A +80/B -40/C -40.
Both sum to zero; the per-participant comparison caught the incorrect amounts.
M06 returned A -50/B +10/C +40, also zero-sum, and was detected as well.

D01 exposes missing executable enforcement of the model's already-declared
nonnegative-Money law. D02 exposes missing executable beneficiary-membership
constraints. D03 is a contract discrepancy: nonnegative model Money permits a
zero contribution, while the implementation requires positive funding entries.
Resolving that discrepancy requires an explicit decision, not weakening code or
silently treating an empty/zero contributor as a different representation.
No model policy or implementation rule was changed to remove these findings.

The CI artifact `10634027201` has SHA-256
`8589a29b1b5b7c7e0ec9fd87d3752fffa91a3fb1b8a6137d9845c66474daa267`.
The downloaded ZIP digest and every included input file's Git blob/SHA-256 were
verified. The exact snapshot was rerun on Node `v22.16.0` after CI's
`v22.23.2`; all baseline observations, mutation observations, summary fields and
input source hashes matched. Both runs used the real `decimal.js` `10.6.0`.
Both executions exited 1. This is a same-harness reproduction, not an independent
implementation or a second independent oracle.

The executable experiment remains at the tested commit above; this section is
an observation record. The runner, corpus, model and application modules were
not changed after observing the results. The original repair branch was not moved.
