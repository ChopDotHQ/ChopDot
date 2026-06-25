# ChopDot Product Board Policy

## Statuses

- `backlog`: captured but not ready
- `discovery`: needs source review, user story, or product simplification
- `ready`: product gate passes and the next action is clear
- `building`: active implementation or UX work
- `validation`: implemented enough to test with screenshots or agents
- `measuring`: in pilot or observation
- `blocked`: blocked by external access, missing evidence, or unresolved risk
- `done`: accepted with evidence
- `deferred`: intentionally parked

## WIP Limits

- `building`: maximum 3 cards
- `validation`: maximum 5 cards
- `blocked`: no limit, but every blocked card needs a blocker string and next action

## Evidence Quality

- `none`: no evidence
- `thin`: notes or source references only
- `partial`: command output, screenshot, doc, or focused test exists
- `strong`: real UI evidence plus test or human/operator review
- `live`: production/live environment evidence

## Promotion Rules

A user-facing card cannot move to `ready`, `building`, `validation`, or `done` unless:

- user story exists
- one next action exists
- total product gate score is at least 8
- language score is 1
- decision contract exists

A user-facing card cannot move to `done` unless:

- evidence quality is not `none`
- evidence list is not empty
- screenshot evidence exists or `screenshot_required` is `no`

## Hard Fails

Fail validation when normal user copy contains internal language:

- evidence
- rail
- claim
- kernel
- adapter
- obligation
- chapter
- test-token
- raw JSON
- protocol
- settlement
- native
- host
- state machine

Developer checks and proof reports may use technical language. Normal product cards must translate it into user language.

## Product Gate

Every user-facing feature must answer:

```text
User journey:
One next action:
Friction score /3:
Trust score /3:
Clarity score /3:
Language score /1:
Total /10:
Decision:
```

## Agent Policy

Agents may support evidence only when they:

- use the real visible app
- do not mutate internal state directly
- act as separate people or devices
- record screenshots and observations
- include dead ends and hesitation, not only happy paths

Agent evidence does not replace human/operator approval.
