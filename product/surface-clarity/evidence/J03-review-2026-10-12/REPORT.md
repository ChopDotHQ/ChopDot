# J03 Create group — partial review / confirmed repair proposal

2026-10-12. Runtime c59073cf (same runtime as user-accepted J02).
No repair code changed. J03 is not accepted; stop for proposed repair review.

## Actual observation

Guest Home → Start a group → enter J03 currency review → Currency → EUR.
Without clicking Create group, the UI shows Group created, EUR and 0 expenses.
Reload returns Home with that group saved. This is an actual effect, not just a
static success preview. Current wrapper handles #success-eur as rememberGroup(EUR).
USD has the same source handler; it was not separately replayed in this review.
CHF returns to entry. The current creation-owner integration already demonstrates
selection-then-explicit-create semantics, but its separate path was source-read only.

What works in this sample: name/currency are legible; success shows the actual
name/currency, one person, zero expenses and next-step exits; reload projects the
saved group. This does not qualify the whole J03 or its downstream exits.

Source: J03 spec and J03-D01 require Name → Currency → explicit Create → success.
create-join/README.md records the same integration rule. Frozen sources stay intact.
Finding SC-J03-001: guest currency selection performs creation prematurely.

## Bounded proposal

Currency selection SHALL change only the canonical creation draft and return to
entry, showing the retained name and selected currency. Group creation SHALL occur
only on explicit Create group, once. Back/reopen/reload SHALL retain the draft;
selection/cancellation SHALL preserve already saved groups and expenses.
Use existing draft/creation-owner semantics; no second business-state store.
Preserve the approved visual hierarchy, guest/account boundaries, financial rules,
J02 acceptance, and current J04/J05 handoff meanings. No redesign or frozen edit.

User journey: I am creating a group, I need to choose its name and currency before
committing, so the group starts with the intended settings.
One next action: Create group after confirming the displayed name/currency.
Friction 3/3, Trust 3/3, Clarity 2/3, Language 1/1 = 9/10 (prediction, not user study).

If authorized: replay CHF/EUR/USD choice → entry → explicit create; cancel/back
and draft reload; preserve existing records; save-once success and J03 exit-owner
handoffs. Inspect 393x852/430x890; run only relevant existing creation checks.
Show the repaired screens/preview and stop for acceptance before J04.

## Evidence and limits

Captured images: eur-created-without-create.jpg and home-persisted-eur.jpg.
Reviewed on isolated origin 4190; original J02 preview data on 4189 is preserved.
No invitation sent. J04/J05 were not reviewed or implemented here; J05 proposal
is parked. Account creation, offline/error states and full J03 coverage remain
unreviewed. No broad tests or additional evidence tooling run.
Documentation impact: J03 record/finding and this brief proposal; no wiki/ADR
needed for the proposed integration correction unless scope changes.
