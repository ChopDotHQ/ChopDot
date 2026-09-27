# ChatGPT Work Factory

**Status:** proposed operating model  
**Scope:** developer tooling and autonomous product-delivery workflow  
**Runtime authority:** none — this document must never redefine ChopDot product law  
**Primary principle:** make the development factory powerful; keep the product sovereign

## Mission

ChopDot should continue to make material product progress when Codex is unavailable or rate-limited.

ChatGPT Work is the always-on operating layer. Scheduled workers, native ChatGPT capabilities, GitHub, CI, research tools, and narrowly selected plugins may help the team research, define, build, test, review, and prepare release candidates.

Codex is an optional accelerator for deep implementation and debugging. It is not a required dependency of the delivery loop.

## Hard boundary: factory capability vs product dependency

A centralized or proprietary service may be used by the **factory** when it improves development speed or quality. It must not silently become required for the **product runtime**.

Before adopting any new service, plugin, API, hosted model, datastore, auth provider, queue, or synchronization layer, answer two separate questions:

1. **Factory question:** does this materially help ChatGPT Work build or verify ChopDot?
2. **Runtime question:** would ChopDot users need this provider to continue using a deployed Product?

If the runtime answer is yes, adoption is blocked unless the capability is explicitly part of the approved Polkadot-native architecture or a separately reviewed open/decentralized dependency.

A useful test is:

> If this company or hosted service disappeared tomorrow, could an existing ChopDot user still open the Product, access the state they control, verify the relevant state, and continue the core flow using the approved Polkadot-native architecture?

If not, the service is not a harmless developer convenience; it is a product dependency and requires an architectural decision.

## Current Polkadot-native runtime target

Current Polkadot Products documentation describes a Product as a static HTML/CSS/JavaScript application that runs client-side inside the Polkadot host or web gateway. The host provides wallet, signing prompts, storage, identity, and chain access through the Product SDK. Product bundles are published through Polkadot-native infrastructure and associated with a `.dot` domain.

Relevant current sources:

- https://docs.polkadotcommunity.foundation/introduction/
- https://docs.polkadotcommunity.foundation/architecture/
- https://docs.polkadotcommunity.foundation/getting-started/developers/
- https://docs.polkadotcommunity.foundation/guides/build-and-publish/
- https://docs.polkadotcommunity.foundation/guides/platform-services-sdk/
- https://docs.polkadotcommunity.foundation/updates/2026-09-devnet-update/

Runtime direction therefore favors:

- static client-side Product delivery,
- self-custodial user authority,
- host-mediated wallet/signing/storage/identity capabilities,
- Asset Hub / PolkaVM where custom on-chain logic is required,
- People-chain capabilities where identity/personhood is required,
- Bulletin for Product bundle publication/storage,
- DotNS / `.dot` discovery,
- provider diversity and explicit chain descriptors rather than a ChopDot-operated application backend,
- local-first / user-controlled state where feasible,
- CRDT or deterministic synchronization techniques only when they preserve the approved authority model.

## Factory core

The default factory should remain small and composable.

### ChatGPT Work

Owns orchestration, reasoning, research, Cloud Browser tasks, scheduled execution, and role coordination.

### Scheduled workers

Provide continuous execution while the user is away. Workers should be specialized and event-gated rather than duplicated.

### GitHub

Canonical engineering coordination and execution surface:

- source and branches,
- issues and handoffs,
- review evidence,
- GitHub Actions,
- artifacts,
- immutable commit identities,
- acceptance and release checkpoints.

GitHub is factory infrastructure, not a ChopDot runtime dependency.

### GitHub Actions

Preferred generic compute surface for repository-bound work:

- builds,
- tests,
- browser rendering,
- screenshot generation,
- visual/state matrices,
- security checks,
- deterministic evidence,
- static analysis.

Where a capability can be implemented reproducibly in the repository or CI at reasonable cost, prefer owning it there over adding another SaaS tool.

### Repository-owned product knowledge

