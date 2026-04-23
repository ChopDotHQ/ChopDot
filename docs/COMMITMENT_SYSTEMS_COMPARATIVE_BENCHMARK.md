# Commitment Systems Comparative Benchmark

<discovery_plan>
- Compare how communities, individuals, teams, and businesses currently handle commitment challenges
- Identify the failure modes each system solves and creates
- Define what ChopDot must beat to be meaningfully 10X better
</discovery_plan>

## FACTS

- People already solve commitment problems through many systems:
  - kinship and local reputation
  - savings groups
  - ROSCAs and rotating funds
  - contracts and deposits
  - marketplaces and escrow
  - payment apps and requests
  - spreadsheets and group chats
  - project management tools
  - service-level agreements
  - DAO and multisig governance
- None of these is universally best.
- Each trades off:
  - speed
  - proof
  - privacy
  - cost
  - cultural fit
  - enforcement
  - dispute handling
  - accessibility

## INFERENCES

- ChopDot should not benchmark itself against one competitor.
- It should benchmark itself against the whole workaround stack people already use.
- The product is only 10X if it improves the user's actual commitment workflow, not just one isolated screen.

## ASSUMPTIONS

- ChopDot remains coordination-first and non-custodial in the near term.
- External services may later integrate, but the kernel must remain stable across them.

## Historical Pattern

Commitment systems usually evolve through the same pressure cycle:

1. informal trust works while the group is small, local, and repetitive
2. records appear when memory and social pressure stop scaling
3. rules appear when ambiguity creates conflict
4. escrow, deposits, or contracts appear when losses become material
5. identity, monitoring, or dispute systems appear when abuse becomes repeatable
6. bureaucracy appears when the protection system becomes heavy enough to create its own friction

ChopDot should not blindly copy the final bureaucratic layer.
The product should preserve the speed and cultural flexibility of early trust systems while adding only the proof, state, recovery, and assurance needed for the risk level.

## Future Pattern To Watch

The likely future is not one universal trust app.
It is a layered trust stack:

- local norms and social context stay important
- software records become the shared memory
- payments and rails remain external or modular
- privacy-preserving assurance replaces unnecessary identity collection where possible
- agents help coordinate, but must remain bounded by explicit authority and auditability
- ecosystems pay for attributable coordination, retention, and value movement, not generic user counts

ChopDot should be measured by how well it becomes the commitment kernel inside that stack.

## Comparative Systems

## 1. Informal Social Trust

Examples:

- family trust
- friend groups
- local reputation
- verbal agreements

What works:

- low friction
- culturally embedded
- no formal identity burden

What fails:

- selective memory
- shame and pressure
- weak evidence
- hard recovery after betrayal

Metrics to compare:

- misunderstanding rate
- dropout rate
- relationship damage
- time spent chasing
- recovery success

ChopDot must be better at:

- making state and expectations visible without destroying social flexibility

## 2. Savings Groups And ROSCAs

Examples:

- chamas
- tandas
- susu
- stokvels
- arisan
- VSLAs
- ASCAs

What works:

- repeated participation
- bounded membership
- clear contribution routines
- strong local norms
- visible records

What fails:

- officer abuse
- dropout
- recordkeeping gaps
- exclusion
- limited portability

Known measurement patterns:

