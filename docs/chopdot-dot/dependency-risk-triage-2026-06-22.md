# ChopDot Dependency Risk Triage

Status: `active-risk`
Date: 2026-06-22
Programme: release readiness + 9/10 claim boundary

## Summary

`npm run ci:fast` passes, but it currently treats `npm audit --audit-level=high`
as a warning. This means build health is green, but production security clearance
is not green.

Latest audit snapshot:

```text
49 vulnerabilities: 2 low, 25 moderate, 19 high, 3 critical
Direct packages involved: @automerge/automerge-repo, cypress, ethers,
ipfs-http-client, ipfs-only-hash, knowns, vite, vitest
```

## Triage

| Class | Packages / area | Risk judgment | Next action |
| --- | --- | --- | --- |
| Immediate safe-upgrade candidates | `vite`, `vitest`, `ethers`, transitive `ws`, `undici`, `hono`, `lodash`, `path-to-regexp`, `picomatch`, `tmp`, `form-data`, `fast-uri`, `yaml`, `postcss` | Mostly direct runtime/dev packages where `npm audit fix` says a non-forced fix is available; needs lockfile review and regression run | Try non-forced `npm audit fix` on a branch, then run `npm run validate:readiness`, `npm run ci:fast`, and full Playwright |
| Dev/test-only or local-tooling risk | `cypress`, `vitest`, some `vite` dev-server issues, `tsx`/`esbuild`, test runner transitive packages | Important for local/dev safety, but not automatically a production app exploit if dev servers are not public | Keep dev servers local-only; upgrade with normal dependency hygiene before public pilot |
| Production/runtime dependency risk | `ethers`, `viem`/`ws`, `undici`, `ipfs-http-client`, `ipfs-only-hash`, `protobufjs` chain, `@automerge/automerge-repo`/`uuid` | Could matter for wallet, network, archive/hash, and sync surfaces if exposed in production | Prioritize before public production claim; verify app flows after any major upgrade |
| Blocked by breaking upgrade | `ipfs-http-client`, `ipfs-only-hash`, `knowns`, related `protobufjs`, `nanoid`, `parse-duration`, `js-yaml`, `gray-matter`, BlockNote stack | `npm audit fix --force` proposes semver-major or dependency-downgrade changes; unsafe to apply blindly | Create a separate dependency migration spike; replace or isolate IPFS/knowns paths if needed |

## Current Claim Boundary

Allowed:

```text
Local CI passes with known dependency audit warnings.
```

Not allowed:

```text
Production dependency/security clearance is complete.
```

## Required Before Public Production Claim

- Run a non-forced dependency update branch and regression suite.
- Decide whether `ipfs-http-client` / `ipfs-only-hash` stay in the production bundle or move behind a lazy lab/archive boundary.
- Decide whether `knowns` is required in the app release bundle.
- Re-run `npm audit --audit-level=high` and record remaining production/runtime advisories.
- Re-run `npm run validate:readiness`, `npm run ci:fast`, and `npx playwright test --workers=1`.
