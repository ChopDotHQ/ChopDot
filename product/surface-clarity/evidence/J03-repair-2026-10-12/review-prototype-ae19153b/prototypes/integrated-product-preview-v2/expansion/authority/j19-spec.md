# Journey 19 — Insights

V1 · Candidate #19 · Review pending. Prototype only; not Golden.

## Goal and position

Registry goal: **Understand useful patterns rather than raw transactions.**

Entry: Home, Group Home, or You.  
Exit: the relevant Group Home or Account & Preferences surface.

Insights is a read-only interpretation layer over accepted records the viewer is currently allowed to see. It is not a balance, ledger, payment instruction, financial score, or second Activity feed.

## Main path

Insights → choose period / group scope → read useful pattern → open the relevant group or preference boundary → return.

Default: **Last 90 days · All groups**.

## Candidate rules for approval

1. **Patterns, not raw transactions.** V1 summarizes confirmed shared-spend patterns, group mix, settled/open group count and separately held asset activity. It does not reproduce a transaction ledger.
2. **Read-only.** Opening, filtering or comparing Insights never changes an expense, balance, request, payment, savings position or group.
3. **Like-for-like comparisons only.** CHF compares only with CHF over a comparable completed period. DOT remains a separate asset. No converted aggregate becomes a payment instruction.
4. **Current authorized scope only.** Group details and totals are calculated from groups the viewer may currently access. Losing access removes that group's private contribution from the current insight instead of preserving it in a hidden aggregate.
5. **Latest accepted record wins.** Corrections replace older versions in derived totals. Duplicated deliveries do not double-count. Deleted/currently excluded records are not counted.
6. **Do not overstate incomplete data.** If the current comparison window is partial or still syncing, the current amount may be shown but the increase/decrease comparison is withheld.
7. **Minimum evidence before a trend.** A scope with too little confirmed history shows “Need a little more history” rather than manufacturing a pattern.
8. **No people ranking or trust score.** V1 may identify a group with the largest authorized spend, but it does not rank people or infer reliability, generosity, risk or creditworthiness.
9. **Settled is descriptive, not actionable.** “3 of 4 groups settled” describes period-end state only. Reading the card cannot settle the remaining balance.
10. **Adjacent journeys keep ownership.** Journey 08 owns Group Home. Journey 27 owns account/preferences. Insights does not recreate those controls.
11. **Offline data is visibly stale.** Cached insights may be readable but are not presented as refreshed current truth.
12. **TYPO-01 remains deferred.** This candidate reuses the established typography and visual system without starting the shared readability pass.

## Synthetic review data

The V1 demo uses synthetic records only:

- Last 30 days: CHF 360.00 vs CHF 420.00 previous period.
- Last 90 days: CHF 1,020.00 vs CHF 1,130.00 previous period.
- Last 12 months: CHF 3,820.00 vs CHF 3,650.00 previous period.
- Last 90 days biggest CHF group: Zurich Weekend, CHF 430.00 (42% of CHF shared spend).
- Hackathon: DOT 2.400000 shown separately from CHF.

These figures are demonstration fixtures, not real account data.

## Recovery / edge states

- insufficient history;
- partial/incomplete comparison window;
- offline cached insight;
- load error;
- no insights yet;
- group access changed;
- mixed CHF/DOT history;
- corrected or duplicate records;
- invalid hash/bare entry normalization;
- adjacent Group Home / Account Preferences unavailable in the prototype.

## Visual inheritance

Uses the established ChopDot fixed mobile frame, compact centered headers, neutral white cards, dark primary actions, bottom navigation, line icons, green for confirmed/downward comparison context and pink only for warnings. No new global tab is added: Insights remains a feature entered from Home, Group Home or You.

## Prototype limits

The HTML is standalone and synthetic. It contains no real backend, analytics service, account data, remote font/script/image, payment action or persistence. Native `file://` navigation is blocked in this environment; browser QA uses the exact HTML bytes via Playwright document loading and records that limitation explicitly.

## Decision history

### J19-D01 — Read-only patterns instead of a second ledger
**Decision:** Summarize useful group/spend patterns and route out to canonical destinations.
**Why:** The registry goal is understanding patterns rather than raw transactions; settlement history and Activity already own event/history surfaces.
**Alternatives:** Transaction-style analytics feed. Rejected for V1 because it duplicates Journeys 15 and 18.
**Tradeoffs:** V1 is deliberately selective and will not answer every reporting question.
**Revisit when:** Real usage shows people need deeper analytics rather than clearer summary patterns.

### J19-D02 — Compare only like-for-like currencies and complete periods
**Decision:** CHF and DOT remain separate; incomplete comparison windows suppress deltas.
**Why:** Existing money journeys require exact currency separation and forbid estimates from becoming instructions.
**Alternatives:** Converted cross-asset totals and partial-period trend percentages. Rejected because they can look more authoritative than the data supports.
**Tradeoffs:** Some overview cards show less information when data is incomplete.
**Revisit when:** A later informational analytics layer can label non-instructional estimates unambiguously.

### J19-D03 — Current access constrains current insight
**Decision:** Recompute from groups the viewer may currently access; do not retain hidden private group contribution in current aggregates.
**Why:** Insights should not become a privacy bypass after group access changes.
**Alternatives:** Preserve historical aggregate even after access removal. Rejected for V1.
**Tradeoffs:** Historical totals can change after an access change.
**Revisit when:** A future export/audit policy explicitly defines retained aggregate rights.

<!-- JOURNEY_DECISION_HISTORY:START -->
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
<!-- JOURNEY_DECISION_HISTORY:END -->
