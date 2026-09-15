# Phase C1 selective product contracts

Status: **candidate for independent review**. Authority: issue #38 comment `5678939496`.

This package selectively integrates two approved product-contract decisions without reopening the 28 validated UX Goldens.

- **GUEST-01** introduces a durable, group-scoped `MemberIdentity` / `Participant` primitive. A guest may become a real ledger participant without first creating a wallet or full account. Account-backed identity remains an optional capability upgrade for actions such as payment/signing/admin.
- **SPEND-01** introduces only the rail-neutral `SpendIntent` shared state model. It is not a new journey and it does not select a card, pot, bank account, issuer, BaaS provider, wallet rail, or merchant-card execution mode.

## Non-negotiable boundaries

1. Existing approved Golden HTML and Golden checksums are immutable in this candidate.
2. No Journey 29 is created.
3. Display name and email are never identity merge keys.
4. Guest-to-account upgrade/link/claim preserves the same durable participant ID and all expense/split/history references.
5. Collision or proof mismatch fails to `unresolved`; it never silently merges or replaces a participant.
6. `authorized` does not mean `spent`. Only proof-backed capture/materialization changes canonical financial state.
7. `unknown` execution cannot create, extend, or duplicate spend authority. Recovery/reconciliation is required before retry.
8. Every future concrete spend execution mode must implement the `SpendIntent` adapter boundary; none is selected here.
9. Only public-safe product requirements and architecture semantics belong in this package.

## Selective UX successors

- `journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html` strengthens entry so an invite-context guest can continue to the invite flow without full account creation, while normal account-backed entry remains available.
- `journeys/04-invite-join/phase-c1-guest-v1-candidate.html` preserves context-before-consent and private-before-join, then creates a durable guest participant after explicit consent. It also models recovery and explicit link-mismatch handling.

The successors are review artifacts only. They do not replace their Golden predecessors.

## Minimum consuming contracts

J09, J24, J25 and J27 each receive a narrow `phase-c1-consumer-contract.md` defining how they consume `MemberIdentity` without redesigning their journeys.

## Machine-verifiable evidence

`verify.mjs` validates identity and spend invariants plus the research boundary. `qa.mjs` exercises J01/J04 at 393×852 and 430×890, captures screenshots, checks all direct guest/account/recovery/link-mismatch paths, verifies no external requests or console/page errors, and fails on viewport overflow. The dedicated candidate workflow also runs the existing workbench gate so unrelated Golden checksums remain protected.
