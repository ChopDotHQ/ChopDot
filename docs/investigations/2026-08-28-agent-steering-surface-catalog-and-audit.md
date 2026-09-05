# Agent steering-surface catalog and audit — 2026-08-28

**Kind:** investigation and measurement
**Status:** concluded
**Trigger:** operator report of repeated product narrowing and unclear judgment authority
**Owner:** agent-systems integrator
**Independent reviewer:** not performed in this catalog-only phase
**Opened / concluded:** 2026-08-28
**Exact target root:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Exact target branch:** `codex/agent-loop-ci-hook-repair`
**Exact starting commit / tree:** `3b1715bb2c3f3f8d09d32974ad08d0297805bb65` / `6fa33d2c396e039bbe2e21b10f8058eef3dbc3be`
**Complete starting Git status:** clean; upstream
`origin/codex/agent-loop-ci-hook-repair`; ahead `0`; behind `0`
**Evidence level:** `source-only` plus newly executed non-mutating command results
**OutcomePacketV1 / evidence reference:** not produced; this is not an accepted
implementation package
**Machine-readable catalog:**
`governance/agent-system/steering-surface-catalog.v1.json`, SHA-256
`ab932cd9494d035d47d7c7efb31b320beba9bb078ee3ac90382605c7b029b780`
**Supersedes / superseded by:** supersedes the completeness conclusion of
`docs/investigations/2026-08-26-agent-instruction-surface-reconciliation.md`;
does not erase its historical observation

This investigation does not change `PRODUCT_TRUTH.md`, Product Cockpit
priority, any skill, agent, loop, validator, repository setting, participant
authority, or release state.

## Question

What surfaces can currently steer ChopDot agents, what does each surface do,
what may it influence, what must it never decide, is it portable and current,
and where can it narrow or drift the product despite apparently successful
loops?

## Expected outcome

The catalog phase succeeds only when every ChopDot-specific steering class can
be answered with:

1. activation condition;
2. input or backing source;
3. output, write, or cognitive effect;
4. allowed influence;
5. forbidden influence;
6. tracked and portable status;
7. freshness or exact-root status;
8. risk and concrete conflict evidence; and
9. a proposed `keep`, `repair`, `quarantine`, `replace`, or `retire` disposition.

This phase does **not** succeed by changing the surfaces before the operator can
review the inventory.

## Declared universe and exclusions

### Included

- 137 exact-worktree candidate steering files found across tracked entrypoints,
  Product Cockpit, the portable agent system, loop/evaluation machinery, and
  agent-governance code;
- all 17 project-labeled skill packages under the canonical checkout's ignored
  `.agents/skills/` tree, comprising 49 files and 571,664 bytes;
- the two named AutoBots ChopDot agents and their current required inputs;
- the canonical ignored AgentOps context bridge used by the canonical
  `AGENTS.md` hydration route;
- environment-owned platform instructions, global/plugin skills, and ephemeral
  subagents as influence classes.

### Excluded

- a line audit of every unrelated global or vendor skill installed on the
  workstation;
- application-internal state/event loops;
- source, skill, agent, Cockpit, validator, or repository-setting repair;
- deletion, disabling, installation, commit, push, merge, publish, or deploy.

Global/plugin skills are included as an external class because they can affect
ChopDot when activated. They are not individually cataloged when they are
unrelated to ChopDot and were not activated.

## Sources and provenance

| Source | Identity | Evidence | Limitation |
|---|---|---|---|
| Exact Git worktree | branch `codex/agent-loop-ci-hook-repair`, HEAD `3b1715b`, tree `6fa33d2` | `git rev-parse`, `git status --porcelain=v2 --branch` | Source identity only; no release claim |
| Exact context authority | `product/context-authority.json`, SHA-256 `91fb77a9ddc5b5985db4643c969c3bae4ba040277fcaa2522358ec249fe0bb08` | full source read and `npm run context:validate -- --json` | Validation currently fails branch identity |
| Product authority | `PRODUCT_TRUTH.md`, SHA-256 `d5ea94b3b89f682d7b7ab76f580102316c25b0366c52b9b5a851a5ab7162bba6`; current Cockpit hashes recorded in the machine catalog | full source review and targeted phrase scan | Does not establish user or implementation proof |
| Tracked judgment methods | Product Judgment `d9c9a9b6...`; Frontend Design `b7c9229a...` | full source read | Method content is itself an audit target, not audit authority |
| Portable agent loops | seven profiles and seven rubrics under `governance/agent-system/` | full JSON reads and compact field extraction | Source existence does not prove adoption |
| Instruction validator | `scripts/agent-system/compatibility.mjs`, SHA-256 `53783d7d...` | source and test read | Measures current implementation, not intended semantics |
| Machine-local skills | 17 `SKILL.md` entrypoints, individual hashes in catalog | full entrypoint reads; supporting-file count and size | Ignored, outside exact worktree, not Git-portable |
| AutoBots agents | `chopdot-daily-operator` `06d0cecc...`; `chopdot-product-systems-steward` `16af3806...` | registry and input-path inspection | Cross-repo/cross-root supporting agents only |
| Canonical AgentOps bridge | `/Users/devinsonpena/ChopDot/.local-private/agentops/kg_context.json`, updated `2026-08-10T15:38:55Z` | full source read | Ignored, stale, canonical-root, not a verified KG receipt for this worktree |

