# Journey 18 — Activity & Notifications

V1 · Candidate #18 · Review pending. Prototype only; not Golden.

## Position and handoff
Journey 17 V1.1 is Golden #17. Journey 18 is the **readable projection and attention-routing layer** for meaningful ChopDot changes. It does not become a second place to approve expenses, execute payments, settle requests, confirm savings, or mutate balances.

Registry goal: **Understand what changed and what needs attention.**

Entry: Activity tab or notification.  
Exit: the canonical journey or detail that owns the underlying item.

## Source basis
The pre-workbench product already treated Activity as a bottom-tab timeline and exposed filtering/refresh. Existing readiness notes also called for a **ChopDot-only activity feed for settlements/requests with no chain-wide transaction spam**. This candidate preserves that useful intent while aligning it with the authority, privacy, recovery, and exact-money rules frozen in Journeys 07–17.

## Main paths
**Activity:** Activity tab → Needs attention / Recent activity → open an item → canonical owning journey → return.

**Notifications:** Bell → unread delivery copies → open notification → re-check current canonical state → owning journey, stale-state explanation, or access-changed state.

**Read state:** Notifications → Mark all read → unread count becomes zero while unresolved attention remains unresolved.

## Candidate product rules for approval
1. **ChopDot-only signal.** Activity contains meaningful ChopDot domain milestones, not chain-wide transactions, RPC polls, provider refreshes, reconnect noise, or idempotency checks.
2. **Attention is separate from chronology.** Items requiring the user's decision or follow-up stay in a distinct **Needs your attention** section while ordinary changes remain chronological.
3. **Activity is read-only.** Opening, filtering, refreshing, or reading the feed never approves an expense, confirms a payment, settles a request, moves savings, or changes a balance. The owning journey performs mutations.
4. **Unread is not unresolved.** Notification read state is personal UI state. Marking notifications read cannot resolve the underlying payment, request, expense, or savings item.
5. **Notification delivery is a copy, not authority.** A notification may contain a snapshot, but opening it re-checks the current canonical state before deciding what the user sees next.
6. **Stale notifications explain the difference.** If a notification said Waiting but the current payment is Complete, the UI says it changed and routes to the current payment record rather than replaying the old action.
7. **Meaningful milestones dedupe technical noise.** One payment remains one readable activity item for a meaningful state; provider/status refreshes do not create feed spam.
8. **Access is checked on open.** Losing group access prevents Activity from restoring current private group details. A minimal personally relevant saved payment record may remain only where the already-approved history policy permits it.
9. **Exact currencies and assets stay separate.** CHF, EUR, DOT, etc. remain exact and distinct. Activity never invents a converted total or payment instruction.
10. **Offline data is visibly stale.** Saved activity may remain readable offline, but refresh cannot invent new events or imply that the projection is current.
11. **Unread badge count and attention count are independent.** The bell may show two unread notifications while three underlying items still need attention.
12. **Filtering changes presentation only.** All / Needs attention / Payments / Groups changes the view, not canonical domain state.
13. **Adjacent screens are previews only.** Handoffs identify the canonical owner journey; they do not claim cross-journey execution is implemented in this prototype.
14. **No dead search surface.** V1 intentionally omits search rather than presenting a non-functional control. Search can be proposed later when activity volume justifies it.

## Authority
- **Canonical domain/backend:** owns expense, request, payment, membership, savings, access, and balance truth.
- **Activity projection:** reads accepted domain events, dedupes meaningful milestones, derives chronological and attention views, and supplies navigation targets.
- **Notification delivery:** carries a recipient-scoped snapshot and read/unread metadata. It cannot create domain authority.
- **User:** may read, filter, mark delivery copies read, or navigate to the owning journey.
- **ChopDot UI:** may render the projection and current state. It cannot fabricate resolution or infer payment finality from delivery/read state.
- **LLM/agent:** may summarize or route. It cannot execute underlying financial or approval actions merely because an Activity item exists.

## Privacy and retained history
Activity re-checks current access at open time. Ordinary group details disappear when access is revoked. Personally relevant payment history follows Journey 15's already-approved minimal retained-record policy; Activity does not expand that policy.

