# ChopDot Platform Adoption Decisions

Date: 2026-08-22
Scope: v1 planning on `codex/chopdot-v1-launch`

## Decision: Product SDK ADOPT_AS_ADAPTER

Use the high-level Product SDK behind ChopDot-owned interfaces. Align the SDK,
TrUAPI, and host-test family in one compatibility change. The SDK is never
membership, organizer, payment-settlement, or product-history authority.

## Decision: Direct TrUAPI DEFER

Do not add direct protocol code unless a documented user-critical Product SDK
gap exists and cannot be resolved upstream.

## Decision: Host test SDK ADOPT_AS_ADAPTER

Use the simulator as fast integration evidence, then require a distinct real
dot.li or Desktop host gate.

## Decision: DotNS ADOPT_AS_ADAPTER

Use DotNS for content-addressed delivery and discovery. Name ownership and
content resolution do not establish ChopDot participant authority.

## Decision: Host local storage ADOPT_AS_ADAPTER

Use scoped local storage for the private working projection. It is not the
canonical event history and cannot satisfy fresh-device recovery alone.

## Decision: Statement Store ADOPT_AS_ADAPTER

Use Statement Store only as a bounded carrier for signed, idempotent envelopes.
It is not the retained ChopDot ledger, and delivery does not imply acceptance.

## Decision: Bulletin storage INVESTIGATE

Run an encrypted receipt experiment covering renewal, missing data, privacy,
deletion, and recovery before adopting Bulletin for user blobs.

## Decision: Asset Hub contract and CDM INVESTIGATE

Define the minimum enforceable shared-state need before writing or deploying a
contract. Preserve claimed, cleared, approved, and closed money states.

## Decision: Identity backend REJECT_FOR_V1

Do not introduce Supabase, clone the Parity identity backend, or adopt another
operated database by analogy. Reconsider only for a measured responsibility
that native and local rails cannot meet acceptably.

## Decision: Polkadot Pay server REJECT_FOR_V1

Use its lifecycle and test patterns as research only. Its merchant-payment
service is not ChopDot's group-management product or authority model.

## Decision: LocalDOT pattern INVESTIGATE

Study adapter separation and host testing. Do not copy GPL source or import
marketplace escrow semantics into ChopDot.

## Decision: Web3 Storage DEFER

Keep the emerging provider/checkpoint platform outside the v1 critical path
until Bulletin demonstrably fails a named storage requirement and a stable
Products Devnet provider route exists.

## Approval boundary: publication remains human-approved

This catalog does not authorize package changes, contracts, registry writes,
DotNS publication, payments, or deployment.
