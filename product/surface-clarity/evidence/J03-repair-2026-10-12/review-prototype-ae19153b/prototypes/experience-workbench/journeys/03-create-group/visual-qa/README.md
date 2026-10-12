# Journey 03 — Create Group V2 Visual QA

**Status:** Golden Candidate — awaiting product/design approval  
**Date:** 2026-09-03  
**Golden reference:** Journey 02 Home V1.4

## Render method

Browser/IAB was unavailable in this workspace. Fallback: Python Playwright using local Chromium with `page.set_content()` because direct file/localhost navigation is blocked by the sandbox administrator.

## Viewports rendered

- 393 × 852
- 430 × 890

## States rendered and reviewed

- Start group
- Currency picker
- Group created
- Offline proposal
- Create failed

## Fidelity ledger

| Check | Golden evidence | V2 result | Status |
|---|---|---|---|
| Frame | Home V1.4 uses fixed header / scroll content / fixed footer | Same 3-row locked viewport frame | PASS |
| Palette | `#f7f7f8`, white surfaces, black ink, Polkadot pink, semantic green | Same palette; no decorative gradients | PASS |
| Card language | 18px radius, subtle border/shadow | Currency/group cards inherit same geometry | PASS |
| Typography | Bold compact hierarchy, short utility copy | Strong 30px flow title; 13px body; short labels/actions | PASS |
| Icons | Lucide-style line SVG, 2px round stroke | Back, currency, check, people, receipt use same language | PASS |
| Density | Airy, not compressed to fit everything | Primary screen intentionally leaves breathing room | PASS |
| Copy | State and actions before explanations | Entry copy reduced to “Name it. Pick a currency.” | PASS |
| Footer | Critical actions stay visible | Create / Invite / Add Expense / retry actions fixed | PASS |

## Automated layout checks

At both 393 × 852 and 430 × 890:

- Body width equals viewport width.
- No horizontal scrolling.
- No element extends beyond viewport bounds.
- Header bottom equals content top.
- Content bottom equals footer top.
- Footer bottom equals viewport bottom.
- All 37 internal fragment links resolve.
- Core path works: Start → Currency → Back → Create → Invite handoff → Back → Expense handoff.
- EUR and USD choices land in currency-correct created states.
- No Unicode placeholder icon glyphs remain.

## Material fixes made after rendering

1. Removed the explanatory “Shared expenses” note from the entry screen.
2. Shortened entry copy to “Name it. Pick a currency.”
3. Changed success copy to the direct next-actions sentence “Invite people or add an expense.”
4. Removed an internal design/implementation note that leaked into the offline user interface.
5. Completed EUR and USD result states so alternate currency choices do not lead to a misleading CHF result.

## Open product / implementation questions

1. **CHF support:** prototype product truth uses CHF, but current production `CreatePot.tsx` does not list CHF among selectable currencies. Must be reconciled deliberately.
2. **Offline creation:** V2 proposes “Save now. Sync later.” This fits the intended local-first direction, but must be validated against the actual data/service behavior before implementation.
3. **Savings:** remains a separate journey. It should not expand core expense-group creation.

## Verdict

V2 is visually consistent with Golden Home V1.4 and has no material layout or icon regressions in the reviewed states. It is ready for user review as **Golden Candidate**, not yet Design Approved.