## Method

1. Verified the exact root, branch, HEAD, tree, upstream, and complete starting
   status.
2. Enumerated tracked steering candidates and every canonical project-labeled
   skill entrypoint.
3. Read all 17 `SKILL.md` files and the two tracked judgment methods as objects
   under audit. No judgment skill was used to approve itself.
4. Read every loop profile and policy; extracted expected outcomes, assertions,
   effects, approvals, review mode, budgets, terminal states, and knowledge
   preflight.
5. Read the relevant rubrics, core adversarial suite, instruction validator,
   and compatibility tests.
6. Inspected the two named AutoBots agent registries and tested whether their
   required input paths exist and how old they are.
7. Compared canonical and exact-worktree identities for the key documents the
   external agents read.
8. Searched for repeated product-shaping and reviewer-authority assumptions.
9. Executed the required context validator against the actual branch.
10. Recorded all results without modifying any audited behavior.

## What the system actually contains

### 1. Product authority

| Surface | What it does | Allowed influence | Must never decide | Audit verdict |
|---|---|---|---|---|
| `PRODUCT_TRUTH.md` | Holds durable product invariants | Product law only | Current priority, implementation, deployment | Keep |
| `product/benchmark-baseline.md` | Records the dated category floor and evidence grades | Baseline requirements and open evidence gaps | Priority, parity proof, current implementation | Keep with strict E0/E1/E2 boundaries |
| `product/cards.md` | Holds current packages, priority, scope, blockers, outcomes | Revocable current work | Universal product behavior | Review P-022 Home/action wording |
| `product/decisions.md` | Holds dated revocable decisions | Current product decisions | Product law, implementation proof | Clarify Home versus bounded state actions |
| `product/decision-contracts.md` | Makes current decisions testable | Acceptance for accepted decisions | Creating those decisions | Current Home contract conflicts with the operator's homebase clarification |
| `product/roadmap.md` | Orders delivery phases | Current sequence | User experience by itself | Keep, then align after the catalog review |
| generated board/resume | Operator navigation | Read-only presentation | Source authority | Keep generated-only |

The product authority layer is conceptually correct, but current Home language
is not coherent. `product/decision-contracts.md` requires empty and returning
Home states to select one dominant working action. `product/cards.md` P-022
still names `Scan a receipt`. `product/roadmap.md` warns against a universal
receipt entrance. The operator has now clarified that Home should be a stable
homebase with navigation and may recognize and prompt open actions. That
clarification is not yet represented by one unambiguous tracked decision.

### 2. Operating and execution authority

| Surface | What it does | Strength | Gap |
|---|---|---|---|
| `AGENTS.md` | Exact-root read order, routing, loops, verification | Correct exact-root intent | Routes into currently disputed product methods and an invalid branch manifest |
| seven loop profiles | Bounded creation, evaluation, repair, terminal state | Objective outcomes, effects, budgets, evidence | Some profiles turn product assumptions into hard failures |
| seven rubrics | Score and hard-fail assertions | Measurable outcomes | Repeats the profile assumptions rather than independently challenging them |
| effect/approval policy | Controls repository and external mutations | Strong authority/effect model | No equivalent cognitive-influence policy |
| runner/contracts/schemas | Durable packets and lifecycle | Portable, provider-neutral structure | Source existence is not repeated operational adoption |
| instruction validator | Checks references, commands, and thin Claude redirect | Detects missing entrypoints and three stale stack claims | Does not inspect product assumptions, wrong-root ignored skills, or influence conflicts |
| core adversarial suite | Four negative structural cases | Demonstrates fail-closed mechanics | Does not test the drift patterns that actually escaped |

