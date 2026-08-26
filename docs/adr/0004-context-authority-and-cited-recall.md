# ADR 0004 — Context authority and cited recall

**Kind:** decision
**Status:** accepted
**Owner:** product and release integrator
**Last reviewed:** 2026-08-26
**Applies to:** `chopdot-v1-launch`
**Authority:** dated context-governance decision subordinate to product law and explicit supersession
**Decision date:** 2026-08-24
**Partially superseded by:** ADR 0005 replaces backend-specific core vocabulary with the Knowledge Context Port; this ADR's authority order remains accepted
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
5. cited recall through a conforming Knowledge Context adapter;
6. supporting/historical/generated context.

Knowledge backends are recall and navigation layers. They do not create product
facts. A recalled claim is durable for an outcome only when the configured
adapter returns cited facts whose exact root, branch, commit, and outcome digest
match the accepted worktree outcome, with no disallowed fallback or stale
reason. KGv2 and Repo Graph remain supported provider adapters.

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
