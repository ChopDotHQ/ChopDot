# ChatGPT Capability Radar

**Purpose:** evaluate ChatGPT plugins/apps and external tooling for the ChopDot autonomous development factory without creating unnecessary SaaS cost, duplicated capability, or runtime centralization.

This is a decision aid, not product authority.

## Decision states

- `CORE` — proven unique leverage; part of the default factory.
- `CONTEXTUAL` — use when the external system itself is the source/target of work.
- `TRIAL` — run only against a concrete bottleneck with measurable success criteria.
- `HOLD` — useful in general but currently duplicative, costly, or insufficiently autonomous.
- `REJECT_RUNTIME` — must not become a required ChopDot runtime dependency without an explicit architecture decision.
- `IGNORE` — no meaningful relationship to the current factory.

## Scoring rubric

Score each dimension 0–3.

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Unique capability | fully reproducible | minor convenience | meaningfully easier | otherwise impractical/impossible |
| Autonomous use | human-heavy | frequent intervention | mostly unattended | clean scheduled use |
| Economics | high/new recurring cost | meaningful credits/seat | low marginal cost | already included/free |
| Portability | sole truth/strong lock-in | difficult exit | exportable/substitutable | disposable with no loss |
| Runtime isolation | likely product dependency | boundary unclear | separable | provably factory-only |
| Safety/authority | broad/unbounded | weak controls | role-bounded | exact/fail-closed controls |
| Measurable leverage | no clear metric | hypothetical | plausible | demonstrated |

A candidate should not become `CORE` merely because its total is high. Any failure of runtime isolation or product sovereignty overrides the score.

## Current radar

| Capability | State | Why | Revisit trigger |
|---|---|---|---|
| ChatGPT Work | CORE | always-on orchestration, research, Cloud Browser, scheduled work | n/a |
| Scheduled tasks/workers | CORE | unattended progression and event-gated roles | measure coordination overhead |
| GitHub plugin | CORE | unique direct repo/branch/issue/PR/CI/artifact actions | n/a |
| GitHub Actions | CORE | repo-native compute, tests, renders, evidence | only replace specific workloads when clearly superior |
| Native web research | CORE | current external knowledge and platform verification | n/a |
| Native image generation | CORE | owned design/creative generation without Canva dependency | n/a |
| Devpost plugin | CONTEXTUAL | authoritative hackathon dates/rules/prizes/submission surface | use only during relevant hackathons |
| Gmail | CONTEXTUAL | unique access to feedback/stakeholder email when needed | enable feedback-intake loop only when real traffic exists |
| Google Calendar | CONTEXTUAL | useful for human coordination, not product building | real scheduling bottleneck |
| Google Contacts | CONTEXTUAL | recipient resolution only | when external outreach workflow requires it |
| Google Drive | CONTEXTUAL | useful only when human source material already lives there | do not create parallel product truth store |
| Hugging Face Jobs | TRIAL | genuinely different remote CPU/GPU compute surface | specific CI/ML workload GitHub Actions cannot handle economically |
| Hugging Face models/datasets/papers | CONTEXTUAL | useful for AI research/features | only when product/research scope needs ML |
| Hugging Face MCP Spaces | TRIAL | potential source of specialist micro-tools | trial only one exact missing capability at a time |
| Figma | HOLD | powerful but mostly reproducible with repo-native design system, HTML/CSS, screenshots, image generation | human designer collaboration or truly unique design-system need |
| Canva | HOLD | strong creative UI but largely duplicative for current team | collaborative marketing-production bottleneck |
| Supabase | REJECT_RUNTIME | hosted canonical data/auth/backend would violate current sovereignty direction | only explicit architecture reconsideration; historical code is not approval |
| Wix | IGNORE | unrelated to current Product architecture | none expected |
| Booking.com | IGNORE | unrelated to factory | none expected |
| Binance | IGNORE | market-data capability does not help current product factory | explicit product requirement |
| LinkedIn | IGNORE | unrelated to build loop | recruiting/BD workflow only |
| Coursera | IGNORE | learning surface, not autonomous product capability | targeted learning need |
| SlidesGPT | IGNORE | presentation convenience is reproducible | exceptional presentation throughput need |

## Native-first capability map

Before searching for a plugin, try the owned/native route.