The loop architecture is useful. The failure is not that loops exist. The
failure is that their objective expected outcomes sometimes contain a disputed
product premise. A deterministic loop then makes the drift repeatable.

### 3. Cognitive influence

This is the missing governed layer. A steering surface can make no file write
and still materially shape what an agent recommends or builds.

| Influence surface | Current state | Risk |
|---|---|---|
| Tracked Product Judgment method | Portable, but mixes evidence method with one-action and anti-dashboard product framing | High |
| Tracked Frontend Design method | Strong screen verification, but also selects action hierarchy and rejects surface types | High |
| Machine-local Engineering Judgment | Broad, ignored, untracked, embeds receipt, closeout, architecture, copy, and actor decisions | Critical |
| Generic UI/UX Pro Max | Mandatory heuristic design-system generator and fixed style rules under a very broad trigger | Critical for ChopDot direction |
| UI Visual Validator | Strong skeptical evidence method, but claims final-gatekeeper and unspecified design-system authority | Medium |
| Knowns skills | Parallel document/task/timer/approval model | High to critical |
| Web3 Testing | Ethereum/mainnet/Goerli/Etherscan assumptions presented as reusable setup | High without adaptation |
| Accessibility, Solidity security, Webapp Testing | Useful conditional techniques | Low to medium when requirement-bound |

No tracked policy currently answers: “May this surface choose a product
hierarchy, user action, architecture, or visual direction?” The existing
authority policy answers only whether an agent may read, write, commit, or
perform an external effect.

## Machine-local skill audit

All 17 packages are outside the exclusive worktree at
`/Users/devinsonpena/ChopDot/.agents/skills`. Canonical
`.git/info/exclude` ignores `.agents/`, so these files are not reviewed or
versioned with this branch.

| Skill | What it does | Audit | Proposed disposition; no action taken |
|---|---|---|---|
| Accessibility Compliance | WCAG-oriented audit/remediation guidance | Useful assurance; must test accepted behavior | Keep advisory |
| ChopDot Engineering Judgment | Architecture, product gate, receipt flow, closeout, copy, Polkadot boundary, actor tests | Broad untracked product and architecture doctrine | Quarantine, then replace with thin tracked loader |
| ChopDot Frontend Design | Loads exact tracked frontend method | Good loader shape; tracked method needs repair | Keep loader after method repair |
| ChopDot Product Judgment | Loads exact tracked product method | Good loader shape; tracked method needs repair | Keep loader after method repair |
| Knowns Commit | Confirmation and Git commit workflow | Parallel repository workflow | Explicit-only, never default |
| Knowns Doc | Search/create/edit Knowns docs | Can create document sprawl and second authority | Quarantine for ChopDot |
| Knowns Init | Reads Knowns docs/tasks/timers first | Conflicts with exact read order; backing type incompatible | Disable as ChopDot default |
| Knowns Research | Searches historical tasks/docs and mutates task research | Can promote stale patterns and incompatible task state | Quarantine for ChopDot |
| Knowns Task | Owns task, timer, plan approval, AC, status, done | Parallel execution and approval authority | Disable as ChopDot default |
| Knowns Brainstorm | Guided option recommendation and task writes | Can steer product and create second task source | Explicit support only |
| Knowns Extract | Generalizes task patterns into docs | High risk of turning a temporary product choice into doctrine | Quarantine for ChopDot |
| Knowns Reopen | Reopens task/timer/AC/plan | Incompatible parallel task lifecycle | Quarantine for ChopDot |
| Solidity Security | Generic contract-security guidance | Appropriate if contract scope is already accepted | Keep advisory |
| UI/UX Pro Max | Selects product type, style, color, typography, and layout from heuristic datasets | Generic taste system can override ChopDot direction | Do not use as ChopDot authority |
| UI Visual Validator | Skeptical screenshot and accessibility verification | Good when bound to accepted requirements; not a product judge | Keep as requirement-bound validator |
| Web3 Testing | Hardhat/Foundry/fork/gas/coverage/verification examples | Ethereum-centric and partly stale for ChopDot | Adapt or replace |
| Webapp Testing | Python Playwright/local-server technique | Optional; must not replace repo Node/host/production tests | Optional technique only |

Individual SHA-256 hashes, activations, effects, and risk explanations are in
the machine-readable catalog.

## Named agent audit

### `chopdot-daily-operator`

- Owner root: `/Users/devinsonpena/ChopDot`, not the exact worktree.
- Required repo inputs were last modified in February and March 2026; its eval
  suite was modified in June.
