# Post-J28 Product Decisions — Phase C1

Status: **selective integration candidate; independent review required**.

This document is the repo-owned, public-safe rationale record for the bounded Phase C1 product-contract package. It does not alter Golden authority, freeze successor bytes, select a production spend rail, or authorize Product Integrator / production implementation.

## Authority and canonical baseline

The approved product decision was made after all 28 registered UX journeys were exact-head validated at `ux/experience-workbench@ec67add06888ab99212f3a4a533951195259030b`.

The Phase C1 selective candidate branch is derived from the later canonical materialization descendant `bfc171fbfe1407d9dda2ad1d90174a13e2431442`, which preserves the same validated 28-Golden authority. Phase C1 must preserve every unrelated Golden byte and checksum.

Public authority and acceptance records:

- Product decision: https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5678939496
- Durable decision summary: https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5679654905
- Phase C1 execution authority: https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5679711494
- Phase C1 security acceptance delta: https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5680116087
- Public security model/test plan: https://github.com/ChopDotHQ/ChopDot/issues/43#issuecomment-5680113433

## Approved now

### GUEST-01 — Participant / MemberIdentity

ChopDot needs a durable, group-scoped Participant identity that can exist without a full account. A guest may participate in the group ledger, preserve stable expense/split/history references, export and recover that history, and later link or upgrade safely to an account-backed identity without replacing the historical Participant.

Identity state and capability are separate concepts. Guest authority is an explicit least-authority, group-scoped capability held by the guest. It is not implemented by removing canonical account-key/signature checks and the organizer never proxy-signs as the guest. A guest may read joined-group member-visible ledger context and submit the bounded expense/split inputs permitted by policy. Funding or signing spend, membership/group administration, payment-destination control and settlement confirmation remain account-backed unless a later reviewed contract explicitly changes that boundary.

Guest → account link/claim is staged and atomic. The existing Participant is selected first, proof and account activation succeed before binding commit, and historical ownership is never renamed as a precondition. A failed or cancelled link leaves the exact pre-link Participant graph unchanged. A successful binding enriches capabilities on the same Participant and preserves every expense, split, history, export and recovery reference.

Display name and email are never merge keys. Collisions, contradictory proof, or mismatches remain unresolved until explicitly reconciled rather than silently merging people.

**Cross-group privacy decision:** the group-visible identity boundary uses **group-scoped unlinkability**. Participant IDs are group-scoped and group surfaces must not expose a stable account identifier that lets overlapping members correlate the same account-backed person across ChopDot groups. ChopDot may privately maintain a product-account binding needed for account capabilities, but that binding is not group-visible identity. Polkadot's per-application alias is useful account context but, by itself, does not provide per-ChopDot-group unlinkability.

### SPEND-01 — rail-neutral SpendIntent

ChopDot should own the shared domain truth for group-money coordination before, during, and after a spend without making any one execution rail product law.

A SpendIntent therefore carries its own operation identity, participants/shares/funding rule, policy/approval snapshot, adapter/source-mode field, authorization/funding/execution lifecycle, proof source, lineage for partial capture/refund/reversal, and recovery state. Canonical Expense / obligation / group-financial-state materialization is proof-backed and exactly-once.

SpendIntent is a **separate economic domain** from the existing PaymentIntent contract. SpendIntent coordinates value before/during purchase. PaymentIntent settles an already-existing obligation after debt exists. One captured SpendIntent may derive canonical expense/obligation state exactly once; a later PaymentIntent may settle those resulting obligations, but it may not create, recreate, or duplicate the merchant spend.

`authorized` does not mean `spent`. An `unknown` execution result cannot create, extend, or duplicate spend authority or dispatch fresh value; reconciliation of the exact operation must occur before any new execution attempt. Partial capture, refund and reversal remain adjustments on the original operation lineage.

Host/payment callbacks are observations, not canonical spend proof. A future adapter must bind the exact operation identity, amount, asset, destination and required finality or authoritative readback before a SpendIntent can become captured/materialize financial state. A host `Completed` callback alone is insufficient.

