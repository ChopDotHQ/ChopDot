# Engineering Remediation Plan

Status: Draft  
Last updated: 2026-01-14  
Owners: **DEV** (primary), **TEDDY** (backend/infra), **OPEN** (as assigned)

Role owner aliases used below:
- **PM** = product lead
- **UX** = design/research
- **SRE** = DevOps/infra
- **SEC** = security
- **LEGAL** = compliance/legal
- **FIN** = FinOps/costs
- **SUPPORT** = community/support
- **CHAIN** = protocol/wallet specialist

## Scope
- Security, data integrity, architecture/maintainability, performance, UX stability, testing, observability, and docs.
- Align data ownership decisions (metadata vs normalized tables vs CRDT).
- Keep the docs site initiative parked but scoped for later.
- Maintain future readiness for JAM and decentralization where it adds resilience.

## Constraints
- Preserve existing user data; avoid breaking schema changes without migrations and rollback.
- Maintain guest mode and feature flags until replacements are stable.
- Prefer small, reviewable increments with no behavior changes unless explicitly planned.
- Avoid adding dependencies unless they address a documented gap.
- Keep data access layers modular to allow replacing Supabase in the future.

## Goals
- Correctness: CRDT and settlement logic are deterministic and consistent.
- Security: no anonymous access to sensitive tables; abuse protections on public endpoints.
- Reliability: clear source-of-truth and safe concurrency behavior.
- Maintainability: smaller, well-owned modules with clear boundaries.
- Observability: actionable error tracking and release parity checks.
- Future readiness: coordination layer that can scale defensively, with decentralization where it makes sense.

## Checks (Definition of Done)
- Security: `anon` has no grants to auth nonces or financial tables; IPFS endpoint rate limited.
- CRDT: stable actor IDs and cryptographic hashing; collision tests pass.
- Financials: single settlement engine used everywhere; UI matches service outputs.
- Data model: pot writes are safe under concurrent edits; metadata size bounded.
- UX: mobile and desktop flows tested for login, create pot, add expense, settle.
- Testing: unit + integration + smoke tests for core flows.
- Observability: error tracking live; parity checklist enforced with rollback notes.

## Role Review (Responsibilities, Questions, Findings)

### Core Engineering Roles
- **Principal Architect**
  - Responsibility: system boundaries, data ownership, consistency model, change isolation.
  - Questions: What is canonical state? What is the conflict strategy? What fails safely?
  - Findings: pot metadata JSON is treated as canonical, which risks lost updates; monolithic screens slow isolation; CRDT actor/hash are correctness blockers.
- **Security Engineer**
  - Responsibility: auth, RLS, abuse protection, secret handling.
  - Questions: Who can read/write sensitive data? Where can we be spammed? How are secrets rotated?
  - Findings: `anon` grants remain in migrations; IPFS endpoint lacks rate limiting; nonce storage needs strict access.
- **CRDT/Data Integrity Engineer**
  - Responsibility: merge semantics, identity, dedupe, offline correctness.
  - Questions: Are actor IDs stable per user/device? Are hashes collision-safe? What is migration path?
  - Findings: random actor IDs and weak hashes are correctness blockers; need stable actor IDs + SHA-256 hash + tests.
- **Backend/Edge Engineer**
  - Responsibility: API contracts, idempotency, scalability, error handling.
  - Questions: Are edge functions idempotent? Is lookup scalable? Can we rollback safely?
  - Findings: wallet auth uses listUsers scan; pot upsert writes full metadata; invites flow incomplete.
- **Frontend/Mobile Engineer**
  - Responsibility: UI architecture, UX stability, state boundaries, accessibility.
  - Questions: Are flows testable and modular? Are mobile constraints handled?
  - Findings: large screens increase review cost; settlement math duplicated; known Safari keyboard issue.
- **Performance/Scalability Engineer**
  - Responsibility: data growth, fetch patterns, cache strategy, bundle size.
  - Questions: What grows unbounded? Where do we paginate? What is the caching model?
  - Findings: pot metadata payload grows; TTL caches are local-only; pagination not enforced.
- **QA/Testing Lead**
  - Responsibility: test strategy, release gating, coverage for core flows.
  - Questions: What is release-gate? What scenarios are risky?
  - Findings: missing CRDT/settlement tests; no explicit release-gating suite.
- **Observability/Release Engineer**
  - Responsibility: logging/metrics, parity, rollback.
  - Questions: How do we detect and rollback regressions?
  - Findings: monitoring is a TODO; parity checklist is manual.

### Additional Perspectives
- **Product Manager (PM)**
  - Responsibility: user outcomes, scope priority, MVP definition.
  - Questions: Who is the primary user and what is their success path? What is the MVP for onboarding?
  - Findings: success metrics not explicit; need clear “first win” flow and prioritized user funnel.
- **UX Research/Design (UX)**
  - Responsibility: usability, comprehension, onboarding clarity.
  - Questions: Do users understand pots/attestations? Where do they drop off?
  - Findings: needs usability testing; reduce cognitive load in auth and settlement flows.
- **DevOps/SRE (SRE)**
  - Responsibility: deploy reliability, rate limits, rollout/rollback.
  - Questions: How do we rollback? What’s the plan for failover?
  - Findings: rate limiting missing; rollback and parity checks need formalization.