- It writes operator briefs, task queues, scorecards, dashboards, and compact
  context.
- Its `advance_when` permits it to interpret operator priorities, while its
  human-review boundary covers roadmap interpretation.

Verdict: useful historical operator-agent design, but unsafe as a current
router for this launch worktree until its inputs and outputs are exact-root,
freshness-gated, and subordinated to the tracked context authority.

### `chopdot-product-systems-steward`

- Owner root: `/Users/devinsonpena/ChopDot`, not the exact worktree.
- Required inputs include canonical `README.md`, an April 2026 2030 strategy
  document, and canonical `src/docs/README.md`.
- The exact and canonical hashes differ for README, cards, decisions,
  decision-contracts, roadmap, operating loops, and loop runner.

Verdict: this agent can accurately summarize its configured canonical sources
and still be wrong for the launch worktree. Quarantine it from exact-worktree
routing until adapted.

## Knowledge and hydration audit

The portable design correctly says KGv2, Repo Graph, exact source, and a future
KGv3 are adapters behind one knowledge port. That is the right abstraction.

The current concrete hydration surfaces are not trustworthy for this branch:

1. `npm run context:validate -- --json` exits non-zero with:
   `context branch mismatch: codex/agent-loop-ci-hook-repair != codex/chopdot-v1-launch`.
2. The canonical ignored `kg_context.json` was updated on 2026-08-10 and points
   to `/Users/devinsonpena/ChopDot`.
3. It cites `portable-shell-trial` evidence, old cards, old statuses, and
   `Review this spend`.
4. Its JSON shape is an old bridge summary, not the current portable receipt
   with requested/active read path, runtime, fallback, facts, citations, exact
   root, branch, commit, and outcome digest.

Therefore the current system has a portable knowledge design, but no valid
current-branch hydration proof from the surfaces inspected in this audit.

## Reviewer-authority ambiguity

The repository now correctly records a delegated-owner model:

- human owner: `Devpen787`;
- agents act as the human owner;
- independent human review required: `false`.

But other sources still require `different_actor`, `critical independent
review`, or `independent_review` without consistently stating whether that
means:

- a different deterministic evaluator run;
- a different agent acting for the same owner;
- a different GitHub principal;
- a separate human; or
- an external domain specialist.

This ambiguity caused the earlier nonsensical claim that a named contributor
was the required reviewer. The contributor was never the authority. The repair
must preserve useful evaluator separation without manufacturing a human or
named-collaborator dependency.

## Counterevidence and adversarial checks

### “The skills are only optional, so they cannot hurt”

Rejected. The runtime exposed the machine-local skills as available
capabilities, and Engineering Judgment has an extremely broad trigger. It can
shape recommendations even when it performs no external effect.

### “Repeated one-action language proves consensus”

Rejected. The same premise is copied through the engineering skill, two
tracked methods, two loop profiles, rubrics, operating loops, cards, decisions,
and contracts. Repetition is lineage, not independent evidence.

### “The validator makes the instruction surface safe”

Rejected. The validator checks nine reference strings, 15 package commands,
Claude deference, and three stack terms. Its positive test passes when all
strings exist; it does not parse influence, action selection, portability,
freshness, or conflicts.

### “Current documentation is fresh because it was reviewed yesterday”

Rejected. The context manifest was dated 2026-08-27 but fails the active branch
identity gate. Freshness metadata cannot replace identity validation.

### “The older accepted instruction reconciliation already covered this”

Rejected. That investigation listed two machine-local skills. The current
visible project skill universe contains 17 packages, and even the two listed
hashes no longer match. Its historical observation remains useful, but its
coverage conclusion is superseded.

## Findings

| ID | Severity | Finding | Consequence |
|---|---|---|---|
| F-001 | Critical | No unified cognitive-influence registry exists | Green execution gates can coexist with prompt-driven product drift |
| F-002 | Critical | Exact context validation fails the active branch | The repo is not hydrated under its own gate |
| F-003 | Critical | Canonical KG bridge and two AutoBots agents are stale and cross-root | They can route toward superseded cards and assumptions |
| F-004 | Critical | Engineering Judgment is a broad ignored doctrine file | Product/architecture rules change without review history |
| F-005 | High | One-action/anti-dashboard language is duplicated across many layers | One premise looks like consensus and over-narrows Home |
| F-006 | High | Reviewer separation and human authority are ambiguous | Agents can invent a named reviewer or misstate human proof |
| F-007 | High | Knowns skills assume the wrong task backing and lifecycle | Parallel task/document authority and ENOTDIR incompatibility |
| F-008 | High | Instruction validation is syntactic, not semantic | Harmful/stale assumptions can pass |
| F-009 | Medium | Prior accepted inventory is incomplete and hash-stale | “Accepted” can be mistaken for current complete coverage |

