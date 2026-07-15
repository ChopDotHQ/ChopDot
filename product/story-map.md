# ChopDot Story Map

Status: `active`
Last updated: 2026-06-29

This is the product truth layer above the cockpit.

The cockpit does not decide what ChopDot is. The cockpit tracks buildable slices
after the story map has named the user journey, order, and desired outcome.

```text
Story map -> Journey review -> Product card -> Screenshot/test evidence -> Cockpit status
```

## Operating Contract

1. The story map owns product sequence.
2. Journey reviews prove a slice of the story map in the real app.
3. Product cards turn one journey slice into buildable work.
4. The cockpit tracks execution, readiness, evidence, and next action.
5. A cockpit "next card" can be skipped or reframed if it does not fit the active story-map sequence.

Do not let the cockpit become the product manager. It is the workbench.

## Current Story Spine

```text
I paid / I need to collect
-> ChopDot captures the moment
-> friends get one obvious action
-> payment is marked or recorded
-> receiver confirms what arrived
-> group closes with a readable saved record
```

## Current Story Map

### S1 Normal Pot Evening Or Trip

Goal: make the basic shared-expense loop feel clean enough for friends to use without coaching.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S1.1 | Track a shared cost | Add Expense | P-018 | done |
| S1.2 | Capture a payment moment | Split this payment | P-001 | done |
| S1.3 | Friend pays from a link | Pay Mina | P-002, P-021 | done |
| S1.4 | Receiver confirms money arrived | Confirm received | P-003 | done |
| S1.5 | Finish and save the record | Close record | P-004 | done |
| S1.6 | Check the full regular pot journey | Review journey | P-022 | done |
| S1.7 | Clean normal journey language | Clean visible copy | P-011 | done |
| S1.8 | Pay with a funded test wallet | Pay Mina | P-023 | done |
| S1.9 | Check wallet currency fit | Check payment | P-024 | done |

Next story-map question:

> Does S2 receipt/photo capture reduce typing without bringing back manual-first forms?

### S2 Receipt / Photo Capture

Goal: reduce typing when Mina has a receipt or payment link.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S2.1 | Add receipt without manual item entry | Add receipt | P-012 | done |
| S2.2 | Review extracted total and people | Review split | P-012 | done |
| S2.3 | Correct details only after capture | Change split | P-012 | done |

### S3 Savings Circle

Goal: help a trusted group run contribution rounds without becoming custody.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S3.1 | Start a circle round | Open round | P-006 | done |
| S3.2 | Member pays contribution | Mark paid | P-006 | done |
| S3.3 | Treasurer confirms received | Confirm received | P-006 | done |
| S3.4 | Handle delay | Record delay | P-006 | done |
| S3.5 | Close round record | Close round | P-006 | done |

### S4 Emergency Pot

Goal: coordinate urgent help with privacy and dignity.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S4.1 | Create private help request | Start pot | P-007 | done |
| S4.2 | Contributor helps privately | Contribute | P-007 | done |
| S4.3 | Organizer confirms receipt | Confirm received | P-007 | done |
| S4.4 | Approvers approve release | Approve release | P-007 | done |
| S4.5 | Save redacted record | Save record | P-007 | done |

### S5 Community Fund

Goal: help small groups manage shared contributions, approvals, releases, and handoff.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S5.1 | Record contribution | Add contribution | P-008 | ready |
| S5.2 | Request spend/release | Request release | P-008 | ready |
| S5.3 | Approve release | Approve | P-008 | ready |
| S5.4 | Record payment made | Mark paid | P-008 | ready |
| S5.5 | Handoff saved record | Export record | P-008 | ready |

### S6 Polkadot-Native Infrastructure

Goal: make infrastructure reduce friction or increase trust invisibly.

Slices:

| Slice | User job | Primary action | Product cards | Status |
| --- | --- | --- | --- | --- |
| S6.1 | Keep native gaps honest | Review boundary | P-010 | blocked-live |
| S6.2 | Use native session only when it helps the story | Sync session | P-010 | blocked-live |
| S6.3 | Save receipt packet | Save record | P-010 | blocked-live |

## Pass Rule

Every implementation pass must close the loop:

```text
Product map -> User journey -> Wireframe/screenshots -> Product card -> Cockpit
```

At the end of a pass, answer:

- Did the story map change?
- Which slice did we prove?
- Did screenshots match the journey?
- Did the card close with evidence?
- What is the next story-map slice, and does the cockpit agree?
