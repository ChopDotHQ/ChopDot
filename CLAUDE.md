# ChopDot — Project Intelligence

> This file is the cross-IDE persistent memory for all AI agents operating in this repository.
> It is the Claude Code equivalent of `.cursorrules` and must be read before any action.

## MANDATORY: Read Before Any Action

Before writing code, executing commands, or proposing architecture, you MUST read:

1. `.memory/core_directives.md` — Immutable architectural rules
2. `.memory/project_context.md` — Current project state and active crises

If `.memory/` does not exist in this working directory (e.g., worktrees), the core directives are inlined below.

---

## Core Directives (Immutable)

1. **The Database Reality:** The `main` branch's dual-calculation engine is mathematically broken. The unified data layer exists solely in `feat/api-layer-integration`. Do not recommend rebuilding the database.
2. **The UUID Sync:** ChopDot uses optimistic `Date.now()` strings on the frontend, which permanently breaks editing when Supabase returns a true UUID. Any persistence tasks must focus on asynchronous UUID hydration.
3. **The Math Constraints:** Do not use `.toFixed()` float-string scaling for split allocations — it drops pennies. Base components must use integer (cents) math with remainder modulo.
4. **Blockchain Integrity:** Settlement logic must strictly await `status.isFinalized` on Substrate, NOT `status.type === 'inBlock'`.

## Project Context

- **Last Major Audit:** 2026-03-23 (frozen in `/docs/architecture-audit-2026/FINAL_REPO_VERDICT.md`)
- **Active Crisis:** UUID desync — transition from optimistic local IDs to safe server UUIDs threatens "offline-first" UX. Primary blocker for MVP scaling.
- **Web3 Status:** Legacy `add_usdc` branch quarantined. Future Web3 must cleanly extract ONLY `polkadot.ts` bindings onto the new data layer. Do not merge the UI components.

---

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.6 + Vite 6
- **Styling:** Tailwind CSS 4 + Radix UI + ShadCN components
- **State:** React Context + custom hooks + Automerge CRDT
- **Backend:** Express.js + Supabase (PostgreSQL 17) + IPFS/Crust
- **Blockchain:** Polkadot (@polkadot/api) + WalletConnect + Ethers.js
- **Auth:** Supabase Auth (email/OAuth) + Polkadot wallet signature
- **Testing:** Vitest + Playwright + Cypress + Axe (a11y)
- **Deployment:** Vercel + GitHub Actions (7 workflows)

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app component, routing, state |
| `src/contexts/AuthContext.tsx` | Authentication state management |
| `src/contexts/AccountContext.tsx` | Wallet connection state (828 lines) |
| `src/services/data/DataContext.tsx` | Data layer provider |
| `src/utils/supabase-client.ts` | Supabase client setup |
| `supabase/functions/wallet-auth/index.ts` | Wallet auth edge function |
| `supabase/functions/accept-invite/index.ts` | Pot invite acceptance |
| `supabase/functions/decline-invite/index.ts` | Pot invite decline |
| `src/FILE_STRUCTURE.md` | Complete codebase navigation guide |
| `src/DESIGN_TOKENS.md` | Design system reference |
| `vite.config.ts` | Build config with env validation |
| `supabase/config.toml` | Local Supabase configuration |
| `package.json` | Dependencies and scripts |

## Supabase

- **Project ID:** `jpzacnkirymlyxwmafox`
- **Region:** `eu-central-2`
- **DB:** PostgreSQL 17.6
- **Tables:** 14 (profiles, users, pots, pot_members, expenses, contributions, settlements, payments, crdt_checkpoints, crdt_changes, receipts, auth_nonces, invites, wallet_links)
- **Edge Functions:** wallet-auth (v17), accept-invite (v3), decline-invite (v1)
- **WARNING:** `profiles` table has RLS DISABLED

## Conventions

### Commits
Use conventional commits: `<type>: <message>`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`
- Lowercase, max 50 chars, NO Co-Authored-By lines
- Use `knowns.commit` skill for formatting

### Frontend Changes
- If editing React components, layouts, or user-facing copy, trigger `ui-ux-pro-max` skill to validate visual constraints
- No emoji icons (use SVG), add `cursor-pointer` to clickable elements, use smooth transitions
- Design tokens in `src/DESIGN_TOKENS.md` — no hardcoded hex colors

### Testing
- `npm run ci:fast` — lint, type-check, unit tests, build
- `npm run smoke:five-flows` — core user flow validation
- `npm run e2e` — Playwright browser tests
- `npm run qa:all` — complete QA suite

---

## Agent Infrastructure

### Skills (`.claude/skills/`)
- `knowns.init` — Session startup, load context (USE AT START OF EVERY SESSION)
- `knowns.task` — Task execution with research-first workflow
- `knowns.research` — Codebase exploration before implementation
- `knowns.commit` — Conventional commit formatting
- `knowns.doc` — Documentation management
- `knowns.task.brainstorm` — Requirements exploration
- `knowns.task.extract` — Knowledge extraction from tasks
- `knowns.task.reopen` — Reopen completed tasks
- `knowns.handoff` — Session end state capture (cross-IDE handoff)
- `webapp-testing` — Playwright-based UI testing
- `web3-testing` — Smart contract testing (Hardhat/Foundry)
- `ui-ux-pro-max` — Design system intelligence
- `ui-visual-validator` — Visual regression testing
- `solidity-security` — Contract security auditing
- `accessibility-compliance-accessibility-audit` — WCAG compliance

### AgentOps Integration
Connected to `/Users/devinsonpena/Documents/AutoBots/agentops`
- Generates daily operating brief for ChopDot
- Produces prioritized task queue
- Syncs queue into `.knowns/tasks/` for execution
- Files: `docs/AGENTOPS_INTEGRATION.md`, `docs/AGENTOPS_OPERATOR_BRIEF.md`, `docs/AGENTOPS_TASK_QUEUE.md`

### Task Surface
- `.knowns/tasks/` — Git-tracked task files
- `.knowns/docs/` — Project documentation
- `.knowns/config.json` — Project settings

### Cross-IDE Context
- `.knowns/docs/active-context.md` — Current session state (read on start, write on end)
- `.memory/core_directives.md` — Immutable rules (may not exist in worktrees — inlined above)
- `.memory/project_context.md` — Architectural state (may not exist in worktrees — inlined above)

---

## Zero-Trust Execution Protocol

For every complex objective, bug fix, or architecture prompt:

1. **ENABLE CHAIN OF THOUGHT:** Before executing, output a discovery plan listing the queries you'll run to verify assumptions.
2. **VERIFY PHYSICAL STATE:** Do not trust prompts or chat history as absolute truth. Confirm branch names, file existence, and schemas against the actual filesystem.
3. **REQUIRE PROOF:** If you cannot find file-level evidence for a claim, label it UNVERIFIED.
4. **REFUSE TO GUESS:** You have permission to say "I do not have enough context." Do not hallucinate code or architectures.

When presenting technical plans, separate findings into:
- **FACTS:** Code, files, or Git states you physically verified
- **INFERENCES:** Logical conclusions drawn from facts
- **ASSUMPTIONS:** Things treated as true but not physically proven

---

## Quick Reference Commands

```bash
npm run dev              # Start Supabase + Vite dev server
npm run build            # TypeScript + Vite production build
npm run ci:fast          # Fast CI: audit, lint, type-check, test, build
npm run smoke:five-flows # Core flow validation
npm run e2e              # Playwright E2E tests
npm run qa:all           # Complete QA suite
npm run type-check       # TypeScript validation only
npm run lint             # ESLint only
```
