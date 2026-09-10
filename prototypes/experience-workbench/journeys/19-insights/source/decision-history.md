## Decision history

**Coverage:** Journey 19 V1 candidate decisions recorded from the current specification and QA during candidate creation. This is not an approval record; V1 remains review-pending.

### J19-D01 — Read-only patterns instead of a second ledger

**Decision:** Summarize useful group/spend patterns and route to canonical destinations rather than reproduce raw transactions.

**Why:** The registry goal is understanding useful patterns rather than raw transactions, while Settlement History and Activity already own event/history surfaces.

**Alternatives:** A transaction-style analytics feed was considered and rejected for V1 because it duplicates Journeys 15 and 18.

**Tradeoffs:** V1 is deliberately selective and will not answer every reporting question.

**Revisit when:** Real usage shows that people need deeper analytics rather than clearer summary patterns.

**Approval / version:** V1 review candidate; not approved or Golden. TYPO-01 remains deferred.

**Sources:** [Journey 19 specification](../spec.md) [Journey 19 visual QA](../VISUAL_QA.md) [Journey registry](../../../registry/journeys.json)

### J19-D02 — Compare only like-for-like currencies and complete periods

**Decision:** CHF and DOT remain separate, and incomplete comparison windows suppress increase/decrease deltas.

**Why:** Frozen money journeys require exact asset separation and prohibit estimates from becoming payment instructions.

**Alternatives:** Converted cross-asset totals and partial-period trend percentages were rejected for V1.

**Tradeoffs:** Some overview states intentionally show less comparison information when the data is incomplete.

**Revisit when:** A later informational analytics layer can label non-instructional estimates unambiguously.

**Approval / version:** V1 review candidate; not approved or Golden.

**Sources:** [Journey 19 specification](../spec.md) [Model tests](./test-model.cjs)

### J19-D03 — Current access constrains current insight

**Decision:** Recompute current insights from groups the viewer may currently access and omit inaccessible private group contribution.

**Why:** Insights must not become a privacy bypass after group access changes.

**Alternatives:** Preserving hidden historical group contribution inside the current aggregate was rejected for V1.

**Tradeoffs:** Historical-looking totals can change when access changes because the current insight is authorization-scoped.

**Revisit when:** A future export or audit policy explicitly defines retained aggregate rights.

**Approval / version:** V1 review candidate; not approved or Golden.

**Sources:** [Journey 19 specification](../spec.md) [Browser QA](../visual-qa/browser-qa.json)

### J19-D04 — Repair continuity drift and approve V1.1 as Golden #19

**Decision:** Preserve the V1 candidate, correct only the fresh-review defects in a separately reviewed V1.1 candidate, restore the canonical Pots / People / raised Add / Activity / You shell, restore the missing scope-picker chevron, add the People boundary preview required by that shell, and approve the resulting exact artifact as Golden #19.

**Why:** Fresh reproducibility review found that V1 had drifted from the frozen global navigation and had a collapsed scope-picker SVG at both target sizes. V1.1 then passed the complete fresh browser, interaction, model and shell-consistency checks and was explicitly approved for freeze.

**Alternatives:** Freezing V1 despite the drift, silently mutating V1 in place, or expanding the review into a broader Insights redesign were rejected. The approved correction remained narrow and preserved the existing Insights information hierarchy.

**Tradeoffs:** V1.1 adds one standalone People boundary preview and changes the global shell presentation to match existing Goldens, increasing the screen/action count while leaving Insights semantics unchanged. The original V1 artifact remains as provenance rather than being rewritten.

**Revisit when:** A future global-navigation redesign is explicitly approved across the product, new research warrants a substantive Insights V2, or evidence shows the current boundary handoffs are materially confusing.

**Approval / version:** v1.1 — design-approved as Golden #19 on 2026-09-10. HTML SHA-256 `c67973e0efc1068d006d57c4d5690b6c49218bd63f24cb62ab587fbf5b9862da`; HTML changes after approval are not authorized. TYPO-01 remains deferred.

**Sources:** [V1.1 visual QA](../review-v1.1/VISUAL_QA.md); [V1.1 QA summary](../review-v1.1/QA_SUMMARY.json); [Journey 19 approval record](../../../registry/approvals/19-v1.1.json); [Golden approval note](../GOLDEN_APPROVAL.md).
