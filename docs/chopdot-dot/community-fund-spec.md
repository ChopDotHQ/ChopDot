# Community Fund Spec

## Purpose

Help small groups manage shared contributions, approvals, releases, and handoff without becoming a DAO, bank, or treasury custodian.

## Primary Actors

| Actor | Authority |
| --- | --- |
| Admin | Creates fund period, manages roles, closes period. |
| Approver | Approves, denies, or requests review for releases. |
| Contributor | Records incoming contribution claims. |
| Payer | Records external payment/release claims. |
| Receiver | Confirms receipt or beneficiary status. |
| Viewer | Reads allowed status and receipt. |

## Required Setup

- fund name
- period
- admins
- approvers
- approval rule
- categories
- contribution expectations
- receiver/beneficiary policy
- closeout rule

## Core Flow

1. Admin opens a fund period.
2. Contributors record incoming contribution claims or external treasury references.
3. Admin/treasurer confirms incoming contributions where needed.
4. Member creates release/spend request.
5. Approvers approve, deny, or request review.
6. Payer records external payment or transfer.
7. Receiver/beneficiary confirms where needed.
8. Period closes with receipt showing approved releases, unresolved items, and evidence refs.

## Must Include

- roles: admin, approver, contributor, receiver, viewer
- contribution records
- release requests
- approval states
- spend/payment claim
- confirmation
- period closeout
- export for next treasurer or reviewer

## Must Not Include In V1

- DAO governance claims
- treasury custody
- automatic multisig execution
- investment/yield language
- public proof of sensitive member or payment details

## Closeout Blockers

The fund period cannot close cleanly if:

- an approval request is pending
- an approved release is not claimed or confirmed
- active disputes exist
- required contribution claims remain unconfirmed

It can close with open items only when each blocker is annotated and visible in the receipt.

## User Copy

Use:

- `Release requested`
- `Approved`
- `Needs review`
- `Payment claimed`
- `Receiver confirmed`
- `Period closed`

Avoid:

- `DAO vote`
- `treasury execution`
- `escrow`
- `automatic payout`
- `investment return`
