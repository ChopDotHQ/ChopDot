# Savings Circle Spec

## Purpose

Help a trusted group run recurring contribution rounds and payout order without losing track.

This mode is not a pooled savings account, yield product, escrow product, or automatic payout system.

## Primary Actors

| Actor | Authority |
| --- | --- |
| Organizer | Creates circle, sets policy, opens/closes rounds. |
| Treasurer | Confirms contributions and payout claims. |
| Member | Owes contribution, may claim paid, may receive payout. |
| Viewer | Reads allowed status only. |

## Required Setup

- circle name
- members
- contribution amount
- currency
- round schedule
- payout order
- missed-payment policy
- treasurer/receiver
- closeout rule

## Core Flow

1. Organizer creates a circle and policy version.
2. Organizer opens a round.
3. Required contribution obligations are created for members.
4. Members claim contribution paid through external rail or optional DOT/USDC.
5. Treasurer confirms each contribution.
6. Current payout recipient is visible.
7. Payout claim/confirmation is recorded if used.
8. Round closes only when required contributions are confirmed or exceptions are annotated.

## Must Include

- round status
- payout order
- contribution claims
- receiver/treasurer confirmation
- missed-payment handling
- exception notes
- private closeout receipt per round

## Must Not Include In V1

- pooled custody
- automatic rotation payout
- yield
- public default reputation
- smart-contract escrow
- stored balances controlled by ChopDot

## Closeout Blockers

The round cannot close if:

- a required contribution has no confirmed claim
- an active dispute exists
- a payout/release request is approved but not confirmed
- an unresolved missed payment lacks an exception note

## User Copy

Use:

- `Contribution claimed`
- `Treasurer confirmed`
- `Missed contribution noted`
- `Round ready to close`
- `Round closed`

Avoid:

- `yield`
- `escrow`
- `guaranteed payout`
- `protected savings`
- `automatic release`