Prefer tracked, reviewable sources over another SaaS knowledge silo:

- product contracts,
- journey definitions,
- design tokens,
- Golden artifacts,
- architecture decisions,
- agent instructions,
- acceptance checks,
- state matrices,
- brand assets,
- QA rubrics.

## Worker topology

Parallelize independent reasoning; serialize authority and writes.

```text
Product / Contract Scout -------\
UX / Accessibility Scout --------+--> ONE Builder --> Evidence QA --> ONE Reviewer --> Supervisor --> Human gate
Trust / Sovereignty Scout -------+
Architecture / Platform Scout ---/

Control Tower observes throughput and coordination, but does not become a second Supervisor.
```

### One writer rule

For one candidate branch, one Builder owns product bytes at a time. Extra capacity should be spent on read-only scouts, evidence preparation, testing, adversarial review, and contract refinement instead of competing writers.

### Scouts

Scouts should produce concrete, bounded findings that can be consumed before formal review. They do not own product authority and do not modify candidate bytes.

### Builder

The Builder executes continuously until the complete scoped candidate is review-ready or a genuine cross-role/human/external blocker exists. It should not stop after every small commit.

### Reviewer

One independent Reviewer consumes one sealed exact handoff and reviews the complete candidate. Duplicate equivalent reviewers are normally waste, not useful parallelism.

### Supervisor

Owns authority transitions, exact-byte approval binding, Golden freeze integrity, and safe advancement. It does not implement candidate product bytes or independently self-review them.

### Sovereignty / Architecture Guardian

A dedicated read-only role should challenge every new architecture or external capability against:

- Polkadot-native platform primitives,
- user authority and key custody,
- local-first possibilities,
- open/protocol-level substitutes,
- centralized provider lock-in,
- failure if a vendor disappears,
- hidden server-side state or authority,
- historical centralized architecture that is no longer current product law.

This review should happen at definition/contract time, before implementation.

## Plugin and external capability adoption gate

A plugin is not valuable merely because it is good. It must add a capability the factory cannot cheaply and reliably own itself.

Every candidate receives the following gate.

### 1. Unique capability

What can this plugin do that ChatGPT Work + GitHub + Actions + repository-owned tooling cannot reasonably reproduce?

If the answer is only nicer UI, another design canvas, another place to store files, or convenience around an already-owned capability, default to `HOLD`.

### 2. Autonomous usability

Can scheduled ChatGPT Work use it unattended and deterministically enough to improve overnight execution?

If routine use needs repeated manual confirmations, desktop interaction, or user intervention, its value to the autonomous factory is limited.

### 3. Economics

Does it require a new paid tier, recurring seat, credit pool, or material usage spend?

Paid capability is not automatically rejected, but the measurable gain must exceed the cost and an owned alternative must be considered first.

### 4. Portability

If the plugin is removed tomorrow, can the factory continue with repository-owned truth and ordinary tools?

A plugin must not become the sole home of product truth, design truth, test truth, or release truth.

### 5. Runtime isolation

Can we prove the plugin stays completely outside the deployed ChopDot runtime?

If not, apply the stricter runtime architecture gate.

### 6. Safety and authority

Can the plugin be constrained to the exact operations its worker role needs? Does it preserve human gates for protected merge, production deployment, secrets, spending, signing, and other irreversible actions?

### 7. Measurable improvement

Before permanent adoption, run a bounded trial and measure at least one:

- wall-clock reduction,
- fewer Reviewer revisions,
- higher first-pass acceptance,
- lower worker/token usage,
- better defect discovery before formal review,
- new evidence that was previously impractical,
- removal of a real manual bottleneck.

No measurable gain means no permanent dependency.

## Current capability posture

### Core / keep

**GitHub** — unique direct repository, branch, issue, review, CI, and artifact access. This is the factory coordination plane.

**Native ChatGPT Work + scheduled tasks + web research + image generation** — orchestration and specialist reasoning without another external design or data platform.

### Contextual / use only when the job truly needs the external system

