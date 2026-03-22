# ChopDot Operator Task Queue

Generated: 2026-03-22T19:37:29+00:00
Source brief: `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`

## cd-op-01-close-preflight-failure-

- Title: Close preflight failure: KPI section (Missing or unclear.)
- Priority: `critical`
- Track: `funding-readiness`
- Rationale: Derived from the current ChopDot daily brief to convert operator recommendations into a reviewable execution queue.
- Acceptance criteria:
  - OpenGov preflight no longer reports a KPI-section failure.
  - The proposal draft contains a clearly structured KPI section with measurable targets.
- Evidence paths:
  - `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
  - `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
  - `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
  - `/Users/devinsonpena/ChopDot/artifacts/opengov-preflight-report.json`
  - `/Users/devinsonpena/ChopDot/artifacts/OPEN_GOV_PROPOSAL_DRAFT.md`

## cd-op-02-fix-request-payment-data

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

## cd-op-03-expand-smoke-suite-from-

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

## cd-op-04-desktop-wallet-login-pol

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

## cd-op-05-mobile-walletconnect-log

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

## cd-op-06-settlement-status-clarit

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
