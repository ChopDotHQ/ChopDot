# Research Agenda: Trust And Failure

<discovery_plan>
- Turn the extracted research doctrine into one repo-ready agenda
- Cover both historical trust systems and non-obvious failure patterns
- Keep the output product-facing rather than academic
</discovery_plan>

## FACTS

- ChopDot is not only a payments or booking product.
- It is a shared commitment system.
- Shared commitment systems fail as much from human and cultural misreads as from software defects.

## INFERENCES

- Research is a product input, not decoration.
- ChopDot needs explicit research programs on:
  - how trust has historically been coordinated
  - how shared systems usually fail in practice

## ASSUMPTIONS

- This agenda is meant to guide product doctrine and future field research.
- Not every track needs to be deeply funded now.

## Mission

Identify the recurring trust, contribution, release, governance, and recovery mechanisms humans have used across time and place, then extract the design patterns that ChopDot should adopt, adapt, or avoid.

## Practical Research Workstream

This is not only a doctrine file anymore.

The practical workstream now has five parallel outputs:

1. `reading_and_sources`
- collect primary and secondary sources
- annotate them briefly
- extract design patterns

2. `comparative_models`
- compare historical and modern trust systems
- map each mechanism to ChopDot analogs

3. `field_templates`
- interviews
- observation checklists
- pilot scorecards

4. `pilot_runbooks`
- Brazil
- Kenya
- later local community / cooperative pilots

5. `audit_and_agent_surfaces`
- define what an auditor sees
- define what a helper agent may and may not do

## Priority Reading List

Immediate reads to anchor the work:

- UNCDF / CGAP savings group and linkage toolkits
- academic and ethnographic ROSCA literature
- mutual aid and cooperative case studies
- Aragon / DAO treasury governance material
- Encointer / local-currency personhood and meetup docs
- Pix documentation and Brazilian compliance references
- M-PESA / Daraja documentation and Kenyan compliance references

The point of the reading list is not “collect PDFs.”
It is to extract repeatable trust patterns into product doctrine.

## Track A: Trust Systems Across Time And Place

### Domains

- ROSCAs
- ASCAs
- VSLAs
- tandas
- stokvels
- chamas
- susu
- arisan
- chit funds
- mutual aid societies
- building societies
- cooperatives
- member-owned finance
- legal trust structures
- community currencies
- DAO governance patterns

### Core questions

- How is membership defined?
- What counts as real contribution?
- How is release or payout decided?
- How is trust created without heavy formal institutions?
- What is visible and to whom?
- How are defaults handled?
- What happens when a member leaves?
- What rules prevent organizer abuse?

### Expected product outputs

- role model guidance
- contribution visibility rules
- release / approval rule patterns
- dispute / dropout heuristics
- local-fit guidance for markets and communities
- comparative trust-pattern table

## Track B: Human Coordination Failure Patterns

### Domains

- ghosting
- soft commitment
- fake enthusiasm
- organizer fatigue
- free-riding
- conflict avoidance
- last-minute dropouts
- passive-aggressive chasing
- selective memory after failure
- “I thought someone else handled it”

### Core questions

- When do people say yes without committing?
- What language creates false confidence?
- What reminders create action versus resentment?
- When do groups prefer ambiguity because it feels socially safer?
- When does one organizer become the unpaid admin by default?

### Expected product outputs

- anti-ambiguity language rules
- reminder design principles
- organizer burden map
- joined vs committed separation
- false-confidence UX rules

## Track C: Incentive Design And Small-Group Game Theory

### Domains

- deposits as commitment signals
- partial refunds
- cancellation fees
- waitlist mechanics
- resale / transfer incentives
- organizer incentives
- adverse selection
- moral hazard
- asymmetric risk

### Core questions

- When does a deposit improve seriousness?
- When does it exclude the wrong people?
- When does transferability improve efficiency?
- When does it create speculation?
- When do refund policies create bad behavior?
- When does organizer discretion become abuse?

### Expected product outputs

- deposit rules
- reassignment rules
- refund logic
- risk-sharing rules
- transfer / waitlist heuristics

## Track D: Local Norms Around Obligation And Face-Saving

### Domains

- asking for money
- public debt visibility
- group hierarchy
- private vs public disagreement
- kin/community obligation
- formal vs informal proof

### Core questions

- In which contexts is public visibility helpful?
- In which contexts is it humiliating?
- When is organizer authority expected?
- When is group consent expected?
- When is phone-number identity enough?

### Expected product outputs

- local visibility policy rules
- market-specific onboarding assumptions
- local identity / trust surface guidance
- rail / interface fit notes by market

## Track E: Governance Failure Patterns

