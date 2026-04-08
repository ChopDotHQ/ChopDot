# Launch Perimeter And Survivability Plan

## Purpose

This file defines the safest and strongest launch posture for ChopDot.

It is here to answer:

- what kind of product we should actually launch
- what legal and compliance perimeter we are trying to stay inside
- what can shut us down
- what dependencies create fragility
- what it costs to run and maintain each posture
- what the entry and exit strategy should be

This is a founder decision document, not legal advice.

## Product rule

ChopDot should launch in a posture that:

- can create real value without holding pooled funds
- can survive vendor or rail changes
- can live inside a manageable legal frame
- can grow into stronger execution later without rewriting the company

## Four launch modes

## Mode 1: Coordination software

ChopDot helps groups:

- define commitments
- invite participants
- track progress
- request approvals
- confirm closure

But ChopDot does not:

- hold user money
- invest funds
- promise yield
- silently move value

### Risk profile

- legal risk: lowest
- operational complexity: low to medium
- shutdown risk: lower
- moat strength: moderate, depends on commitment semantics

### Cost profile

- infra cost: low
- compliance/legal cost: low to medium
- maintenance cost: moderate

### Good for

- first launch
- SMBs and communities
- internal validation
- fast iteration

## Mode 2: Coordination plus proof

ChopDot adds:

- attestation or proof references
- visible release evidence
- optional chain or external-proof enrichment

But still avoids pooled custody and yield.

### Risk profile

- legal risk: still manageable if kept narrow
- operational complexity: medium
- shutdown risk: moderate
- moat strength: stronger

### Cost profile

- infra cost: low to medium
- compliance/legal cost: medium
- maintenance cost: medium

### Good for

- stronger trust story
- better closure and auditability
- future builder adoption

## Mode 3: Orchestrated execution

ChopDot coordinates real execution across rails with explicit user-approved actions.

### Risk profile

- legal risk: materially higher
- operational complexity: high
- shutdown risk: higher
- moat strength: potentially higher, but also more fragile

### Cost profile

- infra cost: medium to high
- compliance/legal cost: high
- maintenance cost: high

### Good for

- later-stage product depth
- only after the kernel and policy layers are mature

## Mode 4: Custody / pooled funds / yield

ChopDot holds funds, pools balances, invests them, or pays rewards.

### Risk profile

- legal risk: highest
- operational complexity: highest
- shutdown risk: highest
- incident blast radius: highest

### Cost profile

- infra cost: medium
- compliance/legal cost: very high
- maintenance cost: very high

### Good for

- not now

## Recommended launch posture

Launch in:

- Mode 1 first
- Mode 2 where trust or proof materially improves the product

Do not launch in:

- Mode 4

Approach Mode 3 only later, and only with explicit approval and strong boundaries.

## Why this is the right posture

This gives ChopDot:

- the best chance of legal manageability
- the best chance of low-cost survival
- a real product before heavy compliance burden
- a path to future tokenization and execution without forcing it now

## Legal and compliance posture

## Current safe rule

Prefer:

- coordination
- explicit approvals
- proof references
- non-custodial execution surfaces

Avoid early:

- pooled funds
- interest or yield
- hidden treasury behavior
- “we hold your money” product framing

## Switzerland

Relevant official posture:

- accepting public deposits or crypto-based assets can move a product into banking or FinTech-license territory
- Swiss data protection rules also matter, especially for cross-border transfers

Useful official references:

