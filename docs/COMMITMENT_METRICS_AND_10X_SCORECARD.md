# Commitment Metrics And 10X Scorecard

<discovery_plan>
- Define the metrics ChopDot should track to understand whether it is improving trust in financial commitments
- Separate internal progress, user value, safety, privacy, and ecosystem value
- Turn "10X better" into measurable thresholds instead of aspiration
</discovery_plan>

## FACTS

- ChopDot already tracks or proposes core metrics in:
  - [SYSTEM_METRICS_AND_FORMULAS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SYSTEM_METRICS_AND_FORMULAS.md)
  - [ECOSYSTEM_IMPACT_DASHBOARD_REQUIREMENTS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/ECOSYSTEM_IMPACT_DASHBOARD_REQUIREMENTS.md)
- External measurement systems offer useful analogs:
  - DORA tracks software delivery performance and warns that simple delivery metrics are not enough without context and team health. Sources: [Google Cloud DORA 2024](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report), [Google Cloud DORA 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)
  - CHAOSS tracks open-source community health, contributions, and project health. Source: [CHAOSS metrics](https://wiki.linuxfoundation.org/chaoss/metrics/metrics)
  - Savings-group research tracks attendance, retention, membership growth, repayment, savings, loan fund health, and long-term institutional survival. Sources: [SEEP long-term savings groups](https://seepnetwork.org/resource-post/a-decade-later-the-long-term-outcomes-of-savings-groups), [UNCDF savings group linkages toolkit](https://www.uncdf.org/article/3918/savings-groups-linkages-toolkit-for-financial-institutions)
  - Payment and marketplace systems track disputes, fraud, outcomes, and monitoring thresholds. Source: [Stripe disputes analytics](https://docs.stripe.com/payments/analytics/disputes)
- The common pattern is:
  - measure the actual failure mode
  - distinguish leading signals from final outcomes
  - avoid metrics that can be gamed or detached from user value

## INFERENCES

- ChopDot should not only measure usage.
- ChopDot must measure whether trust failure is reduced.
- The core scorecard should cover:
  - commitment clarity
  - completion
  - organizer risk
  - dispute / abuse
  - privacy exposure
  - recovery
  - reliability
  - ecosystem attribution

## ASSUMPTIONS

- "10X better" does not mean 10X on every metric immediately.
- It means ChopDot must become clearly and measurably better than the user's current workaround on the pain that matters most.
- Current alternatives include chat threads, spreadsheets, payment apps, manual reminders, ad hoc deposits, marketplace escrow, contracts, and local social enforcement.

## Time Horizon

Past measurement:

- document how the group handled commitments before ChopDot
- capture failure memories, dispute patterns, dropout patterns, and organizer burden
- identify the informal enforcement method already used by the group

Present measurement:

- compare the same group using ChopDot against its own baseline
- measure state clarity, completion, organizer burden, recovery, and privacy exposure during real use
- keep qualitative notes when users bypass the product or recreate old workarounds

Future measurement:

- track whether repeated use makes commitments more reliable over time
- track whether the group becomes less dependent on one trusted coordinator
- track whether ecosystems or partners can attribute useful activity to ChopDot
- track whether new assurance layers reduce abuse without increasing exclusion or privacy harm

## Core Measurement Principle

Every metric should answer:

1. what happened
2. who was affected
3. whether trust improved or failed
4. what action should change next

If a metric does not change a decision, it is dashboard theater.

## Metric Families

## 1. Commitment Clarity

Purpose:

- measure whether people understand who is actually committed and what happens next

Metrics:

- `JCR`: joined-to-committed ratio
  - `committed_participants / joined_participants`
- `MUR`: misunderstanding rate
  - `users_who_misstate_obligation / users_tested`
- `SAR`: status accuracy rate
  - `users_who_correctly_explain_state / users_tested`
- `NAR`: next-action recognition
  - `users_who_correctly_name_next_action / users_tested`

10X target:

- reduce organizer ambiguity by at least 80-90 percent versus chat/spreadsheet coordination in comparable flows

## 2. Completion And Follow-Through

Purpose:

- measure whether commitments move from intent to legitimate completion

Metrics:

- `PCR`: participation commitment ratio
- `CCR`: commitment completion rate
- `TTC`: time to commitment
- `TTClose`: time to close
- `LDR`: late dropout rate
- `SCR`: stale commitment rate

10X target:

- materially reduce late dropout and stale commitments versus the user's current method

## 3. Organizer Risk

Purpose:

- measure whether ChopDot reduces the burden of one person fronting money, trust, or coordination work

Metrics:

- `ORE`: organizer risk exposure
- `ORR`: organizer risk reduction
  - `(baseline_organizer_exposure - chopdot_exposure) / baseline_organizer_exposure`
- `CMR`: chase-message reduction
  - `(baseline_chase_messages - chopdot_chase_messages) / baseline_chase_messages`
- `RB`: recovery burden
- `MRC`: manual rescue count

10X target:

- reduce chase burden and manual rescue enough that organizers feel the product changes the job, not just the interface

## 4. Dispute, Abuse, And Safety

Purpose:

- measure whether ChopDot reduces the ways people get burned, tricked, or pressured

Metrics:

- `DR`: dispute rate
  - `commitments_with_dispute / completed_or_active_commitments`
- `FCR`: false confirmation rate
  - `invalid_confirmations / confirmation_attempts`
- `FAA`: failed authority attempt rate
  - `blocked_invalid_actions / total_sensitive_action_attempts`
- `ABR`: abuse report rate
- `SNR`: scam/near-miss rate
- `UAR`: unsafe agent action rate

10X target:

- make false closure and wrong-actor confirmation structurally difficult, not socially negotiated after the fact

## 5. Privacy And Assurance

Purpose:

- measure whether trust is improved without unnecessary identity exposure

Metrics:

- `AEL`: assurance escalation level distribution
  - share of flows at `A0` through `A5`
- `DMI`: data minimization index
  - required identity fields / total possible identity fields
- `OIR`: optional identity rate
  - flows where higher identity was optional rather than mandatory
- `PER`: privacy exposure rate
  - incidents or flows exposing more information than needed
- `PDR`: proof disclosure ratio
  - disclosed claims / available claims

10X target:

- preserve low-friction, low-disclosure flows wherever risk allows while still blocking the main abuse patterns

## 6. Recovery And Antifragility

Purpose:

- measure whether the system learns from failure and recovers without hidden operator heroics

Metrics:

- `RE`: reassignment efficiency
- `ART`: average recovery time
- `RLR`: recovery learning rate
  - repeated_failure_class_count_after_fix / before_fix
- `IRR`: incident recurrence rate
- `MTTR`: mean time to recovery

10X target:

- reduce repeated failure classes over time instead of repeatedly rescuing the same issue manually

## 7. Reliability And Product Integrity

Purpose:

- measure whether ChopDot's trust layer is technically dependable

Metrics:

- uptime
- action failure rate
- event write success rate
- replay duplication rate
- state mismatch rate
- refresh persistence pass rate
- invariant test pass rate

10X target:

- trust-critical state must be more reliable than the social workaround it replaces

## 8. Ecosystem And Partner Value

Purpose:

- measure whether ChopDot causes attributable value for ecosystems, rails, protocols, or partners

Metrics:

- `TVC`: total value coordinated
- `AEU`: attributable ecosystem users
- `ECA`: ecosystem-coordinated actions
- `EVR`: ecosystem value retention
- `RUR`: repeat usage rate
- `PAV`: partner-attributable value

10X target:

- prove that ChopDot causes repeat coordination and value movement that a partner or ecosystem can rationally support

## Baseline Comparison Rule

Every serious metric should compare against a baseline.

Baselines may be:

- chat coordination
- spreadsheet tracking
- payment-app requests
- manual deposits
- existing marketplace escrow
- local savings group method
- current business process
- current community process

Do not report improvement without naming the baseline.

## 10X Scorecard

Use this scorecard when judging whether ChopDot is meaningfully better than alternatives.

| Area | Question | 10X signal |
| --- | --- | --- |
| clarity | do users understand state and next action? | ambiguity nearly disappears |
| completion | do commitments close more reliably? | fewer stale or failed commitments |
| organizer risk | does the organizer stop carrying the group? | fronting/chasing burden collapses |
| safety | are false actions blocked? | wrong-actor and false-closure paths are structurally prevented |
| privacy | is trust improved without over-disclosure? | most low-risk flows remain low identity |
| recovery | does the system recover from failure? | fewer repeated manual rescues |
| reliability | does state survive messy use? | refresh, replay, and failure do not corrupt trust |
| cultural fit | does it adapt to local norms? | mechanisms can vary without breaking the kernel |
| ecosystem value | does it produce attributable usage? | partners can see real activity caused by ChopDot |

## Measurement Anti-Patterns

Avoid:

- counting created commitments as successful commitments
- counting pending value as coordinated value
- counting invited users as committed users
- counting self-reported payment as confirmed payment
- measuring identity strength without measuring privacy cost
- measuring usage without measuring trust failure
- measuring speed without measuring safety

## Decision

ChopDot's progress should be judged by trust outcomes, not vanity usage.

## Why

The product only matters if it measurably reduces commitment failure, organizer burden, dispute risk, privacy exposure, and unsafe trust assumptions.

## Next Move

Turn this into:

1. event instrumentation requirements
2. a dashboard schema
3. baseline comparison studies against the main alternatives

## First Metrics To Instrument

Start with the smallest set that proves whether ChopDot changes behavior:

1. joined-to-committed ratio
2. commitment completion rate
3. stale commitment rate
4. time-to-close
5. chase-message reduction
6. manual rescue count
7. dispute or confusion rate
8. assurance escalation level
9. privacy exposure rate
10. event write success rate
