# Generated Gate B Construction Packet

**Derived view — not product authority or implementation authorization. Pre-Gate-B readiness: BLOCKED.**

## Construction order

1. J08 — Group Home
2. J05 — Add an Expense
3. J06 — Review / Correct an Expense
4. J07 — Review / Agree / Raise an Issue

## Gate A qualified reuse

- `ctx.group` — one local group fixture/state continuity
- `ctx.expense_draft` — bounded draft Back/reopen/reload continuity
- `ctx.expense` — common equal-split expense subset only
- `ctx.position` — Home/common-expense position demonstration only; not J10 integration
- `ctx.activity` — Home attention/task-continuity demonstration only; not J18 integration

Provenance caveat: J05 stylesheet is preview-owned reconstruction; approved Golden HTML is unchanged.

## Gate B composition

Contexts: `ctx.group`, `ctx.expense_draft`, `ctx.expense`, `ctx.review`, `ctx.position`, `ctx.activity`, `ctx.expense_guard`

Operations: `expense.create`, `expense.edit`, `expense.delete`, `expense.review_agree`, `expense.raise_issue`, `expense.resolve_issue`, `expense.withdraw_issue`, `expense.reply_to_issue`

Rendered here: `view.group_home`

Refreshed downstream: `view.position` → Gate C, `view.activity` → Gate D

## Authority blockers

- **AUTH-J05-GOLDEN-INCOMPLETE** — J05's frozen structured-source README declares six slices, but five are absent from the frozen authority tree.

## Product decisions required

- **POLICY-EXPENSE-LOCK-SCOPE** — Historical J08/J05/J06 behavior includes settlement-related expense mutation locking, while later settlement contracts narrow dependency blocking to affected items. The final mutation-lock scope is not settled by the frozen sources.

## Continuity contracts

- **CONT-EXP-01** — J05 creates the same Expense lineage consumed by J08/J06/J07.
- **CONT-EXP-02** — J06 mutates the existing Expense and appends accepted history; it never creates a correction-copy Expense.
- **CONT-EXP-03** — J07 review/issue/reply/withdraw state remains attached to the same Expense and reviewer/issue lineage.
- **CONT-EXP-04** — Group Home refreshes Attention/Recent/Position from accepted underlying state; standalone J10/J18 screens are not part of Gate B.

## Composition laws

- **COMP-01** — The same underlying object identity survives adjacent journey handoffs; routes do not create replacement domain objects.
- **COMP-02** — Only an operation owner may mutate its semantic object; projections/read models cannot mutate source truth.
- **COMP-03** — Derived views refresh from accepted underlying state; no journey manually overwrites Position, Activity, Insights or history to simulate an outcome.
- **COMP-04** — Possible-effect recovery preserves the original operation identity and returns to the owning journey after verified outcome/safe retry/explicit stop.
- **COMP-05** — Gate A partial capability coverage is not promoted to full journey integration.
- **COMP-06** — Approved Goldens define experience projection; the schema references them and does not duplicate or redesign their visual hierarchy/copy.

## Build constraints

- **BUILD-01** — Do not infer full J05/J08 coverage from the bounded Gate A expense demonstration.
- **BUILD-02** — Do not redesign Golden hierarchy, copy, actions, permission boundaries, or recovery meaning.
- **BUILD-03** — Do not introduce production storage, real authentication, financial execution, provider selection, Product Integrator, protected merge, or deployment as Gate B work.
- **BUILD-04** — Do not use Product IR/funding/conformance research branches as product authority.

## Journey authority

### J08 — Group Home
- Spec: `prototypes/experience-workbench/journeys/08-group-home/spec.md`
- Golden entrypoint: `prototypes/experience-workbench/journeys/08-group-home/v1-golden.html`
- Resolved artifact: `prototypes/experience-workbench/journeys/08-group-home/v1-golden-candidate.html` (html, Git blob `a262d87412f3ff8a09e3ac36d67d7a4ced6b351c`)
- Authority: `prototypes/experience-workbench/journeys/08-group-home/source/decision-history.md` (decision_history)

### J05 — Add an Expense
- Spec: `prototypes/experience-workbench/journeys/05-add-expense/spec.md`
- Golden entrypoint: `prototypes/experience-workbench/journeys/05-add-expense/v1-golden.html`
- Resolved artifact: `prototypes/experience-workbench/journeys/05-add-expense/source/README.md` (source_manifest, Git blob `4be3362789f1265b6fad99690694f35d325cbefd`)
- Resolved artifact: `prototypes/experience-workbench/journeys/05-add-expense/source/core.html` (html, Git blob `524da4f898d7c8a22437c42833c06106852609aa`)
- **MISSING frozen artifact:** `prototypes/experience-workbench/journeys/05-add-expense/source/split-methods.html`
- **MISSING frozen artifact:** `prototypes/experience-workbench/journeys/05-add-expense/source/details-receipt.html`
- **MISSING frozen artifact:** `prototypes/experience-workbench/journeys/05-add-expense/source/payer-variant.html`
- **MISSING frozen artifact:** `prototypes/experience-workbench/journeys/05-add-expense/source/recovery.html`
- **MISSING frozen artifact:** `prototypes/experience-workbench/journeys/05-add-expense/source/styles.css`
- Authority: `prototypes/experience-workbench/journeys/05-add-expense/STATE_INVENTORY.md` (state_inventory)
- Authority: `prototypes/experience-workbench/journeys/05-add-expense/source/decision-history.md` (decision_history)

### J06 — Review / Correct an Expense
- Spec: `prototypes/experience-workbench/journeys/06-review-correct-expense/spec.md`
- Golden entrypoint: `prototypes/experience-workbench/journeys/06-review-correct-expense/v1.1-golden.html`
- Resolved artifact: `prototypes/experience-workbench/journeys/06-review-correct-expense/SOURCE_PACKAGE.md` (package_manifest, Git blob `e7c0bede5acd8bf48bcc8a3ead8ee12192151ee9`)
- Resolved artifact: `prototypes/experience-workbench/journeys/06-review-correct-expense/source-package-v1.1.zip` (zip, Git blob `e073ea0717e7621c921056d56945c89bc6c0207e`)
- Authority: `prototypes/experience-workbench/journeys/06-review-correct-expense/STATE_INVENTORY.md` (state_inventory)
- Authority: `prototypes/experience-workbench/journeys/06-review-correct-expense/source/decision-history.md` (decision_history)

### J07 — Review / Agree / Raise an Issue
- Spec: `prototypes/experience-workbench/journeys/07-review-agree/spec.md`
- Golden entrypoint: `prototypes/experience-workbench/journeys/07-review-agree/v1.1-golden.html`
- Resolved artifact: `prototypes/experience-workbench/journeys/07-review-agree/README.md` (package_manifest, Git blob `9fb851062f9047efb57fa31ab9508a2993c59a14`)
- Resolved artifact: `prototypes/experience-workbench/journeys/07-review-agree/v1.1-golden-candidate.html.xz` (xz, Git blob `29c8f9246840ff6c9fc926f147e00547baec9bc7`)
- Authority: `prototypes/experience-workbench/journeys/07-review-agree/STATE_INVENTORY.md` (state_inventory)
- Authority: `prototypes/experience-workbench/journeys/07-review-agree/source/decision-history.md` (decision_history)

## Schema blockers

- None detected.

