# Certified Task Friction

**Derived diagnostic — not product authority.** User-step counts exclude prototype-only/system progression and count required input groups as one interaction step each.

Certified tasks: **31** across **6 journeys**. Semantic-only tasks without approved UI: **1**.

## Task metrics

| Task | Journey | Min steps | Typical | Entry included | Band |
|---|---|---:|---:|---:|---|
| Add common equal-split expense | J05 | 4 | 4 | 1 | short |
| Add expense with another payer | J05 | 6 | 6 | 1 | moderate |
| Add equal expense for two participants | J05 | 7 | 7 | 1 | longer_precision_path |
| Add exact-split expense | J05 | 9 | 9 | 1 | longer_precision_path |
| Add shares-based expense | J05 | 9 | 9 | 1 | longer_precision_path |
| Add expense with receipt | J05 | 8 | 8 | 1 | longer_precision_path |
| Edit an existing expense | J06 | 4 | 4 | 1 | short |
| Delete an owned expense | J06 | 4 | 4 | 1 | short |
| Inspect expense history and return | J06 | 3 | 3 | 1 | short |
| Inspect receipt and return | J06 | 3 | 3 | 1 | short |
| Hand another member to expense review | J06 | 2 | 2 | 1 | very_short |
| Agree that an expense looks right | J07 | 2 | 2 | 1 | very_short |
| Raise an issue about your share | J07 | 4 | 5 | 1 | short |
| Withdraw a raised issue | J07 | 2 | 2 | 0 | very_short |
| Reply to an expense issue | J07 | 2 | 3 | 0 | very_short |
| Agree after an expense changed | J07 | 1 | 1 | 0 | very_short |
| Accept an owner's reply | J07 | 1 | 1 | 0 | very_short |
| Keep an issue open after owner reply | J07 | 3 | 4 | 0 | short |
| Open Add Expense from Group Home | J08 | 1 | 1 | 0 | very_short |
| Open review task from Group Home | J08 | 1 | 1 | 0 | very_short |
| Open balances from Group Home | J08 | 1 | 1 | 0 | very_short |
| Open settlement from Group Home | J08 | 1 | 1 | 0 | very_short |
| Start first expense from empty group | J08 | 1 | 1 | 0 | very_short |
| Prepare default full TWINT settlement and hand off | J11 | 3 | 3 | 1 | short |
| Prepare partial TWINT settlement and hand off | J11 | 5 | 5 | 1 | moderate |
| Prepare bank-transfer settlement and hand off | J11 | 5 | 5 | 1 | moderate |
| Prepare wallet settlement and request approval | J11 | 5 | 5 | 1 | moderate |
| Record an external cash/other payment handoff | J11 | 5 | 5 | 1 | moderate |
| Mark TWINT payment sent and reach waiting state | J12 | 2 | 2 | 0 | very_short |
| Receiver confirms receipt and sees settlement complete | J12 | 2 | 2 | 0 | very_short |
| Complete a full external/manual settlement across payer and receiver | J12 | 4 | 4 | 0 | short |

## Coverage gaps

- **Start explicit whole-group closeout** (TASK-GROUP-CLOSEOUT-START) — The approved hybrid lock policy defines GroupCloseoutContext semantics, but no frozen Golden currently defines the normal user control/path that starts a whole-group closeout.

## Reading the counts

- `minimum_user_steps` = required inputs + deliberate user actions inside the journey.
- `typical_user_steps` additionally includes expected-but-optional inputs such as an issue note or reply content.
- `end_to_end_*` adds a certified predecessor entry action when one is defined.
- Prototype `Continue` controls used only to advance saving/review fixtures are verified but excluded from user-effort counts.
- Cross-actor handoffs are coordination boundaries and do not count as clicks.

