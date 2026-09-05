# ChopDot investigations

**Kind:** operating guidance
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-26
**Authority:** investigation structure only; never product law, current product
priority, participant authority, implementation proof, or release proof

Investigations resolve adjacent uncertainty that can invalidate a proposed
decision or implementation even when its direct tests pass. Start from
`docs/investigations/0000-template.md`, preserve exact source provenance, and
link the concluded investigation from the affected ADR, product card,
requirement, PR, evaluation, or `OutcomePacketV1` evidence index.

An investigation produces a cited reasoning artifact. It proves only what its
recorded method and evidence level establish. It is not automatically source,
command, simulator, real-host, chain, participant, independent-review, or
release proof.

## Mandatory triggers

Create or update an investigation when work introduces or materially changes:

- money representation, precision, splitting, correction, refund, exchange,
  fees, settlement, migration, custody, escrow, or release authority;
- person, contact, account, recipient, membership, organizer, key rotation,
  signature, capability, revocation, recovery, or replay semantics;
- public/shared storage, delivery, synchronization, retention, indexing,
  analytics, notifications, privacy, or secret handling;
- chain, host, wallet, contract, registry, network, asset, finality, deployment,
  ownership, or provider behavior;
- a core first-use journey, error/recovery message, mobile layout, keyboard
  path, focus behavior, accessible name, or assistive-technology behavior;
- agent contracts, effect/approval handling, evidence levels, terminal states,
  evaluator independence, knowledge adapters, CI enforcement, or repository
  authority; or
- any same-level conflict among product law, decisions, source evidence,
  release evidence, instructions, packets, or governance proposals.

Write `None — no trigger applies` in a PR only after checking every applicable
class above.

## Required method

1. Verify exact root, branch, commit/tree, complete Git status, and governing
   sources.
2. State one bounded question and the decision it could change.
3. Declare the source/experiment universe and its exclusions.
4. Record primary source identity, version, timestamp, digest, and access status.
5. Separate facts, inferences, assumptions, counterevidence, and unknowns.
6. Attempt the strongest practical adversarial or falsifying check.
7. Distinguish source inspection, command execution, simulation, real
   environment, independent review, live-user observation, and release readback.
8. Conclude `ACCEPT`, `ACCEPT WITH CONDITIONS`, `HOLD`, or `REJECT / REDESIGN`.
9. Name the smallest exact follow-up proof and update affected sources when the
   conclusion changes direction.

## Evidence levels

Use only IDs from
`governance/agent-system/policies/evidence-levels.json`:

`source-only`, `unit`, `simulated-integration`, `simulated-host`,
`exact-candidate`, `real-host-chain`, `live-user`, `release`, and
`local-blocked`.

`local-blocked` is useful blocker evidence and is never promotable. Knowledge
recall or a generated summary remains supporting context unless the underlying
source identity and evidence are independently established.

## Source and privacy rules

- Prefer primary and authoritative sources; label curated sources as discovery
  leads.
- Record literal commit/tree/artifact identities in immutable evidence. A
  moving PR body alone may use `CURRENT_PR_HEAD` when CI resolves it.
- Cite another checkout, branch, host, network, or account explicitly; never
  present it as exact-target evidence.
- Keep prompts, credentials, participant content, receipts, raw personal data,
  and unredacted agent traces out of committed investigations.
- Provider or KG identity belongs in provenance metadata and may not become
  product authority.

## Review and lifecycle

Critical money, authority, privacy, recovery, credential, security, and release
investigations require a separately identified reviewer. CODEOWNERS routing does
not prove independence.

Use these lifecycle states:

- `open` — question or evidence collection remains active;
- `concluded` — a bounded decision and follow-up evidence are recorded;
- `superseded` — a later investigation replaces the conclusion and is linked;
- `blocked` — the unresolved external or same-level condition and safe next
  action are explicit.

Preserve superseded investigations for provenance. Do not rewrite historical
findings to match a newer conclusion.