| Need | Default owned route | Plugin only if… |
|---|---|---|
| Code changes | GitHub branch/file/tree/commit actions | capability cannot be expressed through GitHub safely |
| Build/test | GitHub Actions | workload needs unique external hardware/runtime |
| UI design | HTML/CSS prototypes + repo design tokens + image generation | human design collaboration requires another surface |
| Visual evidence | browser/render scripts + Actions artifacts | unique browser/device coverage cannot be reproduced |
| Journey modeling | repo-native state graphs/contracts | external system adds proven value rather than another copy |
| Product knowledge | tracked repo authority | source material already lives elsewhere and must be consulted |
| Research | native web research + official docs | proprietary/authenticated source is required |
| Creative assets | image generation + SVG/HTML templates | collaborative editorial workflow demands another tool |
| Compute | GitHub Actions | specialized CPU/GPU job is materially better elsewhere |
| Database/runtime state | approved Polkadot/client/local-first architecture | never choose SaaS datastore merely for convenience |
| Auth/identity | approved Product SDK / Polkadot platform route | explicit reviewed product architecture says otherwise |

## Trial protocol

Every `TRIAL` candidate must have an issue or exact task containing:

1. **Bottleneck:** what is currently slow, impossible, expensive, or unreliable?
2. **Owned baseline:** how do we do it today without the plugin?
3. **Proposed plugin capability:** the exact unique operation to test.
4. **Runtime boundary:** explicit statement that no Product runtime dependency is introduced.
5. **Cost boundary:** expected paid tier, credits, compute cost, or `no new cost`.
6. **Authority boundary:** what the plugin may read/write and what remains human-gated.
7. **Success metric:** measurable threshold.
8. **Exit plan:** how the factory returns to the owned route if the plugin disappears.
9. **Verdict:** `ADOPT`, `CONTEXTUAL`, `HOLD`, or `REJECT` after the trial.

Do not trial a tool because it is popular or available.

## High-value capability gaps to watch

Search the ChatGPT plugin ecosystem only for capabilities that are genuinely difficult to own.

### 1. Browser / device execution

Ideal capability:

- navigate the real rendered Product,
- inspect DOM/accessibility tree,
- collect console/network errors,
- exercise Back/Forward/reload,
- test mobile viewports or real devices,
- capture exact screenshots/artifacts,
- operate unattended.

Prefer native Work Cloud Browser when it satisfies the job. Add a plugin only for missing evidence such as real-device farms, browser matrices, or accessibility instrumentation that cannot be reproduced in Actions.

### 2. Security-specific analysis

Potentially unique capability:

- dependency vulnerability intelligence,
- smart-contract analysis,
- supply-chain analysis,
- static/dynamic security tooling,
- fuzzing or specialized scanners.

Prefer open CLI tools in GitHub Actions when equivalent. A plugin is interesting only when it exposes unique current intelligence or execution.

### 3. Polkadot / Parity platform tooling

Highest strategic value would be a ChatGPT plugin or MCP surface that directly exposes authoritative Polkadot Product SDK / Devnet capabilities, current descriptors, contract tooling, chain state, or platform-specific validation **without becoming a proprietary runtime dependency**.

If an official or open source ChatGPT-compatible MCP/plugin emerges, evaluate it immediately.

### 4. Real-device / hardware interaction

A safe plugin that can operate isolated test hardware or device farms could unlock evidence that browser CI cannot provide. This requires strict authority and secret boundaries.

### 5. Specialist compute

Remote GPU/CPU execution is worth adding only for workloads that are materially impractical in Actions, such as model evaluation, heavy visual analysis, or large fuzzing jobs.

## Plugin rejection patterns

Reject or hold by default when the pitch is one of these:

- "It gives us a nicer dashboard."
- "It is easier than maintaining a small script."
- "It stores our project context for us."
- "It gives us another design canvas."
- "It gives us another hosted database."
- "It gives us auth out of the box."
- "It has an AI agent that can do what our workers already do."
- "It will save time" without a baseline and measurable threshold.

## Factory metrics for capability decisions

Track before/after adoption where possible:

- active execution time,
- avoidable schedule wait,
- first-pass review rate,
- Reviewer revision count,
- CI reruns,
- evidence-generation time,
- manual human steps,
- external tool spend,
- worker/task count,
- context/token burden,
- runtime dependencies introduced (`target: 0`).

## Radar maintenance rule

Re-evaluate this radar only when one of the following happens:

- ChatGPT exposes a new plugin/app relevant to a high-value gap,
- a current plugin adds a materially new capability,
- a real factory bottleneck appears,
- a paid tool's cost/limits change,
- Polkadot Products / Product SDK architecture changes,
- an external tool becomes required by a human collaborator,
- a plugin creates unexpected autonomy or security friction.

Do not churn the stack simply because new tools exist.
