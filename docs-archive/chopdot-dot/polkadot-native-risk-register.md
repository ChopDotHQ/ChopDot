# Polkadot Native Risk Register

Status: `active`  
Last updated: 2026-06-16  
Scoring: likelihood (1-5), impact (1-5), detectability (1-5), residual = L*I/D (lower is better)

## Mandatory Risk Classes

| ID | Risk | L | I | D | Residual | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Host contract drift (`truapi`/product-sdk version changes) | 4 | 5 | 3 | 6.7 | Pin versions; host compatibility matrix; truapi playground diagnosis | open |
| R-002 | `@polkadot-api/json-rpc-provider` import mismatch | 5 | 5 | 4 | 6.3 | Pin provider; host-container proof before promotion | open |
| R-003 | Statement Store reliability under churn/latency | 4 | 5 | 3 | 6.7 | Latency bench (`statement-store-tools`); multi-device host gate | open |
| R-004 | Bulletin retention insufficiency for long History | 3 | 5 | 4 | 3.8 | Document retention limits; renewal strategy; external redundancy option | open |
| R-005 | Hybrid-path regression during migration | 4 | 4 | 3 | 5.3 | Feature flags; dual-read schema bridge; e2e smoke expansion | open |
| R-006 | Semantic regression (`claim` vs `confirm` collapse) | 3 | 5 | 4 | 3.8 | Kernel invariant tests; adversarial simulation suite | mitigated |
| R-007 | Privacy leak in emergency/savings modes | 3 | 5 | 4 | 3.8 | Redaction defaults; private payload adapter tests | mitigated |
| R-008 | Invite abuse / revocation propagation gaps | 4 | 4 | 3 | 5.3 | Signed invite authority; transport revocation tests | open |
| R-009 | Asset Hub fee/UX burden for small payments | 3 | 3 | 4 | 2.3 | Optional evidence rail; off-chain fiat fallback | accepted |
| R-010 | Ops/support tooling gap in native-only posture | 3 | 4 | 3 | 4.0 | External ops stack declared; non-truth boundary | accepted |

## Residual Risk Policy

- Target: **>=99% of identified migration risks captured and scored**.
- Current identified risks: **10**
- Scored risks: **10**
- `risk_register_score = 1.00` (completeness of register, not zero residual risk)

## Non-Negotiable Boundary

Residual risk will always exist. The programme forbids claiming "no migration risk remains."

## Top Open Blockers (by residual score)

1. R-001 Host contract drift
2. R-003 Statement Store reliability
3. R-002 json-rpc-provider mismatch
4. R-005 Hybrid-path regression
5. R-008 Invite abuse / revocation
