# ChopDot.dot Product Packet

Status: `implementation-input`

Purpose: define the first `ChopDot.dot` product edition without mixing it into the current ChopDot app routes or turning Polkadot infrastructure into user-facing product truth.

## Product Promise

Help groups collect intent, track obligations, move through approvals, confirm what happened, and close with a trusted record.

### Product primitive (2026-06-17)

**Group commitment** — shared truth for who owes what, who acts next, and what was confirmed, **without custody**.

Three surfaces on the same engine:

| Surface | Job | Ship posture |
| --- | --- | --- |
| **General group commitment** | Shared chapters, obligations, closeout | Live (`ChapterHome`) |
| **Savings circle** | Recurring rounds, payout order | **Playground demo** (Programme A) |
| **Spend Cards** | Split at pay moment + ≤1 step | Next — [capture-layer-build-plan](./cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) |

Native + Playground execution: [path-to-fully-native.md](./path-to-fully-native.md) · Agent routing: [native-execution-playbook.md](./native-execution-playbook.md) · **Capture vs native lanes:** [capture-native-lane-map.md](./capture-native-lane-map.md) · Summit operator reference: [summit-playground-operator-reference-2026-06-18.md](./summit-playground-operator-reference-2026-06-18.md)

**Progress checkpoint (open first):** [Master plan](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md) — **§ PRODUCT END STATE** (vision) + **§ STATUS BOARD** (progress)

Users should only feel:

- what happened is captured
- the current state is clear
- the next actor is obvious
- money movement stays external or optional
- the final record is readable and portable

## Included Modes

`ChopDot.dot` includes five first-class chapter modes:

| Mode | Primary job | V1 posture |
| --- | --- | --- |
| `event_deposit` | Collect commitments/deposits for an event or paid session. | General commitment |
| `shared_expense` | Split and close ordinary shared costs. | Simple mode |
| `savings_circle` | Run recurring contribution rounds and payout order. | **Playground demo** |
| `emergency_pot` | Coordinate urgent help with dignity and accountability. | Privacy-first |
| `community_fund` | Track contributions, approvals, releases, and handoff for a small group fund. | Non-custodial |

**Spend Cards** (pay-moment capture wedge) ship via the capture layer — same primitive, not a separate product.

## Shared Loop

Every mode uses the same loop:

```text
Catch -> Show -> Move -> End
```

- **Catch:** join, rules, expenses, requests, contributions, claims
- **Show:** status, balances, next actor, blockers
- **Move:** claim paid, confirm receipt, approve release, record exception
- **End:** close round/chapter with a receipt

## Non-Custody Rule

ChopDot records, coordinates, confirms, and proves. External rails move money.

V1 does not provide escrow, stored balances, card issuing, managed wallets, custody, automatic payouts, yield, or smart-contract-controlled release.

## Agent resume (start here — any tool: Cursor, Codex, Claude)

| Doc | Use when |
| --- | --- |
| **[Master execution plan](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md)** | **Cross-tool resume** — § PRODUCT END STATE, § STATUS BOARD, § CROSS-TOOL RESUME |
| [Recommended MCPs](./recommended-mcps.md) | **Cursor/Codex MCP** — phase matrix + `mcp/*.json` templates |
| [Native Execution Playbook](./native-execution-playbook.md) | Skills / verification — Programme A vs B |
| [Path to Fully Native](./path-to-fully-native.md) | Roadmap v5 — native gates, Playground §18 |
| [Cursor Brainstorm Jun 16 2026](./cursor-brainstorm-jun-16-2026/README.md) | Capture / Spend Cards — has its own Codex hydration prompt |
| [Product Evolution History](./product-evolution-history.md) | Strategy / wedge narrative |
| [Polkadot Native Cursor Handoff](./polkadot-native-cursor-handoff.md) | Audit-only — has its own Codex hydration prompt |

**Default for “continue the project”:** master plan → paste § CROSS-TOOL RESUME block into Codex.

## Cursor Brainstorm — 16 June 2026 (Capture Layer)

**START HERE:** [cursor-brainstorm-jun-16-2026/README.md](./cursor-brainstorm-jun-16-2026/README.md) — single handoff for the 16 Jun 2026 session.

**Product law:** meet users at **pay moment + ≤1 step**; hero path requires bound payment handoff (L1+), not intent-only register.

