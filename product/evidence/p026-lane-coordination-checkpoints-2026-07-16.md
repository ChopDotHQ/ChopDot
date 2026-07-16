# P-026 Lane Coordination Checkpoints - 2026-07-16

## Purpose

This registry records ownership evidence consumed by P-026. It does not grant
P-026 permission to edit another lane's worktree or implementation surface.

## Active ownership

| Lane | Owner task | Locked scope | P-026 action |
| --- | --- | --- | --- |
| Programme A portable shell and host proof | `codex://threads/019eaa66-6265-7a92-9469-15f1f5aca52e` | Portable shell, host proof, and its owned paths | Consume checkpoints and proof read-only |
| P-025 canonical integration | `codex://threads/019f1ce5-733d-7ac3-b63d-290e5a0dd572` | Canonical root, P-025 integration, authority, and security reconciliation | Do not reassign active paths before the canonical baseline promotion decision |
| P-026 proof map and routing | `codex://threads/019f17aa-0547-7f53-907d-624cc443a64c` | Structured path model, proof coverage, generated routing, and ownership coordination | Map and route only |

## Non-overlap decisions

- P-026 does not implement `N-007` or any journey it recommends.
- P-026 does not implement receipt/OCR behavior.
- P-026 does not edit the portable-shell or canonical-root implementation.
- A missing or expired owner checkpoint does not release ownership.
- Stale ownership is quarantined as `stale_owner` until explicit release or
  reassignment is recorded.

## Programme A viewport proof checkpoint

- Commit: `e8505cb test(dot-host): validate focused input viewport proof`
- Owner location: `/Users/devinsonpena/ChopDot/.worktrees/portable-shell-trial`
- Evidence: `proof/dot-host-focused-input-viewport-2026-07-16.md`
- Report: `proof/portable-shell-dot-host/report.json`
- Accepted scope: live 22-step `.dot` journey, reload persistence, focused
  amount/title entry within the 390x844 viewport, screenshot validation, and
  missing-host-paint rejection.
- Boundary: this evidence changes no product or money semantics and does not
  promote portable-shell files into P-026.

## Evidence policy

External worktree evidence remains at its owner location. P-026 stores stable
IDs, commits, task links, accepted claims, limitations, and ownership decisions
as read-only registry metadata. Sparse-worktree validation must not require
copying the external artifacts.
