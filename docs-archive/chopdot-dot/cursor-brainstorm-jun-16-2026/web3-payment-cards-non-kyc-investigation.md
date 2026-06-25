# Web3 Payment Cards and Non-KYC Reality — Investigation

Status: `active`  
**Last updated:** 2026-06-16  
**Goal:** Investigate how current web3 payment cards work, whether non-KYC cards truly exist, who the providers are, and whether pre-loaded ChopDot Spend Cards are viable.

---

## Executive take

1. **True non-KYC Visa/Mastercard web3 cards are not a durable model.**  
   Providers using regulated card rails consistently require KYC before meaningful card use.
2. Current web3 cards are typically one of two models:
   - **Self-custodial spend orchestration** (wallet-connected, still KYC on card programme side).
   - **Custodial/prepaid balances** (faster UX, heavier provider control and compliance burden).
3. For ChopDot, a **pre-loaded Spend Card** is technically possible, but it changes the product from coordination software into payments programme operations (compliance, issuer dependencies, fraud/disputes, ops).

---

## Scope and evidence quality

- This investigation uses publicly available docs and help centres from providers and infrastructure partners.
- Priority is given to **official vendor docs** over third-party review sites.
- Some providers market "low-friction onboarding". This is not treated as "non-KYC" unless official docs support that claim.

---

## How web3 cards work today (common architecture)

```text
User wallet/balance -> Card programme ledger -> Network authorisation (Visa/Mastercard)
-> Crypto/fiat conversion + settlement -> Merchant payout
```

Common stack roles:

- **Front-end brand/app**: wallet UX and user journey.
- **Card programme manager / issuer stack**: onboarding, controls, card lifecycle.
- **Network + issuing bank/partner**: card acceptance rails and scheme compliance.
- **KYC/KYB vendor**: identity checks, sanctions screening, ongoing AML controls.

Even self-custodial designs generally still require regulated identity checks for card issuance.

---

## Provider scan (2026 snapshot)

## 1) Gnosis Pay

- Model: self-custodial wallet linked to card programme.
- KYC posture: **required** to receive card.
- Signals:
  - Official help centre states KYC is mandatory.
  - Requires identity docs, proof of address, and liveness checks.
  - Documentation references KYC status orchestration in onboarding APIs.

