# Canonical workflow capability matrix

Status: active reconciliation evidence

The canonical branch distinguishes an executed check from a capability that is currently unavailable. A green blocked-marker job is not test evidence; its job name and summary must say that the underlying capability did not run.

| Workflow | Current contract | Evidence meaning |
|---|---|---|
| CI — frontend | Required and executable | Clean install, reconciliation guard, typecheck, lint, unit tests, and production build |
| CI — backend | Required and executable | Clean install, Prisma generation, backend typecheck, backend tests, and backend build |
| Coverage | Required and executable | Vitest coverage artifact and summary |
| Secrets Scan | Preserved required security control | Secret-scanning result |
| Cypress E2E | Capability-gated | Runs only when Cypress config, specs, generator, scripts, and dependency exist; otherwise records an explicit blocker |
| Targeted Smoke | Capability-gated | Runs only when the Playwright smoke runner and package contract exist; otherwise records an explicit blocker |
| Edge Functions Sync | Capability-gated | Runs only when the verifier script and package command exist; otherwise records an explicit blocker |
| Release Validation | Capability-gated and manual | Runs only when the full release/smoke runtime exists; otherwise records that no release claim is made |

## Why this is necessary

The `mvp` source preserved workflow files whose referenced scripts, configurations, test suites, and dependencies had already been removed. Allowing those workflows to fail ambiguously would obscure whether a product regression occurred. Deleting them would lose the intended quality contracts. Capability gating preserves the contracts while making the missing runtime explicit.

## Promotion rule

A capability-gated workflow can become required only in the same bounded slice that restores its runtime, executes it, uploads evidence, and updates this matrix. No workflow may be promoted based only on configuration files or written tests.
