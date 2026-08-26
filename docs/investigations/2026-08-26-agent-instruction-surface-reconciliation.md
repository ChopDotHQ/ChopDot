# Agent instruction-surface reconciliation — 2026-08-26

**Kind:** measurement
**Status:** accepted
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-26
**Applies to:** `chopdot-v1-launch`
**Authority:** instruction-routing evidence only; never product law or product priority

## Exact-worktree result

The exact launch worktree contains two tracked agent entrypoints:

- `AGENTS.md`, the canonical portable operating entrypoint;
- `CLAUDE.md`, a minimal redirect that defers to `AGENTS.md` and carries no
  independent stack or product claim.

It contains no `.agents/` or `.cursor/` instruction tree. Their absence is not
treated as permission to import another checkout's instructions as worktree
truth. The executable instruction validator checks the tracked entrypoints and
the package command surface.

## Machine-local supporting skills

Two machine-local ChopDot skills were inspected read-only outside the exclusive
worktree:

| Surface | SHA-256 | Observation | Disposition |
|---|---|---|---|
| `/Users/devinsonpena/ChopDot/.agents/skills/chopdot-product-judgment/SKILL.md` | `bbe3b1661f74723f496232eff3456fc7dc7265b9508983994bfbc19d1e269863` | Reviewed 2026-08-24; resolves the exact worktree, product law, Cockpit, production entrypoint, screenshots, and live-failure repair, but predates the Portable Agent Outcome System command route. | supporting; select the `product-definition` or `incident-repair` profile through `AGENTS.md`; may not redefine outcomes or terminal states |
| `/Users/devinsonpena/ChopDot/.agents/skills/chopdot-frontend-design/SKILL.md` | `0cd0bce748594fb87e5fa911c5c4acfddbbb117e8873437dcecd9f9b6ad3c39a` | Reviewed 2026-08-24; resolves the exact worktree, Cockpit, production entrypoint, real-screen states, accessibility, and screenshot repair, but predates the Portable Agent Outcome System command route. | supporting; select the `ux-creation` profile through `AGENTS.md`; may not redefine outcomes or terminal states |

The skills' product and visual loops remain useful. Their process vocabulary is
not canonical because the files are machine-local, outside this worktree, and
not available to every agent provider. A future machine-local skill update may
add a small redirect to `AGENTS.md`; no exact-worktree conclusion depends on
that update.

## Conflict and portability decision

1. `AGENTS.md` and the executable schemas/CLI define the portable process
   contract.
2. `CLAUDE.md` must defer and must not duplicate stack or product claims.
3. Optional machine-local skills may select a loop profile and add specialized
   judgment, but cannot alter product law, priority, evidence levels, budgets,
   effect authority, terminal states, or success semantics.
4. Missing optional skills are visible as unavailable supporting capability,
   not as a failed core instruction gate.
5. A conflicting tracked instruction is a failed validation; a conflicting
   machine-local skill is excluded from authority and recorded for local repair.

## Proof commands

```bash
npm run agent:instructions:validate
npm run context:validate
npm run product:validate
```

An instruction-surface result cannot prove that CI is enforced, a release is
safe, or the system is adopted.
