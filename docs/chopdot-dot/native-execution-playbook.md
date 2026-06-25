# ChopDot.dot — Native & Playground Execution Playbook

Status: `active` · **2026-06-17**
**Purpose:** tell humans and agents **when to use which skills, plugins, subagents, and verification** so `path-to-fully-native.md` stays comprehensive and implementation stays disciplined.
**Companion to:** [path-to-fully-native.md](./path-to-fully-native.md) (roadmap), [capture-layer-build-plan.md](./cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) (Track 1 wedge), [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md) (audit programme).

---

## 1. Two programmes (never confuse them)

| Programme | Goal | Acceptance bar | Doc home |
| --- | --- | --- | --- |
| **A — Playground ship** | Listable `chopdot.dot`, runnable demo, registry metadata | Judge completes savings-circle loop in ~60s; real React bundle (not `dist-dotspike` stub) | `path-to-fully-native.md` §18 |
| **B — Native truth** | G0–G8 gates; host Statement Store; encryption; EVM-free native path | 7/7 host runtime gates; no Supabase on native truth path | `path-to-fully-native.md` §6 |

**Rule:** Programme A must not be blocked on G0–G8 completion. Programme B must not pretend the deploy spike is the product.

---

## 2. Session start (every agent)

Read in order:

0. **[Master plan](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md)**:
   - **§ PRODUCT END STATE** — full outcome / “what are we building”
   - **§ STATUS BOARD** — progress scoreboard
1. [PROJECT_DIRECTIVES.md](../../PROJECT_DIRECTIVES.md) + [AGENTS.md](../../AGENTS.md)
2. [docs/chopdot-dot/README.md](./README.md) — product primitive + modes
3. [path-to-fully-native.md](./path-to-fully-native.md) — programme + gates
4. **This playbook** — tool routing
5. Active queue: [.knowns/tasks](../../.knowns/tasks) if implementing

**Hydration rule:** If the thread is native/Polkadot → start at `polkadot-native-cursor-handoff.md`. If Spend Cards/capture → `cursor-brainstorm-jun-16-2026/README.md`. If both → read both; do not merge programmes without §0 primitive framing.

---

## 3. Decision tree — what kind of work is this?

```text
START
  │
  ├─ "Should we build X?" / positioning / wedge
  │     → chopdot-product-judgment skill
  │     → superpowers:brainstorming (before any spec)
  │
  ├─ "Is this architecture right?" / kernel / adapters
  │     → chopdot-engineering-judgment skill
  │     → ce-architecture-strategist (large structural changes)
  │
  ├─ "Update the roadmap / make plan comprehensive"
  │     → superpowers:brainstorming → doc edit
  │     → ce-coherence-reviewer (doc consistency)
  │     → Task explore (readonly) for code/doc cross-check
  │
  ├─ "Implement feature X" (multi-step)
  │     → superpowers:writing-plans → plan in docs/superpowers/plans/
  │     → superpowers:executing-plans OR subagent-driven-development
  │     → verification-before-completion before claiming done
  │
  ├─ "Deploy / .dot / Playground listing" (Programme A)
  │     → path §18 checklist
  │     → chopdot webapp-testing / playwright skill
  │     → verification-before-completion (build + e2e + pad dry-run)
  │
  ├─ "Native gate proof" (Programme B)
  │     → polkadot-native-runtime-proof-report.md gate definition
  │     → host-api-test-sdk spike (§14)
  │     → ce-correctness-reviewer + ce-security-reviewer (G2/G3)
  │
  ├─ "Review PR / large diff"
  │     → cursor-team-kit: review-and-ship
  │     → code-reviewer subagent (milestone complete)
  │     → ce-adversarial-reviewer (≥50 lines or auth/crypto)
  │
  └─ "Debug failing test / flake"
        → superpowers:systematic-debugging
        → ce-julik-frontend-races-reviewer (async UI)
```

---

## 4. Skill matrix (when to invoke)

### ChopDot-local (always prefer for product/eng judgment)

