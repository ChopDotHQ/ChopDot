# ChopDot Public Beta Story Map

**Kind:** reference
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** subordinate journey composition reference only; `PRODUCT_TRUTH.md`, the benchmark baseline, active Cockpit decisions/cards, and roadmap phase exits win
**Sources:** `PRODUCT_TRUTH.md`, `product/benchmark-baseline.md`, `product/cards.md`, `product/decisions.md`, `product/roadmap.md`

ChopDot uses one product loop for every group-money mode:

```text
Catch -> Management -> Payout -> History
```

One bounded Catch integration example is:

> Mina paid for a group. She scans what happened, reviews the exact amount and
> people, sends each person one clear action, confirms what actually arrived,
> and closes a readable record that the group can recover.

This example does not define the whole product, the universal Home action, or
the operator priority. Category completeness is governed by the benchmark
baseline and phase exits.

## Contextual first viewport

- Every first viewport has one dominant action selected from the observed user
  state; there is no universal action for every participant.
- A participant entering the Catch route with a spend sees **Scan a receipt**,
  with import/link next and manual correction only as fallback.
- A participant intentionally starting a shared group sees **Create my group**.
- An invite recipient, returning group member, or recovering participant sees
  the single action required by that state.
- Account choices remain explicit when relevant: create account, log in,
  connect wallet, or continue locally as a guest.

## Shared sequence

1. Enter the relevant group state: create, join, return, contribute, capture,
   confirm, close, or recover.
2. Create or review the bounded draft; nothing shared changes before the
   responsible participant accepts.
3. Choose only the people, roles, exact amounts, currency, and next action
   required by that state.
4. Send, perform, or record the relevant payment/contribution action.
5. Keep requested, marked-paid, cleared, confirmed-received,
   approved/released, and closed
   states distinct.
6. Correct by append-only events; never rewrite accepted history.
7. Close or advance the mode through a readable saved record.
8. Restore from the participant-held signed log and encrypted checkpoints.

## Mode baselines

- Normal pot, trip, couple: capture -> split -> request -> pay -> confirm -> close.
- Spend Card: import transaction -> attach receipt -> review -> normal loop.
- Savings circle: rules -> contributions -> payout -> recipient confirm -> next round.
- Emergency pot: private request -> threshold -> release -> recipient confirm -> redacted record.
- Community fund: contribute -> propose -> approve -> release -> confirm -> handoff/report.

No mode may introduce a second money, membership, recovery, or closeout authority.
