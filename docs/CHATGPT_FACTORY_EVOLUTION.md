# ChatGPT Work Factory — Evolution Loop

**Status:** active experiment plan  
**Purpose:** make the scheduled ChatGPT Work system materially faster, more productive, and more reliable without turning process into bureaucracy.  
**Authority:** process guidance only; it does not change ChopDot product law, Golden approval, merge, release, or deployment authority.

## Primary mission

The factory exists to maximize **trustworthy product progress per hour of wall-clock time and human attention**, especially when Codex is unavailable.

The question is not “how many workers can we run?” It is:

> How much correct, reviewable product can ChatGPT Work move through the roadmap while Devinson is away?

Sovereignty, security, and authority remain guardrails. They are not the main throughput project unless a concrete architecture change makes them relevant.

## Operating laws

1. **One writer per candidate lane.** Parallelize thinking, testing, evidence preparation, and future-work preflight — not competing product writes.
2. **A scheduled run is a trigger, not a work unit.** Once started, a Builder should continue through the whole authorized sprint until review-ready or genuinely blocked.
3. **Mechanical failures are self-repaired.** Builders fix ordinary test, harness, selector, rendering, layout, and implementation defects in the same run when no new product authority is required.
4. **Formal review is independent and singular.** One exact sealed handoff → one independent Reviewer. Duplicate equivalent reviewers are waste unless a specific second opinion is requested.
5. **Human attention is reserved for actual authority.** Product ambiguity, exact approval, irreversible actions, protected merge, production deployment, spending, signing, secrets, and other explicit human gates.
6. **Future work is prepared in parallel.** While Journey N is being built, read-only workers may prepare Journey N+1 so the next Builder does not start from zero.
7. **Deterministic work belongs in automation.** GitHub Actions/scripts should increasingly own rendering, screenshot matrices, interaction replay, checksums, state coverage, console/network capture, accessibility scans, and evidence packaging.
8. **The roster must earn its existence.** A scout or worker that does not measurably prevent rework or shorten cycle time should be merged, changed, or removed.
9. **Do not optimize a stable loop for novelty.** If a generation works, keep it until evidence identifies a bottleneck.

## Factory generations

Each remaining prototype journey is an opportunity to improve one major part of the system while keeping the rest stable enough to compare.

### Factory v1 — Journey 24

**Experiment:** parallel specialist scouts + one sustained Builder + one formal Reviewer.

Prove:

- scouts can find material defects before formal review;
- the Builder can absorb those findings without competing writers;
- the Builder continues instead of stopping after bounded increments;
- one Reviewer can consume the complete candidate in one pass;
- schedule latency is no longer the dominant cost.

Treat J24 as the baseline for the fast-lane architecture.

### Factory v1.1 — Journey 25

**Add:** a compressed current-work packet + more deterministic evidence automation.

The current-work packet should let a worker enter the task without reconstructing the entire project history. It should contain only what is needed to act safely:

- current journey and stage;
- canonical authority head;
- candidate branch/head if one exists;
- exact contract/source files to read;
- relevant adjacent Goldens/patterns;
- open still-current scout/reviewer findings;
- expected evidence commands/artifacts;
- current owner and stop condition.

Automation should take more bookkeeping away from reasoning workers: renders, viewport matrix, console/network capture, interaction results, state counts, checksums, and evidence manifest where practical.

**Question:** does Builder activation → sealed review request materially fall versus J24?

### Factory v1.2 — Journey 26

**Add:** next-journey preflight while the current journey is still active.

While J25 is building/reviewing, read-only workers may prepare J26:

- contract gaps;
- likely state inventory;
- Polkadot/platform implications;
- adjacent Golden patterns;
- likely trust/recovery risks;
- reusable components/patterns;
- expected QA matrix.

They must not create J26 candidate product bytes before J26 becomes authoritative.

When J26 activates, its Builder should inherit a prepared runway instead of starting from discovery.

**Question:** how close can activation → first complete candidate get to pure implementation time?

### Factory v1.3 — Journey 27

**Add:** Golden-derived pattern reuse.

By this point the workbench has enough approved examples to stop treating every screen as greenfield design. Extract reusable repo-owned patterns from Goldens, for example:

- confirmation/review;
- warning/block;
- pending/unknown result;
- reconciliation/retry;
- empty/loading/offline;
- success/receipt;
- destructive action;
- owner-boundary handoff;
- navigation/header/back behavior;
- common typography/spacing/action hierarchy.

These are product/design patterns, not a second design authority. Goldens remain the evidence.

**Question:** does reuse improve both implementation speed and visual/interaction consistency?

### Factory v1.4 — Journey 28

**Add:** roster and pipeline tuning from observed data.

By J28 there should be enough evidence to decide:

- which scouts consistently prevented Reviewer revisions;
- which scouts can be merged;
- whether Evidence QA needs a dedicated worker or can be automated;
- whether review timing still causes idle time;
- which mechanical checks should move fully into Actions;
- whether current-work packets materially reduce context reconstruction;
- whether N+1 preflight is producing real speed gains;
- where human approval remains the only unavoidable wait.

