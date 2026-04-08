# Shared Commitment Kernel Spec

## Purpose

This document defines the minimum builder-facing kernel for ChopDot.

The goal is not to expose the whole company vision.
The goal is to define the primitive that builders can safely understand and use:

- one canonical shared commitment object
- one lifecycle
- one event model
- one narrow wedge story

## Product sentence

ChopDot Shared Commitment Kernel helps groups move from vague plans to approved, funded action.

## Scope

This kernel is designed first for:

- group deposits
- trip funding
- event funding
- service-linked shared funding

It may later support other wrappers such as:

- milestone release
- expense closeout
- provider-side release workflows

Those later wrappers should still use the same commitment primitive.

## Core object

### SharedCommitment

Required fields:

- `id`
- `kind`
- `title`
- `objective`
- `organizerId`
- `participantIds`
- `baseCurrency`
- `targetAmount`
- `currentAmount`
- `approvalRule`
- `releaseRule`
- `status`
- `createdAt`
- `updatedAt`
- `history`

Recommended optional fields:

- `deadline`
- `description`
- `metadata`
- `linkedObjectRef`

### `kind`

Minimum supported kinds:

- `goal`
- `deposit`
- `expense`

MVP wedge emphasis:

- `goal`
- `deposit`

`expense` remains valid but is not the headline builder story.

## Participants and roles

Minimum role model:

- `organizer`
- `participant`

Minimum participant requirements:

- every commitment has one organizer
- every participant has a stable identifier
- every participant can be in one of:
  - `invited`
  - `joined`
  - `removed`

## Contribution model

In MVP, a contribution is:

- a recorded progress event inside ChopDot
- associated with a participant
- associated with an amount and timestamp

It is not:

- automatic custody
- guaranteed proof of payment by default
- on-chain execution

It may later be connected to:

- manual payment references
- external payment proofs
- on-chain or wallet-backed execution adapters

## Approval and release model

The kernel must support explicit release semantics.

Minimum approval shapes:

- organizer-only
- unanimity of joined participants
- threshold-based approval later

Minimum release rule:

- no release without a valid release request
- release only when approval rule is satisfied

## Lifecycle

Minimum lifecycle for the shared commitment kernel:

- `draft`
- `active`
- `partially_funded`
- `funded`
- `release_requested`
- `released`
- `cancelled`
- `disputed`
- `closed`

For chaptered settlement or closeout flows, the kernel must also support a chapter-style interpretation:

- `draft`
- `active`
- `partially_settled`
- `completed`
- `cancelled`

The exact UI wording may differ, but the system must preserve:

- open state
- in-progress state
- release/approval state
- closed state

## Settlement leg model

For closeout or release flows that require explicit acknowledgement, each leg should have at least:

- `id`
- `fromParticipantId`
- `toParticipantId`
- `amount`
- `status`

Minimum statuses:

- `pending`
- `paid`
- `confirmed`

## Event model

History must be typed and append-only.

Minimum events:

- `commitment_created`
- `participant_invited`
- `participant_joined`
- `contribution_recorded`
- `target_reached`
- `release_requested`
- `release_approved`
- `release_denied`
- `settlement_marked_paid`
- `counterparty_confirmed`
- `chapter_closed`
- `commitment_cancelled`

## Invariants

The following must always remain true:

- a commitment always has a canonical current state
- every visible state transition corresponds to a typed event
- release never happens silently
- closure is visible
- counterparties can distinguish:
  - proposed
  - paid
  - confirmed
- history is durable enough to explain what happened

## What this kernel is not

This kernel is not:

- a booking engine
- a generalized wallet platform
- a custody product
- a token protocol
- a yield system
- an all-on-chain architecture

## Builder extension boundaries

Builders may extend:

- UI
- surfaces
- adapters
- provider workflows
- reference integrations

Builders should not break:

- the shared commitment object
- lifecycle semantics
- approval/release logic
- event-history guarantees
- closure semantics

## Current success criterion

A builder understands the kernel if they can answer:

- what is the commitment object
- what are the states
- what events move it forward
- when can release happen
- what makes a chapter closed
