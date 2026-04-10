# System Metrics And Formulas

<discovery_plan>
- Capture the most useful operating formulas from the extracted chat
- Keep them tied to product truth and operating action
- Avoid math theater
</discovery_plan>

## FACTS

- ChopDot needs metrics that expose actual commitment truth.
- A system like this becomes dangerous when pending, paid, confirmed, ready, and closed are blurred.

## INFERENCES

- A small formula set can materially improve:
  - product design
  - instrumentation
  - investor reporting
  - founder judgment

## ASSUMPTIONS

- v1 should prefer simple interpretable metrics over heavy formal modeling.
- Metrics only matter if they trigger action.

## Core V1 Metrics

### 1. Commitment Readiness

Use:

`R = 1 if all required conditions are satisfied, else 0`

Conditions usually include:
- funding valid
- approvals valid
- timing valid
- policy valid
- compliance / eligibility valid if required

What it reveals:
- whether something is truly executable

### 2. Funding Ratio

`FR = confirmed_contributions / target_amount`

Use to distinguish:
- underfunded
- partially funded
- fully funded
- overfunded

Important:
- use confirmed, not merely pending

### 3. Participation Commitment Ratio

`PCR = participants_who_completed_required_action / participants_expected`

Required action may be:
- pay
- approve
- confirm participation
- sign release

What it reveals:
- joined is not the same as committed

### 4. Organizer Risk Exposure

`ORE = amount_fronted_by_organizer - amount_secured_from_others`

What it reveals:
- whether ChopDot is actually reducing organizer pain

### 5. Slot / Unit Utilization

`U = allocated_units / total_available_units`

Track separately when relevant:
- provisional
- confirmed
- released
- transferred

### 6. Reassignment Efficiency

`RE = reassigned_units_recovered / units_lost_due_to_dropout`

Optional companion:

`ART = average_time_from_dropout_to_replacement`

What it reveals:
- whether the system recovers from dropout

### 7. Trust Concentration Index

`TCI = max(actor_controlled_critical_actions / total_critical_actions)`

What it reveals:
- when too much power sits with one actor

### 8. Approval Threshold Coverage

`ATC = approvals_obtained / approvals_required`

Weighted version later:

`WATC = approval_weight_obtained / approval_weight_required`

### 9. Recovery Burden

`RB = commitments_requiring_manual_intervention / total_commitments`

What it reveals:
- whether the system only works because humans repair it behind the scenes

### 10. Failure Rate By Action

`FR_a = failed_executions_of_action_a / total_attempts_of_action_a`

Sensitive actions may include:
- contribution confirmation
- release execution
- reassignment
- processor callback reconciliation

## Metric To Action Table

| Metric | Bad signal | Action |
| --- | --- | --- |
| `R` | things look ready but are not executable | tighten readiness rules and UI language |
| `FR` | pending contributions treated as real funding | separate pending vs confirmed harder |
| `PCR` | many join but few actually commit | improve commitment language and required actions |
| `ORE` | organizer still fronts too much risk | strengthen deposit / secured-commitment logic |
| `RE` | dropout causes irreversible loss | design better reassignment and waitlist flows |
| `TCI` | one actor controls too much | rebalance approvals and policy surfaces |
| `ATC` | approvals stall | clarify blockers, rules, and role expectations |
| `RB` | high manual rescue | formalize recovery states and tooling |
| `FR_a` | one action fails disproportionately | fix that action before expanding scope |

## Practical rule

Every metric should answer:
- what happened
- why it matters
- what action it should trigger

If a metric does not change a decision, it is probably dashboard theater.

## Next move

- Instrument the first proof slice with the subset that matters immediately:
  - `R`
  - `FR`
  - `PCR`
  - `ORE`
  - `RB`
- Treat later metrics as expansion logic once the kernel works.
