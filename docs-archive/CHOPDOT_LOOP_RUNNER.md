# ChopDot Loop Runner

Status: `active`
Date: 2026-06-22
Purpose: executable control plane for `docs/CHOPDOT_OPERATING_LOOPS.md`.

## What It Does

The runner makes operating loops deterministic:

- creates structured loop packets;
- validates required fields by loop type;
- enforces loop-specific gates;
- optionally runs verifier commands;
- writes a report for every run;
- appends a decision log;
- updates loop state;
- records failures/warnings into an improvement backlog.

It is intentionally not an LLM prompt. It is a Python runner with fixed checks.

## Commands

List loops:

```bash
npm run loops:list
```

Create a packet:

```bash
python3 scripts/chopdot_loop_runner.py new \
  --loop product-spine \
  --decision "Decide whether checkout capture should be the next wedge" \
  --user-job "Organizer records a purchase at checkout without retyping it later"
```

Validate a packet:

```bash
npm run loops:validate -- artifacts/chopdot-loops/runs/<run>/packet.json
```

Run a packet and record the result:

```bash
npm run loops:run -- artifacts/chopdot-loops/runs/<run>/packet.json
```

Run verifier commands inside the packet:

```bash
npm run loops:run -- artifacts/chopdot-loops/runs/<run>/packet.json --execute-commands
```

Print loop state:

```bash
npm run loops:state
```

Run built-in self-tests:

```bash
npm run loops:selftest
```

## Outputs

```text
artifacts/chopdot-loops/runs/<timestamp-slug>/packet.resolved.json
artifacts/chopdot-loops/runs/<timestamp-slug>/report.md
artifacts/chopdot-loops/decision-log.jsonl
artifacts/chopdot-loops/loop-state.json
artifacts/chopdot-loops/improvement-backlog.md
```

## Required Model

Every packet must make these explicit:

```text
Decision
Owning loop
User job
Expected user-visible outcome
Verifier
Stop condition
Verdict
```

Loop-specific gates then add stricter requirements. Examples:

- `product-spine` and `ux-shape` require a `product_gate` object with the user journey, one next action, friction/trust/clarity/language scores, total score, and pass/fail decision. `build` and `keep` are blocked unless the product gate is `PASS` at `8/10` or higher.
- `product-spine` requires pillars, friction, trust gap, proposed change, and strongest null option.
- `first-time-user` requires the five first-time-user answers plus `evidence_mode`.
  `preflight` can only use `spike` or `defer`; `observed` requires screenshot,
  trace, test-results, friend-pilot, or artifact evidence.
- `ux-shape` rejects user-facing copy containing technical terms like `kernel`, `adapter`, `rail`, `raw JSON`, or `test token`.
- `ux-shape` requires a `surface_delta` and fails decorative UI choices. A visible new choice must change the user journey: next action, permissions, status, workflow, blockers, payment, confirmation, closeout, receipt, or history. If it only changes defaults, name, currency, labels, copy, or category, the runner rejects it.
- `commitment-kernel` requires the state invariant and a focused Vitest command.
- `polkadot-native-adapter` requires source refs and an adapter boundary.
- `security-privacy-abuse` scans public evidence paths for obvious private-key, seed, sensitive-reason, and long tx/hash leakage patterns.
- `evidence-qa` requires command objects with explicit `pass`, `fail`, `skipped`, or `not_run` status.
- `decision-editor` requires blocked gates and a known next loop.

## Product Gate Object

For user-facing product or UX work, include:

```json
{
  "product_gate": {
    "user_journey": "I am Mina, I need to capture a CHF 120 dinner payment, so the group can repay me and close the dinner.",
    "one_next_action": "Add receipt",
    "friction_score": 3,
    "trust_score": 2,
    "clarity_score": 2,
    "language_score": 1,
    "total_score": 8,
    "decision": "PASS"
  }
}
```

Rules:

- `user_journey` must follow: "I am [person], I need to [do one job], so the group can [outcome]."
- `one_next_action` must be one action, not a list.
- Scores must add up to `total_score`.
- `PASS` below `8/10` fails.
- `build` or `keep` below `8/10` fails.
- User-facing copy cannot use internal terms and still claim a perfect language score.

## Status Meaning

`pass` means the packet satisfied the current runner contract.

`fail` means the loop is not allowed to authorize the next stage. The failure gets added to:

```text
artifacts/chopdot-loops/improvement-backlog.md
```

This is the self-improvement mechanism: repeated missing fields or weak gates become visible, and the runner/doc can be tightened later.

## UX Shape Surface Delta

Every UX shape packet must include:

```json
{
  "surface_delta": {
    "visible_choices_added": 0,
    "user_action_gained": "What the user can do now that they could not do before.",
    "workflow_effect": "What changes in next action, permissions, status, blockers, payment, confirmation, closeout, receipt, or history.",
    "friction_added": "Any extra tap, field, decision, or text the user must handle.",
    "confusion_removed": "What becomes clearer by scanning the real screen.",
    "evidence_of_removed_friction": "Screenshot, trace, test, or observation path.",
    "keep_change_remove": "keep"
  }
}
```

Hard rule:

```text
No decorative choices.

If a visible option does not change a real user journey, remove it or keep it out of the product surface.
```

## Example Evidence QA Packet

```json
{
  "schema_version": 1,
  "loop_id": "evidence-qa",
  "loop_name": "Evidence And QA Loop",
  "role": "verifier",
  "decision": "Verify funded PAS agent-wallet scenarios",
  "user_job": "Group members see real testnet payment movement reflected in ChopDot records",
  "expected_user_visible_outcome": "The Activity tab says PAS evidence applied and the record closes without exposing emergency details.",
  "verifier": "Focused Playwright passes for group expense, savings circle, emergency pot, and community fund.",
  "stop_condition": "Any scenario fails to close, or emergency receipt leaks sensitive text or tx hashes.",
  "commands": [
    {
      "cmd": "npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1",
      "status": "pass"
    }
  ],
  "evidence_paths": [
    "artifacts/agent-wallet-trials/agent-wallet-trial-2026-06-22/pas-scenario-report.md"
  ],
  "verdict": "keep"
}
```

## Boundary

The runner does not replace real browser testing, user pilots, wallet funding, or source research. It prevents us from skipping the loop contract before those things happen.
