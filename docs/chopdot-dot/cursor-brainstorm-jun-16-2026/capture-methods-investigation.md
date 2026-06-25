# Capture Methods — Deep Investigation

Status: `active`  
**Last updated:** 2026-06-16 (pay-moment law revision)  
**Architecture:** [capture-layer-architecture.md](./capture-layer-architecture.md)  
**Specs:** [spend-cards-spec.md](./spend-cards-spec.md), [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md)

**Product law:** [Pay moment + 1 step](./capture-layer-architecture.md#primary-product-law--pay-moment--1-step) — hero path requires **L1+** (bound handoff or webhook), not intent-only L0.

Region scope: **agnostic matrix** (CH / EU / global notes per row). Twint included as one Swiss P2P benchmark, not the sole north star.

---

## Scoring legend

| Dimension | Scale |
| --- | --- |
| **Capture speed** | 1–5: time to register split for full group |
| **Group split quality** | 1–5: multi-party state, not just 1:1 P2P |
| **Auto-match** | 1–5: payment auto-linked to session without separate “I paid” tap (L2+ = 4–5; L1 bound handoff = 2–3) |
| **Custody load on ChopDot** | None / Low / Medium / High |
| **Build complexity** | S / M / L / XL |
| **Phase** | P0 doc · P1 · P2 · P3 · Defer |

---

## Executive summary

**North star:** meet users at **pay moment** with **≤1 extra step**; that step must save enough later work to beat Splitwise-after.

| Best for P1 (hero) | Fallback / deferred |
| --- | --- |
| Wallet pass or pay link → **Pay now** bound handoff (L1) | Intent-only register → pay later → “I paid” (L0) |
| In-app Spend Card with **Pay now** CTA (not separate register) | ChopDot-issued payment card (L3) |
| Signed `/pay`, `/confirm`, `/spend` links + group QR | Full open-banking tx enrichment |
| Twint/bank/Firma handoff with session ref in memo | Privy neo-bank stack rebuild |
| Firma webhook auto-match (L2 fast follow) | NFC wallet pass tap without handoff |

**Recommended P1 stack:** Spend Card (pay + 1) + pay/confirm links + group QR + **required** settlement handoff on happy path. Wallet pass launcher promoted to P1 where cert cost allows.

**Anti-pattern:** A1 without E2/E3/E5 on the same screen — that recreates Splitwise (square one).

---

## Method matrix

### A — In-app and mobile surfaces

| ID | Method | What it is | Capture speed | Group split | Auto-match | Custody | Build | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | **In-app Spend Card (pay + 1)** | Chapter tile → friends + amount → **Pay now** handoff | 5 | 5 | 3 | None | M | **P1** | Hero wedge; handoff required on happy path (L1) |
| A2 | **Quick split sheet (no card metaphor)** | Same as A1, minimal UI from pot home | 4 | 5 | 3 | None | S | P1 | Subset of A1; still needs Pay now |
| A3 | **iOS / Android home widget** | Widget opens spend session with chapter preset | 4 | 4 | 2 | None | M | P2 | Needs native widget or PWA limits |
| A4 | **Siri Shortcut / Google Routine** | “Split with Friday Crew” voice/intent | 3 | 4 | 2 | None | M | P2 | Good for repeat crews |
| A5 | **iOS App Clip / Android Instant** | Lightweight capture without full install | 4 | 4 | 2 | None | L | P2 | Apple/Google program overhead |
| A6 | **Telegram / chat bot capture** | `/paid €120 dinner split 4` → chapter | 3 | 4 | 1 | None | M | P2 | [`telegramBot.ts`](../../../src/bot/telegramBot.ts) exists; extend |

### B — Wallet surfaces

| ID | Method | What it is | Capture speed | Group split | Auto-match | Custody | Build | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | **Apple Wallet Pass (launcher)** | PassKit generic pass → deep link → Pay now | 5 | 4 | 3 | None | L | **P1** (where feasible) | Best pay-moment surface; does not process payment |
| B2 | **Google Wallet pass (launcher)** | Same for Android | 5 | 4 | 3 | None | L | **P1** (where feasible) | |
| B3 | **Partner payment pass** | Gnosis Pay / Firma card in wallet | 5 | 3 | 4 | Low (partner) | XL | P3 | Partner issuer; webhook to ChopDot |
| B4 | **ChopDot-issued card** | Own virtual card program | 5 | 3 | 5 | **High** | XL | Defer | Neo-bank pivot; conflicts with non-custody thesis |

### C — Group pay links

| ID | Method | What it is | Capture speed | Group split | Auto-match | Custody | Build | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | **Chapter join link** | `/join?token=` | N/A | 3 | N/A | None | — | **Shipped** | [`useInviteFlow.ts`](../../../src/hooks/useInviteFlow.ts) |
| C2 | **Spend session link** | `/spend?token=` prefilled split | 5 | 5 | 2 | None | M | **P1** | KAST-style create-share; ChopDot records split not cash |
| C3 | **Commit / deposit link** | `/commit?token=` trip “I’m in” | 4 | 4 | 1 | None | M | P1 | Trip organiser wedge |
| C4 | **Confirm link** | `/confirm?token=` one-tap receiver | 4 | 5 | 2 | None | S | **P1** | Critical for `claimed != confirmed` |
| C5 | **Settlement handoff link** | `/pay?token=` leg + rail | 4 | 4 | 3 | None | M | P1 | Lab P02; prefilled Twint/bank |
| C6 | **Request payment link** | “You owe €30” → pay handoff | 3 | 3 | 2 | None | M | P1 | Extends [`RequestPayment`](../../../src/docs/implementation/request-payment.md) |
| C7 | **IPFS pot share** | `/import-pot?cid=` | 1 | 1 | 0 | None | — | Shipped | Copy only — not live chapter ([sharing doc](../product/SHARING_VS_ADDING_MEMBERS.md)) |

### D — QR codes

| ID | Method | What it is | Capture speed | Group split | Auto-match | Custody | Build | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | **Static group QR** | Join chapter at table | 4 | 3 | N/A | None | S | P1 | Encode join or chapter landing URL |
| D2 | **Dynamic spend QR** | Single-use spend session | 5 | 5 | 2 | None | M | P1 | Payer scans → friends pre-picked |
| D3 | **Handoff QR** | Encodes `/pay?token=` | 4 | 4 | 2 | None | S | P1 | Peer pays share; Swiss QR culture |
| D4 | **Confirm QR** | Encodes `/confirm?token=` | 4 | 5 | 2 | None | S | P1 | Receiver scans at table |
| D5 | **Receive QR (crypto)** | Wallet address | 2 | 1 | 3 | None | — | Shipped | [`ReceiveQR.tsx`](../../../src/components/screens/ReceiveQR.tsx); DOT rail only |
| D6 | **Merchant POS QR** | Pay restaurant via Twint QR | 5 | 1 | 4 | N/A | XL | **Out of scope** | Twint/acquirer domain; not ChopDot wedge |

### E — Settlement rails and matching

| ID | Method | What it is | Capture speed | Group split | Auto-match | Custody | Build | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | **Manual outside + “I paid”** | User pays anywhere; taps claim later | 3 | 5 | 1 | None | S | **Fallback** | L0 only — square one; not hero |
| E2 | **Twint handoff** | Copy phone + amount; SMS link | 4 | 4 | 2 | None | S | **P1** | [`TWINTForm.tsx`](../../../src/components/settlement/TWINTForm.tsx); **no public Twint API** |
| E3 | **Bank transfer handoff** | IBAN + reference | 3 | 4 | 2 | None | S | P1 | Reference encodes `legId` |
| E4 | **PayPal / Venmo handoff** | Copy or deep link where available | 3 | 3 | 2 | None | S | P1 | Region-dependent |
| E5 | **Firma / stablecoin partner** | Pay via partner + webhook | 5 | 4 | 4 | Low | L | P2 | [Firma](https://www.firma.cash/) pattern; CH/global |
| E6 | **KAST-style payment link** | Custodial link claim | 5 | 2 | 5 | **High** | L | Defer | Learn UX only; don’t copy custody |
| E7 | **Open banking / PSD2 match** | Plaid/Tink/TrueLayer tx feed | 3 | 4 | 4 | Low | XL | P3 | EU; consent friction |
| E8 | **Privy + AA + sponsored tx** | Neo-bank in-app wallet | 4 | 3 | 5 | Medium | XL | Defer | Full stack rebuild |
| E9 | **DOT / USDC on-chain** | Smart settle closeout path | 2 | 3 | 4 | None | — | Shipped | Production testnet; not group capture default |
| E10 | **Cash** | Manual confirm | 2 | 4 | 1 | None | S | P1 | [`SettleHome`](../../../src/components/screens/SettleHome.tsx) |

---

## Competitive benchmark rows (examples)

| Benchmark | What users love | What they lack | ChopDot capture answer |
| --- | --- | --- | --- |
| **Twint (CH)** | 2-tap P2P, QR habit, bank trust | No group split state machine | C2/C5/D3 + E2 handoff + kernel record |
| **KAST** | Payment link + WhatsApp share | Custodial; no chapter closeout | C2/C4 link pattern without custody |
| **Firma** | Instant send, note on payment, multi-currency | Not group chapter OS | E5 handoff + webhook match (P2) |
| **Splitwise** | Familiar split math | Post-hoc entry, weak pay moment | A1 pay + 1 with bound handoff |
| **Venmo** | Social P2P feed | US-centric; no treasurer closeout | C4 confirm + chapter receipt |
| **Revolut bill split** | In-app split after card pay | Bank lock-in; limited modes | Mode-agnostic chapter kernel |

---

## Twint-specific investigation (example benchmark)

| Question | Finding |
| --- | --- |
| Public API for apps to initiate Twint pay? | **No** broadly available; handoff-only for third parties |
| Current ChopDot integration | Reference field + phone copy + SMS ([`TWINTForm.tsx`](../../../src/components/settlement/TWINTForm.tsx)) |
| Lab hypothesis P02 | Prefilled deep link + `legId` in memo ([`payout-investigation-v1.ts`](../../../src/lab/group-money-loop/scenarios/payout-investigation-v1.ts)) |
| Can ChopDot replace Twint at merchant QR? | **No** — acquirer/merchant rail |
| Can ChopDot win group dinner after Twint? | **Yes** — if split registered for all + confirm loop + closeout |
| `twint://` deep links | Limited / undocumented for partners; treat as best-effort SMS/phone handoff |

---

## KAST / Firma pattern mapping

### KAST (payment link)

```text
Create link with amount → share iMessage/WhatsApp → recipient claims funds
```

**ChopDot mapping (non-custodial):**

```text
Create spend link with amount + chapter → share → recipient opens confirm/commit screen
Money moves outside; ChopDot records obligation state
```

### Firma (instant pay + note)

```text
Send to @user or WhatsApp with note "My share of Airbnb"
```

**ChopDot mapping:**

```text
Settlement handoff link with legId + note → Firma pay → webhook marks claimed → receiver confirms
```

---

## Recommended P1 bundle

1. **A1** In-app Spend Card with **Pay now** (L1 minimum)  
2. **B1/B2** Wallet pass launcher where cert allows (pay-moment hero)  
3. **C2, C4, C5** spend / confirm / pay links  
4. **D1, D2, D3** static join QR, dynamic spend QR, handoff QR  
5. **E2, E3, E10** Twint, bank, cash handoffs (E1 only as explicit fallback)  

**P2 add:** E5 Firma webhook (L2), A3 widget  
**P3 / defer:** B3/B4 issued cards, E7 open banking, E6 KAST custody model  

---

## Risks and falsifiers

| Risk | Falsifier |
| --- | --- |
| Users won’t add +1 step before paying | &lt;40% L1+ sessions in pilot |
| +1 step slower than “just pay” | Median steps &gt; normal pay + 1 |
| Link/QR friction worse than Splitwise-after | Time-to-split slower than 30s median |
| Twint handoff too manual | Users abandon at handoff step &gt;50% |
| Intent-only path becomes default | &gt;30% sessions L0-only |

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Pay-moment law; L1 hero; E1 demoted to fallback; wallet pass promoted P1 |
| 2026-06-16 | Initial investigation matrix (18 methods) |
