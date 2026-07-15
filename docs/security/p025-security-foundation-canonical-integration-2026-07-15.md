# P-025 Security Foundation Canonical Integration

Date: 2026-07-15
Change: `p025-security-foundation-canonical-integration-v1`
Branch: `codex/p025-security-integration`
Committed baseline: `12e3df1e85bcf0029d42c38f2127f01dc9f3ee55`
Reviewed checkpoint: `fe6230e78f15435fd68f7a117fe454ded24055a6`
Cherry-picked checkpoint: `2ebf029`

## Outcome

**Integration-ready, not yet canonical-merged or release-ready.**

The reviewed P-025 checkpoint is applied to a clean branch from the committed
ChopDot baseline. The shared root and its concurrent uncommitted work were not
modified. P-025 is now represented in the isolated cockpit as a building card
with executable evidence and an explicit next control.

## Product Gate

User journey: "I am operating ChopDot across several hosts, so I need every
security boundary to come from one reviewable authority before real people or
agents move money."

One next action: `Review security boundary`

Score: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Integrated Scope

- server-derived bearer-token actor identity;
- payer, receiver, and active-pot-member authorization;
- canonical runtime settlement states `pending`, `paid`, and `confirmed`;
- forward migration preserving valid legacy rows and failing malformed rows
  without destructive deletion;
- capture-link UUID foreign key and creator/active-member row-level security;
- capture-link enumeration and payload-mutation denial;
- database-backed replay, wrong-actor, and unrelated-share proof;
- P-025 cockpit card, decision contract, durable decision, roadmap entry, and
  generated read models;
- automatic Prisma client generation after a clean backend install.

## Verification Matrix

| Check | Result |
| --- | --- |
| Product cockpit refresh and validation | PASS, 0 errors |
| Product cockpit warnings | 2 committed-baseline warnings; P-025 adds none |
| Fresh PostgreSQL 16 migration chain | PASS |
| Settlement-state conversion and legacy preservation | PASS |
| Capture-link RLS, enumeration denial, and mutation denial | PASS |
| Database actor, role, replay, and unrelated-share proof | PASS |
| Backend tests | PASS, 46/46 |
| Backend typecheck | PASS |
| Backend build | PASS |
| Root tests | PASS, 22/22 |
| Root typecheck | BASELINE FAIL outside P-025 paths |
| Root build | BASELINE FAIL outside P-025 paths |

The root TypeScript failures cover pre-existing `.dot` model drift, capture
hook and route drift, removed test modules, and application type mismatches.
No reported root error points to the P-025 actor, repository, migration, or
cockpit files introduced by this integration.

## Reproducibility Correction

A fresh backend `npm ci` initially had no generated Prisma client. The backend
now runs `prisma generate` from `postinstall`. A second clean install generated
`src/generated/prisma`, after which backend typecheck and build passed without
manual setup.

## Known Risk And Debt

- direct client mutation of financial tables remains to be inventoried and
  closed;
- financial writes across settlements, payments, events, and closeout are not
  yet atomic;
- guest links are not yet complete scoped and revocable capabilities;
- cross-host product truth is not backend-owned end to end;
- durable payment intents and evidence matching remain incomplete;
- root dependency audit reports 7 vulnerabilities: 1 low, 3 moderate, 3 high;
- backend dependency audit reports 9 vulnerabilities: 5 moderate, 4 high;
- the repository requires Node 22.x, while this verification ran on Node 24.1.0;
- the committed cockpit baseline still references missing `CloseoutReview` and
  `scripts/audit-components-and-structure.mjs` paths.

These items prevent a release-ready or production-secure claim.

## Shared-Root Boundary

The shared root remained on `codex/chopdot-agentops-bridge-docs` at
`12e3df1e85bcf0029d42c38f2127f01dc9f3ee55` with concurrent uncommitted work.
This integration did not copy, stash, reset, commit, or overwrite that work.
The root's broader P-021 through P-025 cockpit rewrite remains a separate
reconciliation concern.

## Documentation Impact

Covered by:

- `docs/adr/0004-server-derived-payment-actor.md`;
- `docs/security/universal-chop-core-security-architecture.md`;
- the P-025 crosswalk and executable proof reports;
- this integration report;
- P-025 product card, decision contract, decision, roadmap, and generated
  cockpit read models.

No normal user-facing screen or copy changed, so screenshot review is not
required for this integration checkpoint.

## Exactly One Next Action

Merge this branch only after preserving the shared root's current work, then
inventory and close direct financial-table mutation paths before the mixed
human-and-agent money pilot.
