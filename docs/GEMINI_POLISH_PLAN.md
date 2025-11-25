# Gemini Polish Implementation Plan

Use this plan to coordinate the “next-level polish” upgrades that came from Gemini’s review. Each section lists the goals, the concrete tasks, and notes we want to revisit during deep-dive sessions. Treat this as a living document—add decisions, owners, and dates when we schedule the work.

---

## Phase 0 – Prep / Shared Context

- ✅ Read `docs/GEMINI_FEEDBACK_CONTEXT.md` + `docs/GEMINI_POLISH_AUDIT.md`
- ✅ Confirm target files for each theme (TopBar, SettlementConfirmation, PotsHome, AddExpense, SettleHome, App.tsx, etc.)
- 🔲 Decide whether we tackle these in one polish sprint or fold into regular releases

---

## Phase 1 – Quick Wins (1–2 days)

| Task | Why | Notes / Decisions Needed |
|------|-----|--------------------------|
| TopBar glassmorphism (`src/components/TopBar.tsx`) | Align nav chrome with BottomTabBar; instant visual uplift | Choose blur strength (`backdrop-blur-sm` vs `md`) |
| Settlement confetti + number easing (`src/components/screens/SettlementConfirmation.tsx`) | Make settlements feel celebratory | Tooling: `canvas-confetti` or `lottie-react`? |
| Wire skeleton loaders in PotsHome (and other screens that read `usePotSync`) | Prevent blank flashes while data hydrates | Need `isLoading` prop or hook state |
| Activate trust score sheet (`src/components/TrustIndicator.tsx`, `MemberDetail`) | Explain the “why” behind the score; gamify trust | Reuse `BottomSheet` from MemberDetail |
| Composer backlog review | Ensure no other quick wins hiding in audit | Schedule during sprint planning |

---

## Phase 2 – UX Refinements (additive polish)

| Task | Why | Discussion Points |
|------|-----|-------------------|
| Ghost/Demo Pot empty state (`PotsHome`, `EmptyState`) | Teach first-time users how pots look/behave | Decide on sample data + whether it’s interactive |
| “Quick Paste” NLP field in AddExpense | Let users paste natural language (e.g., “Dinner 45 paid by Alice”) | Start with regex heuristics; consider a tiny LLM later |
| Gradient/dot backgrounds (Auth screen, You tab header) | Bring Polkadot aesthetic into hero screens | Need design exploration & dark-mode variants |
| Trust identity enrichment (Polkadot on-chain identity lookup) | Show verified names/badges → more confidence | Requires `@polkadot/api` query + caching strategy |

---

## Phase 3 – Web3 Abstraction Improvements

| Task | Why | Open Questions |
|------|-----|----------------|
| Global fiat/DOT toggle (new `CurrencyContext`) | Consistent “View as Fiat” experience across tabs | Where to persist preference (localStorage vs Supabase profile)? |
| Apply fiat toggle to PotsHome, People, WalletBanner, Settle flows | UX coherence; highlights CoinGecko data we already fetch | Need formatting utilities for dual display (`$15.40 (2.1 DOT)`) |
| Proactive “Get Gas” CTA in SettleHome | Guide users who lack DOT balance instead of showing errors | When zero DOT, primary button becomes “Get Gas” → open Hyperbridge sheet |
| Haptic pattern review (success vs neutral) | Ensure haptics reinforce new micro-interactions | Maybe map confetti to `success` double tap pattern |

---

## Phase 4 – Architectural Enhancements

| Task | Why | Considerations |
|------|-----|----------------|
| Migrate toast system to `sonner` (`App.tsx`, `components/ui/sonner.tsx`) | Gain consistent animations, stacking control (`visibleToasts={1}`) | Need to refactor `showToast` helper + replace `<Toast>` component |
| Currency-aware amount input (`react-currency-input-field` or similar in AddExpense) | Prevent invalid decimals; align with DOT precision automatically | Evaluate bundle impact; ensure accessibility |
| Extract `ScreenRouter` from `App.tsx` | Make navigation logic testable and less brittle | Define interface for passing props/state down |
| Evaluate skeleton tooling for other screens | After PotsHome, apply to People/Activity screens if needed | Consider generic `<AppShellSkeleton>` |

---

## Phase 5 – “Killer Feature” Exploration

| Task | Why | Research Topics |
|------|-----|-----------------|
| Receipt OCR pipeline (Tesseract.js or API) | Auto-fill amount/date to leapfrog Splitwise-style apps | Benchmark on-device processing time vs API cost |
| Hook OCR results into AddExpense `prefilledData` | Reduce manual entry; show “confidence” badges | Need UX for editing extracted fields |
| Potential upsell: auto-category suggestions | If OCR is reliable, suggest categories/splits automatically | Scope creep—only if time permits |

---

## Coordination & Next Steps

1. **Prioritize**: During sprint planning pick 2–3 “Quick Wins” and at most one deeper item per iteration.
2. **Design sync**: Review gradient/ghost pot mocks with design before coding.
3. **Tech spikes**: Schedule short spikes for CurrencyContext + OCR feasibility.
4. **Tracking**: Convert each task into a ticket once we assign owners/dates.

_Update this plan after each milestone (e.g., after Quick Wins, revisit Phase 2 priorities)._ 

