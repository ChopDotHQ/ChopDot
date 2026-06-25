# ChopDot Operator Task Queue

Generated: 2026-06-24T12:57:48+00:00
Source brief: `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`

## cd-op-fix-request-payment-data-wiring-so-real-owed-amo

- Title: Fix request-payment data wiring so real owed amounts and breakdowns are shown.
- Priority: `critical`
- Track: `parity`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Request-payment flow shows real owed amounts and participant breakdowns.
  - The flow no longer relies on zeroed amounts or toast-only placeholder behavior.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/FEATURE_AUDIT_AND_IMPROVEMENT_PLAN.md`
  - `/Users/devinsonpena/ChopDot/artifacts/REQUEST_PAYMENT_SMOKE_REPORT.md`

## cd-op-expand-smoke-suite-from-5-to-12-15-flows-coverin

- Title: Expand smoke suite from 5 to 12-15 flows covering auth, invites, import, contribution/withdraw, request-payment.
- Priority: `critical`
- Track: `release-ops`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Smoke coverage expands beyond the current 5-flow pack.
  - Auth, invites, import, contribution/withdraw, and request-payment are represented in reproducible QA artifacts.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/FEATURE_AUDIT_AND_IMPROVEMENT_PLAN.md`
  - `/Users/devinsonpena/ChopDot/artifacts/REQUEST_PAYMENT_SMOKE_REPORT.md`
  - `/Users/devinsonpena/ChopDot/artifacts/SMOKE_5_FLOWS_REPORT.md`
  - `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`

## cd-op-desktop-wallet-login-polkadot-js-or-subwallet-co

- Title: Desktop wallet login (Polkadot.js or SubWallet) complete sign-in + sign-out cycle.
- Priority: `high`
- Track: `release-ops`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Desktop wallet login completes sign-in and sign-out without dead states.
  - No critical console errors or repeated signature loops appear during the flow.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`
  - `/Users/devinsonpena/ChopDot/docs/USER_ONBOARDING_READINESS.md`

## cd-op-mobile-walletconnect-login-completes-sign-return

- Title: Mobile WalletConnect login completes sign + returns to authenticated home.
- Priority: `high`
- Track: `release-ops`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Mobile WalletConnect completes sign-in and returns to authenticated home.
  - Session state persists and clears correctly on logout.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`
  - `/Users/devinsonpena/ChopDot/docs/USER_ONBOARDING_READINESS.md`

## cd-op-settlement-status-clarity-pending-in-flight-fina

- Title: Settlement status clarity (pending/in-flight/finalized/failure) visible.
- Priority: `high`
- Track: `release-ops`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Pending, in-flight, finalized, and failure states are visible in the settlement flow.
  - Users can distinguish status transitions without checking console output or chain explorers.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`
  - `/Users/devinsonpena/ChopDot/docs/USER_ONBOARDING_READINESS.md`

## cd-op-logout-clears-account-wc-session-state

- Title: Logout clears account + WC session state.
- Priority: `medium`
- Track: `stability`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - Task has a reproducible artifact and a user-visible completion condition.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
