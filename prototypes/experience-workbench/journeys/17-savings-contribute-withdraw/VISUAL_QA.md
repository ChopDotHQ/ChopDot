# Journey 17 V1.1 — Visual / interaction QA

Artifact SHA-256: `d4ac9fbc8b6c30a5d09f97b9d2dac3c9ff6f3ae9798a725fd8b8a757cf4c7054`.

## Why V1.1 exists
A fresh standalone rerun of V1 found a real visual defect in the two waiting timelines. Journey 12's inherited `.timeline-row` grid rule was still active, so the contribution and withdrawal timeline copy could overlap even though the earlier coarse layout checks passed.

V1.1 adds one scoped CSS reset under `.status-card .timeline-row`. It does not change product policy, state transitions, amounts, authority, shared visual tokens or any approved Golden HTML.

## Environment
Playwright Chromium with the exact self-contained standalone HTML injected via `page.set_content` because `file://` navigation is blocked by the test environment. The artifact itself contains no external runtime dependency and made zero HTTP(S) requests during the fresh run.

Phone sizes:
- 393 × 852
- 430 × 890

## Fresh V1.1 results
- 19 named prototype states including Demo.
- 38 state-layout renders: all 19 states at both phone sizes.
- 158 internal anchor clicks exercised and passed.
- 12 amount-control clicks exercised and passed.
- 170 total fresh product/control clicks.
- Zero page errors.
- Zero external network requests.
- Zero tested horizontal overflow, header/footer collision or clipped primary cards.
- Explicit text-overlap checks pass for both `add-sent` and `withdraw-pending` timelines at both phone sizes.
- Main Add and Withdraw paths remain clickable end-to-end to their waiting states.
- Existing 86 deterministic semantic/model assertions remain applicable because the V1.1 correction is layout-only.

## Direct visual inspection
Re-reviewed Start, Add, Add Review, Waiting, Unknown-result recovery, Withdraw Review, Withdrawal Waiting, Shared Account and Demo states. The corrected timelines now read vertically with clean separation. Card rhythm, fixed header/footer, neutral background, semantic green, compact labels and line icons remain consistent with the approved direction.

## Limits
Synthetic in-memory prototype. No real custody, wallet, bank, provider, finality, group approval, notification or backend persistence. Browser QA checks the exact HTML render and interaction model only.

TYPO-01 remains deferred.
