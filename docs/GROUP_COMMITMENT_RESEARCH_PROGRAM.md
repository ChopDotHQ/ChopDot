# Group Commitment Research Program

<discovery_plan>
- Turn the existing trust/failure doctrine into a real research program
- Cover history, failures, human behavior, norms, and game theory
- Make the output directly useful for product, pilots, and operating decisions
</discovery_plan>

## FACTS

- ChopDot is building a shared commitment system, not just a calculator or payment widget.
- Existing repo doctrine already establishes that ChopDot needs research on:
  - trust systems across time and place
  - coordination failure patterns
  - incentive design
  - local norms
  - governance failure
  - see:
    - [RESEARCH_AGENDA_TRUST_AND_FAILURE.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/RESEARCH_AGENDA_TRUST_AND_FAILURE.md)
    - [ANTIFRAGILITY_AND_FAILURE_LEARNING.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/ANTIFRAGILITY_AND_FAILURE_LEARNING.md)
    - [SYSTEM_METRICS_AND_FORMULAS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SYSTEM_METRICS_AND_FORMULAS.md)
- Credible external sources confirm that small-group financial coordination systems like ROSCAs rely on institutional design and social sanctions because they cannot rely on legal enforcement:
  - source: [Enforcement in informal saving groups](https://www.sciencedirect.com/science/article/abs/pii/S0304387808000862)
- UNCDF material on savings groups highlights the importance of best practices and resilience in real community contexts:
  - source: [UNCDF savings groups note](https://www.uncdf.org/article/5038/strengthening-resilience-through-savings-groups)
- Commons and collective-action literature, especially Ostrom, remains relevant because ChopDot is fundamentally managing repeated collective action under partial trust.

## INFERENCES

- Research is not a side project.
- It is how ChopDot avoids:
  - rebuilding known social failures
  - encoding the wrong defaults
  - mistaking elegance for real-world fit
- ChopDot needs a research program that is:
  - historical
  - behavioral
  - comparative
  - product-facing
  - pilot-oriented

## ASSUMPTIONS

- The goal is not academic completeness.
- The goal is to generate design rules, policy rules, pilot heuristics, and failure-prevention logic.
- Research outputs should be useful for:
  - product design
  - GTM language
  - pilot selection
  - later governance and policy engines

## The Research Program

## Track 1: Historical Trust Systems

### Question

How have humans historically coordinated pooled obligation, rotating access, mutual aid, and release decisions without strong formal institutions?

### Systems to study

- ROSCAs / chamas / tandas / susu / stokvels / chit funds
- savings groups and VSLAs
- mutual aid societies
- cooperatives and building societies
- community currencies
- modern DAO treasury patterns

### What to extract

- membership rules
- contribution rules
- payout/release rules
- monitoring mechanisms
- exclusion/sanction mechanisms
- organizer and officer roles
- transparency boundaries
- dispute and dropout handling

### Product outputs

- role templates
- contribution and release policy rules
- dropout / reassignment patterns
- trust-anchor ideas

## Track 2: Group Commitment Failure History

### Question

What are the recurring ways group commitments fail in practice?

### Failure classes

- fronting failure
- ghosting failure
- soft-yes / fake enthusiasm
- last-minute dropout
- organizer fatigue
- unclear release authority
- false closure
- hidden ops rescue

### What to extract

- early warning signals
- bad product language patterns
- social triggers for failure
- which failures need policy vs UX vs governance vs recovery tooling

### Product outputs

- anti-ambiguity UX rules
- alert and reminder heuristics
- organizer-protection rules
- failure taxonomy for pilot review

## Track 3: Human Behavior And Behavioral Economics

### Question

What predictable human behaviors distort commitments, and how should ChopDot account for them?

### Areas

- commitment devices
- defaults
- procrastination
- social proof
- loss aversion
- fairness perception
- face-saving behavior
- public vs private obligation

### What to extract

- what strengthens real commitment
- what creates false confidence
- when visibility helps
- when visibility humiliates
- what triggers resentment instead of action

### Product outputs

- default-setting rules
- commitment confirmation language
- visibility/privacy policy options
- “joined vs committed” distinction rules

## Track 4: Small-Group Game Theory And Incentives

### Question

How should deposits, transfers, refunds, waitlists, and organizer discretion be designed so the system remains fair and durable?

### Areas

- deposits as commitment signals
- waitlists
- reassignment rights
- transferability
- partial refunds
- organizer discretion
- adverse selection
- moral hazard
- asymmetric risk

### What to extract

- when deposits improve seriousness
- when deposits exclude the wrong users
- when transferability helps vs creates speculation
- how to share risk between organizer and participants

### Product outputs

- deposit policy templates
- reassignment/transfer rules
- refund and cancellation heuristics
- organizer-risk controls

## Track 5: Local Norms And Cultural Fit

### Question

How do different cultures interpret obligation, money requests, hierarchy, and proof?

### Areas

- public debt visibility
- hierarchy and organizer authority
- private vs public conflict
- kin/community obligation
- informal proof acceptance
- identity expectations

### What to extract

- where public visibility helps or harms
- when phone identity is enough
- when stronger verification is expected
- where organizer authority is normal vs suspicious

### Product outputs

- localization rules
- market-specific visibility defaults
- trust-surface assumptions by market

## Track 6: Governance And Decision Failure

### Question

Which group decisions should be formalized, and which should remain social?

### Areas

- quorum and approval thresholds
- active-minority capture
- veto abuse
- participation fatigue
- informal elite control
- rubber-stamp approvals

### What to extract

- which use cases need governance at all
- which approvals should be hard requirements
- which should stay soft and social

### Product outputs

- approval model templates
- governance boundaries
- group-type policy presets

## Track 7: Proof, Reliability, And Antifragility

### Question

How should ChopDot learn from live failures so the system becomes harder to break?

### Areas

- recovery burden
- manual rescue patterns
- failed release attempts
- state ambiguity
- operator intervention

### What to extract

- which failures should trigger product changes
- which failures should trigger policy changes
- which metrics should have exposed the issue earlier

### Product outputs

- pilot postmortem template
- failure-to-feature decision rules
- reliability instrumentation priorities

## Research Outputs

Every research item should produce one or more of:

- product rule
- policy rule
- operator heuristic
- pilot heuristic
- GTM language insight
- metric or dashboard implication

If it does not change a product or operating decision, it is not yet useful research.

## Repo Structure

Recommended tracked structure:

- `research/trust_systems/01_roscas.md`
- `research/trust_systems/02_savings_groups.md`
- `research/trust_systems/03_mutual_aid.md`
- `research/trust_systems/04_cooperatives.md`
- `research/trust_systems/05_community_currencies.md`
- `research/trust_systems/06_daos.md`
- `research/trust_systems/07_failure_patterns.md`
- `research/trust_systems/08_behavioral_rules.md`
- `research/trust_systems/09_game_theory_and_incentives.md`
- `research/trust_systems/10_local_norms.md`
- `research/trust_systems/11_governance_patterns.md`
- `research/trust_systems/12_pilot_runbooks.md`
- `research/trust_systems/13_sources.md`

## Working Method

For each tracked research note:

1. summarize the mechanism
2. identify how it creates or protects trust
3. identify how it fails
4. map it to a ChopDot analog
5. classify:
   - adopt
   - adapt
   - avoid
   - watch

## Decision

ChopDot should treat group-commitment research as a core operating program.

## Why

Because the system will fail more often from:

- human ambiguity
- incentive mismatch
- role confusion
- local norm mismatch

than from code alone.

## Next Move

Start by producing:

1. `research/trust_systems/01_roscas.md`
2. `research/trust_systems/07_failure_patterns.md`
3. `research/trust_systems/09_game_theory_and_incentives.md`

Those three will give the fastest product value.