- **Compliance/Legal (LEGAL)**
  - Responsibility: privacy, terms, data retention, financial disclosures.
  - Questions: What data is stored? What are retention and user consent policies?
  - Findings: need explicit privacy policy updates for wallet auth and logs; define data retention periods.
- **Data Privacy/Security Ops (SEC)**
  - Responsibility: incident response, monitoring, secret rotation.
  - Questions: How is suspicious activity detected? Who responds to incidents?
  - Findings: no documented incident response; no audit log strategy.
- **FinOps/Cost (FIN)**
  - Responsibility: cost drivers and guardrails.
  - Questions: What’s the cost per active user? Where can usage spike?
  - Findings: IPFS and Supabase usage need caps and alerts; abuse could become a cost risk.
- **Community/Support (SUPPORT)**
  - Responsibility: support load and feedback loop.
  - Questions: What are the top support issues? How do users self-serve?
  - Findings: expand FAQ/help and add feedback capture; prepare public docs later.
- **Chain/Protocol Specialist (CHAIN)**
  - Responsibility: wallet UX, chain specifics, RPC reliability.
  - Questions: Are signing messages stable? Are chain-specific flows resilient?
  - Findings: standardize signing message and versioning; ensure multi-wallet compatibility and RPC fallback.

## Confirmed Decisions
- Canonical data ownership: normalized tables are source-of-truth; metadata JSON is derived.
- CRDT scope: offline/guest only until hardened; not required for all pots.
- Data portability: keep data source layers modular to support Supabase replacement and JAM readiness.

## Cross-Role Alignment (Remaining Decisions)
- Data-source behavior: whether to hard-fail when `VITE_DATA_SOURCE=supabase` is misconfigured.
- Release gates: minimum tests and parity checks required for deploy.
- Release gates: minimum tests and parity checks required for deploy.

## Risk Register

Critical:
- CRDT actor IDs random per session; merge correctness risk.
- Weak change hash leads to collisions and dropped updates.

High:
- `anon` grants in migrations for auth/financial tables.
- IPFS endpoint has no rate limiting/abuse controls.
- Pot metadata upserts risk lost updates under concurrency.
- Settlement logic divergence between service and UI.

Medium:
- Expense IDs use `Date.now()` strings (collision risk).
- Silent fallback to local storage when Supabase is misconfigured.
- TTL caches have no cross-client invalidation.
- Wallet auth user lookup uses listUsers scan.
- Large monolithic screens slow reviews and increase regression risk.

## Phased Remediation Plan (Owners + Timeline)

Phase 0: Stabilize correctness and security (Weeks 0–2)
- Fix CRDT actor IDs + cryptographic hash; add tests. Owner: DEV.
- Add migration to revoke `anon` grants for auth/financial tables. Owner: DEV/SEC.
- Add IPFS rate limiting and request constraints. Owner: TEDDY/SRE.
- Consolidate settlement logic to Decimal-based engine; update UI usage. Owner: DEV.
- Decide canonical data ownership model and CRDT scope. Owner: DEV/PM/ARCH.

Phase 1: Scale + reliability (Weeks 2–4)
- Replace wallet auth listUsers scan with direct lookup/mapping. Owner: DEV.
- Switch expense IDs to UUIDs. Owner: DEV.
- Enforce pagination in UI and data layer. Owner: DEV.
- Define release gating suite (unit + integration + smoke). Owner: QA/DEV.
- Add error tracking and release parity enforcement. Owner: SRE.
- Define data source contract for future Supabase replacement (`docs/DATA_SOURCE_CONTRACT.md`). Owner: DEV/ARCH.

Phase 2: Maintainability + UX + docs (Weeks 4–8)
- Modularize `src/App.tsx` and `src/components/screens/SignInScreen.tsx`. Owner: DEV/UX.
- Define cache invalidation or sync strategy for concurrent edits. Owner: DEV.
- Expand Help/FAQ and draft public docs IA (parked). Owner: SUPPORT/UX/PM.
- Evaluate decentralization options (IPFS/CRDT/JAM alignment) for the coordination layer. Owner: DEV/CHAIN.

## Execution Checklist

Phase 0
- [x] CRDT actor IDs stabilized and hash upgraded; tests added.
- [x] `anon` grants revoked in new migration; verified in staging.
- [ ] IPFS rate limiting in place; 429 verified.
- [x] Settlement logic unified; UI matches service output.
- [x] Canonical data ownership decision documented.

Phase 1
- [x] Wallet auth lookup optimized; no listUsers scan.
- [x] Expense IDs use UUIDs.
- [x] Pagination implemented in UI and data layer.
- [x] Release gating suite defined and running in CI.
- [ ] Error tracking configured; parity checklist enforced.

Phase 2
- [ ] SignInScreen modularized into components/hooks.
- [ ] App shell modularized by feature areas.
- [ ] Cache invalidation strategy documented or implemented.
- [ ] Public docs IA drafted and linked plan documented.

## Open Questions
- Should CRDT be required for all pots, or only offline/guest usage?
- Do we want pot metadata JSON as canonical, or normalized tables + CRDT logs?
- What are the non-negotiable release gates for production deploys?
