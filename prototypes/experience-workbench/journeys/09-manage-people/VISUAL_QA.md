# Journey 09 V1 — Visual and Functional QA

## Reference and scope

Accepted visual basis: unchanged first stylesheet from Golden Journey 01 V1 (itself inherited from J12/J11/J10), approved Group Home and person/balance rows. Inspected the entry reference contact sheet and actual rendered People screens side by side. No image generation, broad redesign, shared typography changes or new global tab.

## Environment

Browser plugin not available. Regular Playwright Chromium with `/usr/bin/chromium`, using `page.set_content` on the exact standalone artifact. All 18 routes checked at 393 × 852 and 430 × 890; desktop workshop at 1440 × 1000. No production providers or account data.

## Results

32 click-through scenarios (16 at each phone size), 110 actual product clicks, 36 route/layout checks, 67 deterministic model assertions, zero page errors. All checked states had content and an in-frame footer, with zero horizontal overflow, header/footer overlap or clipped primary cards/rows. Search, back paths, private preference, role guard, removal safety, unknown-save recovery and currency-scoped handoffs passed.

## Visual fidelity ledger

| Reference point | Result |
|---|---|
| Palette and surfaces | Existing gray-white background, ink, green and restrained pink; no new brand palette |
| Typography | Inherited stylesheet identical; new labels reuse the existing scale; TYPO-01 deferred |
| Frame | Compact fixed header, independently scrolling content and anchored footer |
| Rows and cards | Existing avatar size, row rhythm, borders, radius and shadow reused |
| Icons | Inline stroke SVGs with currentColor; no emoji or placeholder glyph icons |
| Money | Separate same-currency cards with exact fixture amounts and source context |
| Copy | Group/person-led, short labels; no architecture names in product content |

## Corrections made before review

The role demo originally changed the viewing identity, risking “you” describing the wrong balance; it now changes only the fixture group owner. DOT routing originally inherited a fiat preference; it now uses Wallet in that currency only. An open-issue label initially sat on a disabled action; it now opens the review boundary without enabling payment. Root Back has an explicit Group Home boundary, not an inert click. An offline removal guard routes to reconnection rather than a misleading access warning. Accepted removal restores its own immutable person/group context.

## Remaining limits

In-memory prototype only. Boundary cards do not run the adjacent journeys. No actual service, authentication, payment, invitation delivery, backend authorization, persistence, device-level wallet or live concurrency was tested. Full reload intentionally resets the demo. Browser evidence is replay-checked by hash on CI; the CI gate reruns model assertions but does not itself launch a browser.

Verdict: Golden Candidate #12, ready for product review, not frozen.
