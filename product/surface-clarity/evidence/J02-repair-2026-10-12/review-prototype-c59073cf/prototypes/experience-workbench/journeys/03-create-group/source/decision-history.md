## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J03-D01 — Create the group before inviting people

**Decision:** Lead with a group name and visible preselected currency. Invite people after creation. Keep wallets and savings out of group creation. Show explicit creation success with Invite or Add expense exits.

**Why:** The recorded goal is to create a shared expense space with the minimum necessary decisions.

**Alternatives:** Wallet addresses in creation and a toast-only success are explicitly excluded. Savings remains a separate journey. No exhaustive earlier option comparison is recorded.

**Tradeoffs:** Invitation is a later action, not a prerequisite. Offline/local-save is recorded as a prototype proposal rather than verified shared persistence.

**Revisit when:** A downstream journey exposes a genuine weakness; the existing spec requires a deliberate new Golden version rather than rewriting V2.

**Approval / version:** v2 — Golden #2 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: approved experience](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#approved-experience); [Spec: edge states included in the prototype](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#edge-states-included-in-the-prototype); [Spec: prototype truth](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#prototype-truth); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
