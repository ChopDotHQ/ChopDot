# Repo And Branch Map

## Current source of truth

### Code base

- `origin/mvp`
  - cleanup base Teddy should build from
  - restores must happen on top of this simplification direction

### Instruction / strategy branch

- `docs/shared-commitment-kernel-roadmap`
  - current source of truth for direction, architecture, Teddy handoff, finance, and vault navigation

## Historical but still useful

### `origin/feat/api-layer-integration`

- Useful for:
  - earlier API/data-layer discipline
  - backend abstraction thinking
  - operational scaffolding
- Not the current product thesis.

### `origin/hack`

- Useful for:
  - past hackathon and chain-facing experiments
  - older wallet/auth and PVM-oriented work
- Not the current default direction.

### `origin/local-chain`

- Useful for:
  - local blockchain experimentation
  - escrow / contract testing history
- Not the current MVP center.

## How to read this repo now

1. Start from `obsidian/00_HOME.md`
2. Read the curated notes in `obsidian/`
3. Follow into the detailed docs under `docs/`
4. Treat older chain, wallet, and hackathon artifacts as supporting history unless explicitly revived

## Key rule

The repo contains multiple eras of ChopDot.

The active era is:
- shared commitment
- coordination first
- chapter / closeout recovery
- API-ready architecture
- subscription-led monetization
