# ChopDot Operating Loops

Status: `active`
Date: 2026-06-22
Purpose: make ChopDot decisions and builds run through explicit role loops instead of one blended agent judgment.

Executable runner: `scripts/chopdot_loop_runner.py`  
Runner guide: `docs/CHOPDOT_LOOP_RUNNER.md`

## Why This Exists

ChopDot keeps failing when one pass tries to be product manager, designer, engineer, researcher, tester, and launch judge at the same time.

The fix is not more prompts. The fix is explicit loops:

```text
role -> goal -> work -> verifier -> stop condition -> memory update -> next loop
```

Every meaningful ChopDot decision should say which loop is active and what proof would let it continue, stop, or hand off.

## Operating Rules

1. One loop owns the decision at a time.
2. Other loops can comment, but they do not override the owning loop without a handoff.
3. Each loop must produce an artifact: note, test result, screenshot, scorecard update, issue, or decision packet.
4. Research does not count as progress unless it changes a decision, test, design, or build.
5. A loop that cannot name a verifier must stop and narrow.
6. A loop that cannot name a user benefit must not authorize implementation.
7. Product truth stays separate from adapter behavior.
8. A passing test is not enough if the screen still feels wrong to a first-time user.
9. No decorative choices: a visible option must change next action, permissions, status, workflow, blockers, payment, confirmation, closeout, receipt, or history.
10. If a proposed UI only changes a default, name, currency, label, copy, or category, the loop must reject or remove it.
11. Product and UX work must pass the product gate before implementation: user journey, one next action, friction `/3`, trust `/3`, clarity `/3`, language `/1`, total `/10`, and pass/fail decision.
12. `build` and `keep` are blocked unless the product gate is `PASS` at `8/10` or higher.

## Shared Decision Packet

Use this before large work, after failed work, or before changing direction.

```text
Decision:
Owning loop:
User job:
Pillar(s): Catch / Management / Payout / History
Current friction:
Trust gap:
Proposed change:
Strongest null option:
Expected user-visible outcome:
Verifier:
Stop condition:
Evidence paths:
Product gate:
  user journey:
  one next action:
  friction score /3:
  trust score /3:
  clarity score /3:
  language score /1:
  total score /10:
  decision: PASS / FAIL
Surface delta:
  visible choices added:
  user action gained:
  workflow effect:
  friction added:
  confusion removed:
  evidence of removed friction:
  keep / change / remove:
Verdict: keep / build / spike / defer / reject
```

## Loop Registry

### 1. Product Spine Loop

Role: product lead.

Goal: keep ChopDot anchored to the shared-money commitment problem, not to a chain, demo, or technical novelty.

Runs when:

- a new feature is proposed;
- we compare modes like group expense, savings circle, emergency pot, community fund, Spend Cards, or capture links;
- a technical capability looks exciting but its product value is unclear.

Inputs:

- `.local-private/CHOPDOT_CONCRETE_SPINE.md`;
- `docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md`;
- current user complaint, pilot observation, or scenario result.

Verifier:

- names the pillar improved;
- names the friction reduced;
- names the trust increased;
- names the strongest null option.

Stop condition:

- no clear user job;
- no pillar improvement;
- the null option is simpler and good enough.

Output:

- decision packet;
- scorecard update when readiness changes.

### 2. First-Time User Loop

Role: Leo, Nina, Omar, Mina, Riley, Alex, or another real participant persona using ChopDot from their own device.

Goal: prove the app is understandable without technical explanation.

Runs when:

- a flow looks correct in code but confusing in the browser;
- one view carries too much burden;
- a mode needs pilot readiness.

Inputs:

- live route;
- one person, one device/browser context;
- one job to finish.

Verifier:

- the person can answer:
  - what is this pot for?
  - what do I do now?
  - who blocks the group?
  - what changed after I acted?
  - am I done?

Stop condition:

- the person needs protocol language to understand the flow;
- the person cannot find the next action;
- the person cannot tell whether money is claimed, received, released, or closed.

