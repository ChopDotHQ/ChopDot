# Product IR V0 — reduction checkpoint

The experiment has now removed its first redundant architecture.

## Removed

- hand-authored per-invariant `impact_rules`;
- the temporary derived-impact/oracle comparison probe;
- the CI step for that comparison.

## Kept

- executable rules with one semantic subject each;
- one small set of genuine semantic dependencies;
- the ExpenseAccounting composition contract;
- model-driven validation, mutation diagnosis, composition, and query probes.

## Why

The manual impact lists were useful as a temporary oracle while testing whether blast radius could be derived. Once semantic dependencies covered the oracle, keeping both would create duplicated truth.

The remaining model now derives impact by traversing:

```text
violated law
   -> semantic subject
   -> composition / operation dependencies
   -> derived state
   -> journey projections
```

This is a reduction in maintained concepts while retaining the capability.

## Guardrail

If future impact accuracy requires reintroducing many bespoke per-rule or per-journey edges, treat that as evidence to SHRINK the experiment rather than restore a large manual graph.
