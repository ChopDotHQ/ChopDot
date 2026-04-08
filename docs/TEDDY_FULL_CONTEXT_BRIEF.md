# Teddy Full Context Brief

<discovery_plan>
- Consolidate the strategic, technical, financial, and business reasoning behind the current ChopDot direction
- Give Teddy the “why” behind the work, not only the task list
- Make clear what ChopDot is becoming, how it makes money, and why the implementation constraints matter
</discovery_plan>

## FACTS

- The `mvp` cleanup direction was broadly right in what it removed:
  - wallet complexity
  - chain-first sprawl
  - CRDT/IPFS/bridge experiments
  - broad feature sprawl
- The `mvp` branch also removed commitment-lifecycle behavior that is core to the current ChopDot thesis.
- ChopDot’s current product direction is now:
  - shared commitment kernel
  - coordination first
  - proof second
  - chapter / closeout loop first
  - API-ready architecture
  - subscription-led monetization now

## INFERENCES

- Your work is not about rebuilding the old app.
- Your work is about recovering the right product center after the cleanup.
- The current build matters because it determines whether ChopDot becomes:
  - a clearer expense tool
  - or the first working version of a shared commitment system

## ASSUMPTIONS

- You are building from `mvp`.
- You are using `docs/shared-commitment-kernel-roadmap` as the instruction layer.
- The current objective is internal proof, not external hackathon packaging yet.

## 1. What ChopDot Is Becoming

ChopDot is being sharpened into a **shared commitment product**.

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

The current build should prove:
- visible state
- visible next action
- visible blockers
- visible closure

## 2. Why The Chapter / Closeout Loop Matters

The first technical recovery path is the chapter / closeout loop because it is the smallest test of the whole commitment thesis.

If the product can:
- create a closeout or chapter
- express settlement legs clearly
- distinguish `pending`, `paid`, and `confirmed`
- close only when it should
- survive refresh

then ChopDot starts to feel like a real commitment system.

If it cannot do this, it collapses back toward:
- a balance calculator
- a thinner Splitwise-style app

## 3. Why Group Deposits Still Matter

The strongest wedge is still:
- group deposits before execution

Examples:
- villa deposit
- retreat deposit
- workshop booking deposit

This matters because deposits make the commitment logic urgent.

But the easiest technical recovery path right now is expense closeout.

So:
- **wedge = deposits**
- **first recovery slice = closeout**

Do not confuse the two.

## 4. Why The UI/UX Mapping Matters

ChopDot does **not** need a totally new app shell.

It does need the current app to stop feeling like:
- a list of expenses and balances

and start feeling like:
- a shared commitment with objective, state, next action, and closure

That is why Pot Home, Settle, Members, and History all need different emphasis now.

## 5. Why API Readiness Matters

The company does not need to become API-first right now.

But the kernel must be API-ready.

That means:
- logic belongs in domain/service layers
- actions should be explicit
- state changes should be typed
- event history should be typed
- UI should be one client, not the only client

This matters because future:
- builders
- provider integrations
- widgets
- agent surfaces

all depend on the kernel being cleanly exposable.

## 6. Why Monetization Matters To The Build

ChopDot’s money model now is:
- subscription-led today
- premium trust/proof usage later
- builder/API later

This means the product should be shaped to create value for:
- organizers
- communities
- SMB/provider operators

It should **not** be shaped primarily around:
- yield
- custody spread
- token-first economics
- hidden transaction margins

So the build should make ChopDot feel worth paying for because it provides:
- trust
- coordination clarity
- closure

## 7. Why Security And Trust Semantics Matter

The security issue is not only cryptography.

The deeper security issue is whether the product lies or confuses:
- who can act
- what was paid
- what was confirmed
- when something is actually closed

That is why:
- confirmation
- authority
- typed history
- honest state rendering

are core product work, not polish.

## 8. Why Legal / Compliance Posture Matters

ChopDot should launch in a safer perimeter:
- coordination first
- proof second
- no custody-first product shape

That means the build should not quietly drift into:
- pooled funds
- hidden treasury logic
- faux-financial-intermediary behavior

This matters because architecture and product language shape legal posture.

## 9. Why The Business Angle Matters

ChopDot is not being built only as a product demo.

It is being built to become a real business.

Today that means:
- subscription value for operators

Tomorrow that may mean:
- builder/API
- provider workflow infrastructure
- premium trust actions

So the current build needs to create a product that:
- someone can trust
- someone can repeat
- someone can pay for

## 10. The Current Company Logic

### Today

Build:
- shared commitment kernel
- chapter / closeout recovery
- operator-grade clarity

Sell:
- organizer / community / SMB value

Protect:
- trust semantics
- state integrity
- legal perimeter

### Tomorrow

Expand to:
- provider workflows
- builder/API
- bounded agent surfaces
- selective proof and tokenization adapters

## 11. What Not To Do

Do not:
- rebuild the app as a new product
- restore chain/wallet complexity just because it existed before
- build generalized platform/API before the kernel works
- optimize for hackathon packaging before founder validation
- drift back into generic expense-app behavior

## 12. The Most Important Build Rule

**Keep the simplification wins, but restore commitment semantics.**

That is the whole point of the current direction.

## 13. What Success Looks Like

The first successful branch back should make this true:

1. a commitment/chapter exists
2. a closeout can be proposed
3. a leg moves from `pending` to `paid`
4. the counterparty can confirm it
5. closure happens visibly and only when it should
6. state survives refresh
7. the UI tells the truth about what is happening

## Best One-Line Summary

**You are rebuilding ChopDot so it stops being merely a cleaner expense app and starts becoming a trustworthy shared commitment system that can later support real operator value, recurring revenue, and future builder/API expansion.**
