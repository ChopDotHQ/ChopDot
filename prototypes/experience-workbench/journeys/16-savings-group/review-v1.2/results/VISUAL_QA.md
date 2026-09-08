# Savings visual closeout — J16 V1.2 / J17 V1.3

Status: review candidates only. Not Golden. No Journey 19 work.

## Final candidate hashes

- J16 V1.2: `dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de`
- J17 V1.3: `d2cf47381741d9825513ef805b3770c5c31d7436c171f6f5f3f0a92e7d031b97`

J17 changed from the prior visual-review artifact only in review metadata: the sidebar label is now V1.3 and the internal model script id is `j17-v1-3-model`. No product copy, state transition, amount, authority or layout behavior changed in this closeout.

## Version-reference audit

J16 normal candidate title is V1.2. The retained `J16 V1.1 continuity` CSS comment is provenance for the earlier correction, not a current-version label.

J17 title, sidebar and current visual-refinement comment are V1.3. The retained `J17 V1.1` timeline CSS comment documents the earlier scoped timeline correction; the J17 build input remains the actual V1.2 continuity source by design. Stale `Savings — Contribute / Withdraw V1.2` and `j17-v1-2-model` references are absent from the final candidate.

## Regression/layout checks actually rerun

Renderer: Playwright Chromium using the exact HTML bytes via `page.set_content`. This is valid for layout/interaction regression only and is **not** treated as evidence of native standalone opening or reload.

- J16 V1.2: 14 states × 2 phone sizes = 28 layout checks, all pass.
- J17 V1.3: 21 states × 2 phone sizes = 42 layout checks, all pass.
- Viewports: 393×852 and 430×890.
- Page errors: 0.
- Console errors: 0.
- External runtime resources in either candidate: 0.
- Horizontal overflow / header-footer overlap / clipped horizontal controls in tested layouts: 0.
- J16 setup → overview → settings → handoff/back sequence: pass at both sizes.
- J17 CHF 50 contribution → waiting → unknown/check → in-app Back preserves unresolved operation → still unknown → confirmed → exact CHF 1,290 / CHF 570 return: pass at both sizes.
- J17 Max CHF 520 withdrawal → verified not executed → same-operation safe retry: pass at both sizes.
- J17 Max withdrawal → confirmed → exact CHF 720 / CHF 0 return: pass at both sizes.
- Invalid `0`, `abc`, and CHF 520.01 withdrawal limit cases: rejected with no operation created.

Machine evidence: `FRESH_VISUAL_QA.json`.

## Standalone opening and reload

**Unverified in this environment.** Native `file:`, `data:` and localhost navigation was already observed as blocked by administrator controls in the preceding pass. Per closeout instructions, those blocked attempts were not repeated, and document injection was not substituted as equivalent proof.

The J17 source keeps the unresolved operation in JavaScript memory. The browser behavior of a true native file reload with an unresolved operation therefore remains an explicit test requirement; this report does not claim persistence or loss either way without the native run.

## Codex reproduction checklist

1. Use the exact candidate files and confirm their SHA-256 values above before opening them.
2. Open J16 directly from disk with no fragment. Confirm exactly one Savings entry screen is visible. Reload. Record the visible route. Try an invalid fragment and record the fallback.
3. Open J17 directly from disk with no fragment. Confirm exactly one Savings group screen is visible. Reload. Record the visible route. Try an invalid fragment and record the fallback.
4. J17: choose CHF 50 → Review → Waiting. Use Demo/service controls to make the result unknown. Click Check original result so it remains unknown. Return to group and confirm the unresolved banner/operation is still present before reload.
5. Reload the native file at that point. Record whether operation ID, CHF 50 scope, unknown status and Resume/banner survive. Do not infer the result from source or Back behavior.
6. If the operation survives, resume and verify confirmed and not-executed branches preserve the original ID/scope. If it does not survive, record that as a continuity defect for a new candidate; do not silently patch a Golden.
7. Repeat at 393×852 and 430×890, including normal scrolling and browser Back.

## Remaining limitation

No production integration, wallet/provider behavior, persistence backend or shared TYPO-01 changes are in scope. Native standalone reload continuity is the only required closeout check still open locally.