**Kernel decision (2026-06-16):** Option B — [`chapterEngine`](../../src/chapter/chapterEngine.ts) + `ChapterDocument` as capture SSOT.  
**Spend Cards mechanics:** [implementation investigation § technical mechanics](./cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md#spend-cards--technical-mechanics)

**Architecture entry:** [cursor-brainstorm-jun-16-2026/capture-layer-architecture.md](./cursor-brainstorm-jun-16-2026/capture-layer-architecture.md)

| Doc | Purpose |
| --- | --- |
| [cursor-brainstorm-jun-16-2026/README.md](./cursor-brainstorm-jun-16-2026/README.md) | **Codex handoff** — read order, locked decisions, gap list |
| [cursor-brainstorm-jun-16-2026/capture-layer-architecture.md](./cursor-brainstorm-jun-16-2026/capture-layer-architecture.md) | **Master tech architecture** — entities, services, routing, kernel bridge |
| [cursor-brainstorm-jun-16-2026/spend-cards-spec.md](./cursor-brainstorm-jun-16-2026/spend-cards-spec.md) | In-app + wallet Spend Card product spec |
| [cursor-brainstorm-jun-16-2026/group-pay-links-qr-spec.md](./cursor-brainstorm-jun-16-2026/group-pay-links-qr-spec.md) | Pay link types, QR payloads, share channels |
| [cursor-brainstorm-jun-16-2026/capture-methods-investigation.md](./cursor-brainstorm-jun-16-2026/capture-methods-investigation.md) | Deep method matrix (18+ options, region-agnostic) |
| [cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md](./cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md) | **Ground truth** — repo audit, schema, data flows, phased build plan |
| [cursor-brainstorm-jun-16-2026/web3-payment-cards-non-kyc-investigation.md](./cursor-brainstorm-jun-16-2026/web3-payment-cards-non-kyc-investigation.md) | Web3 card landscape: KYC reality, provider map, pre-loaded card options |
| [cursor-brainstorm-jun-16-2026/spend-card-model-decision-memo.md](./cursor-brainstorm-jun-16-2026/spend-card-model-decision-memo.md) | Decision memo: A/B/C scoring, recommendation, trigger gates |
| [cursor-brainstorm-jun-16-2026/b2b-card-issuer-stacks-investigation.md](./cursor-brainstorm-jun-16-2026/b2b-card-issuer-stacks-investigation.md) | B2B issuer comparison: Rain, Gnosis Pay, Baanx, Bridge+Stripe, Marqeta, etc. |

## Packet Files

- [Cursor Brainstorm Jun 16 2026 (START HERE)](./cursor-brainstorm-jun-16-2026/README.md)
- [Product Evolution History](./product-evolution-history.md)
- [Polkadot Native Cursor Handoff](./polkadot-native-cursor-handoff.md) — technical audit resume
| [Path to Fully Native](./path-to-fully-native.md) | **v5** — group commitment primitive, Programme A (Playground) vs B (G0–G8), code-grounded maturity, deploy truth |
| [Native Execution Playbook](./native-execution-playbook.md) | **When to use which skills/plugins/agents** for doc + implementation |
- [Polkadot Native Audit Review (2026-06-16)](./polkadot-native-audit-review-2026-06-16.md) — independent verification of the audit
- [Polkadot Native Build Map](./polkadot-native-build-map.md)
- [Polkadot Native Replacement Matrix](./polkadot-native-replacement-matrix.json)
- [Polkadot Native Audit Dossier](./polkadot-native-audit-dossier.md)
- [Polkadot Native Evidence Ledger](./polkadot-native-evidence-ledger.json)
- [Polkadot Native Audit Scope](./polkadot-native-audit-scope.json)
- [Polkadot Native 99% Scorecard](./polkadot-native-99-scorecard.md)
- [Polkadot Native Runtime Proof Report](./polkadot-native-runtime-proof-report.md)
- [Polkadot Native External Deps Audit](./polkadot-native-external-deps-audit.md)
- [Polkadot Native Verification Signoff](./polkadot-native-verification-signoff.md)
- [Polkadot Native Risk Register](./polkadot-native-risk-register.md)
- [Product Account Signer Spike Report](./product-account-signer-spike-report.md)
- [Parity W3S Payment + Native Research Lane](./parity-w3s-payment-native-research-lane-2026-06-21.md)
- [Mode Map](./mode-map.md)
- [Savings Circle Spec](./savings-circle-spec.md)
- [Emergency Pot Spec](./emergency-pot-spec.md)
- [Community Fund Spec](./community-fund-spec.md)
- [Safety Boundaries](./safety-boundaries.md)
- [Polkadot Adapter Map](./polkadot-adapter-map.md)
- [UX Brief](./ux-brief.md)
- [Adversarial Simulation Report](./adversarial-simulation-report.md)

## Implementation Boundary

The initial code implementation lives under `src/chopdot-dot/`.

It is a local mode-aware commitment kernel, native pot-mode surface, simulated-agent harness, and test packet. The current native savings-circle path can run with `?chopdot-dot-native=1`, but it is still a spike: it does not remove Supabase from the full ChopDot app, does not provide real Product SDK host transport yet, and does not change the production wallet or settlement adapters by default.

## Private Lab

Run the clickable lab with:

```text
/?chopdot-dot-lab=1
```

Deep-link modes:

```text
/?chopdot-dot-lab=1&mode=savings_circle
/?chopdot-dot-lab=1&mode=emergency_pot
/?chopdot-dot-lab=1&mode=community_fund
```

The lab uses local fake test tokens only. Token events are evidence for a claim; they do not confirm receipt, approve release, or close a chapter.

## Native Spike

Run the current no-Supabase savings-circle spike with:

```text
/pots?chopdot-dot-native=1&person=leo
/pots?chopdot-dot-native=1&person=mina
/pots?chopdot-dot-native=1&person=nina
/pots?chopdot-dot-native=1&person=omar
```

This path proves signed event replay, native ChopDot UI behavior, and no-Supabase shared-event convergence through a local Statement Store-style lab transport. It does not yet prove real Product SDK host Statement Store sync.
