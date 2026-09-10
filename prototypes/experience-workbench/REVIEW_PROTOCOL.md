# ChopDot Independent UX Review Protocol

This protocol separates mechanical QA from product judgment. A candidate cannot become Golden because CI is green.

## Required order

`DEFINE → BUILD → MECHANICAL QA → INDEPENDENT UX REVIEW → HUMAN APPROVAL → GOLDEN FREEZE`

The reviewer does not implement fixes and does not supply human approval.

## Evidence required before review

Review the exact candidate, not a moving branch description. Record:

- candidate branch and exact commit/head;
- candidate HTML path and SHA-256;
- journey spec, state inventory, edge cases, and decision history;
- relevant adjacent Goldens and their locked checksums;
- deterministic/model QA summary;
- browser interaction/layout evidence at `393×852` and `430×890`;
- actual rendered screenshots for direct inspection;
- page/console/network errors and any known environment limitation.

If exact visual evidence cannot be directly inspected, visual clearance is not granted.

## Five independent blocking lenses

A serious defect in any one lens blocks `GOLDEN-READY`; scores are never averaged.

1. **Product / interaction** — Does the state solve the stated user job? Is the next action clear? Is intent/context preserved? Are relevant success, empty, pending/loading, unavailable, failure, cancellation/retry, stale/offline, conflict, partial, or unknown-result states honest?
2. **Visual / brand** — Is hierarchy clear? Does the candidate reuse Golden spacing, type, components, icons, status language, and density? Are CTAs prominent without visual noise? Are desktop/mobile states free of clipping, accidental overflow, dead space, and awkward ordering?
3. **Accessibility** — Are controls semantic and labelled? Are keyboard/focus behavior and practical touch targets preserved where inspectable? Is meaning conveyed beyond color? Are contrast and visual state distinctions sufficient?
4. **Copy / comprehension** — Is language specific, plain, and actionable? Do error/recovery states explain what remains true and what happens next? Is internal/protocol jargon kept out of the primary customer flow?
5. **Trust / authority / privacy** — Does the UI stay inside journey ownership? Are preference, permission, payment authority, settlement, sharing, signing, and verification kept distinct? Is sensitive data minimized? Are fixture/demo states never presented as live evidence?

## Classifications

- **REVISE** — at least one concrete material defect requires a candidate change before another full review.
- **REVIEWABLE** — available evidence is mechanically/semantically sound, but a review lens is not yet cleared (for example screenshots could not be directly inspected). Do not manufacture a Builder task if no defect exists.
- **GOLDEN-READY** — all five lenses are cleared on the exact candidate with no material blocker. This means ready for Devinson's review, not Golden.

Only explicit approval by Devinson of the exact candidate can authorize Golden freeze.

## Review behavior

- Prefer concrete defects and smallest viable fixes over aesthetic scoring.
- Do not demand irrelevant state variants merely to satisfy a checklist.
- Re-review only after the candidate/evidence materially changes or a previously unavailable review lens becomes inspectable.
- Roughly three review/fix passes should normally converge; if they do not, identify the unresolved product decision instead of polishing indefinitely.
- Shared-system defects go to `shared/improvements.md`; do not invalidate otherwise-correct Goldens merely to fix shared polish opportunistically.

## Coordination record

Record material review changes in issue #38 using: exact candidate/head; evidence inspected; classification; blocking findings by lens; smallest next action; whether human review is now required.