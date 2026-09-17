# J01 Entry Front Door — Human Gate A decision

Status: **PRODUCT REVIEW — presentation iteration required before Gate A acceptance**

Date: 2026-09-17

Scope: J01 welcome/front-door presentation only. This decision does **not** change the approved identity/session authority model, email-code verification flow, wallet verification semantics, invite continuity, Participant identity, or any production authorization.

## Why this note exists

During the Gate A human walkthrough, the current J01 welcome screen was judged functional but not yet the right ChopDot front door. The screen tried to explain the product before entry with feature rows and supporting copy, which made the first screen feel like a small marketing page rather than a simple product entry surface.

Per the V2 stop rule, this is recorded as an explicit product decision before changing the preview.

## Decision

The default J01 front door should be intentionally minimal.

The first screen should contain only:

1. ChopDot logo / wordmark
2. one short tagline
3. the available sign-in / continue options

The front door should **not** contain general feature education, benefit cards, product-explainer paragraphs, or reviewer/demo chrome in normal mode.

### Product rule

> **The J01 front door is an entry surface, not a landing page.**

It should orient the person, express ChopDot in one line, and let them enter.

## Preserve underneath the new presentation

The existing J01 behavior remains authoritative unless separately reviewed:

- Email + short sign-in code remains the default entry path.
- Wallet sign-in remains an optional alternate path.
- New-person and returning-person paths remain distinct underneath the front door.
- Invite context survives authentication.
- Signing in never joins a group or authorizes payment.
- Session/subject/provenance protections remain unchanged.
- Failure/recovery states remain explicit.

## Remove from the default welcome surface

- `Bring your people.` feature row
- `Keep things clear.` feature row
- `Start with an email. No wallet needed.` explanatory line
- `Demo` / reviewer controls in normal product mode
- any extra product-marketing paragraph whose only purpose is to explain what ChopDot does

These elements may exist elsewhere if useful, but they are not part of the default front door.

## Contextual entry exception

When J01 is entered from a meaningful context such as a group invite, a small amount of context-specific information is allowed because it changes the user's immediate decision.

Example:

- ChopDot logo / wordmark
- short tagline
- `You've been invited to Geneva Weekend`
- sign-in / continue options

This is not general product explanation; it is active journey context.

## Variants to review before code

### Variant A — Pure entry

**ChopDot**

*Shared expenses. Less back-and-forth.*

`Continue with email`

`Use a wallet`

Characteristics:
- minimum possible content
- both entry methods visible immediately
- closest to the current authentication model

### Variant B — Branded entry with one primary action

**ChopDot**

*Shared expenses. Less back-and-forth.*

`Continue with email`

`Use a wallet` shown as a quieter secondary action

Characteristics:
- still two visible methods
- email remains clearly primary
- stronger hierarchy without adding explanation

### Variant C — Neutral sign-in hierarchy

**ChopDot**

*Shared expenses. Less back-and-forth.*

`Continue with email`

`Continue with wallet`

Characteristics:
- treats both methods as parallel sign-in choices
- removes product explanation entirely
- copy is symmetrical and highly functional

## What is not decided yet

- final tagline wording
- exact vertical positioning / whitespace
- whether the wordmark is centered or top-aligned
- exact primary/secondary visual weight of email vs wallet
- whether invite entry uses a small contextual card or one line of contextual text

These should be resolved by comparing a few bounded visual variants, not by widening J01 behavior.

## Acceptance condition

Gate A remains unaccepted until:

1. one minimal J01 front-door variant is selected;
2. it is implemented without changing the approved J01 authority/identity behavior;
3. screenshots are re-captured at the canonical mobile viewports;
4. the front door is re-checked against the UX Laws;
5. Devinson confirms the entry surface feels like the right ChopDot front door.
