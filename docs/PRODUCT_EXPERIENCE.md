# ChopDot Product Experience Constitution

Status: active guardrail for the v1 completion track
Owner: product experience
Applies to: all normal-user surfaces and flows

## Purpose

ChopDot is a group-money product for normal people. The product should make shared spending, settlement, and correction feel obvious and low-stress while keeping the financial truth precise underneath.

Polkadot is an enabling layer, not the product language. If a Polkadot capability makes the experience easier, safer, more portable, or more trustworthy, use it. If it adds visible complexity without user value, keep it behind the boundary.

This document is a Definition of Good, not a visual style guide. `DESIGN.md` defines visual primitives. This file defines how the product should behave and feel.

## Core Experience Promise

A first-time user should understand what happened, what they owe or are owed, and what to do next without needing instructions or crypto knowledge.

The normal journey should compress complexity:

```text
who paid?
what was it?
who shared it?
how much does each person owe?
how should they settle?
is it done?
```

The app should answer those questions directly.

## Product Principles

### PX-001 — One obvious next action

Every normal screen must have one visually dominant next action.

Examples:

- empty group -> `Add expense`
- open balances -> `Request payment`
- payment request -> `Pay` or `I paid`
- received payment awaiting acknowledgement -> `Confirm received`
- finished money state -> `Finish group`

Secondary actions may exist, but must not compete with the primary action.

### PX-002 — Progressive disclosure

Do not ask users to configure complexity before it becomes relevant.

Creating an expense should start with only what is needed to establish money truth:

```text
amount -> what was it -> who paid -> who shares it -> split
```

Advanced split logic, wallet selection, chain details, transaction evidence, or dispute controls should appear only when needed.

### PX-003 — Mistakes should be cheap until money is final

Users must feel safe correcting ordinary mistakes.

Before settlement:

- edit amount
- edit description
- change payer
- change participants
- change split
- delete expense

After settlement activity begins, the product must still support correction, but must preserve history and explain consequences.

Do not create irreversible friction where the underlying action is reversible.

### PX-004 — Money language must be relational

Do not show amounts without explaining what they mean.

Prefer:

```text
Jeanine owes you
CHF 42.50
```

Over:

```text
CHF 42.50
```

Prefer:

```text
Jeanine paid you CHF 42.50 · Cash
Confirmed today
```

Over generic status labels.

### PX-005 — Hide system complexity

Normal UI must not require the user to understand:

- Statement Store
- Host API
- TrUAPI
- adapters
- state machines
- Asset Hub internals
- SS58/H160 distinctions
- block numbers
- RPC endpoints
- proof packets

Expose technical detail only behind a deliberate secondary action such as `View transaction` or developer diagnostics.

### PX-006 — Crypto is a settlement rail, not a mode

A group should not become a different product because someone chooses DOT or USDC.

The interaction is:

```text
How do you want to settle?
Cash
Bank / payment link
DOT
USDC
```

The expense, obligation, history, correction, and confirmation model stays the same.

### PX-007 — Nobody acts unless their money state is affected

Do not force all group members into a settlement ceremony when only two people have an obligation.

Settlement follows optimized obligations, not group membership.

### PX-008 — Recipient experience is a first-class product surface

The payer may never have used ChopDot before.

A request should be understandable from a fresh device:

```text
You owe Dev CHF 32.50
Dinner
Choose how to pay
```

Avoid unnecessary registration, app-download, wallet-creation, or group-navigation steps before the user understands the request.

Fresh-device flows must remain honest about what has and has not synchronized.

### PX-009 — Trust comes from explainability

History must explain how the current balance came to exist.

Good history:

```text
Apartment added · CHF 600
Split with Jeanine
Jeanine owed CHF 300
Expense corrected · total CHF 500
Jeanine now owes CHF 250
Payment requested
Jeanine paid CHF 250 · USDC
Confirmed
```

The user should never need to reconstruct the ledger mentally.

### PX-010 — Polkadot should create magic moments

Use host/app capabilities when they remove steps.

Good candidates:

- use host identity instead of asking for the same identity again
- scan/share a Polkadot identity to add a person
- select an available account without manual address copying
- approve a DOT/USDC payment in the Polkadot App and return to ChopDot
- store transaction evidence without asking the user to paste a hash

If the Polkadot path is more cumbersome than a normal payment path, do not force it.

### PX-011 — Capability failure must degrade honestly

When a host capability is unavailable, the product should say what the user can do next.

Prefer:

```text
Polkadot payment isn't available on this device.
Choose another payment method.
```

Do not show broken controls, protocol errors, or fake success.

### PX-012 — Keep the product socially lightweight

Friends exist to make repeated group-money interactions easier, not to create a social network.

A friend record may hold:

- display identity
- preferred payment methods
- relevant wallet/address references
- prior shared-money context

Do not add feeds, followers, public profiles, engagement mechanics, or social complexity without strong product evidence.

## Screen-Level Heuristics

Before accepting a screen or flow, ask:

1. What question is the user trying to answer?
2. What is the single next action?
3. Can any field or step be inferred or postponed?
4. Can the user safely change their mind?
5. What does the counterparty see?
6. Is the amount and direction of money obvious?
7. Are we exposing architecture because it is convenient for us?
8. Does the experience still make sense if all Polkadot branding is hidden?
9. Does adding Polkadot remove friction, add trust, or add portability?
10. What happens if the user returns three months later?

## Interaction Standards

- Default to direct language and concrete verbs: `Add expense`, `Request payment`, `Confirm received`, `Edit split`.
- Avoid vague finance language such as `execute`, `finalize intent`, `process settlement`, or `resolve state` in normal UI.
- Explain destructive consequences before the action, not after.
- Do not use confirmation dialogs for harmless reversible actions.
- Preserve user-entered values when validation fails.
- Back and cancel behavior must never mutate money state.
- Loading states must not look like success states.
- Empty states should teach the next action, not advertise features.
- Success states should confirm the meaningful result, not merely that a button worked.

## Product Review Gate

Every slice that changes user-visible behavior must document:

```text
User goal
Primary action
Before state
After state
Failure state
Counterparty impact
Recovery path
Why this is the minimum necessary UI
```

A slice fails product review if:

- users must understand internal protocol concepts;
- multiple actions compete without hierarchy;
- a common mistake is unnecessarily irreversible;
- the product claims more synchronization/payment certainty than exists;
- the recipient flow is materially worse than the organizer flow;
- a Polkadot capability is added mainly because it exists rather than because it improves the journey.

## References

- `DESIGN.md` — visual primitives and component styling
- `PORTABLE_SHELL_TRIAL.md` — portable-shell product contract
- `HOSTS.md` — host experience contract
- `docs/CHOPDOT_V1_EXECUTION_BOARD.md` — ordered build plan
