# Tech Architecture Map

## Purpose

This file maps the shared commitment thesis onto the actual ChopDot system shape.

The goal is to make it obvious:

- what the product core is
- what the current implementation base is
- what layers are active now
- what layers are future-facing
- where complexity should stay out for now

## High-level map

```mermaid
flowchart TD
    A["Shared Commitment Product"] --> B["Domain Core"]
    A --> C["Policy / Rules"]
    A --> D["Event History"]
    A --> E["Execution Actions"]
    A --> F["Surfaces"]

    B --> B1["Commitment / Pot"]
    B --> B2["Participants / Roles"]
    B --> B3["Chapter / Closeout"]
    B --> B4["Settlement Legs"]

    C --> C1["Approval Rule"]
    C --> C2["Release Rule"]
    C --> C3["Closure Conditions"]

    D --> D1["Typed Events"]
    D --> D2["Current State"]
    D --> D3["Replay / Explainability"]

    E --> E1["Record Contribution"]
    E --> E2["Request Release"]
    E --> E3["Mark Paid"]
    E --> E4["Confirm Receipt"]
    E --> E5["Close Chapter"]

    F --> F1["Current Web App"]
    F --> F2["Share Links"]
    F --> F3["Future Builder / Agent / Provider Surfaces"]

    G["Current Persistence"] --> B
    G --> D
    G --> E

    H["Deferred Rail / Infra Layer"] -.-> E
    H -.-> F

    H1["Blockchain / Wallet Rails"] -.-> H
    H2["CRDT / Sync / Backup"] -.-> H
    H3["Builder APIs / Hackathon Package"] -.-> H
```

## Current implementation mapping

## Active now

These are the layers that should be active in the current implementation pass:

| Layer | Current reality | What to do now |
| --- | --- | --- |
| Domain core | implemented through `Pot` and related state | keep `Pot` as base, restore commitment semantics on top |
| Chapter / closeout | currently overcut on `mvp` | restore typed lifecycle and settlement legs |
| Policy / rules | lightweight and partly implicit | make release/closure conditions explicit enough for the loop |
| Event history | currently degraded on `mvp` | restore typed append-only history |
| Execution actions | partly stubbed on `mvp` | make mark-paid / confirm / close durable and real |
| Web surface | current app shell exists | keep shell, change product meaning and state exposure |

## Deferred now

These should remain deferred:

| Layer | Why deferred |
| --- | --- |
| Blockchain settlement rails | rail complexity, not current proof |
| Wallet orchestration | not needed to prove commitment semantics |
| CRDT / Automerge / IPFS | sync and backup complexity before core truth is stable |
| Builder APIs | builder packaging comes after internal validation |
| Agent execution | agents should not own money movement now |
| Deep provider integrations | category expansion before kernel proof |

## Future-ready layers

These are not active implementation targets now, but the architecture should remain compatible with them:

| Future layer | Why it matters later | Current rule |
| --- | --- | --- |
| Tokenized commitment or release rights | some commitments may later benefit from tokenized ownership or entitlement models | keep tokenization behind adapter boundaries, not in the domain core |
| Agent preview / validation layer | agents may later read, validate, prepare, and request actions | agents stop at preview, validation, or approval request unless a human-approved policy allows more |
| Scoped approval grants | delegated approval will matter when agent and multi-system actions increase | approval tokens/grants should be scoped, expiring, and additive to human control |
| Proof adapters | external proofs and onchain signals may later enrich trust | proof should feed typed events and state, not bypass them |
| Multi-rail execution | different communities and businesses will adopt different rails at different speeds | keep the action contract stable and the rail-specific logic replaceable |

## Current data flow

The current intended flow should be:

```mermaid
flowchart LR
    U["User Action"] --> S["UI Surface"]
    S --> H["Hook / Screen Logic"]
    H --> P["Persistence / Repository"]
    P --> K["Pot / Chapter / History State"]
    K --> S

    K --> V["Visible Status / Next Action / Closure"]
```

## Current UI mapping

| Current app area | Shared commitment meaning |
| --- | --- |
| Create Pot | Create Commitment |
| Pot Home | Commitment summary and current state |
| Expenses area | Obligation or contribution input |
| Members tab | Participants, roles, blockers |
| Settle flow | Chapter / closeout flow |
| Settlement history | Commitment history |
| Settings | Policy surface |

## Architecture rule

Use this rule for every design and code decision:

- keep the product opinionated at the commitment layer
- keep the rails replaceable
- keep the history typed
- keep the UI honest

## SMB and community design rule

This architecture should stay friendly to:

- popup communities
- small groups
- organizers
- SMBs

That means:

- low setup burden
- modular adoption
- clear upgrade path
- no forced commitment to one chain, one wallet model, or one heavy backend
- ability to adopt new rails or proof systems without rewriting the product core

## What success looks like

The architecture is clear enough when Teddy and the founder can both answer:

- what is the core object
- what is the current implementation base
- what actions move the loop forward
- what state explains the current status
- what layers are active now
- what layers are intentionally deferred
