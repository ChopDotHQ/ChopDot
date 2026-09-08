# Journey 18 V1.1 — Visual & continuity QA

**Candidate SHA-256:** `d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e`  
**Candidate bytes:** 116571  
**Status:** local review candidate; not published; not Golden.

## Environment

Browser plugin not available. Playwright with installed Chromium was used for rendered/interactions checks. One native `file://` navigation attempt returned `ERR_BLOCKED_BY_ADMINISTRATOR`; no further native attempts were made. Native standalone opening/reload therefore remains unverified here. Document injection is not treated as equivalent evidence.

## Results

| Check | Result |
|---|---:|
| Deterministic model scenarios | **20/20 pass** |
| Deterministic model assertions | **71** |
| Named screens | **36** |
| Phone layout checks | **72/72 pass** |
| Focused continuity checks | **34/34 pass** |
| Page errors | **0** |
| Console errors | **0** |
| External runtime requests | **0** |
| Viewports | **393×852, 430×890** |

## Continuity sequences verified against exact candidate bytes

- Separate `payment.waiting` V1 and `payment.complete` V2 events are retained for the same payment. Historical Waiting remains visible but no longer contributes attention.
- The older Waiting notification opens the changed-state explanation, resolves the current state to Complete, then routes to the Complete payment / Journey 15 handoff.
- Duplicate Waiting delivery and out-of-order Complete→Waiting delivery retain two historical events while Complete stays canonical.
- Mark all read → Activity → Notifications remains `All read`; open attention remains exactly two.
- A new notification is the only tested action that reintroduces unread and does not alter attention.
- Bare no-fragment document logic and invalid-fragment normalization pass under the exact injected HTML bytes. Native file/reload remains unverified.
- Activity attention contains two rows; each was scrolled into the normal content viewport at both phone sizes. The attention card uses visible overflow rather than clipping.

## Visual continuity

The final V1.1 candidate has the same five CSS blocks, byte-for-byte, as the retained pre-final V1.1 correction. The only finalization changes are stable notification ids, one retained historical Waiting notification row, and fixture/model wiring. No broad redesign or TYPO-01 changes.

## Remaining limitation

Native standalone open/reload is still required in an environment that permits `file://` or localhost navigation. Use `NATIVE_STANDALONE_CHECKLIST.md`. No GitHub publication or exact-head gate was performed in this pass.
