# J17 V1.4 operation-continuity handoff

## What this package is

A narrow local review candidate based on the exact packaged J17 V1.3. No visual redesign and no Golden changes.

- Preserved source V1.3 SHA-256: `d2cf47381741d9825513ef805b3770c5c31d7436c171f6f5f3f0a92e7d031b97`
- New V1.4 SHA-256: `a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915`
- V1.4 screen markup: unchanged from V1.3
- V1.4 styles: unchanged from V1.3
- 42/42 phone-state pixel comparisons: identical
- Golden HTML changed: no
- Freeze: no
- Journey 19: not started
- TYPO-01: deferred

## What passed locally

- 42/42 layout checks at 393×852 and 430×890.
- Exact CHF 50 contribution amount/projection regression.
- Exact CHF 520 withdrawal limit/projection regression.
- Same-operation retry through the final re-submission at both phone sizes.
- Unresolved-operation protection against repeated Add and direct add fragment at both phone sizes.
- Check-original → Still unknown → Back-to-group preserves exact unresolved operation in the running document at both phone sizes.
- 0 page errors and no external runtime dependencies.

## What remains open

**Native standalone reload recovery is not verified.** This environment blocks native file/data/localhost navigation. A controlled test origin was also blocked. We did not treat document injection as reload evidence.

Run `CODEX_NATIVE_RELOAD_CHECKLIST.md` on the exact standalone V1.4 file. Do not freeze until Case 1 passes on a real reload.

## GitHub status

Not published in this pass. No exact-head gate exists for V1.4. The prior workbench branch was already on an incomplete continuity staging sequence; this package deliberately does not claim repository completion.

## Next step

Visual review can proceed now because visuals are pixel-identical to V1.3. For behavioral closeout, Codex should run the native reload checklist. If it passes, publish V1.4 through the existing workbench regeneration process and run the exact resulting-head gate. If it fails, create a further versioned candidate; do not modify a Golden.
