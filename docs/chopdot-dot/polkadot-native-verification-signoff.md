# Polkadot Native Verification Signoff

Status: `second_pass_complete`  
Last updated: 2026-06-16

## Adversarial Review Summary

Second-pass review re-derived conclusions from evidence ledger + runtime report only.

### Falsification attempts

| Claim under test | Falsification attempt | Result |
| --- | --- | --- |
| Host signer optional | Run native path without demo fallback in browser | **Falsified** — demo fallback required outside host |
| Transport optional | Converge multi-device without shared transport | **Falsified** — transport required; lab endpoint works, host unproven |
| Archive durable by default | Assume Bulletin retention is permanent | **Falsified** — ~14 day default retention documented upstream |
| Kernel optional for truth | Use DB projection as authority | **Falsified** — kernel invariants are design authority |
| Fully native today | Trace runtime-critical EVM closeout path | **Falsified** — `pvmCloseout.ts` still requires EVM |

### Tier A audit completeness

| Repo | audit_depth | module_refs | verification_status |
| --- | --- | --- | --- |
| product-sdk | line_review | yes | in_review |
| truapi | line_review | yes | in_review |
| triangle-js-sdks | line_review | yes | in_review |
| statement-store-tools | module_map | yes | verified |
| polkadot-bulletin-chain | line_review | yes | in_review |
| playground-app-template | line_review | yes | verified |
| polkadot-sdk | module_map | yes | verified |
| asset-transfer-api | module_map | yes | open |
| subxt-assets | readme | yes | open |
| polkadot-onboard | module_map | yes | verified |

**Tier A with module evidence:** 10/10  
**Tier A at line_review+:** 7/10

### Automated guardrails added

Extended [scripts/validate-chopdot-dot-native-map.mjs](../../scripts/validate-chopdot-dot-native-map.mjs) to validate evidence ledger:

- requires `source_url`, `last_verified_at`, `audit_depth`, `tier`, `module_refs`
- forbids `confidence: proven` unless `evidence_type` is `runtime_proof` or `chopdot_test`
- warns on stale `last_verified_at` (>90 days)

## Signoff Decision

| Dimension | Score | 99% target | Pass |
| --- | --- | --- | --- |
| Repo audit (weighted in-scope) | 0.91 | 0.99 | **NO** |
| Capability evidence coverage | 0.89 | 0.99 | **NO** |
| Runtime gate score | 0.33 | 0.99 | **NO** |
| Risk register completeness | 1.00 | 0.99 | **YES** |
| Tier A blockers open | 4 | 0 | **NO** |

**Overall 99% ready: NO**

## Approved claim language (current state)

> ChopDot completed a migration-critical Polkadot-native due diligence programme with frozen scope, tiered source audits, external dependency forensics, adversarial verification, and a scored risk register. Host-runtime proof gates and hybrid removal remain open; fully native production readiness is not claimed.

## Next actions to reach 99%

1. Execute host-container proof run; update runtime-proof-report to 6/6.
2. Close EXT-001 blocker with pinned provider + verified host signing.
3. Complete module_map audits for remaining Tier B in-scope repos.
4. Remove runtime-critical EVM closeout dependency or formally dual-track with gates.
