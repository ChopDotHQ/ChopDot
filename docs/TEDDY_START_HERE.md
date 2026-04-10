# Teddy Start Here

<discovery_plan>
- Give Teddy one self-contained starting document
- Capture what ChopDot is becoming, why the current implementation matters, what to build next, what not to build, and when to escalate
- Reduce the handoff to one file plus references
</discovery_plan>

## FACTS

- Your `mvp` cleanup was directionally right in what it removed:
  - wallet complexity
  - chain-first sprawl
  - CRDT/IPFS/bridge experiments
  - broad feature sprawl
- The problem is not that the branch got simpler.
- The problem is that the branch also removed commitment-lifecycle behavior that is core to what ChopDot is now trying to become.

## INFERENCES

- This work is not about restoring old complexity.
- This work is about restoring the correct product center after the cleanup.
- The current build determines whether ChopDot becomes:
  - a clearer expense tool
  - or the first real version of a shared commitment system

## ASSUMPTIONS

- You are building from `mvp`.
- You are using `docs/shared-commitment-kernel-roadmap` as the instruction layer.
- The current target is internal proof, not external hackathon packaging yet.

## What ChopDot Is Becoming

ChopDot is not just trying to be a smaller expense app.

The current direction is a **shared commitment product**.

That means the product should help groups:
- define what they are doing together
- see who is involved
- see what contributions exist
- understand what approvals or confirmations matter
- know when something is actually ready
- know when something is actually closed

This is deeper than:
- expense tracking
- generic group payments
- a booking wrapper

## Core Rule

Keep the simplification wins.

Do **not** bring back:
- blockchain complexity
- wallet complexity
- CRDT/IPFS/bridge complexity
- generalized platform work too early

Restore:
- commitment semantics
- chapter / closeout lifecycle
- confirmation
- typed history
- visible closure

## Why This Matters

If the product can:
- create a chapter / closeout
- express settlement legs clearly
- distinguish `pending`, `paid`, and `confirmed`
- close only when it should
- survive refresh

then ChopDot starts to feel like a real commitment system.

If it cannot do this, it collapses back toward:
- a balance calculator
- a thinner Splitwise-style app

## Important Product Context

### Wedge vs recovery path

The strongest wedge is still:
- group deposits before execution

Examples:
- villa deposit
- retreat deposit
- workshop booking deposit

But the simplest technical recovery path right now is:
- expense closeout chapter

So:
- **wedge = deposits**
- **first recovery slice = closeout**

Do not confuse the two.

### UI / UX

Do not rebuild ChopDot as a new app.

Keep the current shell where possible.

But make the app stop feeling like:
- a list of expenses and balances

and start feeling like:
- a shared commitment with objective, state, next action, blockers, and closure

### API readiness

The company does not need to become API-first right now.

But the kernel must be API-ready.

That means:
- business logic belongs in domain/service layers
- actions should be explicit
- state changes should be typed
- event history should be typed
- UI should be one client, not the only client

### Monetization

ChopDot’s money model today is:
- subscription-led

The buyers today are:
- organizers
- communities
- SMB/provider operators

Later:
- builder/API
- provider infrastructure
- premium trust/proof actions

Not now:
- yield
- custody spread
- token-first economics

### Trust / security / legal posture

Security here is not just cryptography.

It is also:
- who can act
- what was paid
- what was confirmed
- what was approved
- when something is actually closed

Legal/compliance posture matters, so ChopDot is staying:
- coordination first
- proof second
- not custody-first

## What To Build Next

Use `mvp` as the implementation base.

The immediate goal is **not**:
- hackathon prep
- generalized API productization
- restoring chain complexity

The immediate goal is:

**restore the shared commitment kernel so we can test it ourselves first**

## First Proof Slice

The next branch should make this true:

1. a pot/commitment can produce a chapter / closeout proposal
2. settlement legs are typed
3. a leg can move from `pending` -> `paid` -> `confirmed`
4. the chapter closes visibly only when it should
5. state survives refresh
6. history is typed and legible
7. the UI tells the truth about what is happening

## What I Need Back

The next branch back should include:

- restored typed chapter / closeout lifecycle
- persisted settlement actions
- counterparty confirmation
- typed history
- visible closure
- one clean demo path for the first proof slice
- short notes on anywhere the current pot model fights the kernel

## When To Come Back Immediately

Come back immediately if any of these seem true:

- the current pot model cannot support the chapter / closeout loop cleanly
- the chapter model is the wrong shape
- `expense`, `goal`, and `deposit` clearly need diverging lifecycle behavior right now
- API-readiness requires a different service/domain split than the current code allows
- any UI state or trust language feels fundamentally misleading

## References

Read these after this file:

1. `docs/TEDDY_READ_FIRST.md`
2. `docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md`
3. `docs/TEDDY_IMPLEMENTATION_ORDER.md`
4. `docs/TEDDY_UX_MAPPING.md`
5. `docs/TEDDY_FOUNDER_HANDOFF.md`
6. `docs/TEDDY_FULL_CONTEXT_BRIEF.md`

## Additional Context That Now Matters

These are supporting docs, not blockers to the first proof slice.
Use them when you need deeper context on why the architecture and product direction are being held this way.

- `docs/FUTURE_TECH_REPLACEMENT_MAP.md`
- `docs/BUILD_MATRIX_V1.md`
- `docs/SYSTEM_METRICS_AND_FORMULAS.md`
- `docs/ANTIFRAGILITY_AND_FAILURE_LEARNING.md`
- `docs/RESEARCH_AGENDA_TRUST_AND_FAILURE.md`
- `docs/CHAT_SHARE_69D95681_SYNTHESIS.md`
5. `docs/TEDDY_FOUNDER_HANDOFF.md`
6. `docs/TEDDY_FULL_CONTEXT_BRIEF.md`

Then use these as reference:

- `docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md`
- `docs/SHARED_COMMITMENT_KERNEL_SPEC.md`
- `docs/REFERENCE_FLOWS.md`
- `docs/KERNEL_VERIFICATION.md`
- `docs/TECH_ARCHITECTURE_MAP.md`
- `docs/API_READINESS_PLAN.md`
- `docs/FOUNDER_VALIDATION_PLAN.md`
- `docs/DOC_STATUS_MAP.md`

## Best One-Line Summary

You are rebuilding ChopDot so it stops being merely a cleaner expense app and starts becoming a trustworthy shared commitment system that can later support real operator value, recurring revenue, and future builder/API expansion.