- [FINMA fintech overview](https://www.finma.ch/en/authorisation/fintech/)
- [FINMA FinTech licence](https://www.finma.ch/en/authorisation/fintech/fintech-bewilligung/)
- [FDPIC cross-border transfers](https://www.edoeb.admin.ch/en/cross-border-transfer-of-personal-data)

## EU

Relevant official posture:

- MiCA creates a regulatory framework for certain crypto-asset issuers and service providers
- authorization and AML/CTF burdens increase if the product moves deeper into crypto-asset services

Useful official references:

- [European Commission crypto-assets overview](https://finance.ec.europa.eu/digital-finance/crypto-assets_en)
- [ESMA rules for crypto-asset service providers](https://www.esma.europa.eu/press-news/esma-news/esma-finalises-first-rules-crypto-asset-service-providers)
- [EBA supervisory role under MiCA](https://eba.europa.eu/activities/direct-supervision-and-oversight/ebas-supervisory-role-under-mica)

## Plain-language compliance rule

Before adding a feature, ask:

1. Does this make us look like we hold funds?
2. Does this add yield, rewards, or treasury-like behavior?
3. Does this move us from coordination into payment service or custody territory?
4. Does this create stronger KYC/AML expectations?
5. Does this make personal or financial data materially more sensitive?

If yes, slow down and assess the perimeter before building.

## Shutdown-risk map

These are the main ways ChopDot can be constrained or shut down.

| Risk source | Example | Risk today | Mitigation |
| --- | --- | --- | --- |
| Regulatory perimeter | drifting into custody, deposits, interest, or advice | medium if undisciplined | stay in coordination/proof posture |
| Vendor concentration | Supabase, WalletConnect, hosted infra, one indexer | medium | keep domain/provider boundaries clean and migration-ready |
| Chain concentration | product tied too tightly to one chain or standard | medium | keep rails as adapters |
| Security incident | bad approval flow, wrong closure, leaked state | medium to high | explicit authority, typed state, safer math, honest UI |
| Privacy incident | over-collection, over-sharing, cross-border mishandling | medium | minimal data model, scoped visibility |
| Product confusion | users think ChopDot guarantees more than it does | high | make trust semantics explicit |

## Vendor-risk map

| Dependency | Why it helps now | Why it is risky | Rule |
| --- | --- | --- | --- |
| Supabase | fast shipping, auth, CRUD, realtime | can become product truth and lock-in center | use as provider, not domain definition |
| Wallet vendors / AppKit | easier wallet UX | authority can collapse into vendor flow | wallet = identity surface, not power model |
| Hosted chain infra / indexers | speed and convenience | outages, pricing, policy changes | keep self-hostable path possible |
| Cloud hosting | fast delivery | platform concentration | keep export/migration path healthy |

## Cost and maintenance map

## Low-cost, sustainable posture

This is the target early posture:

- coordination-first
- proof second
- no custody
- no yield
- one stable domain core
- replaceable providers

### What this costs

- product engineering: moderate
- infra: low to medium
- compliance/legal: manageable
- maintenance: manageable if the code stays modular

## High-cost, fragile posture

This is what to avoid early:

- multiple rails as core dependency
- custody-like behavior
- token economics as product center
- overbuilt agent execution
- embedded financial operations without clarity

### What this costs

- product engineering: high
- infra: medium to high
- compliance/legal: high
- maintenance: high
- incident response burden: high

## Maintenance rule

Every new system should be judged by:

- setup burden
- upgrade burden
- failure blast radius
- migration difficulty
- compliance burden

If a feature increases all five before strengthening the commitment kernel, it is probably wrong for now.

## Entry strategy

## What to launch first

Launch the strongest possible version of:

- shared commitment coordination
- chaptered closure
- optional proof

Focus on:

- popup communities
- small groups
- organizers
- SMB services and funding coordination

### Why

These segments:

- feel the pain
- do not want enterprise software
- do not want custody complexity
- benefit from modular adoption

## Entry posture rules

- no pooled yield
- no custody marketing
- no pretending the chain is the product
- no feature race with incumbent expense apps
- no full booking-engine sprawl

## Exit strategy

“Exit” here means how ChopDot survives or pivots if conditions change.

## Good exits

### 1. Product survives vendor change

If Supabase, wallet vendors, or chain tooling change, ChopDot should still have:

- its domain model
- its event history
- its UI logic
- its commitment semantics

### 2. Product survives rail change

If one chain becomes less relevant, ChopDot should still have:

- a useful coordination product
- replaceable execution adapters

### 3. Product survives compliance tightening

If legal constraints increase, ChopDot should still be able to operate as:

- coordination software
- proof/reference layer

without requiring custody or pooled assets.

### 4. Product survives business-model change

If consumer monetization is weak, ChopDot should still be able to evolve toward:

- organizer workflows
- SMB tools
- provider flows
- later builder infrastructure

## Sustainability test

Ask this before launch:

- can the product create value without holding funds?
- can it still run if one vendor disappears?
- can it be legally framed as coordination/proof rather than custody?
- can the core survive rail changes?
- can we maintain this with a small team?

If the answer is no, the launch shape is too fragile.

## What this means for the current roadmap

## Now

- restore the commitment kernel
- validate it internally
- harden auth, privacy, security, and domain boundaries

## Next

- define identity vs authority clearly
- reduce Supabase-shaped semantics
- improve data visibility rules
- make the product honest about proof and closure

## Later

- add stronger proof adapters
- add tokenized rights if justified
- add agent preview/validation/request flows
- add builder or partner surfaces

## Not now

- pooled custody
- yield
- heavy financial intermediation posture
- chain-first product definition

## Bottom line

The launch goal is not “unstoppable.”

The launch goal is:

- legally manageable
- operationally survivable
- modular enough to evolve
- valuable enough without custody

That is how ChopDot gets a real chance to sustain itself.