### Domains

- participation decay
- active-minority capture
- veto abuse
- meeting fatigue
- rubber-stamp approvals
- informal elites

### Core questions

- Which group types need governance at all?
- Which decisions should remain social rather than formally voted?
- When do quorum rules help?
- When do they create theater?

### Expected product outputs

- governance boundaries
- approval model guidance
- group-type governance templates later

## Comparative Trust Pattern Table

Use this structure in future research artifacts:

| System | Structure / flow | Trust and enforcement | ChopDot analog |
| --- | --- | --- | --- |
| ROSCAs / chamas | fixed cyclical pool, rotating payouts | peer accountability, known schedule | commitment with target, due date, visible contribution state |
| VSLAs / ASCAs | regular savings, loan fund, term-end share-out | meetings, elected officers, cash-box discipline | pooled commitment with explicit policy and release rules |
| Mutual aid societies | dues into emergency/disbursement fund | bylaws, solidarity, membership screening | community commitment with trustee / verifier roles |
| Cooperatives / credit unions | member equity, democratic votes | audited finances, majority governance | policy engine + approval thresholds + hybrid payout logic |
| DAO treasuries | onchain proposal and treasury execution | smart-contract enforcement and visible records | high-trust release and event-log-backed approvals |
| Encointer-style communities | local currency plus proof-of-personhood events | in-person verification and bounded community participation | local trust anchors, phone / identity-light onboarding, optional tokenized rights later |

## Repo Structure

Recommended tracked layout:

- `research/trust_systems/01_roscas.md`
- `research/trust_systems/02_savings_groups.md`
- `research/trust_systems/03_mutual_aid.md`
- `research/trust_systems/04_cooperatives.md`
- `research/trust_systems/05_community_currencies.md`
- `research/trust_systems/06_daos.md`
- `research/trust_systems/07_insights.md`
- `research/trust_systems/08_pilots_brazil.md`
- `research/trust_systems/09_pilots_kenya.md`
- `research/trust_systems/10_sources.md`

Each file should include:
- key mechanisms
- product implications
- `adopt / adapt / avoid / watch`
- source list

## Field Research Templates

### Interview prompts

- What happens when someone misses a contribution?
- Who decides whether the group waits, replaces them, or proceeds?
- What records does the group trust?
- What feels fair here?
- What would feel invasive or humiliating?
- What happens when the organizer is the problem?

### Observation checklist

- how contributions are collected
- who verifies payment
- who keeps memory / records
- how conflict is surfaced or suppressed
- whether the group prefers public or private correction
- which device / rail / identity assumptions are already normal

### Pilot scorecard

- commitment success rate
- time to fund / time to readiness
- fairness perception
- dropout incidents
- dispute frequency
- organizer burden
- manual intervention required

## Pilot Runbooks

### Brazil pilot

Target:
- group trip / retreat / deposit coordination

Focus:
- Pix-native expectations
- invite-by-link behavior
- fairness and clarity of deposit flows

Measure:
- funded on time
- misunderstandings
- disputes
- satisfaction with status visibility

### Kenya pilot

Target:
- community event / pooled order / local group commitment

Focus:
- M-PESA / STK push / low-tech compatibility
- phone-number identity assumptions
- fallback for limited app literacy

Measure:
- payment completion
- callback failures
- trust in the flow
- drop-off from invite to action

## Risks, Ethics, And Compliance

Baseline research and pilot rules:

- minimum necessary personal data
- explicit consent
- local-language clarity
- no implied custody if the product is not custody
- no unnecessary KYC theater
- legal review when moving beyond coordination-first posture

## Audit And Agent Surfaces

### Auditor surface

Should support:
- read-only access
- downloadable event history
- reconciliation view
- audit attestation object later

### Agent surface

Allowed later:
- read state
- send reminders
- summarize blockers
- propose actions

Not allowed by default:
- execute release
- transfer rights silently
- bypass policy

## Research To Product Mapping

Every research artifact should end by answering:

1. What trust mechanism did we observe?
2. What failure mode does it resist?
3. What part of ChopDot should adopt or adapt it?
4. What should stay social instead of automated?
5. What metric should tell us whether the feature worked?

## Practical rule

Every research finding should end in one of four labels:

- `adopt`
- `adapt`
- `avoid`
- `watch`

## Next move

- Use this agenda to inform future user interviews, local-market studies, and policy design.
- Do not let it delay the first proof slice.
- Treat it as supporting current work, with the highest immediate value in:
  - deposits
  - organizer exposure
  - reassignment
  - visibility rules
- Build the first tracked `research/trust_systems/` surface when you are ready to convert this from doctrine into a living repo research program.
