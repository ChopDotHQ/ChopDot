# AgentOps KG Bridge

Status: active local operating bridge
Owner: AutoBots AgentOps owns bridge generation; ChopDot owns product truth and implementation.

## Purpose

ChopDot uses the AgentOps knowledge graph as an agent operating layer before product work. The KG bridge is not a user-facing feature and is not product proof by itself. It is a compact routing surface that prevents agents from rebuilding in circles, trusting generated shells, or opening broad docs before the current product truth is known.

## Required Hydration Order

Before starting non-trivial ChopDot product, UI, wallet, payment, AI-builder, or integration work, agents must read:

- `/Users/devinsonpena/ChopDot/.local-private/agentops/kg_context.md`
- `/Users/devinsonpena/ChopDot/.local-private/agentops/decision_cards/chopdot-next-work.md`
- `/Users/devinsonpena/ChopDot/product/generated/product-resume.md`
- `/Users/devinsonpena/ChopDot/product/cards.md`

AgentOps canonical generated report:

- `/Users/devinsonpena/Documents/AutoBots/agentops/reports/chopdot_kg_bridge.md`

## Current Default

Start from `P-022 Regular pot end-to-end coherence` unless the user explicitly overrides the target.

The default product rule is:

- prove the normal-pot journey before branching into savings-circle, mini-app, Telegram, wallet, protocol, or AI-shell expansion
- name the active cockpit card, user journey, one next action, and falsifier before editing UI
- verify user-facing changes with real app click-through and screenshots

## Non-Negotiable Gates

- Do not treat generated UI or AI-builder output as product truth.
- Do not expose internal protocol, adapter, proof, native, host, Product SDK, Statement Store, or AI/process language in normal UI.
- Do not let a feature pass if the first screen lacks one obvious next action.
- Receipt capture starts from photo, link, or import; manual item entry is an optional correction path.
- Agents may prepare trust-critical wallet, payment, deployment, or external actions, but humans approve execution.

## Official Boundary

This file makes KG usage official for ChopDot agent operations. It does not make KG a ChopDot product feature, does not approve product completion, and does not replace the product cockpit, cards, screenshots, tests, or human review.
