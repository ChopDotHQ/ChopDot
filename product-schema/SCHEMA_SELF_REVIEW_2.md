# Product Schema V1 — Self-Review Round 2

This review was performed after the first adversarial hardening pass. It found and corrected four remaining classes of weakness without changing frozen product authority or Gate A product bytes.

1. **Removed accidental payment-storage architecture from Gate B.** Expense operations no longer have to emit the payment-oriented `AcceptedEvent`/outbox primitive. Expense change history, Group Recent, Activity and Attention are modeled as implementation-neutral projections from canonical domain truth.
2. **Added the accepted Gate A deterministic equal-allocation contract as integration evidence.** It is explicitly not promoted to Golden product law. Gate B must preserve stable participant ordering, exact MoneyV1 partitioning, deterministic remainder assignment and conservation for the inherited equal-split path.
3. **Made Expense edit → review invalidation an explicit product-decision gap.** The schema now guarantees stale prior review cannot silently remain current, while refusing to invent which edits invalidate review or the exact resulting status.
4. **Added source-backed Gate B construction requirements.** Basic defaults, required states, permission boundaries, hierarchy and literal review language now travel in the generated packet rather than forcing a builder to rediscover them from the repo.

The authority-derived oracle now verifies short evidence phrases before asserting schema expectations, and the mutation battery includes semantic mutations rather than only structural removal/ownership errors.

Gate B remains intentionally BLOCKED by:
- `AUTH-J05-GOLDEN-INCOMPLETE`
- `POLICY-EXPENSE-LOCK-SCOPE`
- `POLICY-EXPENSE-REVIEW-INVALIDATION`
