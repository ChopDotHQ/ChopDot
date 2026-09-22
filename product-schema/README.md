# ChopDot Product Schema V1

Status: **hybrid settlement-lock policy approved and encoded — final pre-freeze candidate**

The final Gate B product-decision gap is resolved by explicit post-Golden human decision `DEC-EXPENSE-SETTLEMENT-LOCK-01` in `product-decisions-v1.json`.

Policy:
- ordinary settlements use dependency-scoped locking;
- prepared SettlementScope is exact and never retroactively expands;
- unrelated new Expenses remain allowed during an ordinary settlement;
- edits/deletes of Expenses inside an active nonterminal/unknown-effect settlement source scope are blocked;
- an explicit `GroupCloseoutContext` broadens the same guard to block create/edit/delete for that Group;
- relevant unknown-effect scope remains locked until reconciliation or terminal/safe-no-effect truth.

Historical Goldens remain frozen. This decision is explicitly newer product authority and is not rewritten into historical sources.

Current generated readiness should be `READY_FOR_HUMAN_AUTHORIZATION` only when schema verification passes and there are no remaining authority blockers or unresolved Gate B product decisions.
