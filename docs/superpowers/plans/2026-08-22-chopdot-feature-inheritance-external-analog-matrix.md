# ChopDot feature inheritance and external analog matrix

**Kind:** historical research plan
**Status:** completed time-sliced record
**Owner:** product-research
**Observed at:** 2026-08-22
**Applies to:** the source identities recorded by the resulting matrix
**Authority:** execution provenance only; it cannot define current product baseline, priority, implementation, or release state

**Programme:** Programme B — product/platform research. No UI, runtime, deployment, or authority code changes.

## Goal

Create an exhaustive, reproducible bridge between ChopDot's current product
cockpit and the commit-pinned Products Devnet/Parity catalog. The output must
show which external projects provide a verified reusable pattern, which provide
only a discovery lead, and which ChopDot behaviours remain ChopDot-owned product
design.

## Current truth to preserve

- ChopDot remains the four-pillar product: `Catch -> Management -> Payout -> History`.
- One Chop Core owns group, membership, exact-money, event, confirmation,
  closeout, and recovery authority. A platform rail or donor app cannot create
  that authority.
- A registry description is discovery evidence, not source verification.
- An external pattern is not evidence that the ChopDot feature is implemented,
  tested, integrated, deployed, or user-reachable.
- The current product cockpit is in the canonical checkout
  `/Users/devinsonpena/ChopDot`, branch
  `codex/chopdot-agentops-bridge-docs`, commit
  `2f28c1e425a8fc2b8e01dd37a3032746b92d80cb`. It is dirty and is therefore a
  separately identified read-only source, not the launch worktree's Git truth.
- The output target is
  `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`, branch
  `codex/chopdot-v1-launch`, commit
  `3519a894efbcee5144ecb0bcb9ebc44b888a0e7f`.

## Scope in

- Every product card currently present in `product/cards.md`.
- Every path currently present in
  `product/generated/product-behavior-map.json`.
- Every feature family in the current inheritance register, including group
  cards, savings circles, emergency pots, community funds, people/membership,
  capture, payments, closeout, privacy, offline recovery, and native delivery.
- Exact source identities and SHA-256 hashes.
- Evidence grades: `verified_source`, `registry_discovery`, `indirect_pattern`,
  `chopdot_original`, or `no_analog_found`.
- License/reuse boundary, One Chop Core requirement, missing experiment, and
  `now`/`next`/`later` disposition.
- Machine validation and an exact-worktree AgentOps Repo Graph/KGv2 refresh.

## Scope out

- Implementing or redesigning any user interface.
- Copying donor source, adding dependencies, or changing package manifests.
- Changing product-card status, roadmap priority, or decision contracts in the
  canonical cockpit.
- Claiming external source review for a registry-only project.
- Committing, deploying, publishing, or exercising user/payment authority.

## Requirements

1. The matrix SHALL enumerate all current cards exactly once as primary-card
   mappings, while allowing explicit secondary feature-family links.
2. The matrix SHALL enumerate all current behavior paths exactly once.
3. The matrix SHALL record paths that are not yet represented in the generated
   behavior map as a product gap, especially future savings-circle,
   emergency-pot, community-fund, and spend-card paths.
4. Every external analog SHALL cite the commit-pinned source-audit record or a
   registry snapshot row. Registry-only evidence SHALL never be labeled source
   verified.
5. Every feature family SHALL state the ChopDot-owned authority boundary and a
   falsifiable next experiment.
6. Validation SHALL fail on missing/duplicate card IDs, missing/duplicate path
   IDs, unknown feature families, unreferenced evidence IDs, or count drift.
7. AgentOps recall SHALL cite this exact launch worktree after the matrix is
   generated.

## Source freeze

| Source | SHA-256 |
|---|---|
| canonical `product/cards.md` | `3d3cb09191bf18850bf6f53f650e2ecfd8c338554e4b47dc7d49a338a8017930` |
| canonical `product/story-map.md` | `549e60ba10c225c7eef55c423558bc11e403cfd08f2d5dfc9accfdf558387365` |
| canonical `product/path-model.yaml` | `1ff6bd2e871ef97899080ea8a61d82ac9735059d45330f07b7f2e639456bef29` |
| canonical generated behavior map | `2327481bb23f464559cb59f98aebfa90b05d5d62c1f7b123a8f3ebfd1afe5b7b` |
| canonical inheritance register | `ec5f27d1d2c707a94bd884aa83d7c9837bedb48c83bb5470d95091695a85d02c` |
| launch machine catalog | `f6b2c232cbfa23acc143fb47afb8ffc07c998413be0d4112d9b1abbece39dabf` |
| launch source deep audit | `9446a2c05488d9aa101b73419ac02cfa5afe115925435a058677cd24acdeb950` |
| launch adoption decisions | `84e4056796b7f4a495ed73d4d1268cc8de3c25adbe73a5077b197fd0845069bd` |

The canonical status stream was non-empty (`23,794` bytes; SHA-256
`f76633314e73ab2e5414508b7f288cdd9690e7034f89c5a607cc55094224413a`).
The launch status stream was also non-empty (`216` bytes; SHA-256
`7d780e1f2777344908b7effceb7f9f1f455796458aec085d8dce82e6c5c74159`).

## Verification and falsifiers

- Parse the canonical source freeze and compare counts with its generated
  summaries.
- Require `35/35` card coverage and `42/42` generated-path coverage.
- Require all six journey records, while explicitly preserving that four
  future journey families currently have zero generated paths.
- Cross-check evidence IDs against the catalog, deep audit, registry snapshot,
  and adoption-decision inputs.
- Falsifier: any externally attributed feature lacks a source-audit record or an
  explicitly labeled registry row.
- Falsifier: any recommendation implies that host identity, DotNS, Statement
  Store, Bulletin, payment infrastructure, or a donor app can replace ChopDot's
  membership or canonical event authority.
- Falsifier: KGv2 recalls only a packet from another checkout.

## Documentation impact

This task adds research and plan artifacts in the launch worktree and updates
the research index/execution board. It does not alter `docs/wiki/` or an ADR,
because it records research evidence rather than changing an accepted product
or architecture decision. A later adoption decision that changes One Chop Core
or a platform adapter SHALL update the relevant source wiki/ADR and regenerate
their read models.
