# ChopDot Feature Inheritance Decisions

Date: 2026-08-22
Scope: research and plan routing on `codex/chopdot-v1-launch`
Matrix digest: `e430e973a2156396717ebeb7b9d724165b31b98ffd875b1208a43a88d1021409`

## Decision: native rails cover adapters, not ChopDot product authority

Product SDK, TrUAPI, host simulation, dot.li/Desktop, DotNS, scoped local
storage, Statement Store, Bulletin, and Asset Hub patterns cover substantial
delivery, signing, storage, messaging, and payment infrastructure. They do not
replace One Chop Core membership, organizer authority, exact-money events,
receiver confirmation, closeout, or recovery.

## Decision: group cards remain ChopDot-owned product synthesis

Verified donor sources contain useful shared-state and role projections, but no
inspected source implements ChopDot's living group card: one money commitment,
one current state, one next actor, and one obvious action. Keep the model and
its comprehension tests in the immediate product lane.

## Decision: normal pots and their lifecycle remain ChopDot-owned

LocalDOT, Mercado, Polkadot Pay, and simple shared-state apps provide indirect
role, dispute, persistence, payment-lifecycle, and content-index patterns. None
implements ChopDot's editable dinner/trip/couple journey from capture through
correction, settlement, confirmation, and immutable closeout.

## Decision: CircleCredit is discovery evidence, not savings-circle inheritance

The content-addressed Devnet directory verifies that `circlecredit.dot` is
listed alive at CID
`bafybeih54lr3cgyw2ri3fiygduy27qc5fkn5v7bqjctq23mbfz3d22g5aa` with a
description referring to lending circles. Its source, license, protocol,
security, recovery, and runtime claims were not inspected. Lending credit is
not automatically the rotating savings-circle policy specified by ChopDot.

## Decision: emergency-pot behavior has no direct verified analog

Bulletin encryption/storage, Mercado dispute states, and simple role-gated
shared-state patterns are indirect ingredients only. Recipient dignity,
selective disclosure, consent, urgent approval, safe notification, and redacted
closeout remain ChopDot-owned requirements.

## Decision: community-fund analogs are discovery or indirect patterns

`public-research.dot` is a directory-level funding lead. Survey, feedback,
festival, Mercado, and Asset Hub/CDM sources show roles, approvals, evidence
CIDs, disputes, and small contract indexes. No inspected donor proves ChopDot's
community governance, non-custodial handoff, privacy, recovery, or closeout.

## Decision: four future-mode journey maps remain incomplete

The current cockpit contains cards/specs for Spend Card, savings circles,
emergency pots, and community funds, but the generated behavior map assigns
zero paths to each of those four journeys. A card or prose spec is not a
substitute for executable path coverage.

## Approval boundary: this research does not authorize implementation or deployment

The matrix proves coverage and evidence classification only. It does not prove
that a feature is implemented, integrated, tested, committed, deployed, or
user-reachable, and it does not authorize package changes, source copying,
contract deployment, DotNS publication, or payments.
