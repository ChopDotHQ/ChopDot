# Journey 07 — Review / Agree / Raise an Issue

**Priority:** P0  
**Status:** V1.1 Golden / Design Approved

## User goal

Decide whether another person's expense is accurate, or raise a clear issue without social friction.

## Core language

- `Does this look right?`
- `Looks right`
- `Something's off`
- `Not now`

## Core reviewer path

`Group attention → Review queue → Expense → Looks right → Next expense / caught up`

## Issue path

`Something's off → Choose reason → Optional note → Send → Waiting on owner`

## Owner-resolution loop

The owner may edit through Journey 06 or reply. The reviewer sees the update or reply and can choose `Looks right` or `Still off`.

## Boundary

Journey 06 owns detail, edit and delete. Journey 07 owns review, questions, issues and resolution status.

## Settlement dependency clarification

An unresolved issue blocks only payment items whose amount depends on the disputed expense. Unrelated balances remain actionable. This is the smallest correction needed for the Journey 11 payment-scope contract; the approved Journey 07 interaction design is unchanged.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J07-D01 — Human review and narrowly scoped issues

**Decision:** Use Looks right / Something's off / Not now. An issue carries a reason and optional note to the owner; the reviewer can reassess a reply or correction. Only dependent payment items are blocked by an unresolved expense.

**Why:** The goal is accurate expense review without social friction. The dependency clarification explicitly preserves unrelated actionable balances.

**Alternatives:** The former group-wide settlement-blocking wording is narrowed by the Journey 11 contract. The original discussion of alternative reviewer wording is not recorded.

**Tradeoffs:** Journey 06 owns edits/deletes; Journey 07 owns agreement, questions and resolution. The later scope clarification is documented as a dependency correction, not a visual redesign.

**Revisit when:** An issue blocks unrelated items or a reply is mistaken for agreement; recheck dependencies and reviewer authority without casually changing the Golden.

**Approval / version:** v1.1 — Golden #7 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: core language](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/07-review-agree/spec.md#core-language); [Spec: owner resolution loop](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/07-review-agree/spec.md#owner-resolution-loop); [Spec: settlement dependency clarification](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/07-review-agree/spec.md#settlement-dependency-clarification); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
