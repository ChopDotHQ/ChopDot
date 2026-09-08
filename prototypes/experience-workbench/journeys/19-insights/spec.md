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
