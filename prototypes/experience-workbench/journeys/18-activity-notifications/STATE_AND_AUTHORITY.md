# Journey 18 — State and authority

## State layers

### Canonical domain state
Expense, request, payment, membership, savings, authorization, access and balance truth live in their owning domain journeys/services. Journey 18 cannot write these states.

### Activity projection state
A derived, readable list of meaningful accepted domain milestones. It may be regenerated, filtered, cached, deduped and sorted without changing canonical truth.

### Attention state
Derived from unresolved canonical conditions that require this viewer's action or follow-up. Attention is not cleared by simply opening or reading an Activity item.

### Notification delivery state
Per-user delivery metadata such as unread/read, delivery timestamp, and a small snapshot of what was true when the notification was created. This state is not payment/expense/request authority.

### Access state
Always evaluated against the viewer's current permissions when the item is opened. A stale notification cannot restore revoked access.

## Authority table

| Actor / layer | May do | Must not do |
|---|---|---|
| Canonical backend/domain | Accept valid domain events, resolve tasks, recompute balances, enforce permissions | Treat notification read state as domain confirmation |
| Activity projection | Filter, sort, dedupe, render, cache, route | Approve, settle, confirm, withdraw, mutate balances |
| Notification delivery | Deliver a snapshot, change read/unread metadata | Authorize or prove a money/action result |
| User | Read, filter, mark notification copies read, navigate | Resolve a canonical item merely by reading it |
| Agent/LLM | Summarize and suggest/open the owning journey | Execute financial or approval actions without delegated authority |

## Important separations
- **Unread ≠ unresolved.**
- **Delivered ≠ current.**
- **Opened ≠ approved.**
- **Activity row ≠ transaction execution.**
- **Provider refresh ≠ meaningful activity milestone.**
- **Cached ≠ current.**
- **Notification access at delivery ≠ current access.**

## Stable identity / dedupe
A meaningful Activity item is keyed by the accepted event or canonical entity/version milestone. Technical polling, reconnects and repeated provider checks must not create additional user-facing rows for the same meaningful state.

## Money representation
Amounts retain the source event's exact string representation and currency/asset. Currency buckets remain separate. No conversion is performed by Journey 18.
