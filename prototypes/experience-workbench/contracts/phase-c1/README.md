# Phase C1 selective product contracts

Status: **candidate for independent review**. Product authority: issue #38 comments `5678939496`, `5679654905`, and `5679711494`. Security acceptance delta: issue #38 comment `5680116087` / issue #43 comment `5680113433`.

This package selectively integrates two approved product-contract decisions without reopening the 28 validated UX Goldens.

- **GUEST-01** introduces a durable, group-scoped `MemberIdentity` / `Participant` primitive. A guest may become a real ledger participant without first creating a wallet or full account. Guest authority is an explicit least-authority, group-scoped capability held by the guest; it does not bypass canonical authority checks and the organizer never proxy-signs as the guest. Account-backed identity remains an optional capability upgrade for separately proven payment/signing/admin capabilities.
- **SPEND-01** introduces only the rail-neutral `SpendIntent` shared state model for value before/during purchase. It is not a new journey and it does not select a card, pot, bank account, issuer, BaaS provider, wallet rail, or merchant-card execution mode. It is a separate economic domain from existing `PaymentIntent`, which settles already-existing obligations.

## Non-negotiable boundaries

1. Existing approved Golden HTML and Golden checksums are immutable in this candidate.
2. No Journey 29 is created.
3. Display name and email are never identity merge keys.
4. Guest-to-account upgrade/link/claim preserves the same durable participant ID and all expense/split/history/historical-ownership references.
5. Linking is staged and atomic: proof and account activation succeed before binding commit; failed/cancelled linking leaves the exact pre-link Participant graph unchanged.
6. Guest capability is explicit and least-authority. Guest participation is not implemented by deleting account-key/signature checks or by organizer proxy-signing.
7. Group-visible account-backed identity follows **group-scoped unlinkability**: a stable cross-group account identifier is not exposed on group surfaces; a Polkadot per-application alias alone does not provide per-group unlinkability.
8. Collision or proof mismatch fails to `unresolved`; it never silently merges or replaces a participant.
9. `authorized` does not mean `spent`. Only proof-backed capture/materialization changes canonical financial state.
10. Host/payment callbacks are observations only until exact operation, amount, asset, destination and required finality/readback are proven.
11. One captured SpendIntent derives canonical expense/obligation/group state exactly once. A later PaymentIntent may settle resulting obligations but cannot recreate or duplicate the merchant spend.
12. `unknown` execution cannot create, extend or duplicate spend authority and cannot dispatch fresh value. Recovery/reconciliation is required before retry.
13. Partial capture, refund and reversal stay on the original operation lineage.
14. Every future concrete spend execution mode must implement the `SpendIntent` adapter boundary; none is selected here. `polkadot_cash` is only a possible future adapter seam and is not claimed production-ready or merchant-card capable.
15. Only public-safe product requirements and architecture semantics belong in this package.

## Selective UX successors

- `journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html` strengthens entry so an invite-context guest can continue to the invite flow without full account creation, while normal account-backed entry remains available.
- `journeys/04-invite-join/phase-c1-guest-v1-candidate.html` preserves context-before-consent and private-before-join, creates a durable guest participant after explicit consent, exposes the guest/account capability boundary, and directly models recovery, matching link, mismatch, activation failure and cancelled-link rollback.

The successors are review artifacts only. They do not replace their Golden predecessors.

## Minimum consuming contracts

J09, J24, J25 and J27 each receive a narrow `phase-c1-consumer-contract.md` defining how they consume `MemberIdentity` without redesigning their journeys.

## Durable rationale

`shared/POST_J28_PRODUCT_DECISIONS.md` records the public-safe decision rationale, platform interpretation, rail-neutral consequence, identity/privacy boundary and revisit triggers. Private competitor/workbook material is intentionally excluded.

## Machine-verifiable evidence

`verify.mjs` validates identity, atomic-link, least-authority, cross-group privacy, SpendIntent/PaymentIntent separation, adapter-proof, exactly-once and recovery invariants plus the research boundary. `qa.mjs` exercises J01/J04 at 393×852 and 430×890, captures screenshots, checks guest/account/recovery/link-success/link-mismatch/link-failure/link-cancel paths, verifies no external requests or console/page errors, and fails on viewport overflow. The dedicated candidate workflow also runs the existing workbench gate and exact byte comparison so all unrelated Golden checksums remain protected.
