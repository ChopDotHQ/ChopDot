# Kernel Verification

Use this checklist to verify that a branch still preserves the shared commitment kernel.

## Core semantic checks

- [ ] A commitment can be created
- [ ] Participants can join the commitment
- [ ] Contributions can be recorded
- [ ] The system exposes current state clearly
- [ ] The system exposes the next required action clearly
- [ ] Release or close conditions are explicit
- [ ] History is typed and visible
- [ ] Closure is visible when the loop completes

## Contribution and settlement checks

- [ ] A settlement proposal or release request is persisted
- [ ] A payer can mark a leg as paid
- [ ] A counterparty can confirm receipt
- [ ] `paid` and `confirmed` are distinct states
- [ ] The chapter or commitment closes only when the defined conditions are met
- [ ] The full loop survives page refresh

## Builder checks

- [ ] A builder can identify the canonical commitment object
- [ ] A builder can identify the lifecycle states
- [ ] A builder can identify the event model
- [ ] A builder can tell what parts are safe to extend
- [ ] A builder can understand the wedge use case without reading internal strategy notes

## Drift checks

- [ ] The branch still feels like a shared commitment system, not just a balance calculator
- [ ] The branch does not depend on blockchain rails to prove commitment semantics
- [ ] The branch does not hide broken semantics behind toasts or cosmetic UI
- [ ] The branch does not add token, yield, protocol, or booking-engine sprawl

## Suggested basic walkthrough

Walk this path:

1. create a commitment
2. add participants
3. record contribution or compute balances
4. create a proposal / request release
5. mark one leg paid
6. confirm it from the counterparty side
7. verify chapter closure
8. refresh and verify state persists

If this walkthrough fails, the branch is not yet preserving the kernel.
