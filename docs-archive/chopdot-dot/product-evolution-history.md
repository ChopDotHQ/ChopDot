# ChopDot Product Evolution History

Status: `active`  
**Last updated:** 2026-06-16 (pay-moment law revision)  
**Purpose:** Durable record of how product thinking evolved — especially what was once treated as impossible vs what is evidenced today.  
**Primary session source:** Cursor chat, 2026-06-16 (strategy + audit thread)  
**Cursor transcript:** `.cursor/projects/Users-devinsonpena-ChopDot/agent-transcripts/25a7b267-92a3-4cbf-86ee-e90157b97e87.jsonl`  
**Technical audit handoff:** [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md)

> **Note on the “ChatGPT said it wasn’t possible” conversation (~3 months ago, ~March 2026):**  
> The exact prior ChatGPT transcript is not in this repo. This document reconstructs **what was likely meant** from typical constraints at that time, then contrasts with **repo and ecosystem evidence as of June 2026**. If you still have that chat, paste or link it here and we can quote it verbatim in a follow-up edit.

---

## TL;DR — what changed

| ~March 2026 (likely “not possible” framing) | June 2026 (evidenced today) |
| --- | --- |
| “Polkadot can’t do normal SaaS group-money UX” | `ChopDot.dot` chapter kernel + status-first UX spec exists; lab e2e passes for three modes |
| “You need custody / escrow to coordinate group money” | Explicit non-custody model: `claim != confirmation != closed` ([safety-boundaries.md](./safety-boundaries.md)) |
| “Wallet onboarding kills the product” | Host-aware spike path (`?chopdot-dot-native=1`) + demo fallback; Product Account adapters mapped (host unproven) |
| “No path to signed multi-device convergence” | Lab Statement Store transport converges in isolated e2e; host Statement Store still open |
| “Closeout onchain means everything onchain” | Hybrid shipped: offchain coordination + EVM closeout snapshot on Polkadot Hub testnet ([README.md](../../README.md)) |
| “Can’t compare Parity stack honestly” | 99% migration-critical audit packet completed (46 in-scope repos, evidence ledger, scorecard) |
| “Unclear wedge vs Splitwise” | User research + competitive review → **chapter OS** + **Spend Cards** (pay moment + 1 step) wedge |

**Bottom line:** It was not that the vision became technically trivial. The vision was **decomposed** into provable layers (kernel, adapters, lab gates, wedge experiments) so “impossible” became “partially possible, honestly scoped.”

---

## Timeline

### Phase 0 — Early ChopDot (pre–ChopDot.dot)

- Group expense app with Polkadot closeout experiments.
- Live testnet path: guided settle, onchain snapshot + proof (EVM on Polkadot Hub).
- Hybrid wallet model (Polkadot asset wallet + EVM contract writes).
- Product honestly described as **work in progress**, not finished global payments.

**Artifact:** [README.md](../../README.md)

---

### Phase 1 — ChopDot.dot packet (June 2026)

- Five chapter modes on one kernel: event deposit, shared expense, savings circle, emergency pot, community fund.
- Shared loop: **Catch → Show → Move → End**.
- Hard invariant: payment claimed ≠ receiver confirmed ≠ approval ≠ release ≠ closed.
- UX brief: real-world job first, no chain jargon, one primary action per screen.

**Artifacts:** [README.md](./README.md) (packet), [mode-map.md](./mode-map.md), [ux-brief.md](./ux-brief.md), [safety-boundaries.md](./safety-boundaries.md)

---

### Phase 2 — Native spike + multi-device lab (June 2026)

- Native savings-circle path without Supabase in spike surface.
- Signed session replay, membership grants, lab Statement Store middleware.
- Multi-device convergence proven in lab (with parallel e2e flake noted, not product-fixed — audit-only scope).