| Skill | Invoke when |
| --- | --- |
| [chopdot-product-judgment](../../.agents/skills/chopdot-product-judgment/SKILL.md) | Wedge, hero, Playground copy, dual-track, should-we-native |
| [chopdot-engineering-judgment](../../.agents/skills/chopdot-engineering-judgment/SKILL.md) | Kernel choice, adapter boundaries, API-ready, non-custody |
| [chopdot-frontend-design](../../.agents/skills/chopdot-frontend-design/SKILL.md) | ChapterHome, dot lab, host UI, listing screenshots |
| [webapp-testing](../../.claude/skills/webapp-testing/SKILL.md) | Playwright paths, demo URL verification |
| [knowns.task](../../.claude/skills/knowns.task/SKILL.md) | Queue item execution from `.knowns/tasks` |

### Superpowers (process discipline)

| Skill | Invoke when | Do NOT use when |
| --- | --- | --- |
| **brainstorming** | New surface, hero change, scope shift, doc vN | Tiny typo fix; pure code bug |
| **writing-plans** | Approved spec → implementation plan | Still debating design |
| **executing-plans** / **subagent-driven-development** | Multi-task implementation from written plan | Single-file one-liner |
| **verification-before-completion** | Before "done", PR, deploy, gate pass claim | Mid-exploration |
| **systematic-debugging** | Test fail, flake, unexpected runtime | Greenfield feature |
| **dispatching-parallel-agents** | Multi-lens review, broad code+doc audit | Single-file lookup |

### Cursor team kit

| Skill / agent | Invoke when |
| --- | --- |
| **check-compiler-errors** | After TS changes (`npx tsc --noEmit`) |
| **review-and-ship** | Pre-PR / pre-listing hygiene |
| **deslop** | Diff cleanup before review |
| **fix-ci** / **loop-on-ci** | CI red on native/playground branch |
| **code-reviewer** subagent | Gate milestone or programme A ship candidate |
| **thermo-nuclear-code-quality-review** | Large refactor (native adapter port) |

### Compound engineering (conditional reviewers)

| Persona | Invoke when diff touches |
| --- | --- |
| **ce-architecture-strategist** | New adapters, kernel bridge, programme split |
| **ce-correctness-reviewer** | Always on implementation PRs |
| **ce-security-reviewer** | G2 membership, G3 encryption, grants, keys |
| **ce-api-contract-reviewer** | Exported types, host API surfaces |
| **ce-feasibility-reviewer** | Roadmap vN edits, summit dates |
| **ce-coherence-reviewer** | Multi-doc updates (path + README + capture plan) |

| Polkadot-specific | Skill / doc / MCP | Invoke when |
| --- | --- | --- |
| **polkadot-docs** MCP | `https://docs-mcp.polkadot.com` | Parity SDK, `.dot` deploy, Playground, host API — **official docs Q&A** |
| [polkadot-evidence-pack](~/.codex/skills/polkadot-evidence-pack/SKILL.md) | Gate proof artefacts |
| `scripts/validate-chopdot-dot-native-map.mjs` | Editing evidence-ledger or replacement-matrix |
| `paritytech/polkadot-app-deploy` README | Deploy flags, `--publish`, `--js-merkle` |

---

## 5. Subagent matrix (Task tool)

| `subagent_type` | Use for |
| --- | --- |
| **explore** (medium/very thorough) | Code vs doc cross-check; "what's actually implemented" |
| **research** | Parity SDK / Playground docs external grounding |
| **generalPurpose** | Isolated spike (dot-host build profile) |
| **code-reviewer** | Programme milestone complete vs plan |
| **ci-watcher** | Branch CI while implementing gates |
| **shell** | `pad` deploy, `gh issue` — with approval for on-chain writes |

**Parallel pattern for comprehensive plan review:** launch 3× `explore` — (1) `src/chopdot-dot` + chapter, (2) `docs/chopdot-dot` cross-doc, (3) app routing + vite build.

---

## 6. Plugin enablement (recommended)

