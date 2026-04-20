# Authority Model And Role Policy

<discovery_plan>
- Define who can do what in ChopDot
- Separate identity, session, and role from actual business authority
- Make authority enforceable in the kernel rather than implied in UI
</discovery_plan>

## FACTS

- ChopDot's trust-critical actions include:
  - create commitment
  - invite participant
  - join
  - record contribution
  - request chapter / closeout
  - mark paid
  - confirm receipt
  - close chapter
- Current doctrine already says authority must be explicit and enforced in domain logic.
- Current implementation review shows authority is still too weak in backend settlement flows.

## INFERENCES

- ChopDot needs an explicit role model now, even before advanced identity or wallet adapters exist.
- Session identity is not enough; authority must be derived from role plus action plus object context.

## ASSUMPTIONS

- Current scope is small-group coordination under partial trust.
- Future delegated authority and attestation adapters may arrive later, but current policy should stay simple and enforceable.

## Core Rule

No trust-critical action is valid merely because a user is authenticated.

A trust-critical action is valid only when:

- the actor is identified enough for the action
- the actor has the required role for the object in question
- the object is in a state where that action is allowed
- the action is recorded in typed history

## Current Role Set

## Organizer

Can currently be allowed to:

- create commitments
- invite participants
- configure basic policy surfaces
- request chapter / closeout where appropriate
- view organizer-level status and blockers

Cannot automatically be assumed able to:

- confirm receipt on behalf of another participant
- mark another participant's obligation as paid
- silently close a chapter that still requires participant-side confirmation

## Participant

Can currently be allowed to:

- join a commitment
- view their own obligations and relevant shared state
- mark their own outgoing leg as paid
- confirm receipt for their own incoming leg

Cannot automatically be assumed able to:

- act for other participants
- alter organizer policy
- close a chapter globally unless a policy explicitly allows it

## Observer / Future Roles

Potential later roles:

- treasurer
- registrar
- auditor
- provider-side operator
- delegated approver

These are deferred until the core role model is proven.

## Action Authority Matrix

| Action | Default actor | Required checks |
| --- | --- | --- |
| create commitment | organizer | actor is creator/authorized organizer |
| invite participant | organizer | actor controls invitation on this commitment |
| join commitment | invited participant | actor matches invite or allowed join path |
| record contribution | authorized actor or participant | action policy + contribution context valid |
| request chapter | organizer or policy-authorized actor | actor has chapter-request right on this commitment |
| mark paid | payer on that leg | actor matches `from_participant` |
| confirm receipt | recipient on that leg | actor matches `to_participant` |
| close chapter | system or authorized actor after conditions met | closure conditions satisfied |

## Authority Derivation Rule

Authority must always be computed from:

- actor
- role
- object
- current state
- policy

Never from:

- UI location alone
- cached screen assumptions
- possession of a link alone
- generic session presence

## Session And Identity Rule

Authentication proves who is interacting.
It does not by itself prove what they are allowed to do.

So:

- auth/session is an input
- role assignment is a second input
- object-specific authorization is a third input

All three matter.

## Backend Enforcement Rule

Any action that changes trust-critical state must be enforced in the backend/domain layer.

Frontend gating is useful for UX.
It is not sufficient for authority.

## Visibility Rule

Roles also shape visibility.

Each role should see enough to:

- understand current state
- understand their obligations
- understand blockers

But not more than needed for:

- unrelated participant-sensitive data
- unnecessary payment references
- future verification artifacts

## Policy Override Rule

If a policy later allows delegated or exceptional authority, that policy must be:

- explicit
- scoped
- logged
- time-bounded where possible
- visible in history

Hidden override power is not acceptable.

## Future Compatibility Rule

This policy should remain compatible with:

- wallet-centric identity
- role attestations
- group-level delegated authority
- future registrar / auditor roles

But none of those should be required to make the current kernel correct.

## Immediate Enforcement Requirements

Before the kernel is considered trustworthy enough:

1. `mark paid` must verify the actor is the payer on the leg
2. `confirm receipt` must verify the actor is the recipient on the leg
3. closure must only happen after policy and state conditions pass
4. all authority-relevant actions must be visible in history

## Decision

ChopDot should use role-and-object-specific authority, not auth-only authority.

## Why

Because trust-critical coordination fails when the wrong actor can advance state, even if the UI looked correct.

## Next Move

Use this policy to:

1. tighten backend action handlers
2. update review criteria for Teddy's branch
3. later derive a delegated-authority extension model
