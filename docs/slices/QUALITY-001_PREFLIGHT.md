# QUALITY-001 Preflight — Validation + failure/recovery pass

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## Goal

Remove failure modes that can create ambiguous money state, misleading actions, or difficult recovery before visual polish.

## Concrete issues found

1. `CaptureSpend` uses `parseFloat`, so malformed text such as `12abc` can be interpreted as 12.
2. `ReviewSplit` also uses permissive `parseFloat`; negative/invalid exact, percent or share inputs can leak into calculations.
3. ReviewSplit creates expense/split ids with `Date.now() + Math.random()` instead of UUID-grade stable identifiers.
4. `RequestPayment` says `Send / Copy link` but only mutates local state; it neither creates nor copies/shares a request URL.
5. `RequestPayment` sends `SEND_REQUEST` without request id/expiry, weakening standalone return matching, idempotency and activity history.
6. Request UI should refuse zero/openless request state rather than presenting an actionable button.
7. Existing payment signing/network failures already fail closed and surface an error; preserve that behavior.
8. Settings Clear Data has explicit confirmation and is already correctly separated from profile disconnect.
9. App persistence currently clears corrupted JSON silently; explicit schema/corruption recovery belongs to DATA-002 because changing persisted-shape policy here would mix concerns.

## Rules

- malformed money text is rejected, never partially parsed;
- monetary input allows only normal decimal notation, not exponents/trailing text;
- currency-specific decimal precision is explicit at input boundaries;
- split components cannot be negative;
- exact split total must match expense at currency precision;
- percentage inputs cannot be negative and must total 100%;
- share inputs cannot be negative and at least one share must be positive;
- entity ids use `crypto.randomUUID()` where a stable server id is not yet available;
- payment requests have a stable request id + expiry before state changes;
- every split in the same person-to-receiver request scope gets the same request id/expiry so the standalone return packet can be exact-matched;
- request link amount/currency/receiver derive from current state, not user-editable URL text;
- sharing/copy failure is recoverable and does not lie that a link was sent;
- no changes to legacy direct-confirm debt or persisted schema in this slice.

## Planned implementation

- strict decimal/currency validation helper + tests;
- use it in CaptureSpend and ReviewSplit;
- use UUID ids for new expense/split records;
- RequestPayment builds `StandalonePayerRequest` + `buildPayerRequestUrl()`;
- generate one request id + expiry, dispatch it to the exact open split scope, then invoke native share when available or clipboard fallback;
- show success/failure feedback without claiming a channel sent something it did not;
- disable request action when nothing is owed;
- direct tests for validation/request packet creation where practical.

## Deferred

- integer canonical money migration — DATA-002;
- persistence corruption/migrations — DATA-002;
- full offline/retry backend commands — BACKEND/SYNC;
- broad accessibility/viewport pass — QUALITY-002;
- actual push/SMS/email delivery integrations — future product scope.

## Quality status

Required G2 tests + build/mobile interaction evidence before DONE.