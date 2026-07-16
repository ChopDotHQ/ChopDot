# P-025 Root Canonical Reconciliation Manifest

Date: 2026-07-16
Change: `p025-root-canonical-reconciliation-v1`
Owned branch: `codex/root-canonical-p025-steward`
Candidate baseline: `8e41beb8a86208fd428042aabf30b2aeaca8853f`
Shared root inspected: `/Users/devinsonpena/ChopDot`

## Outcome

**SAFE TO REVIEW AS THE PRE-P-026 CANONICAL BASELINE.**

The shared root was inventoried without staging, resetting, cleaning, stashing,
or changing any root file. The last clean branch that combines the intended
product snapshot with the reviewed P-025 actor, migration, and evidence
foundation is `8e41beb`.

The root is not safe to stage in place. It currently mixes the pre-P-026
product tree, an older P-026/behavior-map draft, the rejected root receipt
slice, later portable proof events, local configuration candidates, generated
runtime files, and temporary scripts. Those categories are preserved below so
an owner can reconcile them deliberately instead of turning the dirty root into
an accidental mega-commit.

## OpenSpec-Lite Contract

### Current truth to preserve

- visible ChopDot product behavior captured before P-026;
- P-025 server-derived actor and payer/receiver authority;
- canonical `pending -> paid -> confirmed` settlement states;
- forward-only settlement and capture-link migration repairs;
- P-025 database, replay, RLS, and Node 22 proof;
- separate ownership for P-026, portable-shell, P-027, and receipt work.

### Scope in

- root tracked and untracked inventory;
- P-025 branch and commit comparison;
- one clean pre-P-026 checkpoint;
- an explicit promotion procedure.

### Scope out

- editing or cleaning the shared root;
- portable-shell changes;
- P-026 implementation changes;
- receipt/OCR UI;
- new product behavior;
- deployment, production merge, or money movement.

### Requirements

1. The canonical candidate SHALL preserve the current pre-P-026 visible product
   tree without adding user-facing behavior.
2. The canonical candidate SHALL include the reviewed P-025 actor, migration,
   proof, ADR, and cockpit evidence.
3. P-026 SHALL remain a separate child commit and SHALL NOT be reconstructed
   from the dirty root.
4. The rejected receipt slice SHALL NOT enter the canonical candidate.
5. Portable-shell files and proof SHALL NOT be copied into this branch.
6. Unknown root files SHALL NOT be deleted or silently absorbed.

### Scenarios

```text
GIVEN the shared root contains concurrent uncommitted work
WHEN the canonical checkpoint is prepared
THEN no root file is staged, reset, cleaned, or overwritten
AND the checkpoint is built from committed history in an owned worktree.

GIVEN P-026 has a clean child commit
WHEN the pre-P-026 baseline is selected
THEN P-026 remains outside the baseline
AND can be reviewed independently from commit 36aa9c9.

GIVEN the root receipt slice targeted the wrong ChopDot implementation
WHEN the canonical baseline is selected
THEN its UI, E2E, behavior-map, and D-019 files remain excluded
AND no receipt/OCR product claim is introduced.
```

## Shared Root Snapshot

Observed on 2026-07-16:

| Field | Value |
| --- | --- |
| Branch | `codex/chopdot-agentops-bridge-docs` |
| HEAD | `12e3df1e85bcf0029d42c38f2127f01dc9f3ee55` |
| Tracked changed paths | 109 |
| Tracked modified paths | 104 |
| Tracked deleted paths | 5 |
| Untracked paths | 820 |
| Tracked diff SHA-256 | `2a514bf9f1fdb92d7060d59f822f4c6418eec93e7c855184b32cde4119f5e152` |
| Untracked path-list SHA-256 | `92163ae7a50a92c02622a52e9765e0eec65f94c3e23d28e64c18a53e15c02976` |

Of the 820 untracked paths, 789 are already preserved by `8e41beb`:

| Category root | Count |
| --- | ---: |
| `product/` | 689 |
| `docs/` | 54 |
| `src/` | 20 |
| `scripts/` | 15 |
| `backend/` | 7 |
| `tests/` | 3 |
| `playwright.config.ts` | 1 |

This is why staging the root is unnecessary and unsafe: the intended bulk has
already been converted into reviewable commits.

## Candidate Commit Chain

The canonical candidate is an ordered, reviewable chain from root HEAD:

| Commit | Purpose |
| --- | --- |
| `7d688ea` | Checkpoint current ChopDot application and backend behavior. |
| `6ae4b8e` | Checkpoint cockpit, product docs, wiki, ADRs, and security evidence. |
| `10ca8f5` | Checkpoint the visual evidence corpus separately. |
| `ec2d82d` | Establish P-025 actor and migration authority boundary. |
| `6b8b296` | Integrate the reviewed P-025 checkpoint and generated read models. |
| `02081ef` | Record the Node 22 owner proof. |
| `8e41beb` | Record the concurrent P-026 boundary without absorbing P-026. |

The P-026 scanner is already isolated as the direct child:

- branch: `codex/p026-user-path-scanner`
- commit: `36aa9c9dba366856f0b1d9afc25554c60df2effe`
- base: `8e41beb8a86208fd428042aabf30b2aeaca8853f`

P-026 is therefore not a blocker to selecting `8e41beb` as the pre-P-026
baseline and must not be rebuilt from the mixed root files.

## Root Delta Classification

### Intended product and documentation

The 789 formerly untracked paths captured by `7d688ea`, `6ae4b8e`, and
`10ca8f5` include the product application, cockpit sources, wiki, ADRs,
journey reviews, screenshots, and test support. They are preserved in the
candidate commit chain.

### P-025 security and migration foundation

