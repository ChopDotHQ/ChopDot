# Security Privacy Review

## Purpose

This is a founder/operator review, not a final security audit.

Use it to identify whether the shared commitment MVP is:

- honest
- constrained
- clear about trust boundaries
- careful with participant data

## Core trust questions

Ask these while using the product:

- Can a user tell what state the commitment is in?
- Can a user tell the difference between `pending`, `paid`, and `confirmed`?
- Can a user tell whether release has only been requested versus actually completed?
- Can a user tell who still needs to act?
- Can a user tell when a chapter is really closed?

If the answer to any of these is no, the product is creating trust confusion.

## Security review areas

## 1. State integrity

Questions:

- Can a user trigger closure too early?
- Can a user mark something paid that should not be payable yet?
- Can a user confirm receipt without the right role or context?
- Can a stale page lead to incorrect actions?

Desired property:

- state transitions happen only when allowed

## 2. Identity and participant actions

Questions:

- Is it clear who is organizer versus participant?
- Are invited and joined participants distinct in the logic?
- Can the wrong person perform a confirming action?

Desired property:

- the product does not blur who has authority to act

## 3. Misleading UI

Questions:

- Does the product show wallet/checkpoint/auditable affordances that do nothing meaningful?
- Does the product imply proof where only self-report exists?
- Does the product imply custody or execution where it is only coordination?

Desired property:

- the product does not overclaim trust guarantees

## Privacy review areas

## 1. Data visibility

Check what is visible to whom:

- participant names
- contribution amounts
- settlement status
- payment references
- receipt/proof metadata if added later

Questions:

- Is each piece of data visible only to the people who need it?
- Is anything exposed broadly that should stay within the commitment participants?

## 2. Data retention

Questions:

- What commitment history is retained?
- Is old history still visible after closure?
- Is there any sensitive freeform text or reference data that should be minimized?

Desired property:

- keep enough history for trust and explainability, but avoid careless over-collection

## 3. Future-sensitive fields

Watch for future creep around:

- wallet addresses
- payment references
- bank details
- receipts
- external proofs

Desired property:

- current MVP should not accidentally normalize collecting more sensitive data than needed

## Review template

| Area | Question | Pass? | Risk level | Notes |
| --- | --- | --- | --- | --- |
| State integrity | Can closure happen too early? | yes/no | low/med/high | notes |
| Trust clarity | Can users distinguish paid vs confirmed? | yes/no | low/med/high | notes |
| Authority | Is actor authority clear? | yes/no | low/med/high | notes |
| Privacy | Is participant data scoped correctly? | yes/no | low/med/high | notes |
| UI honesty | Does UI imply capabilities it does not have? | yes/no | low/med/high | notes |

## Decision rule

The MVP is not ready for builders if:

- users can misunderstand whether money really moved
- closure can happen incorrectly
- the UI implies guarantees that do not exist
- participant-sensitive data is exposed too broadly
