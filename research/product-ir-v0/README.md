# Product IR V0 — Expense → Split → Position

Status: **isolated research experiment**  
Base product authority: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`  
Branch: `research/product-ir-v0-expense-slice`

## Hypothesis

ChopDot can become faster and safer to change if core product meaning is represented as a small composable semantic model that can be decomposed, changed, recomposed, and checked without rereading the whole product.

This is **not** a second knowledge graph, a new product authority, or a production rewrite.

The Product Model V1 answers **what relates to what**. Product IR V0 tests whether we can describe **what the product means and what may legally happen** precisely enough to derive useful projections and tests.

## Slice

Only:

- Participant
- Group
- Expense
- Split
- Position

Proving journeys:

- J05 Add Expense
- J06 Review / Correct Expense
- J08 Group Home
- J10 Overall Position

## Hard boundaries

V0 must not:

- modify Golden artifacts or approved journey semantics;
- modify the active integrated preview;
- modify production/runtime code;
- create a database, service, MCP server, graph backend, vector store, or agent platform;
- create a whole-product ontology;
- make Product Model V1 or the preview depend on this experiment;
- introduce manually maintained facts that can be derived reliably.

Generated outputs are never product authority.

## Design principle

**Product IR must compress complexity, not relocate it.**

A semantic fact should have one owner. Projections should be derived wherever practical.

Target shape:

```text
Domain objects + constraints + operations/transitions
                         |
                         v
                 semantic Product IR
              /          |          \
         journeys       tests      impact
              \          |          /
                    implementation
```

Journeys are treated as traversals/projections over product semantics, not as the lowest-level definition of those semantics.

## Falsification test

The experiment must handle a hypothetical change:

```text
Expense.payer: ParticipantId
          ->
Expense.payers: Contribution[]
```

Without changing production code, the V0 model should identify the affected:

- invariants;
- operations/transitions;
- projections/journeys;
- derived position behavior;
- tests that would be required;
- migration shape.

If this requires broad repo archaeology or manually duplicating the same fact in many model files, the approach is failing.

## Evaluation

Compare a normal repo/spec investigation with Product IR-assisted investigation for the same bounded change.

Record:

- files/context required;
- time/steps to identify impact;
- missed dependencies;
- contradictory assumptions discovered;
- number of independently edited semantic surfaces;
- reviewer corrections;
- whether executable checks can be generated from the IR.

### Keep threshold

Continue beyond V0 only if the model clearly reduces discovery/reasoning work **without** increasing maintenance burden.

### Stop conditions

Stop or shrink if:

- the IR becomes another documentation set to synchronize;
- one ordinary product change requires editing many independent IR files;
- model maintenance slows active product work;
- the representation cannot express an approved rule without embedding large prose;
- generated tests are weaker than existing explicit tests;
- the model starts competing with approved specs/Goldens for authority.

## V0 artifacts

- `MODEL.yaml` — deliberately small semantic model/prototype.
- `EXPERIMENT.md` — questions, benchmark, and acceptance protocol.

Representation choice is intentionally provisional. V0 should teach us whether the semantic model is valuable before choosing CUE, XState, a TypeScript/Zod representation, or a purpose-built DSL.
