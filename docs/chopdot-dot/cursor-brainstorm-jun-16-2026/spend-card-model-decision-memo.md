# Spend Card Model Decision Memo (A/B/C)

Status: `active`  
**Last updated:** 2026-06-16  
**Purpose:** Choose the right near-term Spend Card model for ChopDot and define explicit triggers for escalating from non-custodial session preload to stored-value/payment-instrument models.

Related:
- [b2b-card-issuer-stacks-investigation.md](./b2b-card-issuer-stacks-investigation.md)
- [web3-payment-cards-non-kyc-investigation.md](./web3-payment-cards-non-kyc-investigation.md)
- [capture-layer-implementation-investigation.md](./capture-layer-implementation-investigation.md)
- [spend-cards-spec.md](./spend-cards-spec.md)

---

## Executive decision

**Default lane: Model A now.**  
Treat Models B/C as conditional expansions with explicit gates.

Why:
- Fastest route to validated user behaviour at pay moment.
- Lowest compliance and operational burden.
- Best alignment with current non-custodial product boundary.
- Preserves optionality if we need to escalate later.

---

## Model definitions

| Model | What it means | Custody posture |
| --- | --- | --- |
| **A — Session preload** | Spend Card pre-fills chapter + people + amount flow; payment happens on external rails | Non-custodial |
| **B — Custodial prepaid** | Users pre-fund a card balance managed by provider/programme stack | Custodial/partner-led |
| **C — Delegated self-custody spend** | User grants bounded spending permissions from wallet/account abstraction path | Hybrid; still regulated on card rails |

---

## Scoring matrix

Scale: 1 (worst) to 5 (best) for ChopDot’s current stage.

| Dimension | A | B | C | Notes |
| --- | --- | --- | --- | --- |
| **Time to market** | **5** | 1 | 2 | A mostly wiring around existing chapter engine |
| **Compliance simplicity** | **5** | 1 | 2 | B/C materially increase programme/legal surface |
| **Upfront engineering complexity** | **4** | 1 | 1 | C especially complex if delegated controls are robust |
| **Operational burden (fraud/disputes/support)** | **4** | 1 | 2 | B introduces card ops muscle early |
| **Trust alignment (current thesis)** | **5** | 2 | 3 | A matches non-custodial doctrine best |
| **Pay-moment UX potential (long run)** | 3 | **5** | 4 | B/C can be smoother if well executed |
| **Strategic optionality** | **5** | 2 | 3 | A keeps options open without lock-in |
| **Partner dependency risk** | **4** | 1 | 2 | B/C tied tightly to issuer/programme dependencies |

### Weighted verdict (early-stage bias)

If we overweight speed, compliance, and optionality (current context), **A dominates**.  
B only wins if we prioritise payment-UX smoothness above all else and accept a company-level scope shift.

---

## Recommendation by horizon

## Horizon 0-6 months

- Ship **Model A** as core product.
- Integrate one L2 webhook path (partner rail) without taking custody.
- Prove behaviour: people use pay-moment flow and confirm loops close cleanly.

## Horizon 6-12 months (conditional)

- Re-assess B/C only if A+L2 misses thresholds despite strong adoption intent.
- Run one constrained feasibility pilot with a single partner and strict regional scope.

---

## Trigger gates to consider B or C

Escalate only if all are true for at least 2 consecutive pilot windows:

1. **Adoption intent exists**
   - `>= 70%` sessions start from Spend Card/pay-link launcher.
2. **But settlement friction persists**
   - `< 45%` sessions reach claimed within 24h despite L2 adapter in place.
3. **Manual confirmation drag remains high**
   - `< 65%` confirmations within 24h with acceptable reminder UX.
4. **Top user request pattern**
   - Repeated demand for "single tap pay and done", not just better reminders/UI.
5. **Partner path available**
   - At least one issuer/programme partner offers a feasible path in target geography.

If these are not met, stay on A and continue optimisation.

---

## No-go conditions for B/C right now

Do not start B/C if any are true:

- No internal owner for compliance + card programme operations.
- No legal/regulatory resourcing for programme obligations.
- No dispute/fraud operations readiness.
- No clear unit economics model under partner fee stack.
- Product team cannot maintain core chapter loop quality in parallel.

---

## Risks by model

| Model | Primary risk | Mitigation |
| --- | --- | --- |
| A | Feels "one step too many" vs user habit | Tight pay-moment UX, shortcuts/widgets/wallet-launchers, L2 auto-claim |
| B | Early-stage strategic drift into fintech ops | Hard scope guard, staged pilot, board-level decision checkpoint |
| C | Technical complexity without meaningful compliance relief | Restrict to R&D track until hard demand evidence exists |

---

## Immediate next actions

1. Keep implementation roadmap anchored to **A + L2 lite**.
2. Add product telemetry to decision gates (claimed/confirmed timing, launcher usage, drop-off).
3. Create a short partner-screen framework (geo, KYC burden, webhook quality, economics).
4. Re-run this memo after first live pilot window with real metrics.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Initial decision memo: A/B/C scorecard, recommendation, trigger gates |

