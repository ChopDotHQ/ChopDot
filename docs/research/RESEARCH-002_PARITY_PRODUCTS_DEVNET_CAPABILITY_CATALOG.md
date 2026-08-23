# RESEARCH-002: Parity and Products Devnet Capability Catalog

Date: 2026-08-22

Decision: **catalog complete enough to re-review the execution plan; not a
deployment go-live verdict.**

## Executive finding

Products Devnet is not missing the platform rails ChopDot needs to pursue a
native, local-first product. The verified ecosystem includes content-addressed
hosting, DotNS naming, host-mediated signing and permissions, local scoped
storage, Statement Store messaging, Bulletin-backed blob storage, Asset Hub
contracts, deployment tooling, and multiple advanced reference products.

The ecosystem does not provide one drop-in “ChopDot backend.” The sources show
several deliberately different persistence models: static serverless apps,
ephemeral message carriers, renewable content storage, contracts, and operated
PostgreSQL/Redis services. The correct architecture must therefore be selected
per responsibility, with participant-signed events remaining product
authority.

## Exhaustiveness and reconciliation

### Parity repository universe

The refresh called the official GitHub organization and repository APIs using
eight pages: seven pages of 100 records and one of 75. The organization
reported 775 public repositories, and the snapshot contains 775 unique
records. No repository was dropped because it looked irrelevant.

| Classification | Count |
| --- | ---: |
| Relevant platform | 33 |
| Relevant product/reference | 26 |
| Core/infrastructure | 83 |
| Adjacent or excluded with reason | 245 |
| Generated/test | 88 |
| Archived | 300 |
| **Total** | **775** |

Repository snapshot SHA-256:
`a0a24125f8de78748e9f932298ac97229c09661dd49bf3cd385e58e3d114df27`.

### Live Products Devnet universe

The content-addressed directory contains 251 top-level keys: 249 application
records and two metadata keys. All 249 records are retained; 80 were
published, 113 deployed, and 56 name-only.

Registry snapshot SHA-256:
`7dd760070407595236b45e98c6fb2585211508968e3a8b1117282d4b89a9a98e`.

The pinned directory CID is
`bafybeigpxrhnyqstly3r27do6kj2lnfmsuxjt72hbykpr2usbumysj6vde`.

### Deep source diligence

Thirty-six selected platform and donor repositories were cloned shallowly,
resolved to immutable commits, and inspected through a deterministic relevant
path set. Thirty-five had commit-pinned source; one was verified as an empty
repository. No selected repository was blocked.

Deep-audit snapshot SHA-256:
`668f291a433b3e126b366031e13cc9b4bf9e4d9bcd818512a49f36c830955635`.

This is broad due diligence, not a full security audit. Every selected file has
its upstream raw URL, byte count, SHA-256, and bounded excerpts in
`evidence/source-deep-audit.json`.

## Platform findings

1. **Product SDK is the preferred integration layer.** Its pinned README
   enumerates chain, transaction, signer, contracts, cloud storage, Statement
   Store, local storage, host, and DotNS packages. Low-level TrUAPI should stay
   behind this boundary unless a documented SDK gap appears.
2. **Host compatibility is a real versioned contract.** The pinned host-test
   README warns that host protocol generations can be wire-incompatible. The
   launch worktree locks older Product SDK and host-test versions than the npm
   latest observed on 2026-08-22. An upgrade must be one aligned family, not
   four independent bumps.
3. **Static serverless delivery is real.** dot.li and Desktop sources resolve
   content-addressed applications, sandbox them, mediate permissions, and lend
   a signer. This removes the need for an app-owned server for the product
   shell; it does not solve every data responsibility.
4. **Statement Store is a carrier, not ChopDot's database.** Its source and host
   RFCs describe a constrained statement-distribution mechanism. It can carry
   signed idempotent envelopes, but retained history and recovery must live
   elsewhere.
5. **Bulletin is a plausible blob rail with explicit retention work.** Source
   includes store, renew, authorizer, and auto-renew behavior. Private receipt
   use remains gated on encryption, availability, renewal, deletion, and
   recovery experiments.
