# Journey 12 V1.1 — Continuity QA

**Candidate:** `v1.1-continuity-candidate.html`  
**SHA-256:** `2198cde482ec1ab1d2285cdea218492b410bb071bb8916e470f40d4e629d3e4d`  
**Status:** Review pending, not Golden.

## Executed checks

- 20 click-through scenarios: 10 each at 393×852 and 430×890.
- 174 real primary/secondary app clicks; workshop role/result fixtures are separate.
- 30 reducer assertions for read-only refresh, authority separation, partial arithmetic, exact fixture matching and recovery-gated idempotent retry.
- 134 screenshot/layout checks covering all 67 existing screens at both sizes.
- No page errors, blank states, horizontal overflow, overlapping frame regions, clipped primary cards or oversized icons.

## Paths clicked

TWINT / bank / cash: sent → waiting → repeated payer refresh → balances → recipient Not yet → recipient confirmation → payer result → correct balances → record/Done/history/Back.

Partial CHF 20 and unexpected CHF 40: correct remaining CHF 34.30 or CHF 14.30 survives every return.

Wallet: repeated read before receipt stays pending; explicit exact-receipt test fixture → result → balance → record → Done, preserving Connected wallet and 7.812500 DOT. Reversal preserves reopened CHF 54.30.

Bank/wallet unknown timeout: recover → repeated refresh (still recovery) → explicit verified-not-sent test fixture → one eligible retry, keeping payment identity and method.

## Visual review

Inspected the earlier Golden comparison alongside the rendered result, partial-balance, wallet-record, waiting and recovery screenshots. The original stylesheet is byte-identical. The header, footer, surfaces, amount hierarchy, spacing and icon language are retained. Two previously unstyled returning-balance rows now reuse the existing compact row/icon classes instead of showing oversized SVGs. No new screen or design system was added.

## Test environment and boundaries

Browser plugin unavailable. Playwright Chromium rendered the exact standalone HTML via set_content; local URL navigation is blocked in this environment. App controls were clicked, and browser Back was exercised. Native file reload, real bank/wallet callbacks, multi-device authentication and backend persistence were not tested. The local scenario model is not a payment backend.

Raw evidence: `CONTINUITY_QA.json`; full PNG set is retained with the downloadable review checkpoint.
