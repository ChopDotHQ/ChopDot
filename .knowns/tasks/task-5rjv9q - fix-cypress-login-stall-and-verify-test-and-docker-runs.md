---
id: 5rjv9q
title: "Fix Cypress login stall and verify tests/docker"
status: done
priority: high
createdAt: '2026-02-18T07:50:36Z'
updatedAt: '2026-02-18T07:50:36Z'
timeSpent: 0
---

# Fix Cypress login stall and verify tests/docker

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Cypress run was stalling on the sign-in screen. Make e2e auth deterministic, run all tests, then run the docker environment.
<!-- SECTION:DESCRIPTION:END -->

## Completion Notes

- Fixed Cypress auth bootstrap logic to avoid false sign-in detection and ambiguous guest-button selection:
  - `cypress/support/e2e.ts`
- Added Cypress-runtime guest fallback in auth context to avoid Supabase-dependent guest auth in tests:
  - `src/contexts/AuthContext.tsx`
- Verified tests:
  - `npm test` (230 passing)
  - `npm run test:e2e` (185 passing)
- Ran docker environment:
  - `docker compose -f blockchain/docker-compose.local-chain.yml up -d`
  - `docker compose -f blockchain/docker-compose.local-chain.yml ps` shows `chopdot-anvil` running on `8545`.
