# Token Optimization Plan: CLAUDE.md & AGENTS.md

**Goal:** Reduce base context tokens without losing agent capability.  
**Principle:** Move, don’t delete. Skills load on-demand; base files load every session.

---

## Current State

| File       | Lines | Role                                      |
|------------|-------|-------------------------------------------|
| CLAUDE.md  | 11    | Minimal; points to AGENTS.md              |
| AGENTS.md  | 71    | Commands, architecture, conventions, etc. |

**CLAUDE.md is already lean.** No changes needed.

---

## Methodical Process

### Phase 0: Baseline (do first)

1. **Commit current state**
   ```bash
   git add CLAUDE.md AGENTS.md && git commit -m "chore: baseline before token optimization"
   ```

2. **Record current line counts**
   - CLAUDE.md: 11 lines
   - AGENTS.md: 71 lines

3. **Run verification**
   ```bash
   npx tsc --noEmit && npm run build && npx playwright test
   ```

---

### Phase 1: Extract skills (one at a time)

For each candidate below:

1. Create the skill file
2. Remove the content from AGENTS.md
3. Add a one-line pointer in AGENTS.md (e.g. `See skill: chopdot-roadmap`)
4. Run verification
5. Use the agent for a few typical tasks
6. If anything breaks → `git checkout AGENTS.md` and adjust

---

### Phase 2: Candidates for extraction

| Content                    | Lines | New skill              | When to invoke                    |
|---------------------------|-------|-------------------------|-----------------------------------|
| Product Roadmap           | ~8    | `chopdot-roadmap`       | Planning features, prioritising   |
| Planned Instrumentation   | ~7    | `chopdot-instrumentation` | Adding tracking/metrics        |
| Before Modifying UI       | ~4    | Keep in AGENTS.md       | Too small; pointer is enough      |

**Keep in AGENTS.md (essential every session):**

- Quick commands
- Setup
- Architecture (high level)
- Coding conventions
- Verification steps
- Key principles (via CLAUDE.md)

---

### Phase 3: Optional MCP cleanup

- Use `/mcp` to list enabled servers
- Disable servers not needed for ChopDot (e.g. Figma, BrowserStack when not in use)
- Re-enable when needed

---

## Rollback

If anything regresses:

```bash
git checkout HEAD~1 -- CLAUDE.md AGENTS.md
```

Or revert the specific commit from Phase 0.

---

## Success Criteria

- [ ] Verification still passes
- [ ] Agent can still run smoke tests, build, and follow conventions
- [ ] Agent can still access roadmap/instrumentation via skills when needed
- [ ] Base context is smaller (fewer tokens per session)

---

## Notes

- **knowns.init** loads `.knowns` docs; it does not replace AGENTS.md
- **webapp-testing** covers Playwright patterns; AGENTS.md keeps the verification commands
- No overlap to remove; this is additive (new skills) + relocation (move text out of AGENTS.md)

---

## What Was Missed (Audit Addendum)

### 1. Context sources not in project control

| Source | Impact | Action |
|-------|--------|--------|
| **User rules** (Cursor-level) | Long "Developer User Rules" in every session | Not project-controllable |
| **Agent skills list** | 50+ skills with descriptions; may load for skill selection | Not project-controllable; consider disabling unused skills in Cursor settings |
| **MCP servers** | 6+ servers (Polkadot UI, Supabase, Figma, Context7, BrowserStack, cursor-ide-browser) add tool definitions | Use `/mcp` to disable when not needed; prefer CLI tools when available |

### 2. Large files referenced but not in base context

| File | Lines | When loaded |
|------|-------|------------|
| `src/docs/COMPONENT_CATALOG.md` | ~700 | On-demand when agent reads for UI work |
| `src/FILE_STRUCTURE.md` | ~518 | On-demand when agent reads for navigation |
| `.knowns/docs/architecture/chopdot-architecture.md` | ~850 | When `knowns.init` or `knowns doc` runs |