Output:

- observation note;
- screenshot or Playwright trace;
- UX issue or scorecard update.

### 3. Money Behavior Loop

Role: money-behavior researcher.

Goal: make ChopDot match how groups actually coordinate money under social pressure.

Runs when:

- a flow involves delays, missed payments, privacy, awkward reminders, reimbursements, emergency help, or handoff;
- the app risks treating money movement as too simple.

Inputs:

- scenario transcript;
- agent-wallet trial;
- friend-pilot result;
- payment evidence report.

Verifier:

- identifies the social risk;
- explains what a real person might avoid, misunderstand, or feel accused by;
- recommends language or flow that lowers friction without hiding truth.

Stop condition:

- the flow makes users feel policed, exposed, or blamed;
- the app closes a record without making unresolved items legible;
- the app adds ceremony users will route around.

Output:

- behavior note;
- revised copy/flow recommendation;
- pilot question.

### 4. UX Shape Loop

Role: product designer.

Goal: make the screen feel like real ChopDot, not an internal lab or control panel.

Runs when:

- a surface looks technically correct but ugly, dense, or unnatural;
- a lab graduates into product;
- the user says the app does not feel like ChopDot.

Inputs:

- current screenshot;
- target ChopDot app chrome;
- mode-specific user job.

Verifier:

- first screen shows status and next action;
- copy is user-facing;
- technical details are hidden unless in developer checks;
- no single view tries to do every job;
- action hierarchy is obvious on mobile.
- any new visible choice changes a real journey, not just defaults or labeling.

Stop condition:

- visible copy says kernel, adapter, rail, raw JSON, test token, or protocol-first language;
- users must scan too many panels to act;
- the screen passes tests but fails visual review.
- a visible choice only changes name, currency, defaults, category, or copy.

Output:

- screenshot review;
- component/page change;
- UX brief.

### 5. Commitment Kernel Loop

Role: domain engineer.

Goal: preserve ChopDot product truth.

Runs when:

- we add or change claim, confirmation, approval, release, closeout, receipt, payment evidence, or dispute behavior;
- a rail or adapter might accidentally become product truth.

Inputs:

- `src/chopdot-dot/commitmentKernel.ts`;
- `src/chapter/`;
- payment-clearance tests;
- scenario report.

Verifier:

- `claimed != received/cleared != approved/released != closed`;
- weak evidence creates a claim only;
- strong recipient+amount evidence can clear the exact payment leg;
- closeout follows scenario rules;
- unauthorized actions fail.

Stop condition:

- UI state becomes the only source of truth;
- adapter behavior directly closes the product state;
- money, proof, storage, and legal claims blur together.

Output:

- unit tests;
- reducer/action update;
- safety boundary note.

### 6. Polkadot Native Adapter Loop

Role: native stack researcher/adapter engineer.

Goal: use Polkadot-native infrastructure where it reduces friction or increases trust, without making the user care.

Runs when:

- Product SDK, Statement Store, Bulletin, DotNS, Asset Hub, Coinage, W3S Pay, T3RMINAL, or host APIs are considered;
- we replace Supabase or local state in the native truth path;
- Parity releases new infrastructure.

Inputs:

- official docs/repos first;
- master plan status board;
- native adapter map;
- local host-sim or public-testnet evidence.

Verifier:

- adapter has a clear boundary;
- failure is visible;
- native path does not depend on Supabase as product truth;
- user copy remains non-technical;
- host/live claims are separated from local/lab proof.

Stop condition:

- capability is only social-media-level discovery;
- host/runtime access is blocked;
- adapter cannot improve a named pillar yet.

Output:

- adapter card;
- evidence ledger update;
- blocked-live note or spike report.

### 7. Security, Privacy, And Abuse Loop

Role: safety reviewer.

Goal: prevent harm in high-trust money contexts.

Runs when:

- emergency pots, community funds, receipts, wallet keys, tx hashes, personal names, sensitive reasons, or public proof are involved;
- a feature could imply custody, escrow, guarantee, verified identity, or legal settlement.

