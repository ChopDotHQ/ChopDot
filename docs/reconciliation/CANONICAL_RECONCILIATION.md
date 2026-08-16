# ChopDot canonical reconciliation

Status: `IMPLEMENTED_BASELINE`

Branch: `agent/canonical-reconciliation`

Canonical base: `mvp@a7db07d6b8844ddee9061adacad10802bc2b7144`

## Outcome of this milestone

This branch establishes the authoritative integration line without merging the parallel completion branch wholesale.

The `mvp` source is the canonical base because it retains the current application structure together with the Prisma backend, Supabase migrations, Docker and deployment files, security scanning, package locks, and GitHub Actions workflows. The parallel `chatgpt/chopdot-v1-completion` source remains an input library of stronger product and financial slices, not a merge target.

The exact source refs, protected paths, authority rules, port order, and known blockers are machine-readable in `docs/reconciliation/canonical-manifest.json`.

## Non-destructive reconciliation rule

Every future port must be a bounded slice with an explicit before state, after state, authority model, migration impact, tests, and failure behavior.

A change must not silently delete or replace:

- the backend and Prisma schema;
- Supabase migrations;
- CI, coverage, smoke, release, or secrets workflows;
- Docker and deployment configuration;
- repository security policy or secret-scanning configuration;
- package locks;
- the current commitment lifecycle and audit records.

A broad branch merge is prohibited. Selective commits or deliberately rewritten changes are required.

## Canonical authority model

```text
Polkadot App / Host
identity, product account, approval, signing
        ↓
ChopDot client
UI, drafts, cache, offline projection
        ↓ authenticated + idempotent commands
ChopDot service
authorization, domain decisions, DB transactions
        ↓
Postgres
canonical shared operational state + append-only audit events
        ↙                         ↘
Polkadot chain                 optional signals/artifacts
on-chain transaction truth    never the relational ledger
```

Rules:

1. Postgres owns shared ChopDot operational truth.
2. Polkadot owns facts that actually occurred on-chain.
3. Local storage owns only local drafts, cache, and explicitly local-only state.
4. A request does not count as payment.
5. Payer evidence does not silently become receiver confirmation for manual settlement.
6. Private keys and seed material never enter ChopDot.
7. Retried state-changing commands must be idempotent.
8. Financial transitions that belong together must commit atomically.

## Reconciled source assessment

### Preserve from `mvp`

- React application architecture and current routes;
- Prisma/Postgres backend and settlement chapter API;
- Supabase schema and migrations;
- Docker and deployment configuration;
- CI, coverage, smoke, release, edge-function, and secrets workflows;
- security policy and gitleaks configuration;
- lockfiles and test structure.

### Port selectively from `chatgpt/chopdot-v1-completion`

- strict financial input parsing and currency precision rules;
- safe expense correction and settled-history preservation;
- group/member removal safety based on unresolved obligations;
- reusable people and receive preferences without treating typed addresses as authenticated identity;
- one payer → one receiver → one currency payment requests with request IDs and expiry;
- settlement evidence semantics and reversible manual acknowledgement;
- explainable financial history;
- honest local-versus-Polkadot identity lifecycle;
- native PAS/Paseo Product SDK adapter after dependency and host verification;
- mobile and accessibility improvements after current-source implementation and proof.

### Do not port as-is

- removal of backend, CI, deployment, security, or migration infrastructure;
- direct chain-evidence confirmation that bypasses the accepted receiver-confirmation policy;
- unverified production DOT or Paseo USDC claims;
- Statement Store as a financial ledger;
- local-only mutation paths presented as shared cross-device truth.

## Ordered execution after this milestone

### DATA-002 — integer money and persistence migrations

Introduce canonical integer units, explicit currency scale, persisted schema versions, ordered migrations, corrupt-state handling, and invariant tests. This is the next implementation slice.

### BACKEND-001 — authorized command service

Require authenticated actors, membership checks, role checks, idempotency keys, optimistic versions, transactional writes, and append-only audit events.

### BACKEND-002 — durable financial workflow

Persist obligations, payment intents, settlement attempts, evidence, receiver confirmations, retries, reconciliation state, and canonical event timestamps.

### Product slice reconciliation

Port each stronger completion-branch slice only after the canonical money and command boundaries are in place.

### RELEASE-001

Run the complete user journey, build and deployment verification, mobile/accessibility evidence, real host proof, and real-chain proof under the current settlement policy.

## Completion criteria for canonical reconciliation

This milestone is complete when:

- the integration branch starts from the immutable `mvp` SHA;
- the source manifest records every reviewed input ref;
- protected infrastructure is checked automatically;
- frontend and backend CI entrypoints are executable;
- the reconciliation branch has a draft PR targeting `mvp`;
- no consumer financial semantics are changed merely to make reconciliation easier;
- known backend authorization and atomicity gaps remain explicit blockers rather than hidden debt.

This milestone does not declare the application production-ready and does not resolve DATA-002, BACKEND-001, BACKEND-002, live Polkadot verification, or release acceptance.
