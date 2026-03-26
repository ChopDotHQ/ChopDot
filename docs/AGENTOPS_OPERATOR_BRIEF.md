# ChopDot Daily Operator Brief

Generated: 2026-03-22T19:37:29+00:00

Sources:
- `/Users/devinsonpena/ChopDot/docs/FEATURE_PARITY.md`
- `/Users/devinsonpena/ChopDot/artifacts/FEATURE_AUDIT_AND_IMPROVEMENT_PLAN.md`
- `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
- `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`
- `/Users/devinsonpena/ChopDot/artifacts/opengov-preflight-report.json`
- `/Users/devinsonpena/ChopDot/artifacts/AUDIT_V2_CLAIM_EVIDENCE_MATRIX.md`
- `/Users/devinsonpena/ChopDot/README.md`

## Ecosystem Changes

- Release path is now the EVM smart-contract flow on Polkadot Hub testnet, not the older simulated closeout path.
- The previously deployed closeout contract is demo-only; launch requires redeploying the current access-controlled contract.
- Smart-settlement scope now explicitly covers both DOT and USDC closeout flows.
- Launch readiness depends on a hybrid wallet model: EVM wallet for contract writes plus Polkadot wallet for asset settlement.
- Frontend rollout is coupled to wallet-auth and contract redeploy, so release coordination remains an ecosystem dependency.

## Parity Gaps

- Push notifications is missing: `docs/archive/spec.md` (line 116: "mock NotificationCenter exists", line 446: "No push notifications")
- Receipt OCR is missing: Mentioned in `docs/GEMINI_POLISH_PLAN.md` as future feature
- Settlement reminders is missing: `docs/archive/spec.md` (Future Roadmap: "Push notifications - Settlement reminders")
- Expense confirmation requests is missing: Notifications exist in schema (`src/database/init/01-schema.sql` line 227) but not implemented
- Recurring expenses is missing: `docs/archive/spec.md` (Future Roadmap: "Smart Features - Recurring expenses")
- Expense templates is missing: `docs/archive/spec.md` (Future Roadmap: "Smart Features - Templates")

## Stability Risks

- Request-payment is not production behavior (amounts forced to `0`, toast-only send).
- Expense attestation still simulates tx hash/block; not real on-chain attestation evidence.
- Backup/checkpoint path still has placeholder/dev-stub behavior in user-facing UI.
- No comprehensive E2E regression pack for every major route (only one smoke pack today).
- Very limited automated test coverage (3 test files, mostly settlement math).
- Safari keyboard issue

## Top Tasks

- Close preflight failure: KPI section (Missing or unclear.)
- Fix request-payment data wiring so real owed amounts and breakdowns are shown.
- Expand smoke suite from 5 to 12-15 flows covering auth, invites, import, contribution/withdraw, request-payment.
- Desktop wallet login (Polkadot.js or SubWallet) complete sign-in + sign-out cycle.
- Mobile WalletConnect login completes sign + returns to authenticated home.
- Settlement status clarity (pending/in-flight/finalized/failure) visible.

## Structured Output

- JSON brief: `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
- Task queue: `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_operator_task_queue.json`
- Brief schema: `/Users/devinsonpena/Documents/AutoBots/agentops/schemas/chopdot_daily_brief.schema.json`
- Queue schema: `/Users/devinsonpena/Documents/AutoBots/agentops/schemas/chopdot_task_queue.schema.json`
