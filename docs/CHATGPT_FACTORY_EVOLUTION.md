# ChatGPT Work Factory — Evolution Loop

**Status:** active experiment plan  
**Purpose:** make the scheduled ChatGPT Work system materially faster, more productive, and more reliable without turning process into bureaucracy.  
**Authority:** process guidance only; it does not change ChopDot product law, Golden approval, merge, release, or deployment authority.

## Primary mission

The factory exists to maximize **trustworthy product progress per hour of wall-clock time and human attention**, especially when Codex is unavailable.

The question is not “how many workers can we run?” It is:

> How much correct, reviewable product can ChatGPT Work move through the roadmap while Devinson is away?

Sovereignty, security, and authority remain guardrails. They are not the main throughput project unless a concrete architecture change makes them relevant.

## Journey-agnostic operating law

The factory must work unchanged for **Journey N → Journey N+1**.

No permanent worker, watcher, transition, or scheduling rule may require a hard-coded journey number, candidate SHA, or next-journey name. Those values must be resolved from live canonical GitHub state at execution time.

Journey number is product-roadmap data, not orchestration logic.

Factory generation is also data. A journey may declare or inherit a `factory_generation` and enabled capabilities, but workers must read those from canonical repo state/docs rather than infer them from `N`, `N+1`, or prompt history.

A journey-specific one-time automation is acceptable only as a **migration or emergency recovery mechanism**. It must not become the normal way the factory advances.

## Generic state machine

Normal operation is:

```text
AUTHORITATIVE DEFINITION
        ↓
BUILD
        ↓
SEALED REVIEW REQUEST
        ↓
INDEPENDENT REVIEW
   ┌────┴─────────────┐
 REVISE          GOLDEN-READY
   ↓                  ↓
REPAIR          HUMAN APPROVAL
   ↓                  ↓
RE-REVIEW            FREEZE
                       ↓
              TRANSITION VERIFY PENDING
                       ↓
               VALIDATED GOLDEN
                       ↓
          REGISTRY NEXT JOURNEY AUTHORITY
                       ↓
                     BUILD
```

The state machine is driven by canonical registry state, sealed handoffs, exact evidence and explicit human approval — never by a journey-specific cron chain.

## Operating laws

1. **One writer per candidate lane.** Parallelize thinking, testing, evidence preparation, and future-work preflight — not competing product writes.
2. **A scheduled run is an opportunity, not a work unit.** Once started, a Builder should continue through the whole authorized sprint until review-ready or genuinely blocked.
3. **No-idle is a factory law.** Once a valid handoff exists, the next eligible stage should begin at the next safe watcher opportunity. Waiting only because a named worker has not reached its hourly slot is a process defect.
4. **Mechanical failures are self-repaired.** Builders fix ordinary test, harness, selector, rendering, layout, and implementation defects in the same run when no new product authority is required.
5. **Formal review is independent and singular.** One exact sealed handoff → one independent Reviewer. Duplicate equivalent reviewers are waste unless a specific second opinion is requested.
6. **Human attention is reserved for actual authority.** Product ambiguity, exact approval, irreversible actions, protected merge, production deployment, spending, signing, secrets, and other explicit human gates.
7. **Future work is prepared in parallel when enabled.** While Journey N is active, read-only workers may prepare Journey N+1 without writing N+1 candidate product bytes.
8. **Deterministic work belongs in automation.** GitHub Actions/scripts should increasingly own rendering, screenshot matrices, interaction replay, checksums, state coverage, console/network capture, accessibility scans, and evidence packaging.
9. **The roster must earn its existence.** A scout or worker that does not measurably prevent rework or shorten cycle time should be merged, changed, or removed.
10. **Do not optimize a stable loop for novelty.** If a generation works, keep it until evidence identifies a bottleneck.

## Generic watcher mesh

The current fast-lane mesh provides multiple safe opportunities without changing authority semantics:

- Builder opportunities: `:00`, `:20`, `:45`
- Independent review opportunities: `:15`, `:40`, `:55`
- Supervisor/transition opportunities: `:05`, `:35`, `:52`
- Control Tower: `:58`

Every watcher must resolve live current journey/stage/generation before acting and no-op on stale, superseded, already-owned, or ineligible work.

This mesh exists to reduce scheduling latency. It does **not** permit competing writers, duplicate reviews, or authority races.

## Factory capabilities

Factory generations are bundles of capabilities, not journey numbers.

### Sustained Builder

The Builder continues through the complete authorized sprint instead of stopping after bounded increments.

Measure:

- authoritative activation → sealed review request;
- premature Builder stops;
- mechanical self-repair rate.

### Compressed current-work packet

A worker should not reconstruct the whole repository history before acting. The packet contains only what is required:

- current journey and stage;
- canonical authority head;
- candidate branch/head if one exists;
- exact contract/source files;
- relevant adjacent Goldens/patterns;
- still-current scout/reviewer findings;
- required evidence commands/artifacts;
- current owner and stop condition;
- enabled factory capabilities for this journey.

Measure whether context reconstruction falls and activation → useful work improves.

### Caller-reachability evidence

Every registered material state must be proven through a truthful caller path or explicitly classified as a real owner/system boundary.

Direct render/state injection alone is not sufficient evidence of product continuity.

Measure Reviewer revisions caused by unreachable or fabricated state transitions.

### N+1 preflight

When enabled, read-only workers may prepare the registry-confirmed next journey while the current journey builds/reviews:

- contract gaps;
- likely state inventory;
- platform implications;
- adjacent Golden patterns;
- trust/recovery risks;
- reusable components/patterns;
- expected QA matrix.

They must not create candidate product bytes before the next journey becomes authoritative.

Measure activation → first complete candidate and the proportion of discovery already resolved at activation.

