# Journey 19 V1 — Visual and interaction QA

Status: review candidate; not Golden.

## Environment

- Browser plugin: not available.
- Browser: installed Chromium through Playwright.
- Native standalone `file://` attempt: blocked once with `ERR_BLOCKED_BY_ADMINISTRATOR`; not retried.
- Exact standalone HTML was then tested via Playwright document loading. This is not presented as equivalent native-file evidence.
- Viewports: 393×852 and 430×890.

## Results

- 26 explicit screens.
- 52/52 phone layout checks passed.
- 272/272 internal anchor interactions resolved to the intended destination.
- 43 deterministic model assertions across 18 named scenarios passed.
- 0 page errors.
- 0 console errors.
- 0 external runtime network dependencies.
- Bare no-fragment entry resolves to one `overview` screen in the exact document.
- Invalid fragments normalize to `#overview` in the exact document.

## Sequences checked

- 90 days → 30 days → 90 days → 12 months, with exact CHF fixtures.
- All groups → Zurich Weekend, retaining CHF 430.00 group context.
- CHF 1,020.00 and DOT 2.400000 rendered separately.
- Partial-data state suppresses comparison language.
- Access-changed state removes old group detail rather than preserving it.
- Every internal navigation link in every screen at both phone sizes.

## Visual inspection

A first render at 393px revealed flex shrink on the Insights content column, vertically clipping the period chips. The content children now opt out of flex shrinking and the view scrolls normally. Both phone sizes were rerendered and the full QA suite rerun after that correction.

The visual direction remains inherited from the current ChopDot workbench: centered header identity, compact pills, neutral cards, line icons, dark primary action and fixed bottom navigation. TYPO-01 is not part of this candidate.

## Limitations

Synthetic fixture data only. No production analytics service, hosted route, native-file reload, real authorization server or account data. Group and settings destinations are explicit boundary previews, not integrated adjacent journeys.
