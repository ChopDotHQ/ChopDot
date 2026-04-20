# Experiment Log Template

<discovery_plan>
- Provide one durable log format for ChopDot experiments and validation runs
- Tie experiments back to claims, evidence classes, and decision thresholds
- Prevent positive and negative results from disappearing into chat
</discovery_plan>

## Purpose

Use this template for:

- behavioral experiments
- founder validation sessions
- pricing tests
- pilot observations
- implementation hypothesis tests where a narrative log is useful

## Log Entry

### 1. Metadata

- `date`:
- `owner`:
- `experiment_id`:
- `claim_id`:
- `area`:
  - product
  - engineering
  - market
  - future-watch

### 2. Hypothesis

- `claim`:
- `hypothesis`:
- `evidence_class_before`:
- `confidence_before`:

### 3. Why We Ran It

- `motivation`:
- `expected upside if true`:
- `risk if false`:

### 4. Method

- `method_type`:
  - interview
  - walkthrough
  - pilot observation
  - prototype comparison
  - implementation validation
  - pricing conversation
  - stress test
- `cohort / context`:
- `sample size`:
- `duration`:
- `baseline condition`:
- `intervention condition`:

### 5. Metrics And Signals

- `primary metric`:
- `secondary metrics`:
- `qualitative signals to capture`:

### 6. Falsification / Weakening Conditions

- `what would weaken the hypothesis`:
- `what would falsify it`:

### 7. Results

- `observed outcome`:
- `primary metric result`:
- `secondary metric results`:
- `qualitative observations`:

### 8. Interpretation

- `did the result support, weaken, or falsify the hypothesis?`:
- `what seems causal vs uncertain?`:
- `what competing explanations remain?`:

### 9. Confidence Update

- `evidence_class_after`:
- `confidence_after`:
- `reason for update`:

### 10. Decision

- `decision`:
  - promote
  - keep in test
  - downgrade
  - reject
  - defer
- `what changes now`:
- `what remains open`:

### 11. Follow-Up

- `next test or artifact`:
- `ledger update required`:
- `docs to update`:

## Logging Rules

- record null results
- record contradictions
- record weak signals
- do not rewrite the hypothesis after seeing the result
- update the claims ledger if the result materially changes confidence

## Decision

This template is the minimum memory surface for ChopDot experiments.

## Why

Because evidence that is not logged in a reusable format is too easy to overstate, forget, or selectively remember.