6. **Contracts are optional shared-state tools, not the default substrate.**
   CDM and donor apps show content-addressed contract builds and small contract
   indexes. A contract should enter ChopDot only for a minimum enforceable
   shared-state need.
7. **Backends exist inside the same ecosystem.** The verified identity backend
   uses PostgreSQL coordination and workers; the verified Pay reference uses
   PostgreSQL and Redis. This falsifies both extremes: “Supabase is required”
   and “Devnet makes every backend unnecessary.”
8. **Donor apps are pattern evidence.** LocalDOT, Mercado, surveys, feedback,
   festival, and payment services expose valuable tests and decomposition
   patterns. Their product authority differs from ChopDot and their licenses
   are often GPL-family, so they are not drop-in source donors.

## Bounded ChopDot decisions

| Capability | Decision | Reason |
| --- | --- | --- |
| Product SDK | `ADOPT_AS_ADAPTER` | Preferred high-level platform boundary |
| Direct TrUAPI | `DEFER` | Low-level protocol; use only for a proven SDK gap |
| Host test SDK | `ADOPT_AS_ADAPTER` | Fast integration proof with separate real-host gate |
| dot.li/Desktop hosts | `ADOPT_AS_ADAPTER` | Native delivery and consent runtime |
| DotNS | `ADOPT_AS_ADAPTER` | Publication/discovery, never user authority |
| Host local storage | `ADOPT_AS_ADAPTER` | Local-first projection, not recovery alone |
| Statement Store | `ADOPT_AS_ADAPTER` | Ephemeral signed carrier, not ledger |
| Bulletin storage | `INVESTIGATE` | Promising encrypted blob rail; retention/recovery open |
| Asset Hub contracts/CDM | `INVESTIGATE` | Add only for a minimal enforceable shared state |
| LocalDOT pattern | `INVESTIGATE` | Strong composition reference; wrong authority model to copy |
| Survey/feedback/festival patterns | `INVESTIGATE` | Useful CID-index separation |
| Identity backend as ChopDot default | `REJECT_FOR_V1` | No validated responsibility justifies it |
| Polkadot Pay server as ChopDot default | `REJECT_FOR_V1` | Different product and lifecycle authority |
| Mercado source | `REJECT_FOR_V1` | Product mismatch and license metadata conflict |
| Web3 Storage | `DEFER` | Emerging path, not current critical path |
| Registry app descriptions | `INVESTIGATE` | Discovery only until individually source/runtime verified |

The machine-readable decision records include authority boundary, persistence,
network/version, license, maintenance/security signal, evidence status,
confidence, prerequisites, falsifier, and next check for every row.

## Assumptions removed

- Removed: “advanced Devnet apps prove a complete reusable ChopDot backend.”
- Removed: “the existence of Product SDK means package versions are mutually
  compatible.”
- Removed: “a registry description proves its architecture.”
- Removed: “serverless shell means serverless recovery, indexing, and
  notification.”
- Removed: “using a CID or signed statement makes the carrier authoritative.”
- Removed: “we must choose Supabase before evaluating native rails.”

## Remaining unknowns

- Can encrypted Bulletin receipts meet ChopDot privacy, renewal, deletion, and
  recovery requirements on Products Devnet?
- Can the aligned current SDK/TrUAPI/host family pass ChopDot's existing host
  and browser flows without regression?
- Which minimum event subset, if any, needs a contract rather than a signed
  participant log plus projections?
- Can a fresh device recover a group safely without exposing protected keys or
  turning a carrier into authority?
- What exact deployment account, DotNS name, rollback rule, and live gateway
  acceptance test will govern the release?

## Plan consequence

The deployment plan can now be re-reviewed against an evidence-backed
architecture. The immediate engineering lane should be recovery and platform
compatibility proof, followed by one real host deployment candidate. It should
not start with Supabase, a copied donor backend, or a broad contract build.

The catalog itself does not claim that ChopDot is deployed, UI-wired, or
user-reachable.
