# P-026 Proof And Routing Baseline - 2026-07-16

## Decision

P-026 owns the behavior/proof map and duplicate-work routing only. It does not
implement the journey selected by the map.

## Accepted evidence

- `07936cde23a4de5aa1779c17616897021792a41c`: portable capture source and
  local proof. The accepted product truth is manual amount/reason capture,
  review before save, draft preservation, and unchanged money authority.
- `85be5af`: live portable host proof. The live Paseo `.dot` journey passed
  with 22 screenshots; the live HTTPS Telegram-profile journey passed with 24
  screenshots and a standalone payer packet. Both reached explicit finish,
  saved history, and reload persistence.

## Proof boundary

- Portable proof applies to `portable_web`, `telegram`, and `dot_paseo`.
- It does not automatically promote canonical/root `web`.
- The receipt/OCR candidate in `07936cd` was superseded before integration.
- Root C-003/C-004/C-005 promotions and D-019 are legacy-root references only
  and are intentionally not imported as current proof.
- Live Product Account login, live Statement Store convergence, and a real
  Telegram client session remain outside the accepted baseline.

## Lane registry

- Programme A portable shell and host proof:
  `codex://threads/019eaa66-6265-7a92-9469-15f1f5aca52e`.
- P-025 canonical integration:
  `codex://threads/019f1ce5-733d-7ac3-b63d-290e5a0dd572`.
- P-026 proof mapping and routing:
  `/Users/devinsonpena/ChopDot/.worktrees/p026-user-path-scanner`.

## Queue

### Proven

- N-001 Start normal pot
- N-002 Add first expense
- N-004 Review or edit split
- N-005 Send payment request
- N-006 Payer opens request

### Active elsewhere

- Programme A: N-014
- P-025: N-009, N-010, N-011, N-012, N-013, N-021, N-022, N-023, N-024

### Blocked external

- N-008 Payer starts native/app payment: live Product Account and live-device
  convergence require an external runnable client and host capability.

### Highest-risk unowned

1. N-007 Payer cannot pay now
2. N-018 Waive amount
3. N-019 Mark delayed
4. N-020 Payer returns after delay
5. N-015 Send follow-up request after balance changes
6. N-016 Add member before request
7. N-017 Remove member before request

## Single next unowned journey

`N-007 Payer cannot pay now`.

Stop after routing. Do not implement N-007 in the P-026 lane.
