# Journey 01 — Visual and interaction QA

Candidate SHA-256: `383170c06d4e6bc4d6b658664fff6ae0f2eb003cf202ca5e8f8617fb06ae8f46`.

## Environment

Playwright Chromium. Browser plugin not available. File and localhost navigation returned ERR_BLOCKED_BY_ADMINISTRATOR; the checks instead inject the exact self-contained HTML using `page.set_content`. This is a rendering/interaction check, not proof of hosted delivery or a native file reload.

Viewports: 393 × 852 and 430 × 890, plus a 1440 × 1000 desktop review-panel check.

## Results

- 17 named entry states.
- 43 passing model assertions.
- 18 passing click-through runs: nine paths at each phone size.
- 34 passing state/layout checks.
- No page errors, blank entry states, horizontal overflow, header/footer overlap or clipped primary controls.
- Browser-history return from the two reference boundaries preserves signed-in name and destination.
- Test-provider controls are separate from product actions; wallet refresh never signs the person in.

## Direct visual inspection

Compared with the supplied Golden comparison sheet and reviewed Welcome, code, invite result and recovery renders. Inspected palette, card surface/border/shadow, type hierarchy, icon geometry, footer placement and spacing. The first inherited style block is unchanged. Entry-specific headings and fields use the established focused-flow style. There are no progress-label changes.

## Issues found and fixed

1. Native iframe fragment navigation added an unwanted history entry. Reference activation is now isolated to the reference frame; browser Back returns to the signed-in entry result.
2. Test-result controls were desktop-only. The Demo disclosure now makes wallet outcomes and reconnection available on phones.
3. New-person success copy implied existing groups. It now says to start a group when ready.
4. A cancelled or replaced wallet request must not accept a late result. The model checks request identity and authority separately from refresh.

## Boundaries and remaining integration checks

Authentication is simulated. Code 123456 is a public demonstration fixture, not a secure verifier. No delivery, wallet provider, real account linking, server authentication, payment execution or backend persistence has been tested. Reference frames show retained demo snapshots, not personalized live Home data. Invitation expiry is still owned by Journey 04. Native file reload and hosted navigation remain untested in this environment.

## Deferred

TYPO-01: small progress-label readability — later shared typography pass, not this candidate.

Verdict: **Review candidate; not Golden.**
