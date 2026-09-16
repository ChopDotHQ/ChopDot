# Phase C1 selective product contracts

Status: **candidate for independent review**. Product authority: issue #38 comments `5678939496`, `5679654905`, and `5679711494`. Security acceptance records: issue #38 comments `5680116087`, `5680342337`; issue #43 comments `5680113433`, `5680336452`.

This package selectively integrates two approved product-contract decisions without reopening the 28 validated UX Goldens.

- **GUEST-01** introduces a durable, group-scoped `MemberIdentity` / `Participant` primitive. A guest may become a real ledger participant without first creating a wallet or full account. Guest authority is an explicit least-authority, participant-controlled, group-scoped capability. Knowing `participant_id`, being the organizer, or restoring a serialized capability label is not enough to act as that guest. Concrete authenticator crypto/host mechanics remain implementation-level.
- **SPEND-01** introduces only the rail-neutral `SpendIntent` shared state model for value before/during purchase. It is not a new journey and it does not select a card, pot, bank account, issuer, BaaS provider, wallet rail, or merchant-card execution mode. It remains a separate economic domain from existing `PaymentIntent`, which settles already-existing obligations.

## Non-negotiable boundaries

1. Existing approved Golden HTML and Golden checksums are immutable in this candidate.
2. No Journey 29 is created.
3. Display name and email are never identity merge keys.
4. Guest-to-account upgrade/link/claim preserves the same durable participant ID and all expense/split/history/historical-ownership references.
5. **Matching account proof is not link completion.** Link has its own exact `link_operation_id`; the Participant remains a valid guest while activation/binding is pending or unknown. Account-only capabilities appear only after durable binding commit plus authoritative readback.
6. A known pre-effect/no-effect link failure may permit a new operation only after no-effect truth is proven. Any possible-effect link failure is `unknown` and must reconcile the same `link_operation_id` before fresh authority.
7. Guest capability is participant-controlled, group/participant/version/policy scoped, replay-resistant at the contract level, revalidated at effect time, and revocable/versioned. Organizer authority cannot impersonate the guest.
8. Imported/exported/backed-up capability labels are descriptive only. Recovery must re-establish current guest authority from explicit proof/policy and may rotate the guest credential without replacing `participant_id`.
9. Group-visible account-backed identity follows **group-scoped unlinkability**: stable cross-group account identifiers are not exposed on group surfaces; a Polkadot per-application alias alone does not provide per-group unlinkability.
10. Collision or proof mismatch fails to `unresolved`; it never silently merges or replaces a participant.
11. `authorized` does not mean `spent`. Only proof-backed capture/effect materialization changes canonical financial state.
12. Spend evidence is bound to the exact `{spend_intent_id, operation_id, effect_id, authoritative_effect_ref, economic effect kind, adapter/rail identity, amount, asset, MoneyV1 minor units/currency/exponent partition, authorization_version, target digest, policy snapshot, approval snapshot}` plus finality/readback. For `partial_capture`, `refund`, and `reversal`, authoritative proof/readback must also bind the immutable authoritative parent-capture effect reference. Caller-supplied effect kind or parentage cannot override authoritative proof. Before SPEND-01 conservation or materialization is evaluated, every adapter must canonicalize value through the shared exact-money partition (`MoneyV1` or equivalent canonical integer units + currency + exponent); display decimals and any two-decimal fixture are non-authoritative.
13. `failed` means authoritative no-external-effect truth. A timeout/transport failure after possible dispatch is `unknown`, not `failed`; unknown cannot create or extend spend authority and must reconcile the same operation before any new execution attempt.
14. One proven SpendIntent effect derives canonical expense/obligation/group state exactly once. A later PaymentIntent may settle resulting obligations but cannot recreate or duplicate merchant spend.
15. Partial capture, refund and reversal stay on the original operation lineage and the same exact money partition; currency/exponent substitution, economic-kind substitution, and wrong-parent substitution fail closed.
16. Every future concrete spend execution mode must implement the `SpendIntent` adapter boundary; none is selected here. `polkadot_cash` is only a possible future adapter seam and is not claimed production-ready or merchant-card capable.
17. Only public-safe product requirements and architecture semantics belong in this package.

## Selective UX successors

- `journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html` strengthens entry so an invite-context guest can continue to the invite flow without full account creation, while normal account-backed entry remains available.
- `journeys/04-invite-join/phase-c1-guest-v1-candidate.html` preserves context-before-consent and private-before-join, creates a durable guest participant after explicit consent, exposes the guest/account capability boundary, and models guest-authority recovery plus link pending, durable success, mismatch, proven pre-effect failure, cancellation, and unknown/reconciliation states.

The successors are review artifacts only. They do not replace their Golden predecessors.

## Minimum consuming contracts

J09, J24, J25 and J27 each receive a narrow `phase-c1-consumer-contract.md` defining how they consume `MemberIdentity` without redesigning their journeys. They treat serialized authority as inert and preserve link-operation recovery semantics.

## Durable rationale

`shared/POST_J28_PRODUCT_DECISIONS.md` records the public-safe decision rationale, platform interpretation, rail-neutral consequence, identity/privacy/security boundary and revisit triggers. Private competitor/workbook material is intentionally excluded.

## Machine-verifiable evidence

`verify.mjs` validates stable identity, participant-controlled guest authority, replay/version/scope failures, serialized-authority fail-closed behavior, link pending/unknown/readback semantics, SpendIntent proof substitution resistance, failed-vs-unknown temporal rules, exact MoneyV1 `BigInt` materialization across exponent `0/2/3/6/12` and large values, authoritative economic-effect-kind and parent-lineage binding, exactly-once materialization, PaymentIntent separation and the research boundary. `verify-operation-conservation.mjs` validates the mandatory `MoneyV1` adapter-boundary canonicalization, exact integer-unit conservation, non-two-decimal partitions, currency/exponent substitution fail-closed behavior, cumulative capture/refund/reversal conservation, and authorization-adjustment partition stability. `qa.mjs` exercises J01/J04 at 393×852 and 430×890, captures screenshots, and directly verifies guest happy/recovery, link pending→durable-success, mismatch, proven pre-effect failure, cancellation, possible-effect unknown→same-operation reconciliation, plus normal account-backed entry. The dedicated candidate workflow also runs the existing workbench gate and exact byte comparison so all unrelated Golden checksums remain protected.
