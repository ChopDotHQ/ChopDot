# ChopDot Product Schema V1

Status: **post-Claude settlement-dependency hardening candidate**

The approved settlement-lock policy is now split cleanly:

- Gate B uses an **economic dependency guard** for ordinary settlements.
- The guard evaluates both current Expense state and proposed post-state.
- A create/edit/delete is blocked only when it would change an unresolved settlement dependency: source lineage, payer/recipient pair, currency, eligible balance, dispute eligibility, or open partial remainder.
- Guard inputs fail closed when settlement truth is unresolved; `unknown_effect` outranks optimistic terminal labels.
- A partial remainder preserves its dependency lock.
- Raising an issue is allowed, but invalidates any dependent prepared PaymentIntent for re-resolution.
- J05 `locked` remains a Gate B recovery state, now dependency-triggered.
- J08's historical blanket `settlement_in_progress` Add-disabled state is recorded as a post-Golden impact and is no longer required in Gate B.
- Whole-group closeout remains an approved **semantic-only future mode** with no approved surface, and is intentionally excluded from Gate B construction.

Decision provenance is immutable:
- `DEC-EXPENSE-SETTLEMENT-LOCK-01` is pinned at approving commit `c2797bd73dbdb22854ede54cb2b461e26862b1b1`.
- `DEC-EXPENSE-SETTLEMENT-LOCK-02` is pinned at approving commit `880fef977911c2bb366cd3144faef73487643919`.

Historical Goldens remain frozen; post-Golden impacts are recorded explicitly rather than rewritten into them.
