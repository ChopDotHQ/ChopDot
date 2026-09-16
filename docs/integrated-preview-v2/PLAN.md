# ChopDot Integrated Product Preview V2 — Golden-faithful composition

Status: implementation plan
Base authority: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`
Branch: `preview/golden-faithful-v2`

## Why V2 exists

The first integrated preview proved shared routing/state could work, but it re-expressed approved journeys instead of faithfully composing them. That caused visible/product regressions: simplified J01 entry/auth, simplified J05 Add Expense, missing/placeholder iconography, incomplete J27 account/sign-out behavior, and a test gate that checked route/state continuity rather than Golden fidelity.

V2 has one overriding rule:

> Add plumbing; do not redesign the approved product while integrating it.

The 28 Golden journey artifacts/specs remain product authority. Integration code may provide shared state, routing, persistence, fixture data, host adapters, and recovery coordination, but may not silently change approved hierarchy, actions, wording, icon semantics, interaction boundaries, or recovery meaning.

## Build strategy: staged vertical slices

Do not integrate 28 journeys in one coding pass.

### Stage 0 — Golden fidelity contract

Before implementing a journey in V2:
- identify its canonical prototype + version;
- extract primary screens/states and approved hierarchy;
- extract required actions and exits;
- identify iconography requirements;
- identify cross-journey ownership boundaries;
- identify failure/recovery behavior;
- identify integration state that must persist;
- record any conflict between an older Golden assumption and a later approved contract.

No journey is counted as integrated merely because a route exists.

### Stage 1 — Entry and orientation

Integrate only:
- J01 Enter ChopDot
- J02 Home / Orientation

Required user-visible proof:
- Welcome exists;
- email-code flow exists as the approved default path;
- returning-user path exists;
- invitation context can survive entry;
- wallet entry remains an alternate fixture path, not a replacement;
- successful entry lands in the approved Home hierarchy;
- Home preserves approved Lucide-style semantic iconography and bottom navigation;
- no J-number/reviewer machinery is visible in normal mode.

**Gate A:** Devinson can open V2 and say J01 and J02 are recognizably the approved products before any further journey is added.

### Stage 2 — Core expense loop

Add:
- J08 Group Home
- J05 Add Expense
- J06 Review / Correct Expense
- J07 Review / Agree / Raise an Issue

Required proof:
- Group Home remains overview-first, not tab-first;
- center Add Expense action is discoverable;
- J05 common case is amount + description with visible editable defaults for payer, participants, split, date, receipt;
- J05 does not insert an invented common-path review page;
- successful expense updates Group Home/shared state;
- J06 detail is readable before editable and uses J05 controls when editing;
- owner/authorized edit-delete controls remain permission-aware;
- J07 uses approved `Looks right` / `Something's off` / `Not now` language and preserves owner-resolution handoff.

**Gate B:** a user can add, inspect, edit/review, agree/question, and return to an updated group without a Golden contract regression.

### Stage 3 — Position and settlement loop

Add:
- J10 Overall Position
- J11 Settle Up
- J12 Complete Settlement

Required proof:
- J10 defaults to People and preserves gross owe/owed alongside net;
- mixed currencies remain separate;
- person/group source lineage remains visible;
- J11 preserves `Review → Method → Amount → Pay` and exact person/currency/source scope;
- J11 does not claim completion;
- J12 keeps Started/Sent/Waiting/Received/Complete distinct;
- payer refresh remains a read, not receipt;
- unknown result reconciles the same payment identity before retry;
- resulting position is recomputed from shared state rather than manually overwritten.

**Gate C:** the approved in-app money loop works continuously without collapsing authority or payment states.

### Stage 4 — Product shell, account, activity and recovery

Add:
- J18 Activity & Notifications
- J27 Account & Preferences
- J28 Things Go Wrong / Recovery

Required proof:
- Activity is read-only and routes to owner journeys;
- unread and unresolved attention remain separate;
- Account contains profile/preferences/security/session surfaces represented by J27;
- sign-out exists and returns to J01 without deleting product history;
- J28 preserves same-operation identity, reconciliation-before-retry, stale-refresh, partial outcomes, cancellation verification, explicit stop and owner boundaries;
- recovery returns to the owning journey/state rather than a generic new interpretation.

**Gate D:** normal product usage has believable login/session/logout and cross-cutting recovery.

