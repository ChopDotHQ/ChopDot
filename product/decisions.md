# ChopDot Product Decisions

Decision records are the durable product calls. Use `product:checkpoint` for
events and this file for choices we want future agents to inherit.

## DEC-001 - Product cockpit becomes source operating surface

```yaml
id: "DEC-001"
status: "provisional"
scope: "Quality"
cards:
  - "P-014"
decision: "Use a Logos-style cockpit with readable source cards, generated board, lifecycle commands, evidence, and append-only history."
chosen_path: "Migrate from JSON-centered reporting to source Markdown plus generated views."
why: "The previous cockpit was functional but not a usable product flywheel."
evidence:
  - "product/cards.md"
  - "product/board.html"
risk: "If the board remains ugly or manual, the team will stop using it."
follow_up: "Prove the cockpit by running one real card through start, evidence, finish, and history."
supersedes: "none"
```

## DEC-002 - Pay-moment capture is the group expense wedge

```yaml
id: "DEC-002"
status: "provisional"
scope: "Catch"
cards:
  - "P-001"
  - "P-012"
decision: "Prioritize pay-moment and receipt-first capture over generic expense form creation."
chosen_path: "Make 'I just paid' the default path and keep manual item editing as correction."
why: "The highest-friction moment is remembering, entering, and chasing payment context."
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
risk: "A receipt-first interface can become fake OCR theater if it does not reduce typing."
follow_up: "Run a screenshot-backed capture flow and reject manual-first designs."
supersedes: "none"
```

## DEC-003 - Friend links should not require account setup first

```yaml
id: "DEC-003"
status: "provisional"
scope: "Payout"
cards:
  - "P-002"
decision: "No-app friend links must open directly to one low-risk action before deeper onboarding."
chosen_path: "Show amount, receiver, context, and action first; ask for account only when necessary."
why: "ChopDot fails if friends refuse the organizer's link because onboarding appears before usefulness."
evidence:
  - "product/evidence/product-readiness-latest.json"
risk: "Too little identity can reduce trust if payment context is unclear."
follow_up: "Validate with agents and friend-style screenshots."
supersedes: "none"
```

## DEC-004 - Infrastructure stays behind product language

```yaml
id: "DEC-004"
status: "final"
scope: "Native Stack"
cards:
  - "P-010"
  - "P-011"
decision: "Polkadot-native and adapter terms are not normal user-facing language."
chosen_path: "Keep technical status in developer checks and proof reports only."
why: "Users care who owes, who paid, who received, and whether the record can close."
evidence:
  - "docs/chopdot-dot/native-execution-playbook.md"
  - "product/cards.md"
risk: "Over-hiding technical status can confuse operators if proof boundaries are not documented."
follow_up: "Keep blocked-live and setup-required labels in the cockpit, not normal app UI."
supersedes: "none"
```

## DEC-005 - Agent evidence supports but does not replace human approval

```yaml
id: "DEC-005"
status: "final"
scope: "Quality"
cards:
  - "P-009"
  - "P-015"
decision: "Agent journeys are support evidence; human/operator screenshot review remains required before promotion."
chosen_path: "Use agents to discover dead ends and unsafe assumptions, then require review before calling a use case ready."
why: "Agents can click real UI, but they do not prove real user comprehension alone."
evidence:
  - "docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md"
risk: "Treating scripted success as user comprehension repeats previous mistakes."
follow_up: "Record confusion, hesitation, and dead ends in evidence."
supersedes: "none"
```

## DEC-006 - Mini-app surfaces must conform to Chop Core

```yaml
id: "DEC-006"
status: "provisional"
scope: "Quality"
cards:
  - "P-025"
decision: "Every mini-app surface must submit scoped commands to one product-owned authority instead of owning final payment or closeout truth."
chosen_path: "Use server-derived actors, role-checked commands, canonical payment states, scoped capture links, idempotent transitions, and executable migrated-database proof before expanding financial authority."
why: "Cross-environment ChopDot only works if each environment can use native strengths without fragmenting truth, payment semantics, or closeout records."
evidence:
  - "docs/security/universal-chop-core-security-architecture.md"
  - "docs/security/p025-security-foundation-crosswalk-2026-07-14.md"
  - "docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md"
  - "docs/security/p025-settlement-state-migration-proof-2026-07-14.md"
  - "docs/security/p025-capture-link-migration-proof-2026-07-14.md"
risk: "The current checkpoint does not yet prevent every direct client mutation or make multi-record financial writes atomic."
follow_up: "Inventory and close direct financial-table mutation paths before a real mixed human and agent money pilot."
supersedes: "none"
```
