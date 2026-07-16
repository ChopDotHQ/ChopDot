# P-025 + P-026 Canonical Integration Evidence

Date: 2026-07-16

Change: `p025-p026-canonical-integration-v1`

Cards: `P-025`, `P-026`

Status: **integration proof passed**

## Result

The P-025 financial-authority lockdown and the complete P-026 behavior-map
stack now coexist on one reviewable branch without importing Programme A
implementation code or changing normal ChopDot UI behavior.

The integration branch starts from:

```text
dc6b964  canonical P-025 baseline
  -> 26d2cc3  financial-table authority lockdown
```

It then replays the five frozen P-026-owned commits in order:

```text
36aa9c9 -> 756c506  canonical user path scanner
c445988 -> 4a960db  proof routing map
20a3bad -> 3730f7f  lane coordination hardening
08d5324 -> 997a0db  routing invariants
e81cbf4 -> 4c18407  scoped Programme A viewport evidence
```

The integration plan is committed at `c7bd3e1`.

## Reconciliation

The first two P-026 commits conflicted only in generated wiki, cockpit, and
latest-evidence read models that had also been refreshed by P-025. P-025's
generated versions were retained during replay. After all five P-026 source
commits landed, the product behavior map, cockpit, and wiki indexes were
regenerated from the combined source files.

No conflict required a UI, state-model, backend-command, migration, or payment
semantic change.

## Source Integrity

The following P-026-owned sources match the frozen
`codex/p026-user-path-scanner` branch exactly:

- `scripts/generate-user-path-coverage.mjs`
- `scripts/generate-product-behavior-map.mjs`
- `scripts/test-p026-routing.mjs`
- `product/path-model.yaml`
- `product/user-path-map.md`
- `product/user-path-map.mmd`
- `docs/wiki/06-agentops/user-path-coverage.md`
- the three dated P-026 proof and coordination reports

The combined source also preserves:

- P-025 and `DC-025`;
- P-026 and `DC-026`;
- `supabase/migrations/20260716130000_financial_table_authority_lockdown.sql`;
- the P-025 migrated-database authority tests;
- the distinction between canonical/root web and portable web proof.

The diff from `26d2cc3` contains no Programme A implementation files under
`.worktrees/portable-shell-trial`, `src/environment`, `src/payments`, or
`server/payment-intents`.

## Product-System Proof

| Check | Result |
| --- | --- |
| P-026 routing regression | PASS, 6/6 |
| Behavior-map validation | PASS, 0 errors and 0 warnings |
| Journeys | 6 |
| Paths | 42 |
| Known dead ends | 15 |
| Proven paths | 5 |
| Active elsewhere | 10 |
| Stale owners | 0 |
| Blocked external | 1 |
| Highest-risk unowned | 7 |
| Single next unowned | `N-007` |
| Cockpit validation | PASS, 0 errors and 1 WIP warning with external references mounted read-only |
| Journey reviews | PASS, 12 |
| AI PM process | PASS with the existing SmartScan quarantine warning |

The one cockpit warning is the existing building-card WIP limit. No lane is
double-owned and portable proof does not promote canonical application status.

## Application and Backend Proof

All executable application checks used Node.js 22.

| Check | Result |
| --- | --- |
| Frontend unit tests | PASS, 31/31 |
| Frontend type-check | PASS |
| Frontend lint | PASS |
| Frontend production build | PASS with non-secret Supabase placeholders |
| Backend unit tests | PASS, 46/46 |
| Backend type-check | PASS |
| Backend production build | PASS |

The frontend build retains its existing WalletConnect runtime-variable warning
and large-chunk warning. Neither is introduced by P-026.

## Fresh P-025 Database Proof

A new disposable database named with the required `chopdot_p025_` prefix was
created on the existing local Supabase Postgres container. It contained no
production data or credentials and was dropped after the run.

| Check | Result |
| --- | --- |
| Clean migration chain | PASS, 16 migrations |
| Migration/data/RLS checks | PASS, 11/11 |
| Financial authority checks | PASS, 10/10 |
| Backend actor/role/replay/closeout checks | PASS, 10/10 |

The proof confirms that authenticated clients cannot directly mutate
settlements, payments, events, or backend-owned closeout state, while legitimate
payer and receiver commands still work and replay remains idempotent.

## Documentation Validation Boundary

`wiki:generate` regenerated 43 source pages. A clean worktree does not contain
27 root-local or separately owned references, including local `AGENTS.md`,
Cursor rules, historical artifact packets, and Programme A source paths. This
is pre-existing canonical baseline debt.

When those existing locations were mounted into this worktree as temporary
read-only symlinks:

- wiki validation passed for 43 source pages and 2 generated indexes;
- full product validation passed;
- the links were removed immediately afterward and were not committed.

This proves the combined references are valid without making the integration
branch depend on machine-specific symlinks. It does not claim the clean-worktree
documentation portability debt is fixed.

## Dependency Audit Boundary

No dependency changed in this integration.

- root production audit: 2 high advisories;
- backend production audit: 5 moderate and 2 high advisories.

These reproduce the P-025 baseline debt and remain separate remediation work.

## Invariants Preserved

- `paid`, `confirmed`, and `closed` remain distinct.
- Browser-supplied actor identity does not grant payment authority.
- Authenticated clients do not regain financial-table write access.
- One behavior-map item has one active implementation owner.
- Portable/reference proof cannot silently replace canonical application proof.
- Generated product and wiki files remain read models of source truth.
- Normal ChopDot screens, copy, actions, and state transitions are unchanged.

## Known Remaining Work

- P-025 remains `building`; atomic financial persistence is its next material
  security target.
- P-026 remains `building`; `N-007` is its single highest-priority unowned path
  after routing exclusions.
- P-022 remains the main user-facing product lane.
- Programme A remains independently proven and separately owned.
- Clean-worktree external-reference portability and dependency advisories remain
  explicit baseline debt.

## Documentation Impact

- Added this shared P-025/P-026 integration report.
- Added the report to both source cards and regenerated product read models.
- Regenerated wiki indexes; no source wiki behavior page or ADR changed because
  this integration adds no architecture or user-facing behavior.
