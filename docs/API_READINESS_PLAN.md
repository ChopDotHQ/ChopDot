# API Readiness Plan

<discovery_plan>
- Treat API readiness as a current architecture requirement, not a distant add-on
- Keep the current product subscription-led while ensuring the kernel can be exposed cleanly
- Separate API-ready from API-first
</discovery_plan>

## FACTS

- ChopDot’s current product center is the shared commitment kernel:
  - commitment object
  - participants and roles
  - contribution state
  - approval / release logic
  - chaptered closeout
  - event history
  - visible closure
- The current implementation base is still the `Pot` model on top of `mvp`.
- The current roadmap restores the commitment loop first in a fiat/manual form.

## INFERENCES

- ChopDot should be **API-ready now**, even if the public API is not the first shipped product surface.
- If the kernel is not designed to be exposed by API, then:
  - future builder adoption gets harder
  - internal product surfaces become more coupled to UI assumptions
  - migration and embedding get harder
- The right rule is:
  - **API-ready now**
  - **API-product later**

## ASSUMPTIONS

- You want other builders and future providers to be able to build on top of ChopDot.
- You do not want the current web UI to become the only “real” interface.

## Core Rule

**Every important shared commitment action should be representable as an explicit domain action and event, not just as UI behavior.**

That means the kernel should be buildable behind:
- the current web UI
- future API endpoints
- future widgets
- future provider dashboards
- future agent tools

## What API-Ready Means For ChopDot

API-ready does **not** mean:
- full public developer platform today
- public billing and rate limits today
- external SDKs today
- broad partner program today

API-ready **does** mean:
- stable domain objects
- stable state transitions
- explicit action contracts
- typed event history
- clear auth/authority boundaries
- no critical logic trapped only in component state

## Required Kernel Contracts

These should exist conceptually now, even if the transport is internal first.

## 1. Commitment object contract

Minimum shape:
- `id`
- `kind`
- `title` / `objective`
- `participants`
- `roles`
- `state`
- `target` or `balance context`
- `approval rule`
- `release rule`
- `created_at`
- `updated_at`

## 2. Chapter / closeout contract

Minimum shape:
- `chapter_id`
- `commitment_id`
- `status`
- `legs`
- `requested_by`
- `requested_at`
- `closed_at`

## 3. Settlement leg contract

Minimum shape:
- `leg_id`
- `from_participant`
- `to_participant`
- `amount`
- `currency`
- `status` (`pending`, `paid`, `confirmed`)
- `marked_paid_at`
- `confirmed_at`

## 4. Event contract

Minimum events:
- `commitment_created`
- `participant_invited`
- `participant_joined`
- `contribution_recorded`
- `chapter_requested`
- `settlement_marked_paid`
- `settlement_confirmed`
- `chapter_closed`

## 5. Action contract

Important actions should be modeled like domain commands:
- create commitment
- invite participant
- record contribution
- request closeout
- mark leg paid
- confirm receipt
- close chapter

These are the future API verbs, even if they are internal service calls first.

## What This Changes In The Build

## Today

Teddy should still restore the commitment loop first.

But while doing it, the implementation should follow this rule:

- business logic belongs in domain/service/repository layers
- UI triggers actions
- UI does not define the only valid state transition logic

That way the same logic can be exposed later via:
- REST
- RPC
- server actions
- webhooks
- widgets
- agent tools

## Tomorrow

Once the kernel is stable, ChopDot can expose:

### Internal API first
- used by the web app itself
- used by internal tools
- used by test harnesses

### Partner / builder API next
- commitment creation
- participant management
- event reads
- status polling
- closeout / confirmation actions

### Public platform later
- auth
- keys
- rate limits
- usage billing
- SDKs

## Recommended Near-Term Technical Shape

The product should move toward:

1. **Domain core**
   - shared commitment types
   - chapter types
   - settlement leg types

2. **Action layer**
   - explicit commands / mutations

3. **Repository layer**
   - persistence and retrieval

4. **Surface adapters**
   - web UI now
   - API endpoints later
   - agents later

This preserves flexibility without overbuilding the platform.

## What Would Be Weak

These are signs ChopDot is not API-ready:

- state transitions only happen inside components
- business rules are spread across screens
- history is untyped
- actions are toast-only stubs
- one UI path is the only way to trigger valid closeout
- role/authority checks are implicit

## What Would Be Strong

These are signs ChopDot is becoming API-ready:

- same action works from multiple surfaces
- state transitions are typed and persisted
- events explain every important action
- service-layer functions map cleanly to future endpoints
- auth is separate from authority
- web UI is just one client of the kernel

## Product Implication

This does **not** mean API should become the main product today.

It means:

- the kernel should be exposed-capable
- the UI should be one client
- monetization can still be subscription-led today
- builder/API monetization becomes far more realistic later

## Recommendation

Adopt this rule immediately:

**Build the shared commitment kernel as if a clean API will exist, even if the first customers only use the web app.**

That is the strongest compromise between:
- current wedge discipline
- future builder adoption
- future provider integration
- future agent use
