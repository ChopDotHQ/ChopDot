# Emergency Pot Spec

## Purpose

Coordinate urgent help with accountability and dignity.

This mode is privacy-first. It must not create public shame, public donor lists, public recipient identity, or permanent public emergency details by default.

## Primary Actors

| Actor | Authority |
| --- | --- |
| Organizer | Creates pot, sets privacy and approval rule, manages closeout. |
| Recipient | Receives help or is represented by organizer. |
| Contributor | Pledges or claims contribution outside ChopDot. |
| Approver | Approves release readiness. |
| Viewer | Sees only scoped/redacted status. |

## Required Setup

- reason category
- minimum necessary reason text
- privacy level
- target amount
- currency
- recipient or recipient alias
- approval rule
- contributor visibility policy
- closeout rule

## Core Flow

1. Organizer creates emergency pot.
2. Contributors pledge or claim external contribution.
3. Organizer/receiver confirms contribution where appropriate.
4. Approvers approve release readiness.
5. Release is claimed outside ChopDot.
6. Receiver/organizer confirms what was received or released.
7. Closeout is full, partial, unresolved, or voided with annotations.
8. Export defaults to redacted receipt.

## Must Include

- privacy-first setup
- minimum necessary reason text
- contributor visibility controls
- approval list
- contribution claims
- release confirmation
- redacted closeout receipt

## Must Not Include In V1

- public donor wall by default
- public recipient identity
- public emergency details
- automatic payout
- custody
- permanent public proof containing sensitive data

## Closeout Blockers

The pot cannot close cleanly if:

- release approval is still pending
- contribution claims remain unconfirmed and required
- release is claimed but not confirmed
- active disputes exist

It may close with open items only when unresolved items are explicitly annotated and the receipt is marked `closed_with_open_items`.

## Redacted Receipt Defaults

Redacted receipts must exclude:

- contributor names unless explicitly allowed
- recipient identity unless explicitly allowed
- payment references
- private notes
- sensitive reason text

They may include:

- aggregate amount
- closeout state
- timestamps
- policy hash/reference
- unresolved item count
- non-sensitive evidence references