- attendance
- retention
- membership growth
- average savings per member
- repayment rate
- annualized return on savings
- long-term group survival
- sources: [SEEP long-term savings groups](https://seepnetwork.org/resource-post/a-decade-later-the-long-term-outcomes-of-savings-groups), [UNCDF toolkit](https://www.uncdf.org/article/3918/savings-groups-linkages-toolkit-for-financial-institutions)

ChopDot must be better at:

- preserving local trust mechanisms while improving record clarity, role authority, and recovery

## 3. Group Chats And Spreadsheets

Examples:

- WhatsApp threads
- Telegram groups
- Google Sheets
- Notion tables

What works:

- very fast
- familiar
- flexible
- no onboarding burden

What fails:

- ambiguity
- stale state
- no reliable authority
- weak audit trail
- high organizer burden

Metrics to compare:

- chase messages
- stale status count
- wrong-state decisions
- time-to-close
- manual reconciliation time

ChopDot must be better at:

- state truth, next action, and closure without adding heavy workflow friction

## 4. Payment Apps

Examples:

- Venmo
- PayPal
- Cash App
- Pix
- M-PESA
- bank transfers

What works:

- actual money movement
- user familiarity
- receipts

What fails:

- weak group objective context
- payment sent is not the same as obligation resolved
- split between communication and payment truth
- dispute and fraud limits depend on provider

Metrics to compare:

- payment completion
- payment confirmation mismatch
- dispute rate
- reconciliation time
- payment reference exposure

ChopDot must be better at:

- connecting payment status to group commitment state without becoming custody-first

## 5. Marketplace Escrow And Platforms

Examples:

- Airbnb
- Upwork
- eBay-like marketplace protection
- ticketing resale systems

What works:

- platform rules
- dispute flow
- protection policies
- payment custody or hold logic

What fails:

- platform lock-in
- fees
- account risk
- policy opacity
- not designed for flexible small-group commitments

Metrics to compare:

- dispute rate
- resolution time
- evidence quality
- false-positive protection
- user trust after dispute

ChopDot must be better at:

- lightweight commitment clarity and recovery without forcing every group into marketplace custody

## 6. Business Contracts And Deposits

Examples:

- service deposits
- cancellation policies
- booking contracts
- invoices
- SLAs

What works:

- formal obligation
- legal clarity
- enforceable terms

What fails:

- slow setup
- intimidating for small groups
- hard to adapt culturally
- expensive enforcement

Metrics to compare:

- time-to-agreement
- dispute frequency
- enforcement burden
- cancellation loss
- support overhead

ChopDot must be better at:

- making commitment terms usable before a legal or support-heavy process is needed

## 7. Team And Project Tools

Examples:

- Jira
- Linear
- Asana
- Trello

What works:

- task ownership
- progress state
- team visibility

What fails:

- not money-native
- weak financial consequence modeling
- status updates can become performance theater

Useful measurement analogs:

- DORA-style flow and recovery metrics
- team health and friction metrics
- source: [Google Cloud DORA 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)

ChopDot must be better at:

- connecting responsibility, money, and closure in one trustworthy state model

## 8. Open-Source And Community Governance

Examples:

- CHAOSS project health
- DAO governance
- multisig treasuries
- public-good funding

What works:

- transparent contribution
- shared governance
- public accountability

What fails:

- voter apathy
- plutocracy
- unclear impact
- contributor burnout

Useful measurement analogs:

- contributors
- responsiveness
- leadership diversity
- project activity
- impact metrics
- source: [CHAOSS metrics](https://wiki.linuxfoundation.org/chaoss/metrics/metrics)

ChopDot must be better at:

- tracking real commitment and impact, not just visible participation

## 9. Payment Processor Risk Systems

Examples:

- Stripe dispute/fraud monitoring
- card-network monitoring programs

What works:

- dispute analytics
- fraud rates
- network thresholds
- evidence workflows

What fails:

- merchant stress
- delayed disputes
- opaque risk thresholds
- high manual evidence burden

Useful measurement analogs:

- dispute volume
- dispute rate
- fraud rate
- dispute outcome
- evidence quality
- source: [Stripe disputes analytics](https://docs.stripe.com/payments/analytics/disputes)

ChopDot must be better at:

- making commitment evidence clear before disputes become expensive and formal

## 10X Benchmark Table

| Existing system | Main strength | Main failure | ChopDot 10X requirement |
| --- | --- | --- | --- |
| social trust | low friction | weak evidence | keep low friction while adding state truth |
| savings groups | repeated norms | limited portability | preserve norms while improving records and recovery |
| chat/spreadsheets | familiar | stale ambiguity | make state and next action obvious |
| payment apps | money movement | weak group context | connect payment truth to commitment truth |
| escrow platforms | protection | lock-in/custody | add clarity without forcing custody |
| contracts | enforceability | slow/heavy | make lightweight commitments legible |
| team tools | task visibility | not financial | connect responsibility and money |
| open governance | transparency | apathy/impact ambiguity | track real follow-through |
| processors | dispute analytics | late/expensive disputes | prevent evidence gaps early |

## Practical Benchmark Studies

ChopDot should run small comparison studies:

1. group chat vs ChopDot closeout
2. spreadsheet vs ChopDot commitment state
3. payment app request vs ChopDot chapter flow
4. informal deposit vs ChopDot explicit commitment
5. local savings group recordkeeping vs ChopDot history

Each study should measure:

- clarity
- time-to-close
- organizer burden
- completion
- dispute or confusion
- privacy exposure
- recovery

## Decision

ChopDot's benchmark is not one app.
It is the messy combined stack people currently use to survive trust problems.

## Why

If ChopDot is not measurably better than that stack, it will be intellectually strong but practically unnecessary.

## Next Move

Use this benchmark map to create:

1. a baseline study script
2. a first group-chat-vs-ChopDot comparison test
3. a metrics dashboard schema tied to real event instrumentation
