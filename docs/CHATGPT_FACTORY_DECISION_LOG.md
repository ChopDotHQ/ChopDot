# ChatGPT Work Factory — Decision & Lessons Log

**Status:** durable historical record  
**Purpose:** preserve *why* the factory changed so future threads/agents do not repeat solved mistakes  
**Authority:** historical/process context only; live product law, canonical UX registry, exact Git evidence, and explicit human approvals always outrank this file

This is the chronological memory of the ChopDot development factory. It records the problem observed, the decision made, the evidence/lesson behind it, and what must not regress.

It is intentionally different from:

- `CHATGPT_WORK_FACTORY.md` — what the factory is;
- `CHATGPT_FACTORY_EVOLUTION.md` — how we improve it;
- issue #38 — current UX/product operational handoffs;
- issue #40 — factory observer / platform / capability reports;
- product ADRs — product/runtime architectural authority.

## Decision law

A historical decision is useful context, not current truth by itself.

When this file conflicts with live canonical product state or exact Git evidence, live authority wins. See ADR 0004 — Context authority and cited recall.

---

## 2026-09-03 — Stop treating the whole prototype as one growing file

### Problem observed

The prototype was initially fast to evolve as one large HTML surface, but it became progressively harder to reason about, edit safely, and extend without breaking adjacent flows. Thread/context growth also made it increasingly risky to rely on conversation memory for journey structure and prior decisions.

### Decision

Move to a repo-owned Experience Workbench:

- separate journey folders;
- explicit journey specs / state inventories / edge cases / decision histories;
- a registry / Experience Map;
- shared design system and frame;
- approved Golden artifacts;
- render-and-inspect QA;
- state/journey regression checks;
- frozen approved journeys rather than continuously editing old approved HTML.

### Lesson

**Speed from an unstructured prototype eventually turns into rework.**

The scalable unit is a journey with explicit entry/exit/state contracts, not a giant app-shaped mockup.

### Do not regress to

- one monolithic prototype file as the authority;
- journeys defined only in chat;
- adding product flows that are not represented in the journey/state map;
- modifying approved Golden HTML in place.

---

## 2026-09 — GitHub becomes durable factory truth

### Problem observed

Scheduled workers, multiple agents, chat threads and generated summaries can all be individually consistent while referring to different moments or branches.

### Decision

Use GitHub as the durable engineering/process coordination plane:

- exact commits/branches;
- current registry;
- issues #38/#40 for material handoffs and factory observations;
- GitHub Actions for deterministic evidence;
- artifacts/screenshots/tests;
- immutable candidate identities;
- explicit approval/freeze records.

Chat/thread history is navigation context, never stronger authority than live repo state.

### Lesson

**Conversation continuity is useful; repository continuity is required.**

### Do not regress to

- trusting an automation prompt because it says a journey is current;
- treating an old issue comment or chat summary as stronger than a newer Git object;
- relying on a future thread to reconstruct product/process truth from memory.

---

## 2026-09 — Parallelize reasoning; serialize authority

### Problem observed

More workers can create more activity without creating more product progress. Duplicate writers/reviewers risk races, contradictory output and duplicated review cost.

### Decision

Adopt:

- one candidate writer;
- one formal independent Reviewer;
- one Supervisor for authority transitions;
- parallel read-only scouts / evidence / adversarial work where it actually prevents rework;
- Control Tower as coordination observer, not a second Supervisor.

### Lesson

**Agent count is not throughput.** Parallel capacity should remove uncertainty and mechanical work around the critical path, not create competing authority.

### Do not regress to

- multiple Builders editing the same candidate;
- equivalent duplicate formal reviews;
- workers changing authority because another worker is slow.

---

## 2026-09 — Prototype/journey quality before production plumbing

### Problem observed

Earlier product work became complicated when implementation advanced before user journeys, states and visual/product contracts were fully defined.

### Decision

Keep the UX Workbench lifecycle explicit:

`DEFINE → BUILD → MECHANICAL QA → INDEPENDENT REVIEW → HUMAN APPROVAL → GOLDEN FREEZE`

Production integration consumes approved/frozen product truth; it does not redesign it silently.

### Lesson

**A clear product contract is cheaper than repairing architecture around an unclear experience.**

---

## 2026-09 — Factory tooling must not become ChopDot runtime architecture

### Problem observed

Powerful developer services can quietly become product dependencies if convenience is mistaken for architecture.

### Decision

Separate:

1. build-time factory tooling;
2. optional/non-authoritative runtime capability;
3. core runtime dependency.

Centralized services may accelerate building/testing, but ChopDot's core runtime must follow the approved Polkadot-native / user-controlled architecture unless an explicit new architecture decision changes it.

### Lesson

**Use centralized tools to build ChopDot; do not accidentally make ChopDot depend on them to remain ChopDot.**

---

## 2026-09-14 — Sustained Builder instead of hourly work chunks

### Problem observed

Workers previously treated a scheduled invocation like a small work unit: wake, make one increment, stop, then wait for the next schedule.

### Decision

