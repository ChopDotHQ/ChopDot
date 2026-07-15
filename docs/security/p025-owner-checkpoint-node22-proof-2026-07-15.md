# P-025 Owner Checkpoint and Node 22 Proof

Date: 2026-07-15

## Result

`READY FOR OWNER REVIEW AS PRE-P-026 BASELINE; NOT DEPLOYED`

The current shared-root product work was captured without modifying the shared
root, the complete reviewed P-025 range was applied on top, and the combined
branch passed the P-025 database, backend, frontend, build, lint, and `.dot`
smoke checks under the repository's declared Node 22 runtime.

## Change contract

Change name: `p025-owner-checkpoint-and-node22-verification-v1`

Current truth preserved:

- shared root branch `codex/chopdot-agentops-bridge-docs`;
- shared root HEAD `12e3df1e85bcf0029d42c38f2127f01dc9f3ee55`;
- current tracked product work and 789 preflight-approved untracked files;
- P-021 through P-024 product graph and current UI behavior;
- P-025 server-derived actor, canonical payment-state, capture-link, RLS,
  migration, and replay boundaries.

Scope in:

- create an owner checkpoint in an isolated worktree;
- apply the complete reviewed P-025 commit range;
- resolve only older P-025 drafts and generated-cockpit overlaps;
- verify with Node 22 and disposable PostgreSQL;
- record blockers separately from P-025 regressions.

Scope out:

- modifying or cleaning the shared root;
- fixing unrelated proof, wiki, dependency, or Playwright debt;
- pushing, deploying, signing, or initiating money movement;
- claiming that P-025 is complete or production-ready.

## Branch history

- `079c5a025b4a22da2143e1b4482724dcdcd71fd8` - current product owner checkpoint
- `cd42db9` - reviewed P-025 actor and migration boundary
- `61bb0ac` - reconciled P-025 cockpit and canonical evidence

Branch: `codex/p025-owner-checkpoint`

Worktree:
`/Users/devinsonpena/ChopDot/.worktrees/p025-owner-checkpoint`

## Reconciliation decisions

- The shared root was never staged, committed, reset, cleaned, or overwritten.
- Seven older P-025 drafts in the checkpoint were replaced with their reviewed
  versions during the first cherry-pick.
- Current P-021 through P-024 product sources were preserved.
- P-025, DC-025, and DEC-006 were taken from the already-reviewed combined
  reconciliation.
- Generated cockpit views were regenerated from the final clean branch rather
  than resolved by hand.
- No secret-bearing `.env`, key, backup, build, or temporary test files entered
  the checkpoint.

## Node 22 verification

Runtime:

- Node `v22.23.1`
- npm `10.9.8`
- PostgreSQL `16-alpine`, disposable container

| Gate | Result | Evidence |
| --- | --- | --- |
| P-025 clean migration chain | PASS | 15 migrations applied; all 10 migration/data/RLS checks passed |
| P-025 actor boundary | PASS | all 9 actor, role, replay, confirmation, and audit checks passed |
| Backend tests | PASS | 46/46 |
| Backend type-check | PASS | `tsc --noEmit` |
| Backend build | PASS | `tsc` |
| Frontend tests | PASS | 31/31 |
| Frontend type-check | PASS | `tsc --noEmit` |
| Frontend lint | PASS | zero ESLint errors or warnings |
| Frontend production build | PASS | Vite build with non-secret local Supabase placeholders |
| `.dot` smoke static boundary | PASS | index, manifest, boundary copy, Node requirement |
| `.dot` deploy CLI probe | PASS | `polkadot-app-deploy v0.11.0`, environments enumerated |
| Live `.dot` publish | NOT RUN | explicitly outside this proof |
| Product cockpit source validation | PASS with warnings | 0 errors; 10 pre-existing WIP/missing-reference warnings |
| AI product-manager validation | PASS with warning | paste-first SmartScan surface remains quarantined debt |
| Secret-pattern preflight | PASS | zero high-confidence token/private-key matches |

The production build intentionally used local, non-secret placeholder values for
the required public Supabase variables. WalletConnect remains a runtime-only
configuration warning and was not exercised here.

## Baseline blockers not caused by P-025

- Full product validation fails because 57 referenced journey screenshots are
  absent.
- Wiki validation fails because 27 references target absent root or portable
  shell worktree paths.
- Playwright cannot enumerate because `@parity/host-api-test-sdk` is imported by
  the current host-simulation tests but is not declared in the root package.
- Root audit reports 7 advisories: 1 low, 3 moderate, 3 high.
- Backend audit reports 9 advisories: 5 moderate, 4 high.
- Two current-root UI lines contain trailing whitespace.

These are owner-checkpoint promotion debts. They were reproduced before and
after applying P-025 and are not security-checkpoint regressions.

## Shared-root integrity and concurrent delta

At checkpoint capture, the shared root remained on the same branch and HEAD,
and its tracked-diff SHA-256 was:

`dd323f1c265636abfb94ff104378b4af6394341050c24e4893ef538498a9e04f`

During final verification, a parallel task added an incomplete P-026 product
slice to the shared root:

- `product/cards.md` gained `P-026 User path map and dead-end scanner`;
- `product/user-path-map.md` appeared as one new untracked file;
- no application, backend, migration, or P-025 security file changed;
- shared-root cockpit validation currently fails because `DC-026` is missing;
- P-026 also references a `ProductCockpit` screen that does not exist in the
  current router or screen inventory.

The shared root HEAD itself remained
`12e3df1e85bcf0029d42c38f2127f01dc9f3ee55`. The owner checkpoint deliberately
does not absorb this partial concurrent slice. It is the last internally valid,
fully tested product snapshot immediately before P-026 began.

## Documentation impact

P-025 architecture and security documentation now includes ADR-0004, the
security architecture, database and migration proofs, integration manifest,
canonical reconciliation report, and this Node 22 owner-checkpoint proof. No
normal user-facing wiki page was changed. Existing wiki validation debt remains
explicitly open.

## Remaining P-025 risk

P-025 remains `building`. Direct client financial-table mutation paths and
non-atomic financial writes are still open. This branch proves that the reviewed
foundation can coexist with the current product; it does not close those risks.

## Next gate

Review the three-commit owner checkpoint, then decide whether to:

1. merge it as the canonical current product baseline;
2. first split the 897-file product checkpoint into smaller owner-reviewed
   commits; or
3. repair the unrelated Playwright/proof/wiki promotion debt before merging.

The owner should also complete or revert P-026's missing decision contract and
screen ownership before rebasing that slice onto this checkpoint.

Do not deploy this branch until that owner decision is recorded.
