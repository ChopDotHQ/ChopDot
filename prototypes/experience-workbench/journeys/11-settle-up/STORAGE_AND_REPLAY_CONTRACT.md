# Saved Record, Realtime, Outbox and Replay-Safe History Contract

This contract is storage-neutral.

## Durable event acceptance

1. Validate the transition against the payment item, current version, authority and idempotency scope.
2. Accept the internal event and its durable delivery entry in one durability boundary.
3. Only then emit `SavedRecordAccepted` and treat that event as authoritative.
4. `SavedRecordAccepted` confirms durable event acceptance only. It does not mean the payment succeeded, was received, was closed, or that the final user-readable Saved record has already been produced.

## User-readable Saved record

5. The final user-readable Saved record is a durable projection or document derived from accepted history. It is distinct from the internal event acceptance above.
6. A Saved record SHALL be retrievable through an ordinary web storage path, such as an authenticated HTTPS application route or API, using a stable ChopDot record identifier.
7. Any Product SDK CID is optional integration metadata. It must not be assumed to be publicly readable, must not be required for ordinary web retrieval, and must not be the sole retrieval key.
8. The ordinary web retrieval path must remain valid even when an optional Product SDK, content-addressed store or payment integration is unavailable or replaced.

## Realtime, delivery and history

9. Realtime delivery is ephemeral and never authoritative. It may be lost, duplicated, delayed or arrive out of order.
10. Reconnect and refresh reconcile from accepted durable history and the current user-readable Saved record.
11. Outbox delivery retries until acknowledged; consumers deduplicate by stable event ID, payment item ID, stream version and idempotency key.
12. History is append-only and replay-safe. Replay rebuilds projections and Saved records but never opens a payment app, requests wallet approval, resubmits a transfer, marks sent, confirms receipt or closes again.
13. Unknown save results reconcile by event and idempotency identity. They never create a replacement payment or a second Saved record by assumption.