| Plugin | Enable for ChopDot.dot work? | Why |
| --- | --- | --- |
| **Superpowers** | **Yes** | Brainstorming → plans → verify pipeline |
| **Cursor team kit** | **Yes** | Review, CI, compiler checks |
| **compound-engineering** | **Yes** (selective) | ce-* reviewers on large native/capture diffs |
| **Playwright** (Codex) | **Yes** | Demo URL + gate e2e |
| **polkadot-docs** MCP | **Yes** | Official docs Q&A — [recommended-mcps.md](./recommended-mcps.md) |
| **playwright-extension** MCP | **Yes** | Demo / e2e browser verification |
| **Supabase** MCP | **Add at Capture C6** | `capture_link_tokens`, hybrid migrations |
| **polkadot-onchain** MCP | Optional (B / deploy verify) | Paseo tx/balance queries — not docs |
| **Supabase** plugin | Optional | Same as Supabase MCP |
| **Vercel** | No for `.dot` lane | Bulletin is deploy surface |

**Not required:** Browser automation for deploy; use `pad` CLI + Playwright on app URLs.

---

## 7. Programme A — agent checklist (Playground ship)

Before claiming "listing ready", agent must:

- [ ] Read §18 in `path-to-fully-native.md`
- [ ] **verification-before-completion:** `npx tsc --noEmit`
- [ ] **verification-before-completion:** `npm run build` with dot-host env (or documented dummy Supabase keys)
- [ ] **webapp-testing:** demo URL passes (guest or lab entry)
- [ ] Deploy artefact is **`dist/`** (or `dist-dot-host/`), not `dist-dotspike/`
- [ ] Listing copy matches **live** demo (savings circle); Spend Cards labelled "next"
- [ ] **chopdot-product-judgment:** copy does not overclaim native gates
- [ ] On-chain deploy/transfer: **human approval** + smart-mode card

**Plans location:** `docs/superpowers/plans/YYYY-MM-DD-playground-ship.md` (create via **writing-plans** when implementing).

---

## 8. Programme B — agent checklist (native truth)

Per gate G0–G8:

- [ ] Gate proof defined in `path-to-fully-native.md` §6
- [ ] Falsifier written before implementation
- [ ] Artefact path: `artifacts/polkadot-native/<gate>-YYYY-MM-DD.md`
- [ ] Update `polkadot-native-runtime-proof-report.md` on pass/fail
- [ ] Run `node scripts/validate-chopdot-dot-native-map.mjs` if ledger/matrix touched
- [ ] **ce-security-reviewer** on G2, G3
- [ ] **verification-before-completion** with host-api-test-sdk where applicable

**Plans location:** `docs/superpowers/plans/YYYY-MM-DD-native-g<N>-<name>.md`

---

## 9. Keeping `path-to-fully-native.md` comprehensive

| Trigger | Agent action | Tools |
| --- | --- | --- |
| Code changes native adapters | Re-read `polkadotSession.ts`; update §2 ground truth + §1A maturity | explore agent |
| Deploy spike / live tx | Update §13.1 economics + §13.2 with tx hashes | shell (read-only ok) |
| New Parity SDK release | Update §12 tooling version; pin in plan | research agent |
| Capture P1 milestone | Update §16 + §22; link build plan phase | coherence reviewer |
| Gate pass/fail | Update §1A table + runtime proof report | evidence pack skill |
| Product hero change | Update §0 primitive + §18 demo script | product-judgment + brainstorming |
| External blocker resolved (e.g. PoP grant) | Update §13.3 + §22 dependency table | gh CLI |

**Version bump rule:** `vN+1` changelog entry when any of: §0 decision, §18 acceptance bar, §1A maturity row, §13 live economics, new §.

---

## 10. Implementation order (recommended)

**Master plan (all phases):** [docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md) — **check § STATUS BOARD for progress**