**Devpost** — unique direct access to hackathon rules, submission requirements, dates, prizes, projects, and submission state. Valuable for hackathon operations; irrelevant to normal ChopDot runtime.

**Gmail / Calendar / Contacts** — useful only when product feedback, stakeholder coordination, or an external human workflow genuinely lives there. They are not product authority.

**Google Drive** — may be useful for human-authored business material that already lives in Drive. It must not outrank repository product/engineering authority and should not be introduced simply to create another knowledge store.

### Trial only when a concrete bottleneck appears

**Hugging Face** — can provide remote CPU/GPU jobs, model/dataset research, and MCP-enabled Spaces. This can be useful as factory-only compute or research, but it must never become an implicit ChopDot runtime endpoint. Prefer GitHub Actions for ordinary repository-bound compute.

### Hold / not core

**Figma** — currently duplicative for this team. Most needed capabilities can be owned through HTML/CSS prototypes, design tokens, Golden screenshots, component contracts, repo-native state matrices, image generation, and browser/render QA. Revisit only if a human design collaboration requirement or unique capability appears.

**Canva** — currently duplicative for product development. Native image generation plus repo-owned templates/assets cover most current needs. Revisit only for a concrete collaborative publishing workflow that cannot be reproduced economically.

### Runtime-rejected unless architecture is explicitly changed

**Supabase / Firebase / proprietary hosted auth / hosted canonical database / proprietary queue or synchronization authority** — these may be useful technologies in general, and historical ChopDot code contains Supabase experiments, but they must not become required runtime infrastructure merely for convenience. A new proposal must prove why a Polkadot-native, client/local-first, open, or user-controlled design cannot satisfy the requirement.

## Historical centralized code is evidence, not current authority

The repository contains older Supabase integration work and CRDT synchronization experiments. Preserve useful lessons, data models, edge cases, and Automerge/CRDT techniques, but do not infer that historical transport or storage choices remain approved architecture.

Current product authority and current Polkadot platform capabilities must be re-established before reusing those decisions.

## Overnight execution contract

A healthy unattended run should:

1. read live canonical authority;
2. select only an already-authorized current task;
3. run read-only specialist scouts in parallel;
4. let one Builder own candidate writes;
5. repair ordinary implementation/mechanical defects in the same run;
6. produce exact evidence;
7. obtain one independent review;
8. automatically repair `REVISE` findings when they stay inside existing authority;
9. stop at human-only approval or irreversible action;
10. leave a concise exact handoff for the user.

Target morning experience:

> Multiple safe steps advanced overnight; only actual decisions, approvals, or genuine blockers require the user.

## Codex role

Codex is a high-value specialist, not the operating system.

Use Codex when available for tasks where a persistent local repo/shell loop gives a material advantage, such as:

- deep cross-file refactors,
- difficult local debugging,
- large dependency migrations,
- complex build-system work,
- performance profiling,
- low-level implementation where rapid edit-run-debug loops dominate.

The factory must remain able to continue definition, implementation through GitHub writes, CI, evidence collection, review, documentation, and coordination without Codex.

## Human gates

Keep explicit human authority for at least:

- protected merge,
- production / Products Devnet deployment when not already separately authorized,
- secrets or credential handling,
- real spending,
- signing/value-moving transactions,
- destructive irreversible operations,
- publication/submission where the user has not already granted exact authority,
- exact Golden approval when required by the UX workbench contract.

## Success metrics

The Control Tower should progressively measure:

- journey activation -> complete Builder handoff,
- Builder handoff -> Reviewer receipt,
- first-pass `GOLDEN-READY` rate,
- revisions per journey,
- scout findings incorporated before formal review,
- mechanical/QA harness failures,
- avoidable schedule wait,
- duplicate worker attempts,
- human interventions per completed journey,
- factory-only external-service spend,
- number of runtime-centralization proposals rejected before implementation.

The goal is not maximum agent activity. The goal is maximum trustworthy product progress per unit of time, cost, and human attention.
