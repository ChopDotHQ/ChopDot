# Journey 17 V1.4 — Operation Continuity QA

Status: local review candidate only. Not Golden. Journey 19 not started. TYPO-01 remains deferred.

## Source and scope

V1.4 starts from the exact packaged J17 V1.3 candidate, SHA-256:

`d2cf47381741d9825513ef805b3770c5c31d7436c171f6f5f3f0a92e7d031b97`

V1.4 changes only current-version metadata and the prototype continuity script. All 21 screen markup blocks and all CSS are unchanged. A 42-screen/viewport pixel comparison (21 states × 2 phone sizes) is pixel-identical to V1.3.

Final V1.4 candidate SHA-256:

`a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915`

## Corrected behavior

1. **Reload continuity implementation:** unresolved `waiting`, `unknown`, and `checking` operations are cached in browser local storage with the exact operation ID, kind, minor-unit amount, CHF currency, Alps House Fund group, Dev actor, and unresolved status. Hydration accepts only those unresolved statuses. `confirmed` and `not-executed` cannot be restored from browser storage, so storage cannot grant payment/contribution authority.
2. **Same-operation retry:** after a verified-not-executed outcome, Retry preserves the existing operation. The final click on **Confirm withdrawal** / **I added …** reuses that operation ID and scope and returns it to `waiting`; it does not allocate a new operation.
3. **Unresolved-operation protection:** while an operation is `waiting`, `unknown`, or `checking`, Add/Withdraw entry, direct add/withdraw fragments, and amount quick controls route back to the existing operation rather than replacing it.

## Fresh rendered checks

Browser plugin: not available. Playwright Chromium was used for exact-candidate rendered QA.

- Viewports: 393×852 and 430×890.
- 21 states × 2 sizes = **42/42 layout checks passed**.
- 0 page errors.
- 0 console errors/warnings relevant to the app.
- 0 external runtime dependencies.
- Screen markup unchanged from V1.3.
- Styles unchanged from V1.3.
- **42/42 visual parity comparisons are pixel-identical to V1.3.**

### Actual interaction regressions, both phone sizes

- Max CHF 520 withdrawal → unknown → verified not executed → Retry withdrawal → review → **Confirm withdrawal again** → same `demo-savings-op-1`, CHF 520, CHF, Alps House Fund, Dev, status `waiting`.
- CHF 50 contribution → unresolved → Back to group → Add money is blocked from starting another contribution and routes to the existing recovery state. A direct `#add` fragment is also redirected to recovery without replacing the operation.
- CHF 50 still reviews as CHF 50 with projected Available CHF 1,290.
- Max CHF 520 still reviews as CHF 520 with projected Available CHF 720 and Your position after CHF 0.
- CHF 520.01 withdrawal remains rejected.
- Pre-reload sequence passes through Check original result → Still unknown → Back to group with the exact operation ID and `checking` status preserved in the running document, and the unresolved banner provides a recovery route.

## Reload limitation — still open

Native standalone reload is **unverified** in this environment. Native file/data/localhost navigation had already been blocked by browser administration policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), and per instruction it was not retried. A controlled-origin navigation attempt was also blocked and was not repeated.

No inline `set_content()` result is claimed as reload evidence.

The implementation is present, but Codex must run the native standalone reload reproduction in `CODEX_NATIVE_RELOAD_CHECKLIST.md` before this defect can be considered fully closed.

## Browser storage boundary

Browser storage is a prototype continuity cache only. It does not confirm, fail, authorize, or close an operation. The V1.4 hydration allowlist deliberately excludes `not-executed`, `retry-safe`, and `confirmed`. Provider/service results remain separate test actions.

## Publication

Local package only. No GitHub publication, registry update, freeze, Golden update, or exact-head gate was performed for V1.4.