```text
Phase 0 — Doc lock (this session)
  §0 primitive + §18 Playground programme + this playbook

Phase 1 — Programme A (parallel, days)
  dot-host build profile → real bundle → redeploy chopdotxx00.dot or chopdot.dot
  → --publish registry → demo script QA

Phase 2 — Track 1 capture P1a (weeks)
  capture-layer-build-plan phase 1a (hybrid OK)
  → Spend Card vertical slice

Phase 3 — Programme B gates (parallel, weeks+)
  G1 host signer fix (multi-participant) → wire product-sdk-statement-store (G4)
  → G0 funding → G3 encryption → capture kernel adapters (§0 B)
```

---

## 11. Anti-patterns (agents must push back)

| Anti-pattern | Why |
| --- | --- |
| Claim "fully native" from deploy spike alone | Spike is infra/HTML stub |
| Implement G0–G8 before Playground bundle | Wrong programme ordering |
| Use `pad login` with Nova/Talis | URI is `polkadotapp://` — Mobile only |
| Merge capture + dot state without §0 bridge | Dual truth risk |
| Skip verification-before-completion on gate pass | Audit already flagged false precision |
| One giant implementation plan for A+B+capture | Use separate writing-plans outputs |

---

## 12. Quick reference — files agents touch most

| Concern | Path |
| --- | --- |
| Native adapters | `src/chopdot-dot/polkadotSession.ts` |
| Dot kernel | `src/chopdot-dot/commitmentKernel.ts` |
| Capture kernel | `src/chapter/chapterEngine.ts`, `types.ts` |
| Native UI | `src/components/screens/ChapterHome.tsx` |
| Dot lab | `src/lab/chopdot-dot/` |
| Build gates | `vite.config.ts`, `src/utils/envValidation.ts` |
| EVM blocker | `src/services/closeout/pvmCloseout.ts` |
| Roadmap | `docs/chopdot-dot/path-to-fully-native.md` |
| Capture plan | `docs/chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md` |
| Capture vs native lanes | `docs/chopdot-dot/capture-native-lane-map.md` |
| Evidence | `docs/chopdot-dot/polkadot-native-evidence-ledger.json` |

- [ ] Do not claim gate pass without artefact under `artifacts/polkadot-native/`

---

## 13. Anti-drift protocol (implementation)

Drift = solving the wrong programme, expanding scope, or claiming done without evidence.

### 13.1 Session anchor (agent writes at start of implement turn)

```markdown
**Programme:** A | B | Capture-P1
**Plan:** docs/superpowers/plans/<file>.md or "none — single step"
**In scope:** <one sentence>
**Out of scope:** <one sentence>
```

### 13.2 Human anchor (optional, high leverage)

Add one line to `.knowns/tasks` or the plan file:

```text
PROGRAMME=A playground-ship ONLY — no G0–G8
```

### 13.3 Checkpoint cadence

| When | Action |
| --- | --- |
| Before first code commit | Plan file exists with Goal + Out of scope |
| After each milestone | Update STATUS BOARD; run `npm run validate:chopdot-coverage` |
| Before PR / deploy | playbook §7 or §8 + [COMPLETENESS RITUALS R2](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md#completeness-rituals) |
| New spec/doc | COVERAGE REGISTRY row — [R3](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md#completeness-rituals) |
| Scope change requested | Stop → update plan + path §18/§6 → user ack |

### 13.4 Drift recovery

If falsifier triggers (playbook §11): stop implementation, restate FACTS, ask one clarifying question or revert to plan §Goal.

### 13.5 Cursor enforcement

Rules auto-loaded (no user prompt needed):

- `.cursor/rules/chopdot-dot-programme.mdc` — alwaysApply
- `.cursor/rules/chopdot-dot-implementation.mdc` — globs on native/capture paths

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-17 | §13 anti-drift protocol; Cursor rules `.cursor/rules/chopdot-dot-programme.mdc` + `chopdot-dot-implementation.mdc`; AGENTS.md overlay |
| 2026-06-17 | Initial playbook: programme split, skill/plugin/subagent matrix, checklists, doc maintenance rules |
