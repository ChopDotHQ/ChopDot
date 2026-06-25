# Capture Layer — Comprehensive Build Plan (ChopDot.dot)

Status: `plan-ready`
**Created:** 2026-06-16
**Owner lane:** Track 1 (product/application stack)
**Consolidates:** every artefact in [`cursor-brainstorm-jun-16-2026/`](./README.md) into one execution-ready plan
**Ground truth basis:** verified against `src/chapter/*` on 2026-06-16 (not docs-only)

> One-line scope: ship **Spend Cards + pay/confirm/spend links + QR + Twint handoff** on top of the already-shipped `chapterEngine` kernel, with `ChapterDocument` as the single source of truth, no custody, Model A only.

---

## 0. Spine anchoring (mandatory guardrail)

Per `PROJECT_DIRECTIVES.md`, each surface states the pillar it improves and the evidence that would falsify it.

| Surface | Pillar improved | Falsifier |
| --- | --- | --- |
| Spend Card launcher + `/spend` | **Catch** — capture at pay moment, ≤1 step | Median time-to-split > 30s; users prefer "pay then Splitwise" |
| `chapterEngine` legs + `buildPotStatus` | **Management** — who-acts-next clarity | Users can't tell next actor without chasing |
| `/pay` handoff + `/confirm` links | **Payout** — bound handoff + confirm gate | >50% drop at Twint handoff; <50% confirm in 24h |
| `chapterToPot` projection + closeout | **History** — readable, portable record | Closed chapters not trusted/readable |

Optionality preserved: kernel is non-custodial; payment rails are adapters; Polkadot proof anchor stays an optional Track 2 edge.

---

## 1. Locked decisions (carry forward — do not re-litigate)

| Decision | Choice |
| --- | --- |
| Capture kernel | **Option B** — `chapterEngine.ts` + `ChapterDocument` as SSOT |
| Spend Card definition | Saved launcher config + entry route into `addExpense` → `refreshLegs`; **not** a bank card in P1 |
| Launch scope | **P1 core + P2 lite** together (in-app + links + QR + Twint handoff + wallet pass launcher + one webhook adapter) |
| Pre-load model | **Model A** (session preload, non-custodial) now; B/C gated on telemetry |
| Real Visa/MC card | **P3** — partner issuer, KYC on programme side |
| Twint | L1 copy/SMS handoff only — no public Twint API |
| Payment linkage | Ship **L1** on happy path; **L2** webhook as fast follow; never ship L0 as primary UX |

---

## 2. Ground truth — verified in code (2026-06-16)

### 2.1 Shipped and reusable (do not rebuild)

| Capability | Evidence |
| --- | --- |
| `addExpense`, `refreshLegs`, `markLegPaid`, `confirmLeg`, `buildPotStatus`, `chapterToPot`, `closeChapter` | `src/chapter/chapterEngine.ts` (all exported; `addExpense` accepts `source` + `sourceRef`) |
| Full pay→claim→confirm loop in production-grade code | `src/bot/telegramBot.ts` (`/paid`, `/confirm`) |
| Deep-link token pattern (mint→read→navigate) | `src/hooks/useInviteFlow.ts` (`/join?token=`) |
| Twint L1 handoff ceiling (copy + SMS, no API) | `src/components/settlement/TWINTForm.tsx` |
| QR rendering | `src/components/screens/ReceiveQR.tsx` (`qrcode` pkg) |
| File-based chapter persistence (bot only) | `src/bot/store/fileChapterStore.ts` |

### 2.2 Missing — the actual P1/P2 work (verified absent)

| Gap | Verified state |
| --- | --- |
| `ChapterDocument` schema | Still `0.1.0`; `telegramChatId` **required**; no `potId`, no `userId` on member, no `spendCards[]` |
| `CatchSource` | Only `'chat_nl' \| 'receipt_vision' \| 'manual'` — no `spend_card \| pay_link \| qr` |
| App-side chapter persistence | `metadata.chapter` **not** wired into the app; only bot writes chapters |
| `src/services/capture/` | Directory does not exist |
| Capture routes | `useUrlSync.ts` has **no** `/spend \| /pay \| /confirm` handling |
| `capture_link_tokens`, `spend_sessions` tables | Not created |
| Wallet pass | Not built (P2) |

**Net:** the loop logic is proven; P1 is mostly **wiring** — schema deltas, an app-side store, a kernel bridge, three screens, link routing, and two Supabase tables.

---

## 3. Target architecture (concise)

```text
Surfaces:   In-app Spend Card · Wallet Pass launcher (P2) · /spend /pay /confirm links · QR
                              │
Capture:    SpendSession (draft) · capture_link_tokens · QRPayloadCodec
                              │  KernelBridge.commitSpendSession
Kernel:     chapterEngine → ChapterDocument { expenses[], legs[]: open→claimed→confirmed }   (SSOT)
                              │
Rails:      SettlementAdapter: twint · bank · outside · (firma webhook = L2)
                              │
Proof edge: optional Polkadot closeout anchor (Track 2 — not required for P1)
```