**Artifacts:** [polkadot-native-runtime-proof-report.md](./polkadot-native-runtime-proof-report.md), [multi-device-agent-observations.md](./multi-device-agent-observations.md), `src/chopdot-dot/polkadotSession.ts`

---

### Phase 3 — 99% Polkadot-native due diligence (2026-06-16, Cursor)

- **Exercise type:** audit/comparison only — not implementation sprint.
- 698 Parity org repos inventoried; **46 frozen in-scope** for migration-critical diligence.
- Evidence ledger, external deps forensics, risk register, adversarial signoff.
- **Overall 99% ready: NO** — at the 2026-06-16 checkpoint this was recorded as two lab-passing host-runtime gates out of the then-six-gate model; current active runtime proof report supersedes this with 1/7, because only UXGate is lab-passing and host gates remain unproven.

**Artifact:** [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md)

---

### Phase 4 — Strategy reframing (2026-06-16, same Cursor session)

#### User research (informal, founder conversations)

| Persona | Job | Implication for ChopDot |
| --- | --- | --- |
| Mum | Track all spending across life | **Weak hero wedge** — personal finance / aggregation lane; not core today |
| Friends | Split at point of transaction, not after upload | **Strong wedge** — split-at-pay moment; aligns with Spend Cards idea |
| Trip planner friend | Gather money / commitments fast upfront | **Strong wedge** — `event_deposit` + commitment board; link-first distribution |

**Decision:** Do not optimise for “another Splitwise.” Optimise for **fastest chapter organisation** across use cases, with **split-at-pay** as traction hook.

#### Competitive scan (June 2026)

