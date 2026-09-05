# Product authority and benchmark reconciliation evidence

**Kind:** measurement
**Status:** accepted local verification
**Owner:** product-assurance
**Observed at:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** exact-worktree governance verification only; it cannot claim product implementation, E2 competitor proof, deployment, user adoption, or knowledge recall

## Exact scope

- Root: `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
- Branch: `codex/chopdot-v1-launch`
- Starting HEAD verified by the final context run:
  `15fd49de78121a08e07e76c6fee91ef3850bb18d`
- Product law was not edited.
- The worktree already contained concurrent Gate 9 and portable-knowledge
  changes. This slice is therefore verified locally but not committed as an
  undifferentiated worktree.

## Accepted authority model

```text
PRODUCT_TRUTH.md
-> product/benchmark-baseline.md
-> product/decisions.md and product/decision-contracts.md
-> product/roadmap.md delivery phases
-> product/cards.md bounded packages
-> tracked Product Judgment and Frontend Design methods
-> objective packet, Cockpit, context, wiki, and agent-loop validators
```

The product composition order is category baseline, then named ChopDot
differentiation, then bounded experiments. It does not choose a universal Home
action. A card must declare participant or operator audience, bounded action
scope, `action_scope_universal: false`, benchmark role, evidence state, outcome,
owner, failure behavior, and exit.

## Source identity

- Benchmark source: `product/benchmark-baseline.md`
- Benchmark SHA-256:
  `eb0bad42e37a3d6b61ca98414dfc03ff123a0c67c016ee612aab7b6b54c76b50`
- Stable outcome IDs: 17
- Benchmark evidence status: stale `E1-public-source` plus inferred
  `E0-discovery`; same-task `E2-hands-on` remains open.
- Historical cross-checkout matrices and plans are explicitly time-sliced and
  cannot call their old counts or routing current.

## Executable agent outcomes

- `ProductDefinitionPacketV1` and `UxJourneyPacketV1` must cite stable
  benchmark IDs, resolve applicability/disposition, preserve evidence grades,
  follow baseline -> differentiation -> experiment order, retain experiment
  fallbacks, and use a bounded structured actor/state/action scope.
- Their contracts cannot omit the benchmark semantic command.
- The semantic command emits typed measurements consumed by the deterministic
  evaluator; conflicting command and external measurements fail closed.
- The default tracked evaluation suite contains product and UX adversarial
  cases and is runnable through `npm run agent:eval` without hidden arguments.
- The taxonomy is now only a profile registry; expected outcomes live once in
  the versioned loop profiles.

## Newly executed verification

| Command | Exact result |
|---|---|
| `npm run context:validate` | PASS; 13 default sources; exact root, branch, HEAD, tree, and complete dirty status reported |
| `npm run product:validate` | PASS; 11 cards |
| `npm run wiki:validate` | PASS; 13 source pages; generated views current |
| `npm run agent:validate` | PASS; 45/45 governance files |
| `npm run agent:instructions:validate` | PASS; 9 agent references and 15 commands |
| `npm run agent:eval` | PASS; 4/4 default adversarial cases |
| `node --test scripts/product-cockpit.test.mjs scripts/agent-system/tests/benchmark-semantics.test.mjs` | PASS; 61/61, comprising 29 Cockpit and 32 benchmark semantic tests |
| `npm run agent:ci:core` | PASS; 157/157, 0 failed, 0 skipped |
| `git diff --check` | PASS |

## Honest remaining outcomes

- `E2-hands-on` comparator/null-workflow walkthroughs: open.
- Product code or screen implementation from this reconciliation: not done.
- Candidate build, staging, promotion, ownership, and deployment from this
  reconciliation: not done.
- Real-participant proof: not done.
- Exact-worktree durable knowledge recording/recall for this result: not done.
- Logical commit: pending; unrelated and overlapping worktree changes must not
  be swept into this product-governance slice.
