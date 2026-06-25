# ChopDot Friend Pilot Results Ledger

Status: `agent-supported-human-pending`
Date: 2026-06-22
Programme: `B` product usability + Track 1 readiness

## Current Status

No real friend pilot result has been recorded yet for promotion.

An agent-supported pilot run was completed on 2026-06-22, and a mixed
human+agent run packet was generated for `friend-pilot-2026-06-22-mixed`. The
agent run is useful coverage evidence, but it does not promote any scenario to
9/10 because the human participant rows for Dev/Jeanine are still pending.

This ledger is the promotion gate for `docs/chopdot-dot/friend-pilot-script-2026-06-20.md`
and `docs/chopdot-dot/friend-pilot-run-packet-2026-06-21.md`.
The script defines what to run; the packet provides exact local links; this ledger records what actually happened.

Until a row below is updated with real participant evidence, the corresponding mode must stay below 9/10 and must not be described as real-user-passed.

## Evidence Rules

Each scenario result must include:

- separate devices or separate browser profiles;
- participant pseudonyms only;
- route used;
- first user interpretation before coaching;
- coaching needed: `none`, `minor`, or `blocking`;
- action completed;
- blocker explanation;
- unsafe assumption check;
- money-model check: participant explains that payment evidence, payment claim,
  confirmation, approval, release, and closeout are not the same thing;
- screenshot evidence;
- receipt/return check: participant can explain the trusted record, or where they
  would return if the scenario does not reach closeout;
- pass/fail decision;
- required product fix before promotion.

Do not mark a scenario `pass` if any of these are missing.

## Scenario Result Ledger

| Scenario | Status | Participants | Devices | First interpretation | Coaching needed | Action evidence | Blocker explanation | Unsafe assumption check | Money-model check | Receipt/return check | Screenshot evidence | Required product fix | Promotion decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Group Expense | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Savings Circle | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Emergency Pot | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Community Fund | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Capture / Pay / Confirm | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Onboarding / First Entry | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |
| Polkadot-Native Boundaries | `not_run` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | not promoted |

## 2026-06-22 Mixed Human + Agent Evidence

Session: `friend-pilot-2026-06-22-mixed`

Generated run sheet:

```text
artifacts/friend-pilot/friend-pilot-2026-06-22-mixed/run-sheet.md
```

Agent evidence:

```text
artifacts/chopdot-unscripted-agents/2026-06-22/unscripted-agent-results.json
docs/chopdot-dot/unscripted-agent-simulation-2026-06-20.md
```

Result:

- `13 / 13` agent routes loaded with no runtime errors after the local Vite
  server was started on `127.0.0.1:5173`.
- `9` agent steps found and clicked the obvious primary action.
- Group expense: Leo and Nina found `Mark paid`; Mina found `Confirm received`.
- Savings circle: Leo and Omar found `Mark paid`; Mina found `Confirm received`.
- Emergency pot: Casey found `Mark paid`; Riley found `Confirm received`;
  Taylor and Jordan correctly saw waiting states instead of premature actions.
- Community fund: Sam found `Mark paid`; Priya correctly saw `Approval comes
  later`; Alex saw `Confirm Sam` and the admin queue.

Human evidence status:

- Dev: pending.
- Jeanine: pending.
- No scenario is promoted until at least the required human participant evidence
  fields are completed.

Promotion decision:

```text
agent-supported only; not promoted
```

Required product/human check before promotion:

- Dev and Jeanine must each use separate devices or browser profiles.
- They must answer the five pass questions before clicking.
- The facilitator must record first interpretation, coaching level, unsafe
  assumption check, money-model check, receipt/return check, screenshots, and
  required fixes.
- If either human needs coaching to understand next action, blocker, money
  state, or receipt meaning, the relevant scenario stays below 9/10.

## 2026-06-22 Human-Like Agent Pilot

Session: `humanlike-agent-1782161788219`

Evidence:

```text
docs/chopdot-dot/humanlike-agent-pilot-2026-06-22.md
artifacts/chopdot-humanlike-agents/2026-06-22/humanlike-agent-1782161788219/humanlike-agent-results.json
artifacts/chopdot-humanlike-agents/2026-06-22/humanlike-agent-1782161788219/*.png
```

Result:

- `42` normal-surface agent steps ran through the real ChopDot app.
- `41` visible app actions were clicked.
- `1` deliberate no-action state was recorded: Omar left the savings-circle
  contribution unpaid so Mina could record a delay instead of pretending payment
  happened.
- `0` expected actions were missing after waiting for sync.
- `0` runtime errors occurred.
- Group expense, savings circle, emergency pot, and community fund all reached
  a closed receipt state in the final screenshots.

Human evidence status:

- Operator review pending.
- This can count as human-style evidence only if the operator reviews the
  reactions/screenshots and confirms that the behavior makes sense.
- No scenario is promoted to real-human pass from this run alone.

Promotion decision:

```text
agent-observed normal-surface pass; user approval pending; not promoted
```

## Promotion Guard

Allowed current claim:

```text
ChopDot has a ready friend-pilot script and an auditable result ledger. No real friend pilot result has been recorded yet.
ChopDot has a ready friend-pilot run packet with exact local links. No real friend pilot result has been recorded yet.
```

Not allowed:

```text
Real users have passed the pilot.
Every core mode is 9/10.
Live .dot proof is complete.
```

## How To Fill A Row

Use this format inside a follow-up section for each completed scenario:

```text
Scenario:
Date:
Facilitator:
Participants:
Devices:
Route:
First user interpretation:
Coaching needed: none/minor/blocking
Action completed:
What blocked the group:
Unsafe assumption observed:
Money-model check:
Receipt/return understood: yes/no
Screenshot refs:
Pass/fail:
Required product fix:
Promotion decision:
```
