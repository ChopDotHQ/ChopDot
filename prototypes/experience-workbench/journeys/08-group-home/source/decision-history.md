## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J08-D01 — Overview before tabs

**Decision:** Group Home leads with identity, what needs the user, personal position and recent activity. People, Settle and deeper areas are contextual handoffs; retain global navigation.

**Why:** The source explicitly says people should understand the group before choosing Expenses / Members / Settings.

**Alternatives:** Tab-first navigation and a dense accounting-dashboard hero are explicitly contrasted with the overview. Total spend is context, not the hero.

**Tradeoffs:** Recent activity is not the full ledger. The historical prototype includes an expense-change lock during settlement; later item-scoped contracts must be considered at integration without asserting that this HTML already implements them.

**Revisit when:** The overview fails to answer what happened or what needs action; integration reveals a mismatch between the historical settlement lock and later item-scoped rules.

**Approval / version:** v1 — Golden #4 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: core design decision](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#core-design-decision); [Spec: product decisions in the candidate](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#product-decisions-in-the-candidate); [Spec: handoff rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#handoff-rule); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Later scope contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#small-correction-to-earlier-golden-assumptions).
