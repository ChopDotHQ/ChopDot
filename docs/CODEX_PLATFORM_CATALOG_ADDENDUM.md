# Platform Catalog Addendum for the ChopDot v1 Plan

Date: 2026-08-22

## What the new evidence changes

The v1 deployment plan should no longer carry an implicit “choose a backend”
step. It should allocate each responsibility to a bounded rail:

- local/host storage for the private working projection;
- participant-signed events for authority;
- Statement Store for bounded message delivery;
- Bulletin only after encrypted blob retention and recovery proof;
- a contract only for a named minimum shared-state invariant;
- DotNS and a content-addressed host for delivery;
- an operated service only when a measured product responsibility cannot be
  met by those rails.

## What does not change

- `Catch -> Management -> Payout -> History` remains the product loop.
- Claimed, cleared, approved, and closed money states remain distinct.
- Verified contact is not membership authority.
- Contact proof is not organizer proof.
- Platform language remains invisible in normal UI.
- Tested, committed, deployed, reachable, and adopted remain separate states.

## Plan gates to add

1. One aligned Product SDK/TrUAPI/host compatibility gate.
2. Fresh-device recovery and actor-bound isolation scenarios.
3. Encrypted Bulletin receipt experiment with retention and loss recovery.
4. A minimum shared-state decision before any contract work.
5. Content-addressed build, DotNS publication, live gateway, rollback, and
   first-time-user click-through gates.
6. License review before copying any GPL/AGPL/NOASSERTION donor source.

## Still prohibited as assumptions

- “No Supabase” does not mean “no operated component can ever be justified.”
- “Many Devnet apps exist” does not prove their source, security, or recovery.
- “Runs in dot.li” does not mean a product is ready for public use.
- “On-chain” does not mean private, durable, recoverable, or accepted.

This addendum is planning evidence. It does not authorize package changes,
contracts, publication, or deployment.

## Feature-level qualification added after the catalog

The platform census is not a one-to-one feature catalog. The exhaustive feature
inheritance matrix now maps all 35 current product cards and 42 current
generated paths and establishes these boundaries:

- Native delivery/hosting has direct source-verified external patterns.
- Most group-money features have indirect infrastructure or lifecycle patterns,
  not reusable end-product implementations.
- The living group-card model and ChopDot's normal-pot, confirmation, exact-money,
  savings-circle, emergency-pot, and community-fund rules remain ChopDot-owned.
- CircleCredit, PublicResearch, OpenDocs, PolkaNote, dot-drive, Peoplebook, and
  DripStream are registry-level leads until their sources and runtime contracts
  are independently audited.
- Spend Card, savings circle, emergency pot, and community fund currently have
  zero paths in the generated behavior map; cards and prose specs do not close
  that product-proof gap.

The deployment plan must consume
`docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md`
before feature completeness is claimed.
