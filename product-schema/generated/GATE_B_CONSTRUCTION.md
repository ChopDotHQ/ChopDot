# Generated Gate B Construction Packet

**Derived view — not product authority and not implementation authorization.**

Schema audit: **PASS**  
Gate: **Core expense loop**  
Goal: A user can add, inspect, edit/review, agree/question, and return to an updated group without a Golden contract regression.

## Construction order

1. **J08 — Group Home**
2. **J05 — Add an Expense**
3. **J06 — Review / Correct an Expense**
4. **J07 — Review / Agree / Raise an Issue**

## Gate A reuse

Reusable continuity contexts: `ctx.group`, `ctx.expense_draft`, `ctx.expense`, `ctx.position`, `ctx.activity`.
New Gate B continuity contexts: `ctx.review`.

- `expense.create`: expand_bounded_gate_a_capability — Gate A covered common equal-split subset only
- `expense.edit`: new_to_integrated_gate_b
- `expense.delete`: new_to_integrated_gate_b
- `expense.review_agree`: new_to_integrated_gate_b
- `expense.raise_issue`: new_to_integrated_gate_b
- `expense.resolve_issue`: new_to_integrated_gate_b

Gate A remains frozen; its bounded expense demo is not full J05/J08 integration.

## Shared semantic circuit

Contexts: `ctx.group`, `ctx.expense_draft`, `ctx.expense`, `ctx.review`, `ctx.position`, `ctx.activity`

Operations: `expense.create`, `expense.edit`, `expense.delete`, `expense.review_agree`, `expense.raise_issue`, `expense.resolve_issue`

Derived views: `view.group_home`, `view.position`, `view.activity`

## Internal handoffs

- J05 → J06: `ctx.expense`
- J05 → J07: `ctx.review`, `ctx.expense`
- J05 → J08: `ctx.group`
- J06 → J07: `ctx.review`, `ctx.expense`
- J06 → J08: `ctx.group`
- J07 → J08: `ctx.group`
- J08 → J05: `ctx.expense_draft`, `ctx.group`
- J08 → J06: `ctx.expense`
- J08 → J07: `ctx.review`, `ctx.expense`

## Continuity / acceptance

- J05 creates the same Expense lineage consumed by J08/J06/J07.
- J06 mutates that same Expense; it does not fork a correction copy.
- J07 review/issue state remains attached to the same Expense lineage.
- Position/Activity/Group Home are refreshed projections, not manually edited substitutes.
- Every Gate B mutation operates on the same stable Group/Participant/Expense lineage rather than screen-local substitutes.
- Explicit Expense splits conserve the exact Expense amount under MoneyV1 semantics.
- J06 owns expense edit/delete; J07 owns agreement/issue semantics; coordinated issue resolution preserves that boundary.
- Unresolved ExpenseIssue state blocks only dependent payment items.
- GroupHome/Position/Activity refresh from accepted underlying state rather than manual UI overwrites.
- Gate A accepted bytes and the 28 frozen Goldens remain unchanged.

## Frozen journey sources

### J08 — Group Home
- Spec: `prototypes/experience-workbench/journeys/08-group-home/spec.md`
- Golden: `prototypes/experience-workbench/journeys/08-group-home/v1-golden.html` — SHA-256 `7bd47a9ea9987a2bc0e5912b99cddbfe0fea3f1b16d85aa76d76e919747cecf7`
- QA: `prototypes/experience-workbench/journeys/08-group-home/VISUAL_QA.md`
- Owns operations: none
- Participates: none

### J05 — Add an Expense
- Spec: `prototypes/experience-workbench/journeys/05-add-expense/spec.md`
- Golden: `prototypes/experience-workbench/journeys/05-add-expense/v1-golden.html` — SHA-256 `1aa7c723f60ada46d739c33749690ea493c8a2121cf85b3f1678a3798d638b23`
- QA: `prototypes/experience-workbench/journeys/05-add-expense/VISUAL_QA.md`
- Owns operations: `expense.create`
- Participates: none

### J06 — Review / Correct an Expense
- Spec: `prototypes/experience-workbench/journeys/06-review-correct-expense/spec.md`
- Golden: `prototypes/experience-workbench/journeys/06-review-correct-expense/v1.1-golden.html` — SHA-256 `aece70448ae1979f6a0bf3abfc46affc75da2c1540cb91dbeda32efc8722b55c`
- QA: `prototypes/experience-workbench/journeys/06-review-correct-expense/VISUAL_QA.md`
- Owns operations: `expense.edit`, `expense.delete`
- Participates: `expense.resolve_issue`

### J07 — Review / Agree / Raise an Issue
- Spec: `prototypes/experience-workbench/journeys/07-review-agree/spec.md`
- Golden: `prototypes/experience-workbench/journeys/07-review-agree/v1.1-golden.html` — SHA-256 `90c11c09125dc8ba8a7d97530b33b7fff685b3a4fd0979992acf3910736db3ce`
- QA: `prototypes/experience-workbench/journeys/07-review-agree/VISUAL_QA.md`
- Owns operations: `expense.review_agree`, `expense.raise_issue`
- Participates: `expense.resolve_issue`

## Build constraints

- Do not infer full J05/J08 coverage from the bounded Gate A expense demonstration.
- Do not redesign Golden hierarchy, copy, actions, permission boundaries, or recovery meaning.
- Do not introduce production storage, real authentication, financial execution, provider selection, or Product Integrator work as part of Gate B.
- Do not use Product IR/funding/conformance research branches as product authority.

## Schema blockers

- None detected by Stage 4.