Remove complexity that does not pay for itself.

**Question:** what is the smallest worker topology that sustains the best throughput and quality?

## Pipeline target

The mature factory should allow safe overlap without competing authority:

```text
Journey N-1: approved implementation/integration follow-through
Journey N:   one Builder → evidence → independent review → approval gate
Journey N+1: read-only definition/preflight/runway preparation
```

The target morning experience is:

> Multiple safe roadmap steps advanced overnight. Only genuine decisions, exact approvals, or external blockers need human attention.

## Factory Observer

The Factory Observer is intentionally outside the Builder/Reviewer/Supervisor chain.

It **does not**:

- write candidate product bytes;
- classify candidate UX quality;
- approve or freeze Goldens;
- change product authority;
- retask healthy workers during a sprint merely to try a new idea;
- merge, deploy, spend, sign, or handle secrets.

Its job is to examine the **system that is doing the work**.

### Evidence it reads

Use live evidence rather than prompt assumptions:

- canonical journey/Golden registry;
- issue #38 material Builder/Reviewer/Supervisor/Control Tower handoffs;
- exact candidate commits;
- exact GitHub Actions runs and artifacts;
- scheduled-worker state/timing;
- issue #40 prior Factory Observer reports and experiments.

### Core scorecard

For each completed journey or material factory experiment, record what can be established reliably:

| Metric | Why it matters |
|---|---|
| activation → sealed Builder review request | primary build-cycle speed |
| review request → Reviewer receipt | review latency |
| Reviewer receipt → human gate | orchestration/authority latency |
| approval → validated freeze/advance | transition efficiency |
| first-pass `GOLDEN-READY` | strongest quality/early-defect signal |
| Reviewer revision count | rework |
| material scout findings absorbed pre-review | scout value |
| mechanical/QA reruns | automation/harness cost |
| avoidable schedule wait | orchestration waste |
| premature Builder stops | sustained-execution failure |
| duplicate/competing worker attempts | coordination waste |
| human interventions before approval | autonomy quality |
| next-journey runway ready at activation | pipeline overlap value |
| external tool spend | economics |

Do not invent precision when timestamps or evidence are unavailable. Mark a metric `unknown` rather than guessing.

### Observer verdict

Every material report should end with exactly one of these recommendations for each relevant mechanism:

- **KEEP** — working; do not disturb it.
- **CHANGE** — a measured bottleneck warrants a bounded modification.
- **REMOVE** — cost/coordination exceeds demonstrated value.
- **EXPERIMENT** — test one bounded new process/tool against a clear baseline.

Prefer **one highest-leverage change for the next journey**, not a redesign of the whole factory.

### Drift checks

The Observer should flag process drift when evidence shows any of these patterns:

- Builder repeatedly stops after small increments without a genuine gate;
- duplicate writers/reviewers appear on the same exact candidate;
- workers spend more time reconstructing context than advancing work;
- formal review discovers issues the scouts repeatedly should have caught;
- scouts generate noise that does not affect candidate quality;
- CI/render/evidence generation dominates wall-clock time and could be automated;
- schedule gaps dominate active execution time;
- current journey waits while N+1 has no preflight despite spare read-only capacity;
- process comments/authority reconciliation become larger than the product changes;
- a new tool adds complexity/cost without measured throughput or correctness gain.

Drift is not automatically a failure. The Observer should distinguish:

- **healthy adaptation** to a genuinely different journey;
- **necessary safety/authority work**;
- **accidental process growth**;
- **avoidable execution latency**.

## Change discipline

To preserve learning value:

1. Keep the current generation stable enough to measure it.
2. Change the largest observed bottleneck, not the most interesting idea.
3. Prefer one major process experiment per journey generation.
4. Do not reconfigure an active candidate unless there is a concrete coordination/safety defect.
5. Apply normal throughput improvements to the next journey whenever possible.
6. Compare the result against the prior journey.
7. Keep successful changes; revert or simplify unsuccessful ones.

## Lightweight architecture guardrail

Do not run a separate bureaucracy around centralization. When a material runtime architecture proposal appears, ask only whether it introduces a new required centralized dependency or conflicts with current Polkadot/Parity platform direction. If not, move on.

Current Polkadot Dev Docs, Product SDK changes, Parity repositories/tooling, Devnet updates, descriptors, and relevant platform releases should remain watched because a platform improvement can remove work or change the correct implementation path.

## After Journey 28

Do not keep inventing factory versions because the prototype journeys are finished.

At that point:

- select the best proven topology;
- promote the highest-value automation/patterns into normal operation;
- carry the Factory Observer forward at a lower cadence;
- evolve only when roadmap shape, platform capabilities, or measured bottlenecks change.

The factory is successful when it becomes boring: fast, predictable, evidence-backed, and capable of making substantial progress without continuous human supervision.
