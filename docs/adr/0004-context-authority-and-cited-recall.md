# ADR 0004 — Context authority and cited recall

**Kind:** decision
**Status:** accepted
**Owner:** product and release integrator
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** dated context-governance decision subordinate to product law and explicit supersession
**Decision date:** 2026-08-24
**Supersedes:** competing claims that ADRs, wiki, `.knowns`, Cockpit read models,
or KG independently form product truth

## Context

ChopDot accumulated law, decisions, ADRs, wiki pages, historical plans, task
queues, generated Cockpit views, agent skills, Repo Graph packets, and KG
recall. These increased discoverability but did not enforce freshness,
worktree identity, or a single authority order. The same agent could therefore
receive internally consistent but incompatible instructions from different
moments or checkouts.

## Decision

Adopt the machine-validated hierarchy in `product/context-authority.json`:

1. product law;
2. current dated Cockpit source decisions;
3. exact-commit source and test evidence;
4. immutable release and live readback evidence;
5. Repo Graph/KGv2 cited recall;
6. supporting/historical/generated context.

KGv2 is a recall and navigation layer. It does not create product facts. A KG
claim is durable for the release only when active v2 returns citations from a
Repo Graph packet whose exact root, branch, and commit match the accepted
worktree outcome, with no fallback or stale reason.

Generated views and `.knowns/tasks` are read models/operator handoff surfaces.
They cannot reprioritize source cards. Historical material remains available
but is removed from the default route unless a conditional task route selects
it.

## Consequences

- Agents fail early instead of silently mixing checkouts or time horizons.
- Updating context requires maintaining metadata and regenerating read models.
- A valid Cockpit or KG response is no longer sufficient to claim
  implementation, deployment, reachability, ownership, or real-user proof.
- Historical research remains useful without tugging current execution.

## Falsifier

Reject this decision if the validator still permits file order, a generated
view, another checkout, or an uncited/stale KG packet to change current product
priority or release status.
