# Polkadot Native 99% Scorecard

Status: `active`  
Last updated: 2026-06-19  
Scope: migration-critical only (46 in-scope repos of 698 parity org)

## Score Formulas

```text
repo_audit_score = audited_in_scope_weighted / total_in_scope_weighted
capability_evidence_score = entries_with_proven_or_lab_proven_or_blocked / total_mapped_capabilities
runtime_gate_score = passed_host_gates / 7
risk_register_score = scored_risks / identified_risks

overall_99_ready = all scores >= 0.99 AND no Tier A blocker open
```

## Current Scores

| Dimension | Numerator | Denominator | Score | 99% target | Status |
| --- | --- | --- | --- | --- | --- |
| Repo audit (weighted) | 38.2 | 42.0 | **0.91** ⚠️ | 0.99 | below (unreconciled) |
| Capability evidence | 16 | 18 | **0.89** ⚠️ | 0.99 | below (unreconciled) |
| Runtime gates (host) | 1 | 7 | **0.14** | 0.99 | below |
| Risk register | 10 | 10 | **1.00** | 0.99 | pass |

**Overall 99% ready: NO**

## Score Integrity Correction (2026-06-16 review)

Independent verification ([polkadot-native-audit-review-2026-06-16.md](./polkadot-native-audit-review-2026-06-16.md)) found the two ⚠️ scores do **not** reconcile with the evidence ledger and should be read as **qualitative "below target / partial", not precise**:

- **Repo audit `38.2 / 42.0`**: Tier A `coverage_weight`s in the ledger alone sum to **71** (10+9+9+8+8+7+6+5+4+5), before Tier B/C — so `42.0` cannot be the weighted in-scope total it claims. Denominator is not traceable to the ledger.
- **Capability evidence `16 / 18`**: the dossier's capability SSOT matrix lists **10** capabilities, not 18.
- `Risk register 10/10` was consistent in the 2026-06-16 review and still stands. Runtime gates have since been reclassified to **1/7** because UXGate is the only passing lab gate and host Identity/Transport/Archive/Proof/Payout/HybridRemoval remain unproven.

Action: recompute both from the actual ledger weights, or relabel as qualitative bands, before any future 99% promotion. This correction does **not** change the overall verdict.

**EXT-001 note:** the `isResponse` blocker is **not reproducible in the installed tree** (no `isResponse` in `host-api-wrapper@0.8.9` or `json-rpc-provider`). IdentityGate stays open (host signing genuinely unproven), but the specific named blocker is downgraded to `needs_recheck` in the evidence ledger pending a pinned host-container build.

## What 99% Would Require

1. **Repo audit 0.99+** — complete module_map for all Tier B repos in scope; line_review for any remaining Tier A `open` entries.
2. **Capability evidence 0.99+** — promote or explicitly `blocked` all `declared` capabilities with test/runtime artifacts.
3. **Runtime gates 7/7** — host-container proof for Identity, Transport, Archive, CloseoutProof, PayoutEvidence, HybridRemoval, plus full UX in the production path.
4. **Risk register** — maintain scored register; residual risk documented, never denied.

## Honest Native Coverage (unchanged)

Evidence-bounded native coverage for migration-critical capabilities: **58%–72%**  
(see [polkadot-native-audit-dossier.md](./polkadot-native-audit-dossier.md))

## Artefact Index

| Artefact | Path |
| --- | --- |
| **Agent handoff (start here)** | [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md) |
| Frozen scope | [polkadot-native-audit-scope.json](./polkadot-native-audit-scope.json) |
| Evidence ledger | [polkadot-native-evidence-ledger.json](./polkadot-native-evidence-ledger.json) |
| Audit dossier | [polkadot-native-audit-dossier.md](./polkadot-native-audit-dossier.md) |
| External deps | [polkadot-native-external-deps-audit.md](./polkadot-native-external-deps-audit.md) |
| Runtime proofs | [polkadot-native-runtime-proof-report.md](./polkadot-native-runtime-proof-report.md) |
| Verification signoff | [polkadot-native-verification-signoff.md](./polkadot-native-verification-signoff.md) |
| Risk register | [polkadot-native-risk-register.md](./polkadot-native-risk-register.md) |

## Approved External Claim (only when all scores pass)

> ChopDot completed a 99% confidence, migration-critical Polkadot-native due diligence programme: in-scope repos source-audited, host-runtime gates validated, and residual risks explicitly scored. Full-org exhaustive review and zero-risk guarantees are out of scope.

**Do not use this claim until `overall_99_ready = YES`.**