Sources:
- [Why KYC is Required for Gnosis Pay](https://help.gnosispay.com/hc/en-us/articles/39400815102100-Why-KYC-is-Required-for-Gnosis-Pay)
- [Accepted Documents for KYC Verification](https://help.gnosispay.com/hc/en-us/articles/39403933404948-Accepted-Documents-for-KYC-Verification)
- [Gnosis Pay onboarding flow](https://docs.gnosispay.com/onboarding-flow)

## 2) MetaMask Card (with partners)

- Model: self-custody card spend with partner-operated programme rails.
- KYC posture: **required** for enrolment.
- Signals:
  - MetaMask help states KYC is required because the card bridges DeFi and regulated finance.
  - Launch announcement states identity verification/compliance checks are required.

Sources:
- [MetaMask Card security and privacy](https://support.metamask.io/manage-crypto/metamask-card/security-privacy/)
- [MetaMask + Mastercard launch note](https://metamask.io/en-GB/news/metamask-and-mastercard-partner-to-launch-the-us-metamask-card)
- [Crypto Life / MetaMask partner page](https://www.withcl.com/products/metamask)

## 3) KAST

- Model: stablecoin spend card product with tiered verification language.
- KYC posture: **required for full card capability**.
- Signals:
  - KAST help documentation describes Level 2 verification for card creation and sending funds.
  - Requires government ID and liveness, with additional docs possible.

Sources:
- [KAST verification requirements](https://concierge.kast.xyz/hc/en-us/articles/14174809798287-How-Do-I-Complete-Level-1-and-Level-2-Verification)
- [KAST security post on KYC requirement](https://www.kast.xyz/blog/is-your-money-safe-on-kast-heres-what-actually-protects-it)

## 4) 1inch Card programme (with partners)

- Model: branded web3 card with partner issuing stack.
- KYC posture: **required in practice** via partner flow.
- Signals:
  - Official launch highlights regulated Mastercard infrastructure and regional rollout.
  - Partner stack docs (Crypto Life/Baanx style flows) indicate KYC for issuance.

Sources:
- [1inch launch announcement](https://blog.1inch.com/1inch-launches-a-web3-debit-card-in-partnership-with-mastercard-and-crypto-life/)
- [Baanx card operations guide](https://docs.baanx.com/guides/card/overview)
- [Baanx verification endpoints](https://docs.baanx.com/api-reference/user/verification)

## 5) Rain (issuer infrastructure, B2B)

- Model: card issuing platform for enterprises (not just one consumer wallet app).
- KYC posture: **built-in KYC/KYB/AML workflows are programme requirements**.
- Signals:
  - Product pages repeatedly state integrated compliance, monitoring, and identity controls.
  - Card programmes are tied to licensed institutions and scheme requirements.

Sources:
- [Rain card issuing product](https://www.rain.xyz/product/card-issuing)
- [Rain global launch/compliance page](https://www.rain.xyz/resources/how-to-launch-global-card-programs-without-starting-over-in-every-market)
- [Rain virtual accounts compliance section](https://www.rain.xyz/product/virtual-accounts)

---

## Non-KYC reality: what appears true

### Practical conclusion

- **No reliable mainstream web3 card path on Visa/Mastercard is truly non-KYC.**
- "No-KYC" claims are usually:
  - affiliate/review-site marketing language,
  - low-limit onboarding tiers,
  - or short-lived loophole products with high operational/regulatory fragility.

### Why this keeps happening

- Card rails are regulated payment infrastructure.
- Issuers and programme managers need user identity controls and ongoing AML monitoring.
- Even where onboarding starts light, high-value or sustained usage usually triggers fuller verification requirements.

---

## Wallet availability: Apple/Google role in this model

- Apple Wallet / Google Wallet passes are best understood as **launchers and presentation surfaces** unless you are running a full payment credential programme.
- They can deep link users into app flows and display pass metadata.
- They do not remove card programme compliance obligations.

Sources:
- [Google Wallet app link docs](https://developers.google.com/wallet/generic/use-cases/link-from-generic-passes)
- [Apple Pay merchant integration guide](https://developer.apple.com/apple-pay/Apple-Pay-Merchant-Integration-Guide.pdf)

---

## Could "pre-loaded ChopDot Spend Cards" work?

Yes, but there are three fundamentally different interpretations. They should not be conflated.

## Model A — "Pre-loaded" as session preload only (recommended for near-term)

Definition:
- Pre-loaded means "card opens with prefilled group context/amount/participants", not prepaid money.

How it works:
- Keep current non-custodial stance.
- Spend Card launches `SpendSession` with chapter defaults.
- Payment still occurs via external rails (Twint/bank/partner).
- Chapter engine remains SSOT for obligations and confirmations.

Pros:
- Fastest to ship.
- No custody shift.
- Keeps existing product doctrine intact.

Cons:
- No true stored-value convenience.
- L1/L2 proof still depends on handoff/webhook path quality.

## Model B — "Pre-loaded" as custodial prepaid card balance

Definition:
- Users pre-fund a spending balance that ChopDot/partner debits via card transactions.

How it works:
- Requires issuer/programme partner, balance ledger, top-up/withdrawal logic, card lifecycle controls, fraud/disputes operations.

Pros:
- Stronger checkout UX and "it just works" perception.
- Higher chance of automatic settlement matching.

Cons:
- Major compliance and operations lift.
- Moves product identity towards fintech card programme management.
- Significantly higher legal/regulatory dependency risk.

## Model C — "Pre-loaded" with delegated self-custody spending limits

Definition:
- Users authorise bounded spending permissions from self-custody wallets to a card spend module.

How it works:
- Advanced smart account / delegated spending design.
- Still likely requires KYC on the card programme side if it touches mainstream card rails.

Pros:
- Better "web3-native" story than full custody.

Cons:
- Considerably more technical complexity and still does not bypass card-rail compliance.

---

## ChopDot fit assessment

Using the concrete spine (`Catch -> Management -> Payout -> History`) and "friction down + trust up + optionality":

- **Model A (session preload)** improves all four pillars immediately with low structural risk.
- **Model B/C** may improve friction at point of sale, but materially increase non-product overhead and strategic lock-in risk early.

Falsifier to watch:
- If P1/P2 cannot hit target adoption/confirmation metrics without stored-value behaviour, then investigate B/C as explicit strategic expansion, not hidden scope creep.

---

## Recommended phased path

1. **Now:** Keep Spend Cards as session preloads + deep links + chapter-engine SSOT.
2. **Next:** Add one partner webhook path for L2 claim automation and measure lift.
3. **Only if needed:** open a separate programme decision memo for prepaid/custodial card strategy (Model B/C), including legal/compliance workstream sign-off.

---

**B2B issuer deep dive:** see [b2b-card-issuer-stacks-investigation.md](./b2b-card-issuer-stacks-investigation.md).

## Open questions for next investigation pass

1. Which single issuer/programme partner best fits Switzerland + EU launch constraints? (see B2B investigation shortlist)
2. Can ChopDot get acceptable economics without interchange-driven business assumptions?
3. What is the minimum compliance surface if ChopDot remains strictly non-custodial but uses issuer partners?
4. At what metric threshold does "session preload only" fail to justify not moving to stored value?

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Initial investigation: provider map, KYC reality, and pre-loaded Spend Card models |