These are **not** in base context; they load when explicitly read. No change needed. The AGENTS.md pointer ("check before modifying UI") is already minimal.

### 3. Potential overlap: knowns vs AGENTS.md

- **AGENTS.md** has high-level architecture (entry points, chain service, Supabase).
- **.knowns/docs** has `chopdot-architecture.md` (Data Layer API reference) and `chopdot-expense-architecture.md` (stub).
- **README.md** has feature list, "What's Next" — different from AGENTS.md Product Roadmap.

**Conclusion:** Minimal overlap. knowns.init and AGENTS.md serve different roles. No deduplication needed.

### 4. Future rules to watch

- **modularity-deep-review.plan.md** proposes creating `.cursor/rules/modularity.mdc`. That would **add** to context. If you create it, keep it short; consider a skill instead if it's long.

### 5. docs/ and artifacts/

- **docs/** (80 files) and **artifacts/** — loaded on-demand when agent searches or reads. Not in base context. No action.

### 6. Summary of controllable optimisations

| Action | Impact | In plan? |
|--------|--------|----------|
| Extract Product Roadmap → skill | ~8 lines from AGENTS.md | ✅ Yes |
| Extract Planned Instrumentation → skill | ~7 lines from AGENTS.md | ✅ Yes |
| Disable unused MCP servers | Reduces tool-definition tokens | ✅ Yes |
| Disable unused skills (Cursor settings) | Reduces skill-list tokens | ❌ Add: manual step |

---

## Post-Analysis: What's Consuming the Most Credits?

### Built-in options

| Method | What it shows | Limitation |
|--------|---------------|-------------|
| **`/cost`** | Total cost, duration, code changes for current session | Session-level only; no breakdown by source |
| **`/context`** | Coloured grid of what's consuming context *right now* | Real-time only; not post-hoc |
| **Status line** | Context %, cost (configurable) | Real-time monitoring |
| **Analytics dashboard** | Spend, activity, lines accepted, per-user (Teams/API) | [claude.ai/analytics/claude-code](https://claude.ai/analytics/claude-code) or [platform.claude.com/claude-code](https://platform.claude.com/claude-code) — aggregate only |

### Third-party: ccusage (recommended for post-analysis)

Reads Claude Code's local JSONL files. No API key needed.

```bash
# Install / run (no install needed)
bunx ccusage
# or: npx ccusage@latest

# Session report — which conversations cost the most
ccusage session

# Per-session breakdown (input, output, cache, cost)
ccusage session --breakdown

# Filter by date
ccusage session --since 20250601 --until 20250630

# JSON for custom analysis
ccusage session --json | jq '.sessions[] | select(.totalCost > 10)'
```

**Shows:** Input vs output vs cache tokens, cost per session, per-model breakdown, sorted by cost.  
**Does not show:** Breakdown by "skills vs MCP vs files" — Claude Code doesn't expose that.

### Enterprise: OpenTelemetry

For teams with an observability stack:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp   # or prometheus, console
export OTEL_LOGS_EXPORTER=otlp
export OTEL_LOG_TOOL_DETAILS=1      # Log skill_name, mcp_server_name in tool events
```

**Metrics:** `claude_code.token.usage` (by type: input/output/cacheRead/cacheCreation), `claude_code.cost.usage`, per model.  
**Events:** Tool invocations with `skill_name` or `mcp_server_name` when `OTEL_LOG_TOOL_DETAILS=1` — lets you see which tools are used most (proxy for capability usage, not context size).

### What you cannot get (today)

- **Per-source token breakdown** — No built-in way to see "skills consumed X tokens, MCP tools Y, files Z." Context composition isn't instrumented.
- **Optimization approach** — Use `/context` during sessions to spot heavy items, then trim (skills, MCP, CLAUDE.md) based on that. Use ccusage to find expensive sessions and correlate with what you were doing.
| Keep CLAUDE.md as-is | Already minimal | ✅ Yes |
