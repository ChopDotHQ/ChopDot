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
