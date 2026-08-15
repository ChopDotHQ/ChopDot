# ChopDot Engineering Standards

Status: active guardrail for the v1 completion track
Owner: engineering

## Purpose

These standards define how ChopDot changes are built so that fast AI-assisted development remains understandable, reviewable, secure, and recoverable.

The standard is not “clean code” in the abstract. It is change safety for a money product under active platform evolution.

## ENG-001 — Build small vertical slices

Prefer one complete user behavior at a time.

Good:

```text
open expense -> edit -> validate -> save -> balances update -> persist -> reload
```

Avoid broad rewrites that mix state, navigation, persistence, and several payment rails in one change.

Each slice must have explicit scope, non-goals, and acceptance criteria before implementation.

## ENG-002 — Domain logic must be pure where practical

Canonical money logic should be testable without React, browser APIs, host SDKs, or network calls.

Examples:

- split validation
- balance calculation
- obligation calculation
- correction rules
- settlement state transitions
- money/unit conversion boundaries

UI components should dispatch actions and render canonical state rather than reimplement calculations.

## ENG-003 — Invariants are executable

Important rules must exist in tests, not only prose.

Examples:

- sum of splits equals expense amount;
- balances conserve value;
- one confirmed payment cannot settle twice;
- stale request cannot settle changed debt;
- back/cancel does not mutate money state;
- settled history cannot disappear through an edit.

Where useful, add generated/property-style test cases in addition to example fixtures.

## ENG-004 — Stable identifiers are mandatory

Use stable IDs for groups, members, expenses, splits, obligations, payment intents, settlement attempts, evidence, corrections, and commands/events.

Never rely on array index, display name, or screen position as identity.

## ENG-005 — State-changing operations must be idempotent

Repeated taps, retries, callbacks, reloads, or duplicate delivery must not create duplicate financial effects.

A payment/settlement action must have an idempotency strategy before it is connected to a real rail.

## ENG-006 — Money values use canonical integer units

Do not use floating-point values as authoritative payment truth.

- fiat/decimal currencies: canonical minor units where applicable;
- chain assets: canonical base units with explicit decimals;
- formatting/conversion is a presentation concern.

## ENG-007 — Persistence changes require versioning and migration

Any persisted state change must answer:

- what schema version is this?
- how does old data migrate?
- what happens if migration fails?
- what happens with corrupted state?

Do not wipe user money history silently to simplify a release.

## ENG-008 — Current state and event/history state are separate

Current state may be optimized for rendering and calculation. History/audit data must preserve meaningful past transitions independently when required for trust or recovery.

## ENG-009 — Adapter boundaries are contract-tested

Host, payment, wallet, storage, and delivery adapters must expose a narrow interface with deterministic tests.

At minimum test:

- success;
- unavailable capability;
- malformed response;
- timeout/failure;
- duplicate callback;
- stale response where relevant.

Platform-specific data must not leak into the domain model unnecessarily.

## ENG-010 — Feature flags hide incomplete capabilities completely

A disabled or unverified capability should be unreachable in normal UX, not visible as a broken button.

Feature flags must not alter financial semantics. They may select an available adapter or surface.

## ENG-011 — Failure injection is part of payment development

Before a payment/host slice is done, simulate relevant failures:

- user rejects signature;
- insufficient funds;
- wrong account/network;
- host unavailable;
- timeout after submission;
- callback delivered twice;
- stale request;
- app closed/reopened mid-flow;
- corrupted persistence;
- evidence mismatch.

The expected failure result must be explicit and preserve money truth.

## ENG-012 — No opportunistic refactors inside behavior changes

If a refactor is required for a feature, isolate it in its own commit when practical, keep behavior-preserving tests green, then implement the behavior change.

This improves cherry-pickability against the newer Codex branch.

## ENG-013 — Commits should be reviewable and reversible

Prefer one concept per commit.

Good examples:

```text
feat(expenses): allow editing unsettled expenses
fix(settlement): reject stale request updates
test(money): preserve value across split corrections
```

Avoid opaque or huge AI-generated rewrites.

## ENG-014 — Dependencies are intentional

Before adding a dependency, document why existing code/platform capability is insufficient and consider security, maintenance, and runtime impact.

Pin or tightly control versions for critical Parity/Polkadot/payment dependencies until compatibility is proven. Do not auto-upgrade critical SDKs without targeted host and regression tests.

## ENG-015 — Observability must not leak sensitive data

Structured diagnostics are useful, but logs/telemetry must not contain seed phrases, private keys, raw secrets/nonces, unnecessary signatures, full sensitive request URLs, or unnecessary personal/payment data.

Use stable error codes and redacted context.

## ENG-016 — Real-host claims require real-host evidence

Simulator success does not prove real `.dot`/Desktop/App behavior.

Classify evidence as:

- `unit`
- `host-sim`
- `live-host`
- `live-chain`
- `manual-device`

A feature may be implemented but must remain labelled unverified/blocked until the required evidence level is reached.

## ENG-017 — Maintain a compatibility matrix

For platform-sensitive features record:

- source commit;
- app version;
- host/desktop version;
- Product SDK versions;
- relevant network/environment;
- proof level;
- known blockers.

Do not rely on “latest” as a compatibility description.

## ENG-018 — Secure defaults and least privilege

- fail closed on uncertain financial authority;
- request only host/wallet capabilities required for the user action;
- no developer hooks in normal production UI;
- no secrets in client bundle;
- no silent fallback that changes financial meaning.

## ENG-019 — Accessibility and mobile behavior are implementation requirements

For user-visible slices:

- semantic labels;
- sufficient tap targets;
- keyboard/focus safety where applicable;
- 320/375/390px sanity;
- safe-area handling;
- text/content stress where relevant;
- loading/error states that remain usable.

## ENG-020 — Evidence accompanies completion

Every completed slice records in the execution board:

- commit(s);
- tests added/changed;
- which tests were executed;
- proof/evidence level;
- known limitations;
- whether Codex reconciliation is still required.

When execution is not possible in this environment, state `WRITTEN / NOT EXECUTED HERE`. Never convert absence of failure into a claim of success.

## Required Slice Template

Before implementation:

```text
Slice ID
User goal
Current problem
Scope
Non-goals
Domain transitions
Security/trust boundary
UX before/after/failure states
Persistence impact
Migration impact
Adapter/platform impact
Acceptance tests
Required evidence level
```

After implementation:

```text
Commits
Files changed
Tests written
Tests executed
Evidence captured
Known limitations
Execution board status
```

## References

- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/QUALITY_GATE.md`
- `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
