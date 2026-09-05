# State and authority — Journey 13 V1

A request is a coordination record over existing source items, not a new expense or payment. The requester must be the creditor and an authorized participant in every source group. Group ownership is not required to request your own balance; it never grants authority over someone else's money.

## Independent state axes

Command: pending → unknown/recovering → accepted OR verified-not-saved. Retry is allowed only from verified-not-saved and reuses the immutable command ID/payload. Invalid versions/access reject acceptance; old IDs are ignored.

Delivery: queued → delivered OR failed. A delivery retry targets the existing request and returns to queued. Delivered cannot regress from a late failure. Withdrawal suppresses later delivery attempts but cannot recall a message already delivered.

Request: active → payment-progress → paid, or active → withdrawn. Create/withdraw operations preserve every expense item and membership. The original accepted request payload is never edited. Payment/version races reject withdrawal rather than racing it through.

The prototype's explicit verified-payment demo populates settledSourceIds, a separate observed-settlement projection. It does not write the source expense fixture. This prevents re-requesting settled items without pretending that the request service paid them.

## Domain contract

CreateRequestRequested binds actor, recipient, amountMinor, currency, displayScale, sourceItems, sourceGroups, sourceVersion, note, audience and returnTo. An authenticated SavedRecordAccepted for a money-request creates the record. DeliveryConfirmed is separate. WithdrawRequestRequested binds actor, requestId and expectedVersion. Acceptance creates a retained withdrawn state, not a deletion.

Production overlap checks and source-version checks must share an atomic transaction or equivalent serialized operation. Client-side checks only improve the experience. The demo's arrays are not concurrency protection for production. Recover commands from durable storage before permitting a second attempt after reload, reconnect or multi-device use.

No LLM, clipboard action, reminder, group-owner role, realtime event or optimistic UI mutation can authorize payment. Journey 11 owns payment authorization; Journey 12 owns verified payment completion and receipt. Requested, saved, delivered, read and paid are never interchangeable.
