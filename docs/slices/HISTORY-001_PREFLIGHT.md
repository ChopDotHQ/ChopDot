# HISTORY-001 Preflight — Real money activity history

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

History should answer “what happened with my money?” rather than only showing archived groups. Users should understand requests, corrections, payment acknowledgements and confirmations without reconstructing balances mentally.

## Audit principles

1. Events append only after a real state transition succeeds.
2. Stable action/entity ids prevent duplicate one-time/request history.
3. History never changes financial truth.
4. Payer acknowledgement/evidence is visually and verbally distinct from receiver confirmation.
5. Cash acknowledgement is not described as proof that cash physically moved.
6. Chain evidence is described as transaction evidence, not final ChopDot confirmation.
7. Missing historical entities degrade gracefully.
8. Consumer copy never exposes reducer/event jargon.
9. Finished-group summaries remain available below activity.
10. No synthetic historical backfill is invented.

## Implemented events

Existing correction/settlement events consumed:

- `payment_marked_paid`
- `payment_marked_paid_retracted`
- `payment_confirmed`
- `request_invalidated`
- `expense_correction_recorded`

New stable local audit events:

- `expense_added` with id `expense:add:{expenseId}`;
- `request_sent` with id `request:sent:{requestId}` when a real stable request id exists;
- `group_saved` with id `group:saved:{recordId}`.

Ordinary pre-payment UPDATE_EXPENSE/DELETE_EXPENSE actions still lack explicit command ids/occurredAt metadata, so this slice does not fabricate durable edit/delete timeline entries. MONEY-002 corrections already carry stable correction ids and remain auditable.

## Implementation

### `src/history/localActivityAudit.ts`

- wraps successful legacy actions after canonical reducer/settlement processing;
- appends stable events only when the action actually produced the required resulting state;
- never overwrites an existing event id;
- request events require a stable request id;
- request event time on this local prototype is observation time because the legacy `SEND_REQUEST` action does not carry a canonical `occurredAt` field.

Future BACKEND command/event persistence must own canonical multi-device event timestamps.

### `src/state/localAppReducer.ts`

The reducer pipeline now composes:

```text
identity local actions
or
financial reducer
→ settlement evidence/audit
→ stable product activity audit
```

Local-only identity/chain-evidence actions remain outside the legacy shared publisher.

### `src/history/historyPresentation.ts`

Pure projection translates known audit events into consumer rows with:

- person names where available;
- safe `Someone` fallbacks;
- group/expense context;
- amount/currency;
- neutral/warning/positive semantic tone;
- newest-first ordering;
- unknown internal event types filtered out rather than leaked to UI.

### `History.tsx`

The old archive-only screen is replaced by:

1. **Recent activity** — a simple chronological money story;
2. **Past groups** — saved group summaries remain openable.

Important copy examples:

```text
Jean marked payment sent to Dev
Waiting for receiver confirmation

Dev confirmed payment from Jean

Payment request updated

Expense corrected · Dinner
```

This preserves the trust distinction between “payer says/evidence shows payment” and “receiver confirmed it.”

## Product correction made immediately before this slice

PayerView previously aggregated all a member's requested splits even when they were owed to different people. It now settles one creditor at a time, so history and payments cannot combine unrelated receiver obligations under one label.

## Tests written

`src/history/localActivityAudit.test.ts`:

- stable expense event;
- expense replay idempotency;
- stable request event;
- request replay idempotency;
- no fabricated request event without request id;
- invalid/no-op action produces no history;
- group archive event.

`src/history/historyPresentation.test.ts`:

- acknowledgement does not claim confirmation;
- receiver confirmation explicit;
- chain evidence labelled while still pending confirmation;
- missing historical entities safe;
- internal events hidden;
- newest-first sorting.

Verification command:

```text
npm run test:history
```

Tests are WRITTEN / NOT EXECUTED HERE.

## Deferred

- canonical backend append-only event persistence — BACKEND-001/002;
- stable command ids/timestamps for ordinary pre-payment edit/delete — backend/domain follow-up;
- canonical cross-device event merge — SYNC/BACKEND;
- filtering/search/export;
- verified network explorer links for all chain evidence.

## Quality status

G2 code/test artifacts exist. Required before DONE: typecheck, history tests, build, restart persistence and 320/375/390px timeline review against the reconciled current source.