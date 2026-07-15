# Dot Host Guest Payment Return V1

Lane: Programme A portable-shell product proof

## Current truth to preserve

- Mina owns the group and sends Leo one scoped payment request.
- Leo sees one amount, one receiver, and one primary action without onboarding.
- `marked_paid` is not `confirmed`; Mina remains the only person who can confirm receipt.
- The portable shell is static and has no production payment-intent backend.

## Scope in

- Generate share links through the public `.dot` host instead of its blocked sandbox origin.
- Bind each sent request to the exact payer, group, amount, request id, and expiry.
- Let Leo return a narrowly scoped `marked_paid` update to Mina.
- Apply that update only when Mina's local request scope matches exactly.
- Prove the journey in separate browser contexts using only normal UI.

## Scope out

- Automatic cross-device sync.
- Production guest-capability security claims.
- Receiver confirmation by a link, host, wallet, or payment provider.
- Real payment execution, custody, or a new backend.

## Requirements

1. A copied request link SHALL open through `chopdot-shell-proof.paseo.li`.
2. A fresh-device payer SHALL see one amount, one receiver, and one `I paid Mina` action.
3. A sent request SHALL carry a high-entropy request id and expiry that Mina stores on the covered splits.
4. Leo's returned update SHALL change only matching `request_sent` splits to `marked_paid`.
5. A wrong, expired, mismatched, or replayed update SHALL not change another split.
6. Mina SHALL still confirm receipt before the matching split is `confirmed`.
7. Normal UI SHALL not expose host, protocol, capability, proof, or state-machine language.

## Scenarios

### Fresh-device request

GIVEN Mina sends Leo a request from the `.dot` host
WHEN Leo opens the copied link in a fresh browser context
THEN the host opens ChopDot
AND Leo sees his amount, Mina, and one payment action
AND no organizer controls or account setup appear.

### Paid update returns

GIVEN Leo has Mina's live scoped request
WHEN Leo taps `I paid Mina` and sends the update back
THEN Mina opens the returned link
AND only Leo's matching request becomes `marked_paid`
AND Mina sees `Confirm received from Leo`.

### Unsafe return is rejected

GIVEN a returned update has the wrong request id, payer, group, amount, or expiry
WHEN Mina opens it
THEN no split changes
AND the group remains in its previous state.

## Proof

- focused reducer and request-link tests;
- isolated-context Playwright journey;
- live `.dot` screenshots for Leo's request and Mina's confirm state;
- host proof note and cockpit checkpoint.
