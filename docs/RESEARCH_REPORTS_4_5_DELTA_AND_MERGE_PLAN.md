# Research Reports 4 And 5 Delta And Merge Plan

<discovery_plan>
- Compare the two newly provided research reports against the current docs package
- Separate what is immediately mergeable from what should remain future-state guidance
- Record how to handle further research reports safely
</discovery_plan>

## FACTS

- Report 4:
  - [deep-research-report (4).md](/Users/devinsonpena/Downloads/deep-research-report%20%284%29.md)
  - focus: Brazil, Kenya, Pix, M-PESA, local identity, adapters, low-bandwidth UX
- Report 5:
  - [deep-research-report (5).md](/Users/devinsonpena/Downloads/deep-research-report%20%285%29.md)
  - focus: CROPS-style phased roadmap, stack, rails, privacy, agents, tokenized rights, portability

## INFERENCES

- Report 4 is easier to merge directly because it supports current product direction without distorting scope.
- Report 5 is valuable, but it must be filtered harder because it mixes:
  - good future architecture
  - high-expansion scope

## ASSUMPTIONS

- More pasted reports may follow the same pattern:
  - one part concrete and directly useful now
  - one part expansive and future-weighted

## What Report 4 Adds

- local execution doctrine for Brazil and Kenya
- adapter boundaries for Pix and M-PESA
- SMS / phone / USSD implications
- low-bandwidth UX guidance
- local pilot and operational framing

Merged into:
- [LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md)

## What Report 5 Adds

- phased future-state roadmap
- stronger exportability / replayability posture
- better articulation of event-ledger truth
- better deferred view of:
  - rights
  - privacy
  - agents
  - compliance
  - multi-rail expansion

Merged as filtered review:
- [CROPS_PHASED_ROADMAP_REVIEW.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/CROPS_PHASED_ROADMAP_REVIEW.md)

## How To Interpret These Reports

### Report 4

Use as:
- supporting current work
- future pilot and adapter planning

### Report 5

Use as:
- supporting future-state architecture
- values and portability guardrail

Do not use as:
- current build brief

## Practical Rule For Future Reports

For each new research report:

1. identify what changes current execution
2. identify what only changes future architecture
3. merge the useful parts into tracked doctrine
4. explicitly mark the rest as deferred

This prevents research sprawl from silently becoming scope sprawl.

## Next move

- Keep bringing the other reports in as files instead of share links when possible.
- That gives a cleaner merge path and avoids hidden-tool-output loss.
