## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J05-D01 — Fast defaults with precise controls

**Decision:** The common path needs amount and description, with editable defaults for payer, participants, equal split, date and receipt. It has no separate review page. Failures retain entered details.

**Why:** The recorded principle is fast by default, precise when needed. Compact editable summaries keep configuration accessible without making it the main task.

**Alternatives:** A separate common-path review page is excluded. A duplicate warning is preferred to trapping the user; later correction belongs to Journey 06.

**Tradeoffs:** Speed depends on visible, correct defaults and validation of custom totals. Success must still expose amount, payer and personal share.

**Revisit when:** User tests repeatedly save unintended defaults, lose drafts or misunderstand custom splits; investigate the smallest correction before adding friction.

**Approval / version:** v1 — Golden #5 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: default experience](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/05-add-expense/spec.md#default-experience); [Spec: recovery states](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/05-add-expense/spec.md#recovery-states); [Spec: approved decisions](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/05-add-expense/spec.md#approved-decisions); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
