# ChopDot Public Beta Decisions

## DEC-001 - Receipt-first entrance

The first product action is **Scan a receipt**. Capture creates a local draft;
review is the authority boundary. Manual entry is a fallback.

## DEC-002 - One authority

`MoneyV1`, `ChopEventV1`, and `ModePolicyV1` are the domain boundary. Hosts,
wallets, chains, indexes, checkpoints, transports, and projections are adapters.

## DEC-003 - No private backend

The beta uses participant-held signed events, encrypted local projections,
encrypted Bulletin blobs, minimum-disclosure Statement Store hints, and the
minimal `RecoveryHeadIndex`. It does not use Supabase or another operated
ChopDot database/relay.

## DEC-004 - Recovery is honest and optional

Same-account recovery and social re-grant are required. A downloadable
encrypted recovery kit is offered but never mandatory. Bulletin retention and
lost-account limitations must be stated in user language.

## DEC-005 - One immutable promotion

Build once, stage one CAR/CID on Products Devnet, and promote the identical CAR
to Paseo. A `.dot.li` URL is claimed only after independent build-ID and CID
readback. Use `chopdot.dot` only with Full personhood; otherwise ship under
`chopdotapp01.dot` and keep branded migration open.