## Explicitly deferred / not selected

Phase C1 does **not** approve or implement:

- generic merchant debit/credit-card issuance;
- Visa/Mastercard acquiring;
- Apple Pay or Google Pay provisioning;
- a shared merchant card or multi-source card charge mode;
- a joint bank account or shared custodial pot as the default ChopDot model;
- a specific issuer or BaaS dependency;
- split-at-purchase as a selected execution rail;
- a concrete V1 SpendIntent execution mode;
- Journey 29 merely to add a card or spend rail.

Any future concrete execution mechanism must plug into the SpendIntent adapter boundary rather than redefine ChopDot's canonical identity, obligation, recovery, or financial-state truth.

## Current Polkadot platform interpretation

Current Polkadot mobile Pocket evidence and official Devnet semantics show multiple card-shaped host surfaces, including identity, CASH balance, and collectibles. The word or shape `card` here is a host UI metaphor; it is **not** evidence of generic merchant debit/credit-card issuance, Visa/Mastercard acquiring, Apple/Google wallet provisioning, or a shared group card.

Current Devnet CASH is a developer-network digital-dollar / spendable app balance with no real-world value. It can be sent or spent through Coinage on the People chain. Mobile Devnet exposes a CASH card/top-up plus debug/faucet behavior, while desktop does not expose the same CASH card surface.

That makes CASH/Coinage a promising **future optional `polkadot_cash` SpendIntent execution adapter**, not ChopDot V1 product law and not evidence of merchant-card capability. Product SDK / host-platform behavior remains experimental/developer-preview and must stay behind an adapter boundary until independently validated for production suitability. Any future host callback remains observational until exact operation/amount/asset/destination/finality/readback is proven.

## Polkadot account identity vs ChopDot guest identity

Current Polkadot account identity primitives — including username/personhood and per-application privacy-preserving aliases for account-backed users — can later back an `account_backed` ChopDot Participant without exposing cross-app identity.

They do not eliminate GUEST-01. True no-full-account participation remains ChopDot-owned. A later guest → Polkadot-account upgrade must bind the existing stable Participant ID to verified account context; it must not create a replacement historical person or rewrite earlier expense, split, settlement, export, or recovery references. The resulting group-visible Participant remains group-scoped and does not expose a stable cross-group account identifier.

## Architecture consequence

ChopDot owns the durable product semantics:

`Participant → Group state → SpendIntent / Expense → Obligations → Settlement → Proof / Recovery / Portability`

Execution mechanisms are replaceable adapters. Possible future adapters may include manual/external methods, Polkadot CASH/host payments if and when they become production-suitable, and later card/pot/split-at-purchase rails if independently validated. No adapter may redefine canonical ChopDot identity, obligation, recovery, or financial-state truth.

The identity implementation must treat account binding as a capability binding to a stable Participant rather than an ID migration. The money implementation must keep purchase execution (`SpendIntent`) separate from debt settlement (`PaymentIntent`) and use exact operation/proof lineage to prevent duplicate economic derivation.

## Revisit triggers

Re-evaluate the deferred execution choice when one or more of these become true:

1. Polkadot/Parity ships a production-suitable host payment/CASH primitive with the authority, recovery, availability, proof/finality and economic guarantees ChopDot needs.
2. A genuine merchant-card/shared-money primitive becomes officially available and economically/regulatorily viable.
3. User evidence shows a particular spend-before-debt execution mode is required for V1 adoption.
4. Implementation proves the rail-neutral SpendIntent model cannot represent a required real-world mode cleanly.
5. A later reviewed privacy decision intentionally changes the current group-scoped unlinkability requirement for account-backed Participants.

## Review boundary

This record contains only approved public-safe product requirements and current platform/security semantics. Private competitor or workbook evidence is intentionally excluded.

The Phase C1 successor prototypes and shared contracts remain candidates until an independent `GOLDEN-READY / CONTRACT-READY` review and a later exact human approval of the specific successor bytes/contracts. Product Integrator remains held until that re-lock is complete and separate production authority is explicitly granted.