Notification content should be the minimum needed to identify the change and next action. Secrets, wallet keys, raw provider payloads, chain internals, or unrelated group data do not belong in Activity.

## Recovery and edge cases
- stale notification whose canonical state changed;
- group access removed after notification delivery;
- offline/cached feed;
- load error and retry;
- empty Activity and empty Notifications;
- mixed CHF/DOT activity;
- repeated technical payment refreshes;
- notification read state changed while attention remains open;
- current canonical record unavailable;
- adjacent owning journey unavailable in the prototype.

## Visual inheritance
Uses the established fixed phone frame, neutral surfaces, compact headers, bottom navigation, white cards, Polkadot pink only for attention/problem emphasis, green only for confirmed positive outcomes, line icons, and short human copy. No shared typography changes. **TYPO-01 remains deferred.**

The root deliberately removes the older balance summary and settle promotion from Activity. Those concerns already have canonical homes; Activity should stay focused on **what changed and what needs attention**.

## Prototype behavior and limits
The candidate is a single self-contained HTML file. Hash navigation simulates state transitions and adjacent-journey handoffs. It makes no network requests and contains no real backend, push delivery, device notification permission, payment, wallet, custody, authentication, or persistence.

## Decision history

### J18-D01 — Keep Activity ChopDot-only
**Decision:** Show meaningful ChopDot changes and suppress chain/provider technical noise.
**Why:** Existing readiness material explicitly called for a simple ChopDot-only activity feed and no chain-wide transaction spam; technical refreshes would make the feed harder to trust.
**Alternatives:** Full chain/provider event stream. Rejected for the user-facing feed.
**Tradeoffs:** Technical diagnostics need a separate engineering surface.
**Revisit when:** A user-facing technical event itself becomes a meaningful decision or safety signal.

### J18-D02 — Separate attention from unread
**Decision:** Unresolved tasks and unread delivery copies are independent states.
**Why:** Reading a message does not confirm receipt, settle money, agree to an expense, or resolve a request.
**Alternatives:** Clear attention when opened/read. Rejected because it conflates UI consumption with domain resolution.
**Tradeoffs:** Two counts can coexist and need clear labels.
**Revisit when:** Research shows the distinction is still confusing despite explicit wording.

### J18-D03 — Activity routes; canonical journeys mutate
**Decision:** Activity is read-only and hands off to Journeys 04/05/06/07/08/11/12/13/15/16 as applicable.
**Why:** Mutation authority is already designed and frozen in those journeys. Duplicating actions in the feed would create inconsistent recovery and authorization behavior.
**Alternatives:** Inline approve/pay/settle controls. Rejected for V1.
**Tradeoffs:** Some actions take one extra tap.
**Revisit when:** A later version can reuse the exact canonical action contract without duplicating authority or recovery logic.

### J18-D04 — Re-check notification state on open
**Decision:** Notification text is a snapshot; opening it resolves against current canonical state and current access.
**Why:** Delivery can be delayed or stale, and access can change after delivery.
**Alternatives:** Replay the notification's original destination/action unconditionally. Rejected as unsafe and confusing.
**Tradeoffs:** The opened view can differ from the notification text, so the UI must explain why.
**Revisit when:** Notification infrastructure can guarantee atomic current-state deep links without weakening access checks.

### J18-D05 — Preserve exact asset separation in the feed
**Decision:** Never combine CHF and DOT into a converted activity total or instruction.
**Why:** This follows the frozen money rules from settlement and savings journeys.
**Alternatives:** Display a converted aggregate. Rejected because estimates can be mistaken for payable amounts.
**Tradeoffs:** Cross-asset activity is less compressible into one number.
**Revisit when:** Only for an explicitly informational analytics journey with clearly non-instructional estimates.

### J18-D06 — Omit search until it is functional and justified
**Decision:** V1 uses four compact filters and intentionally ships no search control.
**Why:** A static search-looking surface would be a dead control; the current example volume is navigable without it.
**Alternatives:** Decorative/inert search or a larger search implementation in this journey. Rejected for V1.
**Tradeoffs:** Very large histories will eventually need stronger retrieval.
**Revisit when:** Real feed volume makes filters insufficient.
