# ChopDot Golden Screens & Journeys

## Golden set

1. Home / Orientation — V1.4
2. Create a Group — V2
3. Invite / Join — V1
4. Group Home — V1
5. Add an Expense — V1
6. Review / Correct Expense — V1.1
7. Review / Agree / Raise an Issue — V1.1
8. Overall Position — V1

## Golden Journey #8 — Overall Position

**Version:** V1  
**Status:** Design Approved  
**Approved:** September 4, 2026

Approved rules:

- show gross obligations with net;
- People is the default and Groups is secondary;
- offset only the same people and currency;
- never combine currencies silently;
- optional estimates are visibly approximate;
- open issues affect only relevant balances;
- Settle and Request remain separate journeys.

## Golden Candidate #9 — Settle Up

**Version:** V1  
**Status:** Review pending

Core path:

`Overall Position → Settle with a person → Confirm amount and method → Review payment → Start payment → Journey 12`

Candidate rules:

- one person, currency, and amount per settlement;
- full payment is default and partial payment is deliberate;
- preferred available method appears first;
- external methods never masquerade as automatic payment;
- wallet payments keep the original balance as source of truth;
- no infrastructure mode selector;
- open issues block only the affected settlement;
- balance changes force a fresh review;
- existing in-progress settlements reopen rather than duplicate;
- Journey 12 owns progress, confirmation, failure, proof, and completion.

QA:

- 56 explicit states;
- 203/203 links;
- 96 representative renders;
- both target phone sizes;
- no overflow, frame overlap, clipped rows, or placeholder icons;
- semantic identity and Golden comparison passed.
