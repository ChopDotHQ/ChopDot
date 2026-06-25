# Cursor Brainstorm — 16 June 2026 (START HERE)

Status: `handoff_active`  
**Session:** Cursor brainstorm, 16 June 2026  
**Topic:** Capture Layer — Spend Cards, pay links, QR, card issuer research, implementation plan  
**Repo:** `/Users/devinsonpena/ChopDot`  
**Folder:** `docs/chopdot-dot/cursor-brainstorm-jun-16-2026/` — **all work from this session lives here**  
**Strategy context (parent):** [product-evolution-history.md](../product-evolution-history.md)  
**Polkadot audit (separate track):** [polkadot-native-cursor-handoff.md](../polkadot-native-cursor-handoff.md)  
**Cursor transcript:** `.cursor/projects/Users-devinsonpena-ChopDot/agent-transcripts/25a7b267-92a3-4cbf-86ee-e90157b97e87.jsonl`

---

## For Codex / any new agent

**Read this file first.** It is the single resume point for Spend Cards, pay links, QR, capture methods, card issuer research, and implementation planning.

Treat linked artefacts in this folder as source of truth over chat memory. **Do not redo** the investigations unless repo state has materially changed or the operator asks for a refresh.

### Hydration prompt (paste into Codex)

```text
Resume ChopDot Cursor brainstorm (16 Jun 2026) from:
docs/chopdot-dot/cursor-brainstorm-jun-16-2026/README.md

Read that file fully, then capture-layer-implementation-investigation.md
(especially Option B + Spend Cards technical mechanics).

Summarise: locked decisions, what is built vs not, P1+P2 lite scope,
and the single best next implementation step. Docs/strategy only unless I ask for code.
```

---

## What we did (2026-06-16 session)

| Workstream | Deliverable |
| --- | --- |
| **Product law** | Pay moment + ≤1 step; L1 hero = bound handoff (Twint/bank), not intent-only |
| **Architecture** | [capture-layer-architecture.md](./capture-layer-architecture.md) |
| **Repo ground truth** | [capture-layer-implementation-investigation.md](./capture-layer-implementation-investigation.md) |
| **Spend Cards spec** | [spend-cards-spec.md](./spend-cards-spec.md) |
| **Pay links + QR** | [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md) |
| **Method matrix** | [capture-methods-investigation.md](./capture-methods-investigation.md) (18+ options) |
| **Web3 / non-KYC cards** | [web3-payment-cards-non-kyc-investigation.md](./web3-payment-cards-non-kyc-investigation.md) |
| **Pre-load decision** | [spend-card-model-decision-memo.md](./spend-card-model-decision-memo.md) — Model A now |
| **B2B issuer stacks** | [b2b-card-issuer-stacks-investigation.md](./b2b-card-issuer-stacks-investigation.md) |
| **Consolidated build plan** | [capture-layer-build-plan.md](./capture-layer-build-plan.md) — execution-ready, ground-truth verified |

---

## Locked decisions (do not re-litigate without operator)

| Decision | Choice |
| --- | --- |
| **Capture kernel** | **Option B** — [`chapterEngine.ts`](../../../src/chapter/chapterEngine.ts) + `ChapterDocument` as SSOT |
| **Not capture kernel** | `commitmentKernel.ts` / `dotChapter` — separate lab/dot track |
| **Spend Card definition** | Launcher into `addExpense` + `refreshLegs`; not a bank card in P1 |
| **Launch scope** | **P1 core + P2 lite** together (in-app + links + QR + Twint handoff + wallet pass + one webhook adapter) |
| **Pre-loaded card (near term)** | **Model A** — session preload only; not stored-value card |
| **Real Visa/MC card** | **P3** — partner issuer; user KYC on programme side |
| **Twint** | L1 copy/SMS handoff only — no public Twint API |

---

## Canonical read order

| # | File | When to read |
| --- | --- | --- |
| 1 | **This README** | Orientation |
| 2 | [capture-layer-implementation-investigation.md](./capture-layer-implementation-investigation.md) | **Ground truth** — what exists in repo, schema, phased plan |
| 3 | [capture-layer-architecture.md](./capture-layer-architecture.md) | Target architecture, entities, KernelBridge |
| 4 | [spend-cards-spec.md](./spend-cards-spec.md) | Product spec v0–v2 |
| 5 | [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md) | Link types, payloads, routes |
| 6 | [capture-methods-investigation.md](./capture-methods-investigation.md) | Method scoring matrix |
| 7 | [spend-card-model-decision-memo.md](./spend-card-model-decision-memo.md) | A/B/C preload models |
| 8 | [web3-payment-cards-non-kyc-investigation.md](./web3-payment-cards-non-kyc-investigation.md) | Consumer card reality |
| 9 | [b2b-card-issuer-stacks-investigation.md](./b2b-card-issuer-stacks-investigation.md) | B2B issuer diligence (P3) |
| — | [../product-evolution-history.md](../product-evolution-history.md) | Strategy / wedge / competitive context |