The dirty root lacks the final reviewed P-025 files that are present in the
candidate baseline, including:

- `backend/src/integration/p025-migration-chain.database.ts`;
- `supabase/migrations/20260714160000_settlement_status_alignment.sql`;
- `supabase/migrations/20260714170000_capture_link_tokens_repair.sql`;
- the canonical integration, migration, Node 22, and manifest reports;
- the P-025 product checkpoint event.

Seven overlapping root files also contain older P-025 versions. The candidate
branch owns the reviewed versions; they must not be copied from the root.

### P-026 generated and source state

The root contains an older mixed user-path-map draft and generated views. The
clean P-026 implementation is commit `36aa9c9`. Root variants of
`product/user-path-map*`, `scripts/generate-user-path-coverage.mjs`, generated
coverage files, and related cockpit outputs are not canonical inputs.

### Rejected receipt and behavior-map replacement

The following root-owned cluster targeted the wrong ChopDot implementation and
is excluded from this baseline:

- `src/components/screens/SpendCardScreen.tsx` root delta;
- `tests/e2e/capture-spend-loop.spec.ts` root delta;
- `product/path-model.yaml`;
- `scripts/generate-product-behavior-map.mjs`;
- generated product-behavior map and dashboard files;
- `H-2026-07-15T14-47-30-*` receipt checkpoint;
- `H-2026-07-15T14-50-40-*` D-019 checkpoint.

This is classified as a stale replacement, not canonical product truth. The
portable shell separately preserved the honest capture boundary and is outside
this branch.

### Later proof awaiting its own evidence integration

Three root events dated 2026-07-15 at 12:43, 13:33, and 14:45 describe portable
late-expense and guest-link proof. They are valid routing evidence but are not
required to make the main P-025 baseline canonical. They remain outside this
checkpoint for the portable owner to integrate deliberately.

### Owner-review configuration candidates

- `.env.example`;
- `backend/.env.example`.

These may be useful source files, but they are not needed for this reconciliation
and were not absorbed without an owner decision.

### Generated or local-only artifacts

- `dist-dot-host/.bulletin-deploy/manifest.json`;
- generated Prisma client output;
- Supabase `.temp` and `.branches` state;
- `.DS_Store` files.

These are not canonical source inputs.

### Junk or one-off scratch files

- `run_test.cjs`;
- `test-mock-pots.ts`;
- `test-usePotDataMerge.ts`;
- `vite.config.ts.backup`.

They remain untouched in the root and are excluded from the checkpoint.

## Smallest Safe Promotion Strategy

1. Review this manifest and commits `7d688ea..8e41beb`.
2. Treat `8e41beb` as the canonical pre-P-026 integration tip.
3. Do not merge or stage the dirty root. Move the canonical branch reference to
   the reviewed tip only after the root owner explicitly approves preservation
   of the excluded configuration and proof candidates.
4. Keep `36aa9c9` as the independent P-026 child for a later product review.
5. Keep portable-shell history at its independently proven commits; do not
   merge its filesystem into the main application.
6. After the branch decision, run the verification matrix below on the exact
   promoted commit and only then clean or retire the old dirty worktree.

## Verification Required Before Promotion

- `npm test`;
- `npm run type-check`;
- `npm run lint`;
- `npm run build` with non-secret local public configuration;
- backend `npm test`;
- backend `npm run type-check`;
- backend `npm run build`;
- backend `npm run test:p025:migrated-database` against disposable PostgreSQL;
- `npm run product:validate` with known baseline warnings separated from
  regressions;
- `npm run wiki:validate` with existing reference debt reported honestly;
- `git diff --check`;
- final clean status in the owned integration worktree.

## Fresh Verification Result

Run on 2026-07-16 from this owned worktree with Node `v22.23.1` and npm
`10.9.8`:

| Check | Result |
| --- | --- |
| Frontend tests | PASS, 31/31 |
| Frontend type-check | PASS |
| Frontend lint | PASS, zero warnings |
| Frontend production build | PASS with non-secret Supabase placeholders; WalletConnect remains runtime-only |
| Backend tests | PASS, 46/46 |
| Backend type-check | PASS |
| Backend build | PASS |
| P-025 clean migration chain | PASS, 15 migrations and 10 migration/data/RLS checks |
| P-025 actor boundary | PASS, 9 actor/role/replay/audit checks |
| AI product-manager validation | PASS with the existing quarantined SmartScan warning |
| Static `.dot` boundary | PASS, including CLI version and environment probes; no deploy requested |
| Cockpit source validation | PASS, 0 errors and 10 known warnings |
| Full product validation | BASELINE FAIL: referenced journey screenshots are absent from this worktree |
| Wiki validation | BASELINE FAIL: 27 links reference root-local, portable, or Cursor-rule paths absent from this worktree |
| Root dependency install audit | 7 advisories: 1 low, 3 moderate, 3 high |
| Backend dependency install audit | 9 advisories: 5 moderate, 4 high |

The database, application, backend, build, and lint results support integration
of the candidate baseline. Missing screenshot/wiki references and dependency
advisories remain explicit promotion debt; they prevent a release-ready or
production-secure claim but are not regressions introduced by this manifest or
the P-025 commit range.

## Documentation Impact

This manifest is the required security and integration documentation update.
No ADR changes are needed because no new authority or architecture decision is
introduced. No normal user-facing wiki page is changed because visible product
behavior is unchanged. Generated wiki and cockpit files must not be refreshed
solely for this reconciliation note.

## Stop Condition

Do not start another P-025 control, receipt change, or user-facing feature until
the owner either promotes `8e41beb` as the canonical pre-P-026 baseline or
records a precise rejection of one of its ordered commits.
