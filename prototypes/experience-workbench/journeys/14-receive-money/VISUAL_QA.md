# Journey 14 V1 — Visual and interaction QA

Status: review candidate, not Golden. Prototype data only.

## Artifact and environment

- Exact tested HTML SHA-256: `5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d`.
- Reference: approved Journey 13 `visual-qa/request-review.png`, reviewed against current Journey 14 phone captures.
- Browser plugin not available in this session. Used installed Chromium through Playwright.
- Native file navigation was attempted and returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Tests used `page.set_content()` with the exact standalone HTML. This does not establish hosted or native-file behavior.
- Viewports: 393×852, 430×890; desktop workshop 1440×1000.

## Results

| Check | Result |
|---|---|
| Title and first meaningful content | PASS |
| Blank-page/framework-error checks | PASS |
| Browser page errors | None |
| Model tests | 151 assertions across 44 scenarios |
| Click-through runs | 36, using 156 visible product-control clicks |
| Named states at both phone sizes | 44 layout checks across 22 states |
| Horizontal overflow | None in tested states |
| Header/footer overlap and footer visibility | PASS |
| Primary card horizontal clipping | None |
| SVG viewBox / missing-icon checks | PASS |
| UI/control mapping | 86 rendered state/action combinations |
| Inherited foundational and people stylesheets | Byte-identical to approved source |
| QR verification | Independent OpenCV QR decode matched inert example.invalid share reference |
| Shared typography/readability | TYPO-01 deferred; not modified |

Browser evidence: `visual-qa/browser-qa.json`. Model evidence: `visual-qa/model-qa.json`. The gate reruns model tests and checks the recorded browser evidence against the HTML checksum. It does not rerun the browser suite in CI.

## Interaction loops exercised

Choose TWINT → Marc → review → preparing → ready → code → back → recipient preview → back. Bank details → copy preview → exact mocked clipboard write; clipboard rejection → manual-selection fallback. Marc's request → share → recipient preview → return to original request → resume same sharing record. Jeanine's readable destination → return to payment → resume; no re-sharing authority. Wallet uses DOT and its displayed network; a CHF-scoped origin does not offer the DOT destination.

Unknown creation → repeated check → leave/return → same unresolved command → verified result. Verified non-acceptance → same-command retry. Stop → keep → explicit stop → accepted; unknown stop → no stopped claim → verified not-saved → retry. Expiry, changed details and access loss block old codes and Back. External share return/cancel/failure leaves payment unconfirmed and reuses the original link. Reconnection never automatically creates a share.

## Repairs found during QA

1. The first navigation implementation pushed a route after model selection had already changed it, creating a redundant Back entry. It now captures the previous route before selection; header and browser Back were retested.
2. The initial pending-state guard replaced the preparing spinner with recovery immediately. It now distinguishes the current pending-operation view from navigation back to an unresolved operation.
3. The safe exit initially remained trapped behind the access-loss guard. A non-sensitive boundary exit is now allowed without exposing old details; returning still rechecks access.
4. A repeated countdown render could reset scroll/focus. Countdown labels now update without rebuilding active code/share screens; non-navigation renders preserve scroll position.
5. Service acceptance arriving while offline is retained independently of client connectivity; reconnect does not replay execution.

## Reference-fidelity ledger

| Comparison point | Approved reference / current implementation |
|---|---|
| Palette and surfaces | Same neutral background, white cards, dark CTA, restrained pink accent |
| Typography | Identical inherited family, weight, title hierarchy and compact labels; no shared typography pass |
| Cards and rows | Same 18px cards, dividers, neutral avatar/icon containers and row spacing |
| Header and footer | Same compact centered header, fixed bottom actions and independently scrolling content |
| Icons | Same inline 24-unit outline family, 2px strokes, rounded caps/joins; no remote icon dependency |
| Copy and context | New receiving/sharing copy is intentional; no protocol terms or fake payment success |
| Responsive density | Same phone frame behavior at both sizes; workshop panel appears only on desktop |

Inspected the reference and current screenshots directly. New content is intentionally destination-led: receiving fields and a code replace request amounts. Long destination text wraps within its column. The QR is generated from an inert demo reference, not decorative art or an invented payment code.

## Remaining boundaries

All fields, identities, service outcomes and permissions are synthetic. Clipboard success/failure is tested with a controlled browser API double; actual OS clipboard permissions are not guaranteed. The external sharing sheet and recipient authentication are explicit previews. No email, real financial credentials, transfer, message, hosted link or database is involved. Full reload resets the session. The server must independently enforce authority, field allowlists, expiry, durable acceptance, access and replay protection. Native devices, hosted delivery, real providers and full cross-journey execution remain untested.

Evidence sheets: `visual-qa/receive-review.png` and `visual-qa/receive-review-430.png`; individual PNGs preserve both phone sizes.
