# Gemini Feedback Context

Use this file when asking Composer (or any reviewer) to validate Gemini's UI/UX critique against the current ChopDot codebase. It captures the original themes plus a quick audit of what already exists versus what still needs work.

---

## 1. Visual Polish / Polkadot Aesthetic

- **Gemini ask**: Apply glassmorphism to BottomTabBar + TopBar, add dot/gradient backgrounds, and richer celebratory animations.
- **What exists today**
  - `src/components/BottomTabBar.tsx` already uses `bg-background/80` + `backdrop-blur-sm`.
  - `src/components/TopBar.tsx` is still a solid block; no blur/gradient applied.
  - `src/components/screens/SettlementConfirmation.tsx` shows a static check icon only.
- **Follow-ups to validate**
  1. Extend the TopBar styling to match the blurred treatment.
  2. Introduce confetti or Lottie animation + number easing on settlement completion.
  3. Explore gradient/dot backgrounds for Auth screen + You tab header.

---

## 2. UX Refinements

- **Gemini ask**: Replace static empty state with a ghost/demo pot, add NLP “quick paste” for expenses, enrich avatar/identity data.
- **What exists today**
  - `src/components/EmptyState.tsx` only renders icon + copy + buttons.
  - `src/components/screens/PotsHome.tsx` simply calls `EmptyState` when no pots.
  - `src/components/screens/AddExpense.tsx` uses a plain `<input type="number">` and manual validation.
  - `src/components/screens/MemberDetail.tsx` shows Lucide avatar + `TrustIndicator` (dots) with tooltip; no on-chain identity resolution yet.
- **Follow-ups to validate**
  1. Design/implement a ghost “Demo Pot” or seeded example for empty dashboards.
  2. Prototype NLP/regex parsing for a “Quick paste” expense field.
  3. Investigate `api.query.identity` integration to display Polkadot identities/badges.

---

## 3. Web3 Abstraction (“Invisible Crypto”)

- **Gemini ask**: Provide a global fiat/DOT toggle and proactive “Get Gas” affordance when DOT balance is zero.
- **What exists today**
  - `src/components/WalletBanner.tsx` already exposes a `Get DOT (Hyperbridge)` button once connected.
  - `src/components/screens/SettleHome.tsx` blocks DOT settlements when balance is insufficient but only shows a toast.
  - `src/components/screens/YouTab.tsx` keeps a local `currency` preference but it doesn’t drive the UI globally.
- **Follow-ups to validate**
  1. Store/read a global “view as fiat” preference and apply it in Pots, People, WalletBanner, Settle flows.
  2. When DOT balance or connection is missing, switch the CTA to “Get Gas” and open the existing `HyperbridgeBridgeSheet`.

---

## 4. Architectural / Code-Level Suggestions

- **Gemini ask**: Add skeleton loaders during pot sync, cap toast stacking, use currency-aware inputs, refactor routing.
- **What exists today**
  - `src/components/screens/PotsHome.tsx` renders content immediately; no skeleton list tied to `usePotSync`.
  - The app’s toast system (`src/App.tsx` + `src/components/Toast.tsx`) only renders one toast at a time. We have a wrapper for `sonner` (`src/components/ui/sonner.tsx`) but it isn’t wired in yet.
  - `src/components/screens/AddExpense.tsx` uses native number input; no currency masking library.
  - `src/App.tsx` still contains the giant `renderScreen` switch (~3.6k LOC file).
- **Follow-ups to validate**
  1. Introduce `<SkeletonList />` (or similar) while `usePotSync` is loading.
  2. If we migrate to `sonner`, enforce `visibleToasts={1}`.
  3. Evaluate `react-currency-input-field` or similar for AddExpense.
  4. Break routing logic out of `App.tsx` into a `ScreenRouter`.

---

## 5. Killer Feature: Receipt OCR

- **Gemini ask**: Use Tesseract.js (or API) to parse receipts and prefill expense forms.
- **What exists today**
  - `src/services/storage/receipt.ts` handles uploads to IPFS/Crust only; no OCR phase.
  - `AddExpense` receives `prefilledData` but relies on manual entry.
- **Follow-ups to validate**
  1. Scope a client-side OCR pipeline (Tesseract.js) before upload.
  2. Feed parsed totals/dates into the AddExpense form (respecting existing validation).

---

## 6. Trust Indicator Upgrade

- **Gemini ask**: Make trust dots interactive—tap to open a sheet explaining the score.
- **What exists today**
  - `src/components/TrustIndicator.tsx` renders dots with a tooltip blurb.
  - `MemberDetail` already has `BottomSheet` wiring for payment details.
- **Follow-ups to validate**
  1. Convert the trust score into an interactive element that opens a rationale sheet.
  2. Consider gamification metrics (settlements completed, attests, etc.).

---

### How to Use This Doc

When prompting Composer/Gemini/etc.:

1. Paste this context along with the relevant file snippets (BottomTabBar, TopBar, SettlementConfirmation, PotsHome, AddExpense, SettleHome, App.tsx, TrustIndicator, WalletBanner, receipt service).
2. Ask the reviewer to confirm which Gemini suggestions are satisfied and to enumerate concrete gaps or quick wins.
3. Turn the resulting checklist into focused tickets/PRs.

