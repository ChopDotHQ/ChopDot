# ChopDot Product Schema V1

Status: **freeze candidate after final adversarial hardening**

The primary artifact is the composable ChopDot Product Schema. Gate-specific construction packets are downstream derived views, not the purpose or authority of the schema.

Final settlement-dependency hardening now makes the approved policy mechanically load-bearing:
- guard evaluation is effect-time and fail-closed;
- create/edit/delete require complete operation-specific current/proposed state when unresolved settlements exist;
- every settlement descriptor uses a closed resolution-state enumeration;
- released scopes require fresh authoritative reconciliation evidence;
- every unresolved settlement requires before/after dependency snapshots for eligible balance, dispute eligibility and source lineage;
- any change to those dependency snapshots blocks the mutation;
- `expense.issue` and `position.position` are explicit guard inputs;
- dispute-state transitions invalidate dependent prepared PaymentIntents for re-resolution;
- J05 `locked` survives, but its historical blanket-lock copy is explicitly superseded for ordinary dependency-scoped locking;
- whole-group closeout remains semantic-only and outside Gate B until it has an approved surface.

Gate B reaches locked/reconciliation states through a read-only unresolved-settlement seed injected into the same canonical shared prototype state. It does not introduce a second fixture store or implement Gate C settlement execution.

The executable reference for the guard is pinned in `executable_reference_contracts` and emitted into the derived construction packet.
