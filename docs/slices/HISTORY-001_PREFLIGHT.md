# HISTORY-001 Preflight — Real money activity history

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

History should answer “what happened with my money?” rather than only showing archived/finished groups. A user should be able to understand requests, corrections, payment acknowledgements and confirmations without reconstructing state from balances.

## Existing evidence

Already emitted on this branch:

- `payment_marked_paid`
- `payment_marked_paid_retracted`
- `payment_confirmed`
- `request_invalidated`
- `expense_correction_recorded`

Existing finished-group `SavedRecord` summaries remain useful but are not an activity ledger.

Missing high-value events that can be added safely without changing persisted entity shapes:

- `expense_added`
- `request_sent`
- `group_saved`

Ordinary pre-payment `UPDATE_EXPENSE` does not currently carry an explicit occurrence/idempotency timestamp/id. Rather than invent unreliable history identifiers, this slice will leave its detailed journaling to a future command/backend model. MONEY-002 corrections already have explicit correction ids and are auditable.

## Audit rules

1. History events append only after the underlying state transition actually succeeds.
2. Replayed actions must not duplicate stable one-time/request events.
3. History never changes financial truth.
4. Payment wording distinguishes payer acknowledgement/evidence from receiver confirmation.
5. Cash payer acknowledgement is not described as bank/chain proof.
6. Chain evidence may show a transaction reference but does not imply ChopDot receiver confirmation.
7. Missing/deleted historical entities degrade gracefully; History must not crash because an expense/member is no longer active.
8. Consumer copy uses people, amounts and actions—not reducer/event jargon.
9. Finished-group summaries remain available as archive records below activity.
10. Do not fabricate events for actions that were never journaled historically.

## Event identity

Use deterministic IDs where natural stable identifiers exist:

```text
expense:add:{expenseId}
request:sent:{requestId}
group:saved:{recordId}
```

Corrections/settlements keep their existing event IDs.

If a request action has no request id, do not create a durable request event in this slice rather than generating an unstable fake id.

## Implementation shape

- `src/history/localActivityAudit.ts`
  - wrap successful legacy actions after the settlement reducer;
  - append only stable event types;
  - never overwrite an existing event id.
- compose audit wrapper in `src/state/localAppReducer.ts`.
- `src/history/historyPresentation.ts`
  - pure event-to-consumer-row projection;
  - resolve people/group/expense names from current state where possible;
  - safe fallbacks when entities are absent.
- rebuild `History.tsx`:
  - Recent activity timeline first;
  - finished-group archive second;
  - readable timestamps/amounts/status cues;
  - empty state reflects both activity and archive.
- deterministic tests for event creation/idempotency and presentation.

## Acceptance cases

1. Adding an expense produces one durable `expense_added` event.
2. Replaying the same expense id does not duplicate history.
3. Sending a request with a stable request id produces one `request_sent` event.
4. Replayed same request id does not duplicate history.
5. Saving a group snapshot produces one `group_saved` event.
6. Failed/no-op actions do not emit history.
7. Existing settlement events render payer/receiver/amount correctly.
8. `payment_marked_paid` copy says marked/sent, not receiver-confirmed.
9. `payment_confirmed` clearly identifies receiver confirmation.
10. Correction events remain visible with human wording.
11. Missing historical user/expense/group records do not crash the timeline.
12. Saved group summaries remain openable.
13. Timeline is newest-first.
14. No fake historical backfill is generated.

## Deferred

- full backend append-only event persistence — BACKEND-001/002;
- pre-payment edit/delete command history with stable command ids — backend/domain follow-up;
- cross-device canonical event merge — SYNC/BACKEND;
- filtering/search/export — later product scope;
- rich chain explorer links per native/asset evidence — after verified network explorer configuration.

## Quality status

Required: G2 code/tests + mobile/reload verification before DONE.