# ChopDot

See [AGENTS.md](AGENTS.md) for commands, architecture, conventions, and verification steps.

## Key Principles

1. **Read docs first** — check AGENTS.md, COMPONENT_CATALOG.md, FILE_STRUCTURE.md before implementing
2. **Plan before coding** — wait for approval on multi-file changes
3. **Verify after changes** — `npx tsc --noEmit && npm run build && npx playwright test`
4. **Ask when blocked** — don't guess at architecture or product intent
