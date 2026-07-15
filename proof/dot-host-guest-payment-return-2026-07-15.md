# Dot Host Guest Payment Return Proof

Date: 2026-07-15

## Result

Passed against:

`https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`

Deployment CID:

`bafybeigyl77b3d5kv4lgbrmwz2a4qdmat3wd4x34xca7gqtdfseyoxxmmu`

## User Journey

> I am Leo. I need to open Mina's payment link, see my exact share, and tell
> Mina I paid so she can confirm what arrived.

The live proof used two isolated browser contexts and only the visible hosted
ChopDot UI:

1. Mina created `Friday Crew Live` with Leo.
2. Mina recorded a $30 dinner and shared Leo's $15 request.
3. Leo opened the public `paseo.li` payment link in a fresh context.
4. Leo saw one amount, one payment method, and one `I paid Mina` action.
5. Leo had no receiver-confirmation or organizer controls.
6. Leo shared the scoped paid update back to Mina.
7. Mina's existing local group moved only Leo's exact item to `Needs confirm`.
8. Mina confirmed receipt and the group became ready to finish.

## Proof

- command: `npm run test:guest-link:live-dot`
- result: `1 passed (7.5s)`
- machine report: `proof/guest-payment-return-live-dot/report.json`
- screenshots: `proof/guest-payment-return-live-dot/01` through `05`

## Boundaries

- This is an explicit return-link flow, not automatic real-time sync.
- The return packet is not a production backend payment intent or guest
  capability.
- The receiver shell applies it only when group, payer, request id, amount,
  currency, expiry, receiver authority, and current request state match.
- `marked_paid` remains separate from receiver confirmation.
- No live Product Account identity or Statement Store synchronization is claimed
  by this proof.

## Visual Review

- The payer screen presents one obvious action and no internal infrastructure
  language.
- The receiver screen keeps the group context and an `Add expense` recovery
  action while payment confirmation is pending.
- The host's transient loading layer is excluded from screenshots by an
  explicit visible-readiness gate.
