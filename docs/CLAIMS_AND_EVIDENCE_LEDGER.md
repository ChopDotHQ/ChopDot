# Claims And Evidence Ledger

<discovery_plan>
- Create a live registry of major ChopDot claims
- Tag each claim by evidence class, confidence, and next proof step
- Prevent doctrine from outrunning proof
</discovery_plan>

## FACTS

- ChopDot now has an explicit rigor model.
- The repo also now has an explicit audit saying the standard is not yet fully met.
- The missing enforcement surface is a claim-by-claim ledger.

## INFERENCES

- This ledger should become the place where major strategic and product claims are tracked until they are proven, downgraded, or rejected.

## ASSUMPTIONS

- This is a v1 seed, not an exhaustive registry of every sentence in the repo.
- The goal is to track the highest-impact claims first.

## Evidence Classes

- `A`: proven in ChopDot through implementation, tests, operational use, pilot evidence, or user validation
- `B`: backed by strong external evidence
- `C`: inference or informed extrapolation
- `D`: unknown / unproven

## Confidence Levels

- `high`
- `medium`
- `low`

## Ledger

| ID | Claim | Area | Evidence class | Confidence | Current basis | What is still missing | Next proof step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CL-001` | Small-group coordination benefits from explicit roles, visible norms, and shared memory | product | `B` | high | trust-system and behavioral research corpus | ChopDot-specific user evidence | validate in interviews and product sessions |
| `CL-002` | `joined` is not the same as `committed` | product | `B` | high | historical and behavioral research, current doctrine | measured behavior in ChopDot flows | add validation prompts and instrument conversion |
| `CL-003` | Deposits/penalties do not automatically create trust | product | `B` | high | frontier behavior research | ChopDot-specific effect size | test with interviews and pilot policy experiments |
| `CL-004` | ChopDot's first proof slice should center chapter / closeout recovery | product | `C` | medium | doctrine synthesis and engineering practicality | direct user validation and repeat-use evidence | run founder validation against real users |
| `CL-005` | Shared commitment kernel is the correct product center | product | `C` | medium | synthesis across product, research, and architecture docs | repeated user resonance and market proof | validate with interviews, pilots, retention |
| `CL-006` | Authority must be enforced in backend/domain logic, not only UI | engineering | `B` | high | secure systems patterns and direct branch review findings | full implementation compliance | enforce in backend handlers and tests |
| `CL-007` | Chapter identity must be distinct from pot identity for truthful closure | engineering | `C` | high | direct implementation review plus architecture logic | corrected implementation and tests | require real chapter grouping in kernel |
| `CL-008` | ChopDot should be API-ready now, API-product later | engineering | `C` | medium | architecture doctrine | implementation proof that core actions are transport-agnostic | map actions to explicit service contracts |
| `CL-009` | Subscription can be a bridge model but not the terminal model | monetization | `C` | medium | open-system and trust-layer economics research | actual customer willingness-to-pay and later ecosystem evidence | run pricing validation and update model |
| `CL-010` | Long-term value should come from reliability, assurance, policy, integration, and ecosystem contribution | monetization | `C` | medium | trust-layer economics and open-system sustainability research | proof that buyers value those surfaces | pricing interviews and operator design-partner feedback |
| `CL-011` | ChopDot can become an open neutral trust layer rather than a normal SaaS app | strategy | `C` | low-medium | doctrine synthesis and analogical research | strong product proof, reliability proof, continuity model | do not promote beyond internal strategy until more proof exists |
| `CL-012` | Ecosystems may later pay ChopDot for attributable usage and coordination value | strategy | `C` | medium | Nova / ecosystem funding / continuity research | real attributable usage and dashboard proof | implement impact dashboard requirements |
| `CL-013` | Wallet-centric identity and portable authority will matter later | future architecture | `B` | medium-high | Ethereum / Polkadot frontier research | evidence of relevance to ChopDot's near-midterm flows | keep adapters possible, do not overbuild |
| `CL-014` | ChopDot does not yet meet its full rigor and proof standard | operating model | `A` | high | explicit audit plus incomplete validation and implementation state | completion of control docs and proof logs | maintain audit until materially changed |
| `CL-015` | ChopDot should default to minimum sufficient assurance instead of mandatory KYC | identity / privacy | `C` | medium | NIST assurance-level framing, W3C VC model, FATF digital identity guidance, privacy/personhood research | legal review, abuse testing, user privacy research | create assurance-level policy and no-KYC abuse model |
| `CL-016` | Proof of personhood may help with Sybil resistance but can create exclusion, privacy, and coercion risks | identity / anti-abuse | `B` | medium-high | proof-of-personhood literature and decentralized identity research | ChopDot-specific threat model and user comfort testing | study optional personhood paths before product adoption |
| `CL-017` | Trusted agents must be a distinct actor class, not disguised participants | agent authority | `C` | medium | authority model, agent risk reasoning, future-watch research | implementation policy and misuse testing | create trusted-agent authority policy |
| `CL-018` | Cultural trust settings will change which verification and commitment mechanisms are acceptable | cultural fit | `B` | medium-high | historical trust-system research and localization work | field interviews and pilot evidence | create cultural fieldwork protocol and compare pilot results |
| `CL-019` | ChopDot must measure trust outcomes, not vanity usage, to know whether it is working | metrics | `B` | high | DORA, CHAOSS, savings-group, and dispute-monitoring measurement patterns | event instrumentation and real baseline studies | create dashboard schema and baseline comparison tests |
| `CL-020` | ChopDot's real benchmark is the user's whole workaround stack, not one direct competitor | strategy / metrics | `C` | medium-high | comparative systems analysis across social trust, savings groups, chat, payment apps, escrow, contracts, and team tools | structured baseline studies | run group-chat-vs-ChopDot and payment-request-vs-ChopDot tests |

## Practical Rule

A claim should only move up in strength when:

- evidence class improves
- confidence improves
- the missing proof is explicitly closed

If evidence weakens, the claim should be downgraded.

## Update Triggers

Update this ledger when:

- founder validation runs complete
- Teddy's kernel implementation materially changes
- pricing interviews produce real evidence
- pilot evidence appears
- new frontier research changes a major assumption

## Decision

ChopDot should maintain a live claim ledger so strategy, engineering, and GTM do not silently drift into unearned certainty.

## Why

Because doctrine is useful only if the repo can also track what is still a bet.

## Next Move

Expand this ledger after:

1. the next kernel validation pass
2. the next pricing/interview pass
3. the first real pilot evidence
