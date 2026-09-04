# Saved Record, Realtime, Outbox and Replay-Safe History Contract

This contract is storage-neutral.

1. Validate the transition against payment item, current version, authority and idempotency scope.
2. Accept the event and durable outbox entry in one durability boundary.
3. Only then emit `SavedRecordAccepted` and treat the state as authoritative.
4. Realtime delivery is ephemeral: it may be lost, duplicated, delayed or out of order.
5. Reconnect and refresh reconcile from accepted durable history.
6. Outbox delivery retries until acknowledged; consumers deduplicate event ID and stream version.
7. History is append-only and replay-safe. Replay rebuilds projections but never opens a payment app, requests wallet approval, resubmits a transfer, marks sent, confirms receipt or closes again.
8. Unknown save results reconcile by event/idempotency identity and never create a replacement payment by assumption.
