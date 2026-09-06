# Journey 06 — Review / Correct an Expense

**Priority:** P0  
**Status:** Design Approved / Golden Journey #6  
**Version:** V1.1  
**Prototype:** `v1.1-golden.html`

## User goal

Open an existing expense, understand it immediately, and correct it when permitted.

## Core paths

Owner:

`Expense detail → Edit → Save changes → Updated expense`

Other member:

`Expense detail → Review expense → Journey 07`

Delete:

`Expense detail → More → Delete → Balances updated → Group Home`

## Information hierarchy

1. Total amount
2. Expense name
3. Review/change status
4. Payer, personal share, and date
5. Split
6. Receipt and history
7. Contextual actions

## Approved decisions

- Detail is readable before it is editable.
- Edit Expense reuses Journey 05 fields and controls with values prefilled.
- The user's personal share remains visible near the top.
- Only the expense owner or an authorized role gets Edit/Delete.
- Other members can review but do not see fake edit controls.
- Editing resets or updates review status transparently.
- Delete is a separate confirmation state and explains the balance impact.
- Important changes show what changed.
- History and receipt are available without dominating the first screen.
- Journey 06 owns detail, edit, delete, receipt, history, permissions, and recovery.
- Journey 07 owns review, agreement, questions, and issues.

## Visual correction in V1.1

The sync-conflict state initially had missing semantic icon treatment. V1.1 restores:

- compare icon in the conflict heading;
- person icon for the remote version;
- device icon for the locally saved version;
- compare/check icons in the footer actions.

## QA

- 31 explicit states
- 128/128 links resolve
- 393 × 852 and 430 × 890
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder icons
- visual comparison against the Golden set completed

## Next

Journey 07 — Review / Agree / Raise an Issue.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J06-D01 — Readable detail and permission-aware correction

**Decision:** Read expense detail before editing; reuse Journey 05 controls with values prefilled. Only an owner or authorized role sees Edit/Delete. Deletion has a separate confirmation and states the balance impact.

**Why:** The recorded goal is to understand an expense immediately and correct it when permitted. Personal share stays prominent; change status is transparent.

**Alternatives:** Fake edit controls for other members are explicitly ruled out. Receipt/history stay available without dominating the opening screen. A complete alternatives discussion is not recorded.

**Tradeoffs:** Changes may reset review status. V1.1 records a real missing-semantic-icon correction in sync conflict: compare, remote person, local device and footer actions.

**Revisit when:** Permissions or changed-review status are misleading; conflict or inherited-icon regressions recur. Agreement/issue behavior remains Journey 07 scope.

**Approval / version:** v1.1 — Golden #6 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: approved decisions](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/06-review-correct-expense/spec.md#approved-decisions); [Spec: visual correction in v11](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/06-review-correct-expense/spec.md#visual-correction-in-v11); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
