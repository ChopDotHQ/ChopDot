## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J02-D01 — Attention first, wallet secondary

**Decision:** Home is attention-first and group-first. Wallet context remains compact and visible. The header/footer stay visible while only the center scrolls; use inherited icons and short action-led copy.

**Why:** The user goal is immediate orientation: what needs attention, where groups stand and the next useful action.

**Alternatives:** Wallet-first and finance-dashboard-first layouts are explicitly ruled out. Shrinking content to fit more above the fold and placeholder glyph icons are also ruled out.

**Tradeoffs:** The source lists mixed-currency, loading/sync and Activity-icon questions as open at that time. Journey 10 later specifies currency behavior; that does not establish that the Home HTML was updated or integrated.

**Revisit when:** Orientation tests hide an important task or wallet context; a demonstrated frame or icon regression occurs. Shared typography remains deferred under TYPO-01.

**Approval / version:** v1.4 — Golden #1 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: golden hierarchy](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#golden-hierarchy); [Spec: approved rules](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#approved-rules); [Spec: open gaps](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#open-gaps); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Later scope contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#currency-rule).