## Decision

`HOLD` on trusting the current steering stack as a reliable product-decision
system.

This is **not** a hold on all ChopDot engineering or on the useful parts of the
loop framework. The following are worth preserving:

- exact-root and evidence identity;
- product-law versus decision separation;
- category-baseline evidence grades;
- bounded loop contracts and expected outcomes;
- production-entrypoint and real-screen proof;
- finite repair budgets and honest terminal states;
- effect/approval readback;
- portable knowledge adapters.

The hold applies to product/UX prioritization and any claim that the current
skills, agents, or hydration surfaces are coherent enough to prevent drift.

## Proposed next phase — not executed

The smallest safe repair package is:

1. fix current branch/root hydration identity;
2. add one tracked influence-boundary registry with allowed and forbidden
   cognitive effects per surface type;
3. reduce project-local skill entrypoints to thin loaders or explicit advisory
   techniques;
4. quarantine Knowns defaults and cross-root AutoBots agents from launch
   routing;
5. separate product selection from design/engineering verification;
6. record the operator's Home-as-stable-homebase clarification in one current
   product decision and align dependent cards/contracts;
7. define evaluator separation, delegated owner, independent agent, and
   independent human as different fields;
8. add hostile tests for wrong-root skills, product assumptions inside generic
   methods, universal Home action, stale generated context, and false reviewer
   independence;
9. regenerate read models and re-run context, product, wiki, agent, and
   repository validations;
10. only then decide which surfaces to keep, replace, quarantine, or retire.

Expected outcome: an agent can be asked why it made a recommendation and point
to one current product decision plus evidence—not to a pile of mutually
reinforcing prompts.

## Commands executed

All commands used CWD
`/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch` unless an absolute
path is shown.

```text
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse HEAD^{tree}
git status --porcelain=v2 --branch
find /Users/devinsonpena/ChopDot/.agents/skills -name SKILL.md -type f
file, wc, sed, nl, shasum for every machine-local skill entrypoint
find governance/agent-system scripts/agent-system scripts/agent-governance
jq for every loop profile, rubric, policy, core suite, project authority, and taxonomy
rg for product-action, architecture, Home, reviewer, and authority assumptions
git check-ignore -v for .agents and .local-private
stat for both AutoBots agents' required input files
shasum comparison for canonical versus exact key product/loop sources
npm run context:validate -- --json
```

The final command failed as expected for the observed branch mismatch. No retry
or alternate checkout was used to turn it green.

## Verification results

| Check | Exit | Exact result |
|---|---:|---|
| `jq empty governance/agent-system/steering-surface-catalog.v1.json` | 0 | valid JSON |
| `git diff --check` | 0 | no whitespace errors |
| `npm run agent:instructions:validate` | 0 | valid; 9 references; 15 commands; 0 issues |
| `npm run agent:validate` | 0 | 50/50 checked governance artifacts valid |
| `npm run agent:knowns:probe -- --tool-expects=file --json` | 0 | compatible generated file |
| `npm run agent:knowns:probe -- --tool-expects=directory --json` | 1 | incompatible; `ENOTDIR` |
| `npm run context:validate -- --json` | 1 | exact branch mismatch |
| `npm run product:validate` | 1 | blocked by the same exact branch mismatch |
| `npm run wiki:validate` | 0 | 13 source pages; generated views current |
| `npm run agent:eval` | 0 | 4/4 existing adversarial cases passed |
| `node --test scripts/agent-system/tests/adapters-compat-cli.test.mjs` | 0 | 22/22 passed; 0 failed; 0 skipped |

The green instruction and loop checks do not contradict this audit. They prove
their current structural assertions. They do not test the cognitive-influence,
Home-narrowing, wrong-root skill, stale-agent, or reviewer-meaning failures
identified here.

## Documentation and provenance impact

- Added this investigation.
- Added the machine-readable catalog.
- Did not edit generated wiki/Cockpit views because no governing decision was
  changed.
- Did not edit the older investigation; its historical evidence remains
  intact, and this investigation records the superseding coverage conclusion.
- A future repair package must update source wiki/ADR pages only when its
  accepted authority and workflow decisions are known, then regenerate and
  validate derived views.