Projection: legacy expense/settle tabs read `chapterToPot(chapter)` until migrated to `buildPotStatus(chapter)`.

---

## 4. Schema migration `0.1.0 → 0.2.0`

Concrete deltas to `src/chapter/types.ts` (and a migration shim):

```typescript
export const CHOPDOT_CHAPTER_SCHEMA = '0.2.0' as const;

export type CatchSource =
  | 'chat_nl' | 'receipt_vision' | 'manual'
  | 'spend_card' | 'pay_link' | 'qr';        // NEW

export type ChapterMember = {
  id: string;
  name: string;
  telegramUserId?: string;
  userId?: string;                            // NEW — Supabase auth uid when linked
};

export type SpendCardConfig = {               // NEW
  id: string;
  label: string;
  recentParticipantIds: string[];
  settlementPreference: 'twint' | 'bank' | 'outside' | 'dot';
  defaultSplitRule: 'equal';
};

export type ChapterDocument = {
  schemaVersion: typeof CHOPDOT_CHAPTER_SCHEMA;
  id: string;
  name: string;
  currency: BaseCurrency;
  chapterState: ChapterState;
  potId?: string;                             // NEW — link to Supabase pot row
  telegramChatId?: string;                    // RELAX — optional for app-only chapters
  members: ChapterMember[];
  expenses: ChapterExpense[];
  legs: SettlementLeg[];
  spendCards?: SpendCardConfig[];             // NEW — launcher configs
  createdAt: string;
  closedAt?: string;
};
```

Migration rule: a `0.1.0` doc upgrades by defaulting `telegramChatId ?? ''` and `spendCards ?? []`; treat absent `telegramChatId` as app-only. Add a `migrateChapter(doc)` pure function + unit test so the bot and app share one upgrade path. Keep `chapterEngine` core loop unchanged.

---

## 5. Build phases

### Phase 1a — Vertical slice (chapter kernel in the app)

Goal: one dinner, 4 friends, CH Twint, end-to-end, with `ChapterDocument` as SSOT.

| # | Task | New/changed files | Done when |
| --- | --- | --- | --- |
| 1 | Schema `0.2.0` + `migrateChapter` | `src/chapter/types.ts`, `src/chapter/migrateChapter.ts` (+test) | Types compile; migration test green |
| 2 | App-side chapter store | `src/services/capture/ChapterStore.ts` | Load/save `metadata.chapter` (Supabase) + localStorage (guest) |
| 3 | React state hook over engine | `src/hooks/useChapterState.ts` | Mutations route through engine + persist |
| 4 | Kernel bridge | `src/services/capture/KernelBridge.ts` | `commitSpendSession` → `addExpense`+`refreshLegs`; returns expenseId + open legs |
| 5 | Spend session draft state | `src/services/capture/SpendSessionService.ts`, `src/hooks/useSpendSession.ts` | Draft → commit → expire (client-only OK in v1) |
| 6 | Capture link tokens (DB + RPC) | Supabase migration `capture_link_tokens`; `src/services/capture/CaptureLinkService.ts` | Mint/verify/consume mirrors invites |
| 7 | Spend Card + handoff screens | `src/components/screens/SpendCardScreen.tsx`, `CaptureHandoffScreen.tsx` | One screen → **Pay now** → Twint handoff with `legId` in reference |
| 8 | Legacy projection sync | `src/services/capture/chapterSync.ts` | `chapterToPot` runs after each mutation; expense/settle tabs stay correct |
| 9 | E2E proof | `tests/e2e/capture-spend-loop.spec.ts` | spend → legs → handoff → `markLegPaid` → `confirmLeg` → close |

Out of scope for 1a: wallet pass, normalised `chapters` table, dotChapter bridge.

**Acceptance (1a):** From an empty pot, a payer commits a €120/4 split in ≤1 step past the pay decision; legs render via `buildPotStatus`; a peer confirms; `npx tsc --noEmit`, `npm run build`, `npx playwright test` all green.

### Phase 1b — Links, QR, Telegram convergence

| # | Task | Files | Done when |
| --- | --- | --- | --- |
| 1 | Capture route parsing | `src/hooks/useUrlSync.ts` (+ `src/nav.ts`) | `/spend?t=`, `/pay?t=`, `/confirm?t=` resolve to screens |
| 2 | Link flow hook + screens | `src/hooks/useCaptureLinkFlow.ts`, `CaptureConfirmScreen.tsx` | `/pay`→handoff, `/confirm`→`confirmLeg`, expired/consumed/wrong-user states |
| 3 | Share + QR | reuse `src/utils/delivery.ts`, `ReceiveQR.tsx`; add `QRPayloadCodec.ts` | WhatsApp/SMS/Telegram share + dynamic single-use QR |
| 4 | Spend Card config persistence | `chapter.spendCards[]` writes; recent participants update on commit | Launcher reuse works |
| 5 | Telegram ↔ app convergence | `src/bot/store/fileChapterStore.ts` delegates to `ChapterStore` when `potId` linked | Same chapter readable from bot + app |