### Golden-derived pattern reuse

Approved Goldens may yield reusable repo-owned interaction/visual patterns such as:

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

These patterns are accelerators, not a second design authority. Goldens remain the evidence.

Measure implementation speed plus visual/interaction consistency.

### Roster and pipeline tuning

Use accumulated evidence to decide:

- which scouts prevent Reviewer revisions;
- which scouts should merge/disappear;
- whether Evidence QA needs a worker or belongs in Actions;
- whether watcher timing still creates idle time;
- which mechanical checks should move fully into Actions;
- whether current-work packets reduce reconstruction;
- whether N+1 preflight produces real speed gains;
- where human approval remains the only unavoidable wait.

Remove complexity that does not pay for itself.

## Capability configuration

The canonical journey/process state should declare what the current factory generation enables. Conceptually:

```json
{
  "factory_generation": "v1.2",
  "factory_features": {
    "sustained_builder": true,
    "compressed_work_packet": true,
    "caller_reachability": true,
    "next_journey_preflight": true,
    "golden_pattern_reuse": false
  }
}
```

Exact schema may evolve, but the rule is fixed:

> Workers read factory behavior from canonical configuration; prompts do not hard-code behavior to Journey 25, 26, 27, or 28.

## Historical experiment record

Journey-specific references are allowed as experiment history only.

- Factory v1 was first measured during Journey 24.
- Factory v1.1 was first introduced during Journey 25.

Those facts do **not** mean v1 belongs to J24 or v1.1 belongs to J25. The capability bundle can be carried forward, retained, removed, or changed independently of journey numbering based on evidence.

## Pipeline target

The mature factory should allow safe overlap without competing authority:

```text
Journey N-1: approved implementation/integration follow-through
Journey N:   one Builder → evidence → independent review → approval gate
Journey N+1: read-only definition/preflight/runway preparation when enabled
```

The target morning experience is:

> Multiple safe roadmap steps advanced overnight. Only genuine decisions, exact approvals, or external blockers need human attention.

## Factory Observer

The Factory Observer is outside the Builder/Reviewer/Supervisor chain.

It does not write candidate product bytes, classify product quality, approve/freeze Goldens, change product authority, retask healthy workers, merge, deploy, spend, sign, or handle secrets.

Its subject is the **system doing the work**.

### Evidence it reads

- canonical journey/Golden/process registry;
- current factory generation/features;
- issue #38 material handoffs;
- exact candidate commits;
- exact GitHub Actions runs/artifacts;
- scheduled-worker state/timing;
- issue #40 prior Observer reports/experiments.

### Core scorecard

| Metric | Why it matters |
|---|---|
| activation → sealed Builder review request | primary build-cycle speed |
| review request → Reviewer receipt | review latency |
| Reviewer receipt → human gate | orchestration/authority latency |
| approval → validated freeze/advance | transition efficiency |
| first-pass `GOLDEN-READY` | quality / early-defect signal |
| Reviewer revision count | rework |
| material scout/preflight findings absorbed | support-worker value |
| mechanical/QA reruns | automation/harness cost |
| active execution time | actual productive time |
| external CI wait | legitimate external wait |
| human wait | legitimate authority wait |
| avoidable orchestration wait | factory waste |
| premature Builder stops | sustained-execution failure |
| duplicate/competing attempts | coordination waste |
| human interventions before approval | autonomy quality |
| next-journey runway ready when enabled | pipeline overlap value |
| external tool spend | economics |

Unknown stays `unknown`; never manufacture precision.

### Drift checks

The Observer should flag:

- Builder stops after small increments without a genuine gate;
- duplicate writers/reviewers on the same candidate;
- workers spend more time reconstructing context than advancing work;
- formal review repeatedly catches issues enabled scouts/evidence should catch;
- CI/render/evidence generation dominates wall-clock time and could be automated;
- schedule gaps dominate active execution time;
- a validated next journey waits beyond the next Builder opportunity;
- N+1 preflight is enabled but absent despite spare read-only capacity;
- process comments/authority reconciliation become larger than product changes;
- a new external tool adds complexity/cost without measured gain;
- journey-specific `Kickoff Jx` / `Finish Jx` automation becomes necessary in normal operation;
- workers infer generation from journey number rather than canonical config.

The Observer must distinguish healthy journey-specific product adaptation from accidental journey-specific orchestration.

## Change discipline

1. Keep a generation stable enough to measure it.
2. Change the largest observed bottleneck, not the most interesting idea.
3. Prefer one major process experiment at a time.
4. Do not reconfigure an active candidate unless a concrete coordination/safety defect exists.
5. Enable throughput improvements through canonical factory configuration, not journey-specific prompt rewrites.
6. Compare results with the nearest valid prior baseline.
7. Keep successful changes; revert/simplify unsuccessful ones.
8. If a transition needs a one-time journey-specific recovery task, treat that as evidence of a generic orchestration gap and repair the generic state machine afterward.

## Lightweight architecture guardrail

Do not run bureaucracy around centralization. When a material runtime architecture proposal appears, ask whether it introduces a new required centralized dependency or conflicts with current Polkadot/Parity platform direction. If not, move on.

Current Polkadot Dev Docs, Product SDK changes, Parity repositories/tooling, Devnet updates, descriptors, and relevant platform releases should remain watched because a platform improvement can remove work or change the correct implementation path.

## End state

Do not keep inventing factory versions because journey numbers advance.

The factory should eventually stabilize around the smallest proven topology and evolve only when roadmap shape, platform capabilities, or measured bottlenecks change.

The factory is successful when it becomes boring: **fast, predictable, journey-agnostic, evidence-backed, and capable of substantial progress without continuous human supervision.**
