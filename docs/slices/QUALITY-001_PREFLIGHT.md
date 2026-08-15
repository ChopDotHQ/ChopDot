# QUALITY-001 Preflight — Validation + failure/recovery pass

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## Goal

Remove failure modes that can create ambiguous money state, misleading actions, or difficult recovery before visual polish.

## Concrete issues found

1. `CaptureSpend` used `parseFloat`, so malformed text such as `12abc` could be interpreted as 12.
2. `ReviewSplit` also used permissive `parseFloat`; negative/invalid exact, percent or share inputs could leak into calculations.
3. ReviewSplit created expense/split ids with `Date.now() + Math.random()` instead of UUID-grade stable identifiers.
4. `RequestPayment` said `Send / Copy link` but only mutated local state; it neither created nor copied/shared a request URL.
5. `RequestPayment` sent `SEND_REQUEST` without request id/expiry, weakening standalone return matching, idempotency and activity history.
6. Request UI could present an actionable button when no exact payable obligation existed.
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

## Implemented

- added `src/validation/moneyInput.ts` with explicit currency decimal policy and strict normal-decimal parsing;
- added `src/validation/moneyInput.test.ts` covering malformed, exponent, negative, zero, precision and currency-scale cases;
- `CaptureSpend` now uses text + `inputMode="decimal"`, strict parsing, positive-value validation and bounded titles;
- `ReviewSplit` now rejects malformed/negative exact, percent and share inputs, validates exact totals at currency precision, enforces percentage/share rules, surfaces invalid fields and uses UUID-grade local entity ids;
- `RequestPayment` now scopes one request to one payer, one receiver and one currency, excludes obligations owed to other creditors, separates mixed currencies, creates one stable request id + 24-hour expiry, builds the standalone payer URL, and invokes share/clipboard delivery;
- request state changes only after `shareOrCopyText()` returns `shared` or `copied`; `ready` leaves financial state unchanged and shows an explicit recovery error;
- every split in that exact request receives the same request id/expiry, enabling return-link exact matching and `HISTORY-001` request audit events;
- request action is disabled when there is no payable open split;
- added `npm run test:quality` to group validation/request/history regression tests.

## Deliberate non-change

`requestLinks.ts` currently restricts transport currency codes to three letters. That does not block the current USD/EUR/GBP/PAS request journey. USDC live execution is already explicitly blocked in `POLKADOT-003`; widening transport asset-code validation should happen with the executable USDC rail or a narrowly reviewed transport change, rather than forcing a large unrelated file replacement into this quality slice.

## Deferred

- integer canonical money migration — DATA-002;
- persistence corruption/migrations — DATA-002;
- full offline/retry backend commands — BACKEND/SYNC;
- broad accessibility/viewport pass — QUALITY-002;
- actual push/SMS/email delivery integrations — future product scope.

## Verification required

Written / not executed here:

- `npm run lint`
- `npm run test:quality`
- `npm run test:guest-link`
- `npm run build`
- manual mobile proof: malformed spend input, exact/percent/share errors, empty request state, share success, clipboard fallback, share/copy unavailable, and returned payer update.

Do not mark DONE until current-source reconciliation and the required runtime/build evidence are complete.
