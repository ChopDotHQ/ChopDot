# Product IR V0 experiment protocol

## Question

Can a small semantic model make ChopDot easier to break apart, reason about, put back together, and extend than the current repo/spec discovery process?

## Baseline task

Hypothetical only: support multiple payers on one expense.

Do not implement the feature.

### Baseline A — current approach

Using approved specs, registries, implementation and tests, identify:

1. semantic rules affected;
2. journeys affected;
3. state transitions affected;
4. derived financial behavior affected;
5. migration requirements;
6. tests required.

Record files inspected and missed dependencies/reviewer corrections.

### Baseline B — Product IR-assisted

Answer the same six questions beginning with `MODEL.yaml`, then consult source authority only where the IR points or is explicitly incomplete.

## What V0 must prove

### Decomposition

We can inspect one primitive such as Split without loading unrelated UI details.

### Composition

Expense + Split + Group + Participant are sufficient to derive the core saved-expense constraints feeding Position.

### Precision

The representation catches semantic failures that a visually correct UI may miss, especially exact minor-unit conservation.

### Traceability

Every V0 semantic claim points back to existing approved authority or is explicitly marked as an open qualification/hypothesis.

### Change impact

The MULTI_PAYER experiment produces a bounded blast radius and exposes where V0 lacks coverage rather than pretending completeness.

## Representation bake-off

Do **not** adopt a new dependency in this first commit.

After the plain YAML model is reviewed, encode the same slice in at most two executable candidates:

1. TypeScript/Zod + explicit transition model.
2. CUE for constraints plus a minimal transition representation.

Use XState only if transition complexity demonstrates a concrete advantage.

A purpose-built DSL is deferred unless both candidates reveal a specific repeated limitation.

## Benchmark

Prefer measured evidence over architecture enthusiasm.

| Metric | Current approach | Product IR | Desired direction |
| --- | --- | --- | --- |
| semantic source files read | TBD | TBD | lower |
| irrelevant files read | TBD | TBD | lower |
| missed dependencies | TBD | TBD | zero / lower |
| independent semantic edits for one change | TBD | TBD | lower |
| reviewer corrections caused by context gaps | TBD | TBD | lower |
| executable invariant checks generated | TBD | TBD | higher |
| maintenance required after unchanged product | TBD | TBD | near zero |

## Immediate review questions

- Is Expense/Split/Position represented without inventing product policy?
- Are lifecycle and derived-read-model concerns separated cleanly?
- Are UI/Golden concerns correctly projections rather than domain truth?
- Can the model represent unknown/recovery later without becoming a giant ontology?
- Does one semantic change have one obvious edit point?
- Is this already easier to reason about than opening four journey specs?

## Explicit open qualifications

- Exact minor-unit remainder allocation policy is intentionally not invented here.
- J07 review semantics are referenced indirectly through J06/J10 but outside V0.
- Settlement, Activity, Export and Recovery are expected downstream impacts but are outside the initial slice.
- This model does not claim to generate production UI.
- This model does not replace approved specs or Goldens.

## Decision after V0

Only three valid outcomes:

- **KEEP** — clear speed/precision gain; continue one adjacent slice.
- **SHRINK** — useful pieces exist, but representation is too broad.
- **REMOVE** — no meaningful advantage over current product authority + Product Model V1.