A scheduled Builder run is an *opportunity to start*, not the duration of the work unit.

Once eligible, the Builder should continue through the complete authorized sprint until:

- a sealed complete REVIEW REQUEST exists; or
- a genuine authority/human/external blocker exists.

Ordinary implementation, selector, harness, layout and deterministic QA defects are repaired in the same run.

### Lesson

**The clock should start work, not slice work.**

---

## 2026-09-14 — J24 formal review proves independent review is useful

### Problem observed

J24's first candidate had extensive green mechanical evidence and clean rendered states, but the independent Reviewer found a real continuity defect: some registered states existed and rendered correctly yet were reachable only by direct state/hash injection rather than truthful user caller paths.

### Decision

Add caller-reachability as first-class deterministic evidence:

> Every registered material state must be reached through a truthful caller path or explicitly classified as a real owner/system boundary.

A renderable state is not automatically a valid product state transition.

### Lesson

**State existence is not journey continuity.**

This is a concrete example of why green CI cannot replace independent product review.

---

## 2026-09-14 — Idle orchestration is a factory defect

### Problem observed

After the J24 Reviewer returned `REVISE`, the actual repair took only minutes once started, but the pipeline spent a much larger period doing nothing because the responsible Builder had no immediate execution opportunity / dispatch path.

### Decision

Adopt the no-idle law:

> Once a valid exact handoff exists, the next eligible stage should start at the next safe watcher opportunity.

Introduce an event-gated watcher mesh with multiple safe pickup opportunities for Builder, Reviewer and Supervisor stages while preserving one-writer/one-review semantics.

### Lesson

**The workers were not necessarily slow; the orchestration was slow.**

Measure wall-clock time as:

- active execution;
- external CI wait;
- human authority wait;
- avoidable orchestration wait.

Only the last category is pure factory waste.

---

## 2026-09-14 — Do not solve no-idle with journey-specific automation

### Problem observed

The first attempt to remove handoff latency created tasks such as `Finish J24 Verification` and `Kickoff J25 v1.1`.

They solved the immediate timing problem but introduced a larger design flaw: every future journey would require new orchestration glue.

### Decision

Make the factory journey-agnostic.

Permanent workers resolve from live canonical state:

- current journey;
- current stage;
- exact candidate/head;
- review disposition;
- human approval;
- transition verification state;
- current factory generation/features.

The normal state machine is:

`authoritative definition → build → review → revise/repair or GOLDEN-READY → human approval → freeze → transition verification → validated Golden → registry next journey authority → build`

Journey-specific one-time tasks are permitted only for migration/emergency recovery and must trigger a generic-process repair afterward.

### Lesson

**Journey number is roadmap data, not orchestration logic.**

---

## 2026-09-14 — Factory generations are capability configuration, not journey numbers

### Problem observed

Early evolution planning described v1/J24, v1.1/J25, v1.2/J26, etc. This was useful experiment shorthand but could cause workers to infer process behavior from journey numbers.

### Decision

Treat factory generation and features as canonical configuration.

Example capabilities:

- sustained Builder;
- compressed current-work packet;
- caller-reachability evidence;
- N+1 read-only preflight;
- Golden-derived pattern reuse;
- roster/pipeline tuning.

Workers read enabled capabilities from canonical repo state/docs. A journey number does not imply a generation.

### Lesson

**Process capability should survive roadmap movement.**

---

## 2026-09-14 — Preserve why, not just what

### Problem observed

Current docs accurately described the present factory, and GitHub issues preserved events, but a future thread would still need to reconstruct *why* the rules exist by reading long issue histories and old conversations.

### Decision

Create this durable Decision & Lessons Log plus `CHATGPT_FACTORY_RESTART.md`.

Every material future factory change should preserve:

- observed problem;
- evidence/example;
- decision;
- consequence;
- anti-regression rule;
- what would falsify/revisit it where useful.

### Lesson

**A rule without its reason is easy for a future agent to "simplify" back into an old mistake.**

---

## Historical conversation pointers

These user-provided ChatGPT share links are historical research pointers only. They are not product/process authority and may not always remain fetchable:

- https://chatgpt.com/share/6a9d6485-4704-83ed-9617-8286cd97eae5
- https://chatgpt.com/share/6aa1c6d1-2a2c-83eb-9244-b485dc26c302
- https://chatgpt.com/share/6aa7f66f-f9b0-83ed-baa3-c765a57c18a5
- https://chatgpt.com/share/6aa7f687-4364-83eb-99f3-6038277293dd

Important decisions from conversation history must be promoted into repo-owned docs/ADRs/registry rather than depending on these links.

## How to add future entries

Add an entry when at least one is true:

- a completed journey exposes a new recurring process failure;
- a factory experiment is kept/changed/removed;
- a previous rule is materially superseded;
- a new external capability changes the factory topology;
- a restart/new-thread audit discovers missing durable context;
- a one-time recovery task reveals a generic orchestration defect.

Do **not** add entries for routine status, ordinary candidate defects, or journey-specific product choices unless they teach a reusable factory lesson.
