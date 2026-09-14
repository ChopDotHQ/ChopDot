# J25 Current-Work Packet — Factory v1.1

This packet is deliberately compressed. It is execution context, not product authority.

## Live authority at activation
- Canonical UX branch/head: `ux/experience-workbench@2cf40a51fce0137ca137b46cf6d19d1bb8167a31`
- Canonical state: 24 validated Goldens; Journey 25 — Storage / Backup / Recovery V1 authoritative at definition stage.
- Prior Golden: Journey 24 Export / Portability V1, approved HTML SHA-256 `03d1c2094251dc3ec683108c484bdc84e6f7db08b1c40ce042535a2d186a9b82`.
- Exact-head gate: `canonical_exact_head_verified:true`.
- Typography: `TYPO-01` deferred.

## Current journey contract
- `journeys/25-storage-recovery/spec.md`
- `journeys/25-storage-recovery/STATE_INVENTORY.md`
- `journeys/25-storage-recovery/EDGE_CASES.md`
- `journeys/25-storage-recovery/source/decision-history.md`

## Adjacent patterns reused
From approved J24 only as interaction evidence/patterns, never copied as authority:
- first-effect review/confirmation;
- pending / taking longer / unknown;
- exact-operation reconciliation before retry;
- existing exact artifact reuse;
- browser / OS / external provider owner boundaries;
- explicit fixture-vs-live copy;
- 393×852 and 430×890 responsive shell.

J25 changes the product job from export/delivery to storage/backup/restore and adds restore-conflict/non-destructive recovery semantics.

## Factory generation / enabled capabilities
- `factory_generation`: `v1.1`
- sustained Builder: enabled by factory law
- compressed current-work packet: enabled (this file)
- caller reachability: **required**
- N+1 preflight: not enabled for this candidate
- Golden-pattern reuse: informal adjacent-pattern reference only; no generation-level reusable pattern system enabled

## Evidence contract
- Candidate: `journeys/25-storage-recovery/v1-candidate.html`
- QA: `journeys/25-storage-recovery/source/review-qa-v1.mjs`
- Dedicated workflow: `.github/workflows/j25-v1-review.yml`
- Canonical viewports: 393×852 and 430×890
- Every material state must have a truthful click path from `settings-entry` or `recovery-entry`; owner/system boundaries are separately classified.
- Capture state × viewport PNG matrix, layout/touch checks, caller-path replays, page/console/network errors, candidate SHA-256 and exact head/tree.
- Standard branch checks: CI, Coverage, Smoke, E2E Cypress.

## Claim boundary
No production encryption, filesystem persistence, cloud/provider credentials or writes, sync, retention/deletion, database restore, source authenticity, payment, wallet or signing effect is claimed.

## Current owner / stop condition
Owner: one J25 Builder only.
Stop after exactly one sealed `### UX Builder — REVIEW REQUEST` with complete exact evidence, or on a genuine authority/human/external blocker.
