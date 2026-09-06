# Journey 17 — Visual / interaction QA

Artifact SHA-256: `637c1078c26edeaff25ab2bcb7a9c8f5b60fc89188171e77a5fdf3411bf7d0c2`.

## Environment
Playwright Chromium with the exact standalone HTML injected via `page.set_content` because `file://` navigation is blocked in this environment.

Phone sizes:
- 393 × 852
- 430 × 890

## Executed results
- 19 named prototype states including Demo.
- 86 deterministic structural / semantic assertions.
- 38 state-layout renders (all 19 states at both phone sizes).
- 144 product/internal-link clicks exercised across the state matrix.
- Zero page errors.
- Zero tested horizontal overflow.
- Footer remained visible in all checked states.
- Inline SVG icons present on all product states where expected.
- Main Add and Withdraw paths were clicked end-to-end to their waiting states.

## Direct visual inspection
Reviewed Start, Add Review, Waiting, Withdrawal Review and Unknown screens. Card rhythm, fixed header/footer, neutral background, semantic green, compact labels and line icons remain consistent with Journey 16 evidence. The earlier action-card text overlap found during QA was corrected before this candidate checksum was recorded.

## Limits
Synthetic in-memory prototype. No real custody, wallet, bank, provider, finality, group approval, notification or backend persistence. Browser QA checks the exact HTML render and interaction model only.

TYPO-01 remains deferred.