**Acceptance (1b):** A link-only friend (no app) opens `/pay?t=`, completes Twint handoff, and the creditor confirms via `/confirm?t=`; tokens are single-use + TTL-enforced.

### Phase 2 lite — Wallet pass launcher + one webhook (L2)

| Task | Notes |
| --- | --- |
| Wallet pass → `/spend?t=` | PassKit/Google Wallet stores label + URL only; same `commitSpendSession` backend; no PAN/balance |
| One settlement webhook adapter | `SettlementAdapterRegistry` + one partner adapter → auto `markLegPaid` on matched event (L2) |
| App Clip shell (optional) | Defer if it competes with 1a/1b quality |

### Phase 3 — Partner issuer (sales/diligence only)

No app code commitment. Gate on Model A/B/C triggers (§8). See `b2b-card-issuer-stacks-investigation.md` and `web3-payment-cards-non-kyc-investigation.md`.

---

## 6. Routing & deep links

| Route | Handler | Auth |
| --- | --- | --- |
| `/spend?t=` | `SpendCardScreen` prefilled | Member of pot |
| `/pay?t=` | `CaptureHandoffScreen` (leg prefilled) | Optional view; identity to act |
| `/confirm?t=` | one-tap `confirmLeg` | Must match `toMemberId` |
| `/commit?t=` | trip deposit (phase 1.5) | Member |

Note: `useUrlSync` today parses query params, not pathname for these. P1b must add pathname dispatch (SPA fallback already serves `index.html`).

---

## 7. Security (P1 checklist)

- HMAC-SHA256 (or JWT `aud=chopdot-capture`) over `payload + exp`; include `type`, `chapterId`.
- TTL: `spend`/`pay`/`confirm` 15–60 min; single-use consumed on first success.
- Confirm token bound to `receiverId`; spend token to chapter members.
- No PII (phones/IBANs/names) in URL or QR payload — opaque token id only.
- Rate-limit mint per user/chapter/IP; idempotency key on session commit.
- Revoke all chapter tokens on closeout; audit log mint/scan/consume/expire.
- Honour `safety-boundaries.md`: no custody, no auto-release, `claimed ≠ confirmed`.

---

## 8. Telemetry → Model A/B/C decision gates

Instrument from day one (feeds the decision memo):

| Metric | Definition | Healthy |
| --- | --- | --- |
| `capture_latency` | tap card → legs created | low |
| `capture_freshness` | % expenses within 5 min of payment | ≥80% |
| `handoff_completion` | % sessions starting rail handoff | ≥80% |
| `confirm_rate_24h` | % legs confirmed in 24h | ≥70% |
| `repeat_card_use` | same card 2+×/7d | trending up |

Escalate to Model B/C only if, for 2 consecutive pilot windows: ≥70% sessions launcher-started **and** <45% claimed in 24h (with L2) **and** <65% confirmed in 24h **and** repeated "single tap pay and done" demand **and** a viable partner exists. Otherwise stay on A.

---

## 9. Falsifiers / kill criteria

| Signal | Threshold → action |
| --- | --- |
| Drop at Twint handoff | >50% → rethink handoff, not more features |
| Time-to-split | median >30s → the "+1" isn't winning |
| Confirm chase | <50% in 24h → confirm UX / reminders |
| L0 default | >30% sessions skip handoff → product law violated |

---

## 10. Open decisions needing an operator call

1. **Guest pay links** — can a non-user complete `/pay` handoff without an account? (affects token auth design in 1b)
2. **Confirm authority** — creditor-only (engine today) vs organiser-on-behalf? (engine change if the latter)
3. **Chapter storage** — start as `metadata.chapter` blob, split to normalised `chapters` table at >N KB. Confirm N.
4. **Telegram linking** — auto-create pot on `/create`, or manual link by `potId`?
5. **L2 partner** — Firma-as-webhook vs a card issuer shortlist for the single P2-lite adapter.

---

## 11. Documentation cleanups found during review

- `spend-cards-spec.md` → "Kernel mapping" still points to `commitmentKernel.ts`. Under locked Option B it must target `chapterEngine` (`addExpense`/`markLegPaid`/`confirmLeg`). Update to avoid implementer confusion.
- `capture-layer-architecture.md` "Persistence" lists `spend_cards` as a table; the locked model stores cards in `chapter.spendCards[]`. Reconcile (cards in-doc; only `capture_link_tokens`/`spend_sessions` as tables).

---

## 12. Single next step (when operator says "build")

Start **Phase 1a, task 1+2 together**: ship schema `0.2.0` + `migrateChapter` (with test), then `ChapterStore` to persist `metadata.chapter`. Everything else in 1a depends on a durable, app-readable chapter. Verify with `npx tsc --noEmit` before wiring screens.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Initial consolidated build plan; ground-truth verified vs `src/chapter/*`; doc cleanups flagged |