**Deep dive anchor:** [Spend Cards — technical mechanics](./capture-layer-implementation-investigation.md#spend-cards--technical-mechanics)

---

## Packet file index

| File | Purpose |
| --- | --- |
| [capture-layer-architecture.md](./capture-layer-architecture.md) | Master tech architecture |
| [capture-layer-implementation-investigation.md](./capture-layer-implementation-investigation.md) | Repo audit + build plan |
| [spend-cards-spec.md](./spend-cards-spec.md) | Spend Card product spec |
| [group-pay-links-qr-spec.md](./group-pay-links-qr-spec.md) | Pay links & QR |
| [capture-methods-investigation.md](./capture-methods-investigation.md) | Capture method matrix |
| [web3-payment-cards-non-kyc-investigation.md](./web3-payment-cards-non-kyc-investigation.md) | Web3 card landscape |
| [spend-card-model-decision-memo.md](./spend-card-model-decision-memo.md) | Model A/B/C decision |
| [b2b-card-issuer-stacks-investigation.md](./b2b-card-issuer-stacks-investigation.md) | B2B issuer comparison |
| [capture-layer-build-plan.md](./capture-layer-build-plan.md) | Consolidated, execution-ready build plan (P1a → P3) |

---

## Code entry points (already shipped)

| Path | Role |
| --- | --- |
| [`src/chapter/chapterEngine.ts`](../../../src/chapter/chapterEngine.ts) | `addExpense`, `refreshLegs`, `markLegPaid`, `confirmLeg` |
| [`src/chapter/types.ts`](../../../src/chapter/types.ts) | `ChapterDocument`, legs, expenses |
| [`src/bot/telegramBot.ts`](../../../src/bot/telegramBot.ts) | Proven capture loop in Telegram |
| [`src/hooks/useInviteFlow.ts`](../../../src/hooks/useInviteFlow.ts) | Deep link pattern (`/join?token=`) |
| [`src/components/settlement/TWINTForm.tsx`](../../../src/components/settlement/TWINTForm.tsx) | L1 Twint handoff ceiling |
| [`src/lab/group-money-loop/`](../../../src/lab/group-money-loop/) | Lab scenarios for payout/catch |

---

## Not built yet (honest gap list)

Do not assume these exist in code:

| Item | Notes |
| --- | --- |
| `SpendCard`, `SpendSession`, `CaptureLinkToken` types | Spec only |
| `/spend`, `/pay`, `/confirm` routes | Only `/join?token=` wired today |
| `capture_link_tokens` table | Mirror `invites` pattern |
| `KernelBridge`, `ChapterStore`, `SpendCardScreen` | Planned in implementation doc |
| `src/services/capture/` | Not created |
| Real card programme | P3 — partner sales track only |

---

## Phased implementation (when operator asks for code)

From [implementation investigation § phased plan](./capture-layer-implementation-investigation.md):

| Phase | Focus |
| --- | --- |
| **1a** | `ChapterDocument` 0.2.0, `ChapterStore`, `capture_link_tokens`, `SpendCardScreen`, `useCaptureLinkFlow`, `KernelBridge` |
| **1b** | Pay/confirm links, Twint handoff with `legId` in reference |
| **P2 lite** | Wallet pass launcher, one webhook adapter → `markLegPaid` |
| **P3** | Issuer partner — see B2B investigation |

---

## Open decisions (still unresolved)

| # | Question |
| --- | --- |
| 1 | Guest pay links without account? |
| 2 | Telegram chat ↔ app pot linking? |
| 3 | Confirm authority — creditor-only vs organiser? |
| 4 | CH/EU issuer or L2 webhook partner shortlist? |
| 5 | Firma as L2 webhook vs full card issuer? |

---

## Related tracks (outside this folder)

| Track | Entry |
| --- | --- |
| Product strategy history | [product-evolution-history.md](../product-evolution-history.md) |
| Polkadot native audit | [polkadot-native-cursor-handoff.md](../polkadot-native-cursor-handoff.md) |
| ChopDot.dot mode specs | [../mode-map.md](../mode-map.md), [../savings-circle-spec.md](../savings-circle-spec.md) |
| Parent packet index | [../README.md](../README.md) |

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Full Capture Layer packet: architecture, specs, investigations, decisions |
| 2026-06-16 | Renamed folder to `cursor-brainstorm-jun-16-2026/` for session discoverability |