| Product | What they optimise | What ChopDot should borrow | What ChopDot should not copy |
| --- | --- | --- | --- |
| [Firma](https://www.firma.cash/) | Instant zero-fee movement, multi-currency, pay-with-note | Channel-native send, human notes on money events, life-context “wallets” as UX metaphor | Becoming a regulated money mover / stablecoin bank |
| KAST (payment links) | Create link → share in iMessage/WhatsApp → claim | Link-first distribution, “claim” mechanics translated to commit/confirm | Custodial payment link as core product |
| Neo-bank builder stack (Bridge + Privy + Base + Gnosis Pay + DeFi) | One-click crypto money app | Friction removal, sponsored actions, email/chat deep links | Issuing cards, DeFi yield, full neo-bank scope |

#### YC / a16z read (read-only, repo-grounded)

- **Pre-PMF prototype** with strong technical depth; weak evidenced distribution/revenue loop in repo.
- Competitive if scoped as **chapter OS + split-at-pay**, not general expense tracker.
- “Coordination clarity” alone is **not** a moat — must own wedge, distribution, and system-of-record lock-in.

#### Positioning evolution

1. ~~“Group expense app with Polkadot settlement”~~ (too broad, commodity capture leg)
2. “Trusted closeout layer for groups that pay outside the app” (accurate but challenged as non-moat)
3. **Current:** “Fastest way to organise money commitments and closeouts across group use cases”
4. **Emerging traction hypothesis:** **Spend Cards** — chapter-scoped pay context at wallet moment; ≤1 step before normal pay; split registered with bound handoff (money still moves outside ChopDot on L1)

---

## What “wasn’t possible” likely meant (~March 2026)

Without the original chat, these are the **most probable blockers** that caused a flat “not possible”:

### A) Category confusion

Building “Splitwise + crypto” reads as **worse UX for the same job** unless the wedge is explicit (closeout, commitments, proof-at-edge).

### B) Custody/regulatory trap

Many assistants conflate group money with **holding balances**. ChopDot’s later model explicitly avoids custody ([safety-boundaries.md](./safety-boundaries.md)) — that was not a given in early chats.

### C) Polkadot SaaS gap

Until Product SDK / host / Statement Store paths were mapped, “Polkadot-native group app” looked like forcing every action onchain or faking decentralisation.

### D) Multi-device signed truth

Converging group state across devices without a central DB **looked** impossible without either Supabase or full chain execution. The repo now has a **kernel + transport adapter** design; lab transport works; host transport does not.

### E) No shipped primitive

Without `commitmentKernel`, mode map, and chapter objects, the idea was architecture vapor. The repo now has test-backed kernel code and specs.

---

## What has actually changed (evidence, not vibes)

### Product / code evidence

| Capability | Status | Evidence |
| --- | --- | --- |
| Mode-aware commitment kernel | Shipped in repo | `src/chopdot-dot/commitmentKernel.ts`, tests |
| Five chapter modes specified | Documented | [mode-map.md](./mode-map.md) |
| Non-custody legal/product posture | Documented | [safety-boundaries.md](./safety-boundaries.md) |
| Native session spike | Lab | `src/chopdot-dot/polkadotSession.ts`, `?chopdot-dot-native=1` |
| Production closeout (hybrid EVM) | Testnet shipped | [README.md](../../README.md), `pvmCloseout.ts` |
| Clickable lab UX | Passes e2e | `chopdot-dot-lab.spec.ts` |
| Telegram bot sketch | Exists | `src/bot/telegramBot.ts` |

### Ecosystem evidence (audit)

| Capability | Status | Evidence |
| --- | --- | --- |
| Product Account signer path | Adapter + lab fallback; host unproven | [product-account-signer-spike-report.md](./product-account-signer-spike-report.md) |
| Statement Store transport | Lab only | [polkadot-native-runtime-proof-report.md](./polkadot-native-runtime-proof-report.md) |
| Bulletin / archive | Unit seam; live round-trip open | evidence ledger PAR-005 |
| Migration-critical repo map | 0.91 weighted audit score | [polkadot-native-99-scorecard.md](./polkadot-native-99-scorecard.md) |

### Strategy evidence (this session)

| Insight | Recorded here |
| --- | --- |
| Three distinct user jobs (track / split-at-pay / commit-fast) | § Phase 4 user research |
| Firma / KAST / neo-bank learnings | § Competitive scan |
| Spend Cards v0 concept | § Spend Cards below |
| “Clarity is not moat” correction | § Positioning evolution |

---

## Spend Cards — emerging wedge (2026-06-16)

**Full specification:** see [Capture Layer packet](./cursor-brainstorm-jun-16-2026/README.md) (`spend-cards-spec.md`, `group-pay-links-qr-spec.md`, `capture-methods-investigation.md` in that folder).

**Primary product law (2026-06-16):** People already pay. ChopDot meets them at **pay moment** with **at most one extra step**. That step must save enough later work to beat Splitwise-after.

**User vision:** With repeated friends, tap a group card (Wallet or in-app), pay as usual — split already registered for everyone.

**Precise product definition (non-custodial):**

> **Spend Card = chapter-scoped pay context at wallet moment**, not a bank card.

**One-line positioning:** Pay like you always do — one tap first so the split is already done.

**Competitive benchmarks (examples):** Twint/Swiss P2P, KAST payment links, Firma instant pay, Splitwise post-hoc — ChopDot owns **group chapter capture at pay moment**, not national P2P rails.

### Payment linkage levels

| Level | Description | Role |
| --- | --- | --- |
| L0 | Intent only → pay anywhere → manual “I paid” | Fallback (square one) |
| L1 | Split + bound handoff (Twint/bank/Firma + session ref) | **P1 hero minimum** |
| L2 | Partner webhook auto-claimed | P1 fast follow |
| L3 | Partner-issued wallet card | P2/P3 |

### Version roadmap

| Version | What it is | Custody? | Automation |
| --- | --- | --- | --- |
| **v0 Pay + 1 (L1)** | Wallet pass or Pay now → bound handoff → obligations + confirm loop | No | Handoff + manual confirm |
| **v1 Partner rail (L2)** | Same + tx events from Firma/Gnosis/etc. | Partner | Semi-auto |
| **v2 Issued card (L3)** | ChopDot/partner issued card | Yes (partner/you) | Full auto — **major pivot** |

**Recommended:** L1 hero now, design API for L2; do not jump to L3 without explicit strategy decision.

### Why this matters competitively

- Owns **moment of transaction** (friends’ #1 pain) — not post-hoc upload.
- **+1 step** must be cheaper than reconciliation later (WhatsApp math, Splitwise entry, chasing confirms).
- Creates **habit loop** (Wallet pass or pay link before swipe).
- Reuses same chapter kernel across trip / household / crew — supports “general, not trip-only” ambition.
- Complements Firma/KAST (they move money; ChopDot records group truth at pay time).

### P1 MVP (documented only — not built)

1. Spend Card on chapter (in-app + Wallet pass where feasible)  
2. One screen: friends + amount + **Pay now**  
3. Bound handoff (Twint/bank) with `legId` in reference  
4. Confirm links for receivers — no separate payer “I paid” on happy path  
5. L0 “log cash split” as explicit fallback only  

**Hero metrics:**

- Steps from pay decision → group updated: ≤ normal pay + 1  
- ≥80% sessions on L1+ path  
- % of group expenses captured within 5 minutes of payment  

---

## What is still not true (honesty guardrails)

Do not claim these yet:

- Fully Polkadot-native production app (current active host gates 1/7; hybrid EVM remains)
- Automatic split from any physical card without partner/open-banking integration
- Proven PMF / retention / revenue (no metrics in repo)
- “Coordination clarity” as defensible moat by itself
- ChatGPT was “wrong” — the scope was underspecified then; the problem was **under-decomposed**

---

## Open decisions (next strategy forks)

| # | Decision | Options |
| --- | --- | --- |
| 1 | Hero wedge for next 90 days | Spend Cards v0 vs trip commit links vs savings circle |
| 2 | Settlement posture | Stay non-custodial + partner handoff vs explore issued card path |
| 3 | ICP | Repeat organisers across modes vs crypto-native groups first |
| 4 | Mum job | Ignore for now vs lightweight personal aggregation view |
| 5 | Technical track | Continue native audit vs ship Spend Cards v0 on current app stack |

---

## How to resume this thread

**Codex / new agent prompt:**

```text
Read docs/chopdot-dot/cursor-brainstorm-jun-16-2026/README.md for Capture Layer (Spend Cards, pay links, QR),
docs/chopdot-dot/product-evolution-history.md for strategy history,
then polkadot-native-cursor-handoff.md for Polkadot audit state.
Summarise: current wedge, P1 capture bundle, and single highest-leverage experiment.
Docs/strategy only unless asked for code.
```

**Read order:**

1. [cursor-brainstorm-jun-16-2026/README.md](./cursor-brainstorm-jun-16-2026/README.md) (Capture Layer handoff — **start here for capture work**)  
2. This file (strategy history)  
3. [cursor-brainstorm-jun-16-2026/capture-layer-architecture.md](./cursor-brainstorm-jun-16-2026/capture-layer-architecture.md) (Capture Layer tech)  
4. [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md) (Polkadot audit)  
5. [polkadot-native-99-scorecard.md](./polkadot-native-99-scorecard.md) (scores)  
6. [ux-brief.md](./ux-brief.md) + [mode-map.md](./mode-map.md) (product primitive)

---

## Changelog

| Date | Session | What was added |
| --- | --- | --- |
| 2026-06-16 | Cursor | Pay-moment + 1-step product law; L0–L3 linkage; Spend Cards section revised |
| 2026-06-16 | Cursor | Capture Layer packet: architecture, 18-method investigation, spend cards + pay links/QR specs |
| 2026-06-16 | Cursor | Initial history doc: audit completion, user research, competitive learnings, YC/a16z snapshot, Spend Cards vision, “what changed since ~March 2026” |