### Stage 5 — Expand through remaining Goldens

Only after Gates A–D are accepted, integrate the remaining registered journeys in bounded families:
- J03/J04 creation + invite/join;
- J09/J13/J14/J15 people/request/receive/history;
- J16/J17 savings;
- J19 insights;
- J20/J21/J22 payment methods/wallet/QR;
- J23/J24/J25 import/export/storage;
- J26 group lifecycle.

Each family gets the same fidelity extraction before implementation and cannot be declared done from route coverage alone.

## Acceptance model

### 1. Golden visual/interaction fidelity

For every integrated journey:
- semantic icons match the Golden vocabulary; Unicode/emoji placeholders are forbidden where Goldens use icons;
- information hierarchy remains recognizable;
- primary CTA and navigation placement remain recognizable;
- approved human copy/labels are retained unless a documented integration-only correction is necessary;
- required states from the Golden family remain reachable;
- mobile frame behavior remains valid at 393×852 and 430×890.

### 2. Cross-journey continuity

Integration adds shared fixture state for participant, session, groups, members, expenses, reviews/issues, balances/read models, settlement operations/results, activity projection and recovery context.

The same underlying object identity must survive transitions. Navigation cannot manufacture a state change.

### 3. Screenshot + transition audit

Every stage must capture its meaningful user-visible states and review them as a contact sheet before acceptance.

Review twice:
- screen-by-screen for hierarchy, copy, icons, density, target sizes and accidental reviewer/prototype UI;
- sequence-as-product for persona, object, value, terminology, visual-system and authority continuity.

The screenshot exercise is evidence, not product authority. The exact repeatable process lives in `docs/ux-quality/PROCESS.md`.

### 4. UX Laws V1 review

After Golden fidelity and continuity are coherent enough to judge, but before human acceptance, every stage applies the seven-law review in `docs/ux-quality/UX_LAWS_V1.md`:
- Hick’s Law;
- Peak-End Rule;
- Zeigarnik Effect;
- Tesler’s Law;
- Jakob’s Law;
- Miller’s Law / chunking;
- Fitts’s Law.

Use `docs/ux-quality/JOURNEY_UX_REVIEW_TEMPLATE.md` and record concrete evidence/findings rather than an overall numeric UX score.

BLOCKER and MAJOR UX findings must be resolved or explicitly human-deferred with rationale before acceptance.

A UX-law recommendation may not silently override a Golden, product contract, financial/security invariant, identity boundary or recovery truth. Record any conflict and stop for the smallest explicit product decision.

### 5. Human-first gate

Automation and heuristic review are necessary but not sufficient.

A stage cannot be called accepted until:
1. automated structural/browser checks pass;
2. side-by-side Golden comparison passes for the integrated journeys;
3. screenshot/contact-sheet + transition audit is complete;
4. applicable UX Laws V1 checks are complete and material findings resolved/deferred;
5. refreshed evidence exists after material fixes;
6. Devinson has a usable preview URL for that stage and judges the real experience.

### 6. No scope widening

V2 remains a deterministic non-production prototype. It does not authorize real authentication provider integration, funds, signing, provider/rail selection, Product Integrator, protected merge, production deployment, secrets, or app-store publication.

## Tests V1 was missing

V2 must test more than routes:
- assert required Golden labels/actions exist on the integrated screen;
- assert prohibited shortcuts/placeholder icons are absent;
- compare screenshots or DOM landmarks against the approved Golden artifact for each stage;
- execute the actual primary user path instead of directly jumping routes;
- test sign-out → entry;
- test Add Expense through visible UI from Home/Group Home;
- test recovery from the owning journey and return to that journey;
- keep state/identity continuity checks from V1;
- generate screenshot/contact-sheet evidence for every bounded stage;
- keep UX-law findings tied to exact screens/transitions and source SHA.

## Process learning loop

After Gates A and B, review the review process itself before expanding the checklist:
- which laws repeatedly find useful defects;
- which checks create noise;
- what human review catches that the framework misses;
- whether the process materially slows implementation;
- whether a second layer such as Nielsen’s usability heuristics, accessibility criteria or host-platform guidance would earn its cost.

Do not add more framework simply to make the checklist longer.

## Stop rule

If integration requires materially redesigning a Golden journey, stop and record the conflict. Do not silently solve it in code. The smallest explicit product decision must be reviewed separately.
