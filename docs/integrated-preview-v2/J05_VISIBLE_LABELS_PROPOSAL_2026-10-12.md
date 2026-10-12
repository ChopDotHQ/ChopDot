# J05 — persistent expense field labels (proposal only)

Status: PROPOSED; no repair implementation authorized or performed.
Source: accepted runtime c59073cf, reviewed in the live local preview on 2026-10-12.
Finding: existing UX-008, visibly reconfirmed on the empty Add expense screen.

## Current truth to preserve

J02 runtime c59073cf is user accepted. Its saved-expense return remains intact.
Keep exact money/allocation, currency, actor/payer/participants, draft lineage,
validation, receipt/date controls and explicit save semantics unchanged. Frozen
schema and Golden/C1 sources remain untouched. Labels confer no new authority.
This proposal qualifies only the existing expense-entry labels, not the whole J05.

J03 follows J02 numerically but has no recorded defect; keep its sampled working
create/confirmation behavior. J04's older local-person-layout finding has not been
freshly reproduced here. Recommend UX-008 as the next bounded repair because it
is visible now on the task entered directly from accepted Home; do not infer that
J03/J04 or their unsampled paths are fully reviewed.

## Product gate / prediction

User journey: I am a person recording a group expense, I need to recognize the
amount and description fields, so the group can record the correct expense.
One next action: enter the expense amount, with currency visible.
Friction 3/3, Trust 3/3, Clarity 2/3, Language 1/1 = 9/10 (design prediction).
Expected benefit: recognize fields without guessing or relying on disappearing
placeholder text. Cost: a little extra vertical space. Decision: LABEL, proposed.

## Scope and requirements

In: persistent visible Amount and Description labels, correctly associated with
the existing inputs; minimal spacing in the wrapper integration layer.
Out: redesign, new capture paths, new validation/money rules, payer/split changes,
other journeys, frozen source edits or additional evidence tooling.

The labels SHALL remain visible when empty, focused, filled and restored.
Accessible input names and input behavior SHALL remain unchanged.
Currency, primary save action and existing navigation SHALL remain readable.

GIVEN an empty entry, WHEN shown, THEN each field's purpose is visible.
GIVEN a filled draft, WHEN Back/reopen/reload occurs, THEN values and labels remain.
GIVEN valid entries, WHEN saved once, THEN the exact expense saves once and its
receipt returns to the affected Group Home, followed by overall Home.

## Proportional verification / review stop

Inspect empty/filled/restored states at 393x852 and 430x890; check no overlap,
readable labels and reachable action. One targeted draft/reload/save/return replay,
reusing affected existing assertions; one desktop layout look. No broad runner.
Record unrelated baseline failures without investigating. Then show actual screens
and preview for feedback before further implementation.

Documentation impact if implemented: brief J05/UX-008 record and result receipt;
no wiki/ADR update required for this presentation-only correction.
