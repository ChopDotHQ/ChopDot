# J26 V1 compressed current-work packet

## Live activation

- Journey: **26 — Group Lifecycle V1**
- Canonical authority branch: `ux/experience-workbench`
- Activation canonical head: `724799a282cd2233b2f5c227f27613354026bcf6`
- Golden count at activation: **25**
- Stage at activation: **definition / no candidate built**
- Candidate branch: `ux/experience-workbench-j26-v1-candidate`
- Factory generation: **v1.1**
- Required evidence feature: **caller reachability**
- Builder lane: one writer; exact review handoff is the stop condition.
- Shared deferral: **TYPO-01** remains untouched.

This packet is a compressed activation snapshot, not authority. Live canonical registry and exact heads outrank it if they change.

## Product job

Rename, configure, archive, transfer ownership, leave, or delete a group safely from Group Settings, preserving permissions, ledger/history truth and exact operation outcomes.

## Governing sources

1. `prototypes/experience-workbench/registry/{progress,active-candidate,journeys,exact-head-gate}.json`
2. `DESIGN_CONTRACT.md`
3. `REVIEW_PROTOCOL.md`
4. J26 `spec.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, `source/decision-history.md`
5. Journey 08 Group Home Golden contract/shell for Group Settings caller and normal return
6. Journey 09 Manage People Golden contract for roster/removal boundary; it explicitly reserves ownership transfer/lifecycle to J26
7. `shared/improvements.md`
8. Factory v1.1/evolution guidance

## Candidate decisions to implement

- Group-wide lifecycle writes are owner-only; regular members can leave their own membership.
- V1 group configuration is the default currency for **future expense entry only**; history is not converted.
- Archive is reversible organization state, not settlement/deletion.
- J26 owns ownership transfer; J09 owns roster/member management.
- Leave is blocked by owner status or unresolved/open member items.
- Delete requires archived state, sole active membership, no open items, typed group-name confirmation and final review.
- Unknown operation results reconcile before retry; verified no-effect is the only retry gate.
- Cancelled/no-effect, pending, known failure, unknown/reconciling and verified success are materially distinct.
- Verified delete is scoped to this ChopDot working state; no external/global erasure claim.

## Reviewer repair successor

The first independent review of exact candidate `8b3f7feba07ded11932a39dce8a58a548e26735d` returned `REVISE`. The bounded successor repairs all three material findings without widening J26 scope:

- verified rename, future-currency and ownership-transfer facts now remain current truth across normal J26 navigation plus browser Back/Forward/reload;
- destructive delete eligibility is derived from carried fixture facts and stays blocked until the Journey 09 member boundary and money/issue-resolution boundary truthfully return sole-member + no-open-item facts; navigation alone cannot manufacture delete authority;
- verified leave/delete terminal outcomes fail closed under browser history so Back cannot re-expose stale group-sensitive states, with real Back/Forward/reload assertions for both outcomes.

The repair preserves the 78-state + 5-boundary inventory and the existing visual/accessibility/privacy boundaries. The exact successor must regenerate caller-reachability, interaction/model assertions, both canonical viewport renders and exact CI/Coverage/Smoke/E2E before a new review request is sealed.

## Evidence contract

- Candidate: `journeys/26-group-lifecycle/v1-candidate.html`
- QA harness: `journeys/26-group-lifecycle/source/review-qa-v1.mjs`
- Dedicated workflow: `.github/workflows/j26-v1-review.yml`
- Canonical viewports: `393×852`, `430×890`
- Render every registered state and named boundary.
- Caller reachability: exact browser clicks from `settings-entry-owner` or `settings-entry-member`; direct hash render does not count.
- Capture state code, horizontal overflow, action touch height, page errors, console errors, external requests, screenshots, interactions and reachability paths.
- Bind evidence to exact branch/head/tree and candidate SHA-256.
- Independent Reviewer must directly inspect PNGs; Builder evidence never self-classifies candidate quality.

## Named adjacent boundaries

- J26-B01 Journey 08 Group Home
- J26-B02 Journey 09 Manage People
- J26-B03 existing money/issue resolution owner
- J26-B04 Home after verified leave/delete
- J26-B05 Journey 28 recovery for unresolved lifecycle truth

## Stop condition

Stop only after one complete exact `### UX Builder — REVIEW REQUEST` is posted with all required evidence and exact CI status, or if live canonical/candidate authority changes or another genuine human/external authority blocker appears.