Inputs:

- receipt export;
- privacy class;
- wallet/key handling path;
- public/private artifact locations.

Verifier:

- private keys never leave `.local-private`;
- emergency receipts are redacted by default;
- sensitive reason text and payment refs do not leak;
- custody/escrow/legal claims are explicit and conservative.

Stop condition:

- sensitive data appears in a public artifact;
- the app implies guaranteed payout, custody, or protected funds without that being true;
- proof is treated as payment truth.

Output:

- risk note;
- redaction test;
- claim-boundary update.

### 8. Evidence And QA Loop

Role: verifier.

Goal: turn claims into reproducible evidence.

Runs when:

- we say something works;
- a score changes;
- a doc claims readiness;
- the user asks “how is this passing?”

Inputs:

- commands;
- screenshots;
- Playwright specs;
- Vitest suites;
- generated reports.

Verifier:

- exact command passes;
- result path exists;
- user-visible outcome is described in plain English;
- residual risk is stated.

Stop condition:

- no command or screenshot proves the claim;
- the result is stale;
- test passes while product surface is not usable.

Output:

- verification block;
- scorecard update;
- failure report.

### 9. Decision Editor Loop

Role: operating editor.

Goal: keep the project trackable.

Runs when:

- multiple loops produce competing recommendations;
- the master plan drifts;
- we need to know where we are.

Inputs:

- decision packets;
- scorecards;
- master plan;
- task queue;
- latest verification.

Verifier:

- one current decision is named;
- next loop is named;
- blocked items are separated from active work;
- no “done” claim outruns evidence.

Stop condition:

- decision cannot be summarized in plain English;
- there are multiple active centers;
- current status is memory-derived and not repo-verified.

Output:

- status update;
- master-plan or task-queue update;
- next-loop assignment.

## Default Routing

| Situation | Start with |
| --- | --- |
| New feature idea | Product Spine Loop |
| Screen feels wrong | UX Shape Loop |
| User flow feels socially awkward | Money Behavior Loop |
| State semantics are unclear | Commitment Kernel Loop |
| Polkadot repo/capability appears | Polkadot Native Adapter Loop |
| Privacy, receipts, wallet keys, emergency details | Security, Privacy, And Abuse Loop |
| We claim readiness | Evidence And QA Loop |
| We are lost in the plan | Decision Editor Loop |
| Friend/user pilot | First-Time User Loop, then Money Behavior Loop |

## Required Handoff Format

When one loop hands off to another:

```text
From loop:
To loop:
Why handoff:
Facts discovered:
Open question:
Evidence:
Do not change:
Recommended next action:
```

## Example: PAS Agent Wallet Trial

Owning loop: Evidence And QA.

Supporting loops:

- Commitment Kernel Loop: payment clearance semantics;
- First-Time User Loop: each agent acts from a separate context;
- Security Loop: private keys stay local;
- Polkadot Native Adapter Loop: PAS evidence is public-testnet/lab, not production host proof.

Correct conclusion:

```text
Funded public-testnet PAS transfers can clear matching payment legs and close
the correct ChopDot records in the real pot surface. This is not production
custody, live .dot proof, or a real-user comprehension pass.
```

## Example: Bad Loop

```text
Prompt: Make ChopDot.dot amazing.
Agent: Builds a large lab screen.
Tests: Pass.
User: This looks nothing like ChopDot.
Failure: No UX Shape Loop owned the work, and First-Time User Loop never ran.
```

Correct replacement:

```text
Product Spine -> UX Shape -> First-Time User -> Commitment Kernel -> Evidence QA -> Decision Editor
```

## Minimum Daily Loop

When continuing ChopDot work:

1. Decision Editor: name current goal and blocked gates.
2. Product Spine: confirm pillar and user job.
3. Owning loop: do the work.
4. Evidence QA: verify with command, screenshot, or report.
5. Decision Editor: update status, score, or next loop.

If this cannot be done, stop and say which loop is missing.
