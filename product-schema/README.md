# ChopDot Product Schema V1

Status: **hybrid settlement-lock decision encoded — schema candidate for final adversarial freeze review**

Current authored schema:
- `frozen-baseline.json`
- `semantic-core.json`
- `composition-graph.json`
- `gate-b-authority-oracle.json`
- `product-decisions-v1.json`

The last Gate B policy gap is resolved by explicit human product decision `DEC-EXPENSE-SETTLEMENT-LOCK-01`:
- ordinary settlements use dependency-scoped locking;
- new unrelated Expenses remain allowed because prepared SettlementScope is frozen;
- edits/deletes of source Expenses are blocked while the relevant settlement is active/nonterminal or unknown-effect;
- an explicit whole-group closeout broadens the same guard to block create/edit/delete for that Group;
- relevant unknown-effect scope remains locked until reconciliation/terminal truth.

This decision is deliberately recorded as a post-Golden human product decision, not retroactively attributed to the frozen Goldens.
