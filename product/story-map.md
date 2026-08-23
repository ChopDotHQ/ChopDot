# ChopDot Public Beta Story Map

Updated: 2026-08-23

ChopDot uses one product loop for every group-money mode:

```text
Catch -> Management -> Payout -> History
```

The public-beta integration story is:

> Mina paid for a group. She scans what happened, reviews the exact amount and
> people, sends each person one clear action, confirms what actually arrived,
> and closes a readable record that the group can recover.

## First viewport

- Primary action: **Scan a receipt**.
- Secondary entry: import a receipt or payment request.
- Fallback: enter an amount manually after capture fails or is unavailable.
- Account choices remain explicit: create account, log in, connect wallet, or
  continue locally as a guest.

## Shared sequence

1. Capture a receipt, transaction, request, contribution, or proposal.
2. Review the draft; nothing shared changes before acceptance.
3. Choose people, roles, exact amounts, currency, and the next action.
4. Send or record payment/contribution actions.
5. Keep marked-paid, cleared, confirmed-received, approved/released, and closed
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
