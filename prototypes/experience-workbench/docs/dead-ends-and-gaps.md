# Dead Ends, Orphans & Staleness Controls

This is a product-control document, not a visual artifact.

## Rules
1. Every production screen must belong to at least one registered user journey.
2. Every journey state needs an entry and a meaningful exit.
3. A terminal state must explicitly communicate completion; otherwise it needs a next action.
4. A feature does not deserve to survive merely because code exists. It must map to a user goal.
5. Approved prototypes/decisions are product truth until deliberately revised.
6. Production is implementation truth and may lag product truth.
7. If later work invalidates an approved decision, mark it **Needs revisit** rather than silently overwriting it.
8. A journey cannot be marked **Production Verified** until relevant happy, empty, loading, error, offline, permission, and recovery states have been reviewed.
9. Duplicate flows solving the same user goal must be consolidated or intentionally differentiated.
10. Deep links and notifications must resolve to a live, understandable destination.
11. Review-ready prototypes may not contain placeholder Unicode/emoji icons.
12. Visual QA must inspect rendered output, not just HTML/CSS.

## Current flags
- Journey 02 Home: Golden Screen #1 / Design Approved; production mismatch is expected.
- Home mixed-currency aggregate presentation remains unresolved.
- Home loading / initial-sync / refresh presentation remains unresolved.
- Production currently maps Activity to Lucide `Home`; semantic review remains open.
- Journey 03 Create Group: V1 exists but predates the inherited design system and is not Golden.
- Journey 04 Invite/Join: mechanics exist in production, but no approved end-to-end UX yet.
- Journey 07 confirmation/attestation is partial and not yet one coherent approved flow.
- Journey 11/12 settlement mechanics span several screens and need one coherent approved journey.
- Savings is intentionally separated from core expense-group creation.
- Journey 28 recovery is cross-cutting and currently under-specified.

## Dead-end test

For every screen/state ask:
- Where did I come from?
- What happened here?
- What can I do next?
- Can I safely go back/cancel?
- If the action failed, what is the recovery path?

If any answer is unclear, the journey is not finished.
