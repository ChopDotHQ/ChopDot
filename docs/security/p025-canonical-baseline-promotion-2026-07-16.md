# P-025 Canonical Baseline Promotion

Date: 2026-07-16
Change: `p025-canonical-baseline-promotion-v1`
Canonical branch: `codex/p025-canonical-baseline`
Reviewed reconciliation commit: `70f4d86710e68f1be2bb199b0d30ac064eadf973`
Previous canonical tip: `8e41beb8a86208fd428042aabf30b2aeaca8853f`

## Verdict

**PROMOTED AS THE CANONICAL PRE-P-026 INTEGRATION BASELINE.**

The canonical branch was fast-forwarded from `8e41beb` to the reviewed
reconciliation commit `70f4d86`. The fast-forward added only the root
reconciliation manifest. No application behavior, backend route, migration,
product card, generated cockpit output, receipt flow, or host adapter changed.

This is an integration baseline, not a production release. The documentation
and dependency debt below remains open and prevents a release-ready or
production-secure claim.

## Current Truth Preserved

- the pre-P-026 ChopDot application and backend snapshot;
- P-025 server-derived actor, payer, and receiver authority;
- canonical `pending -> paid -> confirmed` settlement behavior;
- forward-only settlement and capture-link migration repairs;
- database, replay, RLS, and audit-actor proof;
- separate ownership for P-026 and Programme A portable-host work;
- exclusion of the rejected root receipt and behavior-map replacement.

## Promotion Boundary

### In scope

- fast-forward `codex/p025-canonical-baseline` to `70f4d86`;
- rerun the complete promotion matrix on the exact promoted tree;
- record known failures and toolchain drift;
- name one canonical branch for subsequent integration work.

### Out of scope

- staging, cleaning, resetting, or merging the dirty shared root;
- rebasing or editing P-026;
- editing the portable shell, `.dot` proof, or Telegram proof;
- new user-facing behavior;
- dependency upgrades;
- production deployment or money movement.

## Verification Environment

- Node.js: `v22.23.1`
- npm: `10.9.8`
- database: disposable local `postgres:16` container
- database name: `chopdot_p025_promotion_exact`
- production data or services: none
- live deployment: none

The disposable database container was removed after the proof completed.

## Verification Results

| Check | Result | Notes |
| --- | --- | --- |
| Frontend tests | PASS | 31/31 |
| Frontend type-check | PASS | `tsc --noEmit` |
| Frontend lint | PASS | Zero warnings allowed |
| Frontend production build | PASS | Non-secret Supabase placeholders; WalletConnect remains runtime-only |
| Backend tests | PASS | 46/46 |
| Backend type-check | PASS | `tsc --noEmit` |
| Backend build | PASS | `tsc` |
| P-025 clean migration chain | PASS | 15 migrations |
| P-025 migration, data, and RLS checks | PASS | 10/10 |
| P-025 actor, role, replay, and audit checks | PASS | 9/9 |
| AI product-manager validation | PASS WITH WARNING | Existing quarantined SmartScan paste-first path |
| Product cockpit source validation | PASS WITH WARNINGS | 0 errors, 10 existing warnings |
| Static `.dot` site boundary | PASS | Node requirement, site, manifest, and boundary copy verified |
| Polkadot deploy CLI probe | PASS MANUALLY | `polkadot-app-deploy v0.11.0`; `paseo-next-v2` and `summit` listed |
| Full product validation | BASELINE FAIL | Journey reviews reference screenshots absent from the isolated worktree |
| Wiki validation | BASELINE FAIL | 27 root-local, portable-worktree, or Cursor-rule references are absent |
| Root production dependency audit | NOT CLEAN | 2 high advisories, both transitive and fixable |
| Backend production dependency audit | NOT CLEAN | 7 advisories: 5 moderate, 2 high |
| Final diff check | PASS | Promotion record only |

## Tooling Drift Found During Promotion

`npm run dot:smoke:preflight` builds and validates the static smoke site, but
its internal CLI probes use this obsolete nested invocation form:

```text
npx -y @parity/polkadot-app-deploy@0.11.0 --version
```

Current npm returns `EUSAGE` for that form, so the helper reports
`needs_review` while exiting successfully. The CLI was therefore verified
separately under the qualified Node/npm pair using `npm exec --package=...`.
This is verification-tool debt and was not repaired during the promotion.

## Shared Root Preservation

The shared root remained at:

```text
12e3df1e85bcf0029d42c38f2127f01dc9f3ee55
```

Its tracked-diff hash remained:

```text
2a514bf9f1fdb92d7060d59f822f4c6418eec93e7c855184b32cde4119f5e152
```

Its untracked path-list hash changed during concurrent work from the value in
the reconciliation manifest to:

```text
d4ae89a21256fc4dd4697691eb96acef6ba5e7a6da5bd37b4fce98d1679a6268
```

That drift was not staged, cleaned, interpreted as canonical input, or copied
into this branch. It reinforces the requirement to keep future integration
work on committed branches and owned worktrees.

## Parallel Lane State

- P-026 remains isolated on `codex/p026-user-path-scanner` and is not included
  in this baseline.
- Programme A portable-shell and host-proof work remains isolated on
  `codex/portable-shell-trial` and is not included in this baseline.
- The dirty root receipt/behavior-map replacement remains excluded.

P-026 must be reviewed as a separate child change and replayed onto this
promoted tip rather than reconstructed from the shared root.

## Documentation Impact

This security/integration promotion record is the required documentation
update. No ADR is required because no authority or architecture decision
changed. No wiki source or generated cockpit file is updated because no
user-facing or product-state behavior changed.

## Next Integration Gate

Future canonical work must start from `codex/p025-canonical-baseline` after
this promotion record. Before starting another P-025 control or user-facing
journey, choose one bounded path, write its authority and state scenarios, and
keep P-026 and Programme A ownership exclusions explicit.
