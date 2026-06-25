# ChopDot Product Cockpit Profile

Status: `active`
Owner: ChopDot local product cockpit
Last updated: 2026-06-24

## Mission

ChopDot helps groups handle shared money moments without confusion:

```text
capture what happened -> show who needs to act -> help money move -> confirm what arrived -> close with a readable record
```

The product is not a technical dashboard. It is a group-money coordination app.

## Operating Question

Every active item in this cockpit should answer:

```text
What are we building?
Which real user journey does it improve?
Where does it live in the app?
How do we know it works?
What is still confusing, blocked, stale, or noisy?
Who or what should work on it next?
```

## Product Pillars

| Scope | Meaning | User promise |
| --- | --- | --- |
| Catch | Capture the money moment quickly. | "I can record this before everyone forgets." |
| Management | Show who owes, who paid, who is next. | "Everyone knows their part." |
| Payout | Help money move through the right payment path. | "Friends can pay without learning the whole app." |
| History | Create a readable trusted record. | "Later, the group can understand what happened." |
| Native Stack | Keep Polkadot-native infrastructure aligned to product value. | "The stack makes ChopDot easier or more trustworthy without becoming the UI." |
| Quality / Agent Testing | Keep screenshots, tests, agents, and language checks tied to journeys. | "We catch dead ends before users do." |

## Source Of Truth

The source of truth is:

```text
product/chopdot-product-graph.json
```

Generated files under `product/generated/` and `product/evidence/` are views and proof packets. Do not edit generated files by hand.

## Boundary

The cockpit is an operator/product surface. It must not become normal ChopDot UI.

