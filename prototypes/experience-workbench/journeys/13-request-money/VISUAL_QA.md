# Visual and interaction QA — Journey 13 V1

Artifact SHA-256: `a22664499c4056d95a6cdeb45df85d43fd2055713e80ae8f69020469aa9bb707`.

## Environment and method

Browser plugin was not listed. Used installed `/usr/bin/chromium` through Playwright, loading the exact self-contained HTML inline. An actual file-navigation attempt returned `ERR_BLOCKED_BY_ADMINISTRATOR`. This is not a hosted-site or native-file delivery test. Desktop review wrapper: 1440×1000. Phone viewports: 393×852 and 430×890.

Flow under test: Journey 09's person/balance context → optional note → review → send → saved/delivered request → same-person return; also duplicate, recovery and withdrawal paths.

## Executed checks

| Check | Result |
|---|---|
| Page identity and meaningful rendered content | Pass |
| Framework/runtime error overlay | None observed |
| Browser page errors | None |
| Model | 112 assertions across 44 named cases, all pass |
| Browser interaction scenarios | 30 runs: 15 at each phone size, all pass |
| Product clicks | 80 through measured helper; excludes demo-result controls |
| State layouts | 44: all 22 routes at both phone sizes |
| Horizontal overflow / header overlap / footer overlap | None in the checked layouts |
| Primary footer visibility / horizontally clipped cards | Pass / none |
| Screenshot evidence | All route states plus sent state and desktop captured |
| UI-event mapping | 72 route/action records, including disabled and prototype-only controls |

Checked runtime scenarios cover compose/edit/send/return/resume, four-group scope, literal note markup, unknown recovery, verified-failure retry, existing requests, offline draft reconnection, changed balance, access loss, withdrawal/keep/unknown/failure, delivery retry, separate CHF/DOT, payment boundaries and reverse/zero amounts.

## Reference comparison and fidelity ledger

Inspected the approved Journey 09 rendered sheet and the latest J13 compose, review and six-state rendered comparison sheet. The first stylesheet is byte-identical to the approved foundation, hash `7fdf48665ca5e823ac98752df0cf7fe5a106484f9738113d9c730018d3d6f2d2`. The inherited J09 component stylesheet is unchanged, hash `670a70382097f7456e4b8202fbeddc29b0d42b8ab5f7a40f0b7a2bb0d9207df4`.

| Comparison point | Evidence and disposition |
|---|---|
| Palette and backgrounds | Same cool neutral background, white cards, dark CTA, pink accent and semantic green/red. No visual-direction change. |
| Typography | Same inherited system family, scale and title weight. New amount uses the existing 35px payment scale; labels retain the approved compact sizing. TYPO-01 stays deferred. |
| Header and footer | Same compact centered context header and anchored primary-action footer. Scrollable content stays between them. |
| Card/row family | Same rounded surfaces, fine borders, shadow, circular initials and icon tiles. Request-specific note/message/fact rows are scoped additions. |
| Icons | Same 24px viewBox, 2px outline, rounded line caps/joins. Added send/close metaphors use the same treatment. |
| Copy and meaning | New J13 copy is recorded in SCREEN_STATE_MAPPING.json. Approved J09 copy is not modified. Requested, saved, delivered and paid remain distinct. |
| Density and responsive layout | Full-size phone checks at both inherited targets, plus desktop workshop wrapper. No new global navigation or dashboard. |

Above-the-fold copy: recorded from the final rendered state inventory; no edits to approved Golden copy. J13 is an extension of the approved visual system, not a pixel clone of Journey 09's different content. Request-specific composition and copy are intentional candidate changes. Shared readability work is deliberately not included.

## Fixes before handoff

The entry header Back now returns to the prior-journey boundary instead of remaining on the composer. Pending/accepted operations survive Back and resume without being recreated. Changed-scope validation also checks source groups, display scale and audience. A verified paid observation excludes settled source items from subsequent broader requests and cannot regress to payment-in-progress. The exact final HTML was rebuilt and all browser scenarios rerun afterward.

Early test-harness failures were a duplicate Back locator, an absent return action on the composer, and an overly long nonblank-text threshold for the intentional loading skeleton; these were corrected in the harness, not hidden as passing product tests.

## Boundaries and remaining risk

All results and identities are synthetic. No real request, notification, wallet, bank, backend or database is used. Full reload resets state. Pending-command durability, real delivery receipts, multi-device concurrency and authorization need backend implementation. Payment-status fixtures are observations, not payment execution. Cross-journey cards are boundary previews only. Browser back handling is implemented; native file/hosted reload, browser matrix, native mobile keyboard, screen-reader audit and production integrations are not validated here.

The workbench gate reruns the model assertions and verifies the browser evidence against the exact HTML checksum; it does not rerun Playwright. No unresolved visual mismatch against the inherited direction was found in the inspected views. This is not a claim that deferred typography/accessibility or production readiness has been completed.
