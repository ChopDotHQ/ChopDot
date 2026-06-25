# Spend Cards — Product Specification

Status: `active`  
**Last updated:** 2026-06-16  
**Architecture:** [capture-layer-architecture.md](./capture-layer-architecture.md)  
**Links & QR:** [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md)  
**Methods:** [capture-methods-investigation.md](./capture-methods-investigation.md)

**Last updated:** 2026-06-16 (pay-moment law revision)

---

## Primary product law — Pay moment + 1 step

See [capture-layer-architecture.md](./capture-layer-architecture.md#primary-product-law--pay-moment--1-step).

People already pay. ChopDot meets them at **wallet / pay moment** with **≤1 extra step**. That step must save enough later work (no Splitwise, no WhatsApp reconciliation) to feel obvious.

**Positioning:** Pay like you always do — one tap first so the split is already done.

---

## Definition

A **Spend Card** is a chapter-scoped **pay-context surface** at the moment users reach for their card — not a bank card.

> One tap on your group card, then pay as usual — split is already registered for everyone.

Copy guardrail (from [safety-boundaries.md](./safety-boundaries.md)):

- Say: **group card for splitting**, **spend context**, **chapter card**  
- Avoid: **bank card**, **balance**, **guaranteed payment**, **escrow**

**Technical mechanics (code-level):** [capture-layer-implementation-investigation.md § Spend Cards — technical mechanics](./capture-layer-implementation-investigation.md#spend-cards--technical-mechanics)

---

## Problem

| Today | Pain |
| --- | --- |
| Pay with Twint/Venmo/bank at restaurant | Only 1:1 transfer; group split lives in chat |
| Add expense in Splitwise after dinner | Slow; people forget |
| Open ChopDot, add expense, pick people, currency | Too many steps at pay time |

Spend Cards optimise **capture at the pay moment** with at most **one extra step** before or during normal payment.

**Anti-pattern:** register split in app, leave to pay elsewhere, come back to tap “I paid” — that is **L0 fallback**, not the hero flow.

---

## Two surfaces (both required long-term)

### 1. Wallet Spend Pass (P1 hero where possible, full P2)

Apple Wallet / Google Wallet **launcher pass** — the best fit for **pay + 1**:

- 1 tap from lock screen → chapter locked in App Clip or deep link  
- Amount + friends pre-filled from last crew  
- **Pay now** → bound handoff (Twint/bank/Firma) with session reference  
- **Does not process payment** unless partner-issued card (P3)  

### 2. In-app Spend Card (P1)

Full UX when user is already in ChopDot — must still obey **pay + 1**:

- Friends + amount on **one screen**  
- Primary CTA: **Pay now** (not “Register split” then pay later)  
- Obligations created **as part of** handoff flow, not as a separate chore  

```text
┌─────────────────────┐     ┌─────────────────────┐
│  Apple/Google Wallet │     │  ChopDot app        │
│  [Friday Crew pass]  │     │  [Friday Crew]      │
│  → 1 tap → pay       │     │  → Pay now CTA      │
└─────────────────────┘     └─────────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
         SpendSession + bound handoff (L1)
```

---

## User flows

### Flow A — Hero: payer at restaurant (L1 bound handoff)

**Target: normal pay + 1 step.**

1. Double-click Wallet → **Friday Crew** pass **(the +1)**, or tap pay link from chat  
2. Amount + friends pre-filled (€120, equal → €30 each)  
3. Tap **Pay now** → Twint/bank opens with amount + `legId` in reference  
4. User completes payment in rail app (normal pay flow)  
5. Friends get share notification + **confirm link**; payer does **not** tap separate “I paid” on happy path  

### Flow B — Pay link only (L1, zero app install for payer)

1. Organiser shares `pay?token=` in WhatsApp: “Your share €30”  
2. Friend taps link **(the +1)** → handoff screen → Twint  
3. Same confirm loop as Flow A  

### Flow C — Host pays for table

1. Host: Wallet pass or one-screen **Pay now** for full €120  
2. Handoff → host pays outside app  
3. Kernel creates expense legs; members get **pay links** for their share to host (each +1 = tap link → pay)  

### Flow D — Trip commit (event_deposit mode)

Spend Card variant: **Commit Card** — commit link is the +1 before deposit pay.

- `/commit?token=` → `Committed` / `Declined` → **Pay now** for deposit  
- See [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md)

### Flow E — Fallback only (L0)

Cash or rail already used without ChopDot open:

- Quick “Log cash split” — explicit **fallback**, not marketed  
- Requires manual confirm; does not satisfy pay-moment law for hero metrics  

---

## Split rules

| Rule | Behaviour |
| --- | --- |
| `equal` | amount / N participants |
| `payer_pays_all` | payer 100%, others informational only |
| `shares` | integer weights per person |
| `custom` | manual per-person amounts (must sum to total) |
| `exclude_payer` | common for “I paid, split among others” |

Default per Spend Card; overridable per session.

---

## Settlement preference (per card)

| Preference | Hero path behaviour |
| --- | --- |
| `twint` | [`TWINTForm`](../../../src/components/settlement/TWINTForm.tsx) handoff — **default CH** |
| `bank` | IBAN + reference in handoff |
| `paypal` | PayPal handoff |
| `firma` | Partner deep link + webhook (L2 target) |
| `dot` / `usdc` | Existing on-chain settle path |
| `outside` | **Fallback only** — copy reference; manual confirm (L0) |

Money moves outside ChopDot on L1; L2 adds partner webhook proof without ChopDot custody.

---

## Kernel mapping

Spend Card commits a **SpendSession** → **KernelBridge** → [`commitmentKernel.ts`](../../../src/chopdot-dot/commitmentKernel.ts):

| Mode | Obligation kind | Actions |
| --- | --- | --- |
| `shared_expense` | `expense_leg` | `claimDotContribution` → `confirmDotContributionClaim` |
| `event_deposit` | `deposit` | commitment + deposit claim |
| `savings_circle` | `circle_contribution` | contribution claim flow |

Invariant: **claimed ≠ confirmed** ([mode-map.md](./mode-map.md)).

---

## UI requirements

From [ux-brief.md](./ux-brief.md):

- One primary action per screen (`Pay now` / `Confirm` / fallback `Log cash`)  
- Status-first: show per-person shares before handoff  
- No blockchain onboarding before job is clear  
- Recent friends as chips (max 8 visible)  
- Haptic on register success  

### Spend Card tile (in-app)

- Chapter label + member count  
- Last used timestamp  
- Optional: open obligation count badge  

---

## Version roadmap

| Version | Scope | Custody |
| --- | --- | --- |
| **v0** | In-app Spend Card + manual/outside/Twint handoff | None |
| **v1** | + pay/confirm links + dynamic QR + one partner webhook | None on ChopDot |
| **v2** | + Wallet pass launcher + App Clip | None |
| **v3** | + Partner-issued wallet payment card (optional) | Partner |

Do not skip v0–v1 for v3.

---

## Metrics

| Metric | Definition |
| --- | --- |
| `capture_latency` | Tap card → obligations created |
| `capture_freshness` | % expenses registered within 5 min of payment |
| `handoff_completion` | % sessions where payer starts rail handoff |
| `confirm_rate_24h` | % obligations confirmed within 24h |
| `repeat_card_use` | Same Spend Card used 2+ times in 7 days |

---

## Non-goals (v0)

- Issuing Visa/Mastercard  
- Stored balance on Spend Card  
- Auto-split from arbitrary bank card without user intent step  
- Replacing merchant QR (Twint at POS)  

---

## Open questions

1. One Spend Card per chapter or multiple (e.g. `Trip` + `Trip — food`)?  
2. Guest/anonymous split via link without account?  
3. Default rail per geography (Twint in CH, Venmo US)?  

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Link to technical mechanics in implementation investigation |
| 2026-06-16 | Pay-moment + 1-step law; L0–L3 linkage; Pay now hero flows |
| 2026-06-16 | Initial spec |
