# Batch 1 local promotion evidence

Run completed: 2026-08-12T14:47:09Z  
Delivery train: `chopdot-functional-candidate-2026-08-12`  
Candidate snapshot: `b1-717ace4938361262`

## Exact commands and results

1. `node --import tsx --test src/membership/membershipLifecycle.test.ts src/membership/signedMembershipEvents.test.ts src/membership/signedMembershipJournal.test.ts src/membership/chatInvitationTransport.test.ts src/membership/membershipDeliveryOutbox.test.ts`
   - PASS: 24/24 tests.
2. `node --import tsx --test src/membership/trustedContactInvitationCoordinator.test.ts`
   - PASS: 3/3 tests.
3. `npx playwright test tests/membership-invitation-ui.spec.ts --config=playwright.host-sim.config.ts --workers=1`
   - PASS: 5/5 visible-UI tests on separate local Mina/Leo coordinators.
4. `node --import tsx --test src/membership/groupKeyHandoff.test.ts`
   - PASS: 5/5 protected-handoff tests.

Total exact gate assertions: 37/37 passed.

Additional same-snapshot verification:

- `npm run test:gate0-foundation`: PASS, 44/44.
- `npx tsc --noEmit --pretty false`: PASS.
- `npm run lint`: PASS.
- `npm run security:baseline`: PASS, 87 files checked.
- `npm run build`: PASS with existing Rollup annotation and large-chunk warnings.
- gate-harness tests: PASS, 12/12.

## Control mapping

| Control | Fresh proof |
|---|---|
| Stable identity and host-held signing seam | Real sr25519-compatible signed-event and handoff suites; production signer remains an injected host edge. |
| Trusted contact to Product Account binding | Coordinator rejects unresolved contacts, mismatched accounts, and arbitrary peer labels. |
| Organizer-signed invite | Mina creates and signs the invitation in the isolated coordinator test. |
| Selected-room delivery | Outbound route is the explicitly selected room; wrong-room inbound delivery rejects. |
| Pending is not membership | Domain, coordinator, and visible UI all keep Leo pending after invite and after acceptance. |
| Explicit accept/decline UI | Mobile and desktop Playwright ceremony exercises both actions. |
| Invitee-signed decision | Leo signs acceptance or decline; wrong actor/account rejects. |
| Protected grant | Mina's separately signed encrypted handoff is required before membership. |
| Adversarial authority | Wrong account, peer label, route, tamper, expiry, conflicting ID, and replay fail closed. |
| Durable delivery | Outbox recreation retries the exact first signed event and rejects conflicting reuse. |
| Isolated host simulation | Two coordinator instances with separate storage, signer, vault, and delivery edges complete Mina -> Leo -> Mina -> Leo. |

## Visible evidence

- `screenshots/09-invitation-joined-desktop-1280x720.png`
- `screenshots/07-invitation-accepted-mobile-390x844.png`
- `screenshots/08-invitation-grant-failed-mobile-390x844.png`
- `screenshots/09-invitation-joined-mobile-390x844.png`

## Honest boundary

This is a controlled local Batch 1 pass. The live lane remains blocked: the
installed Desktop SDK does not expose a trusted contact-to-Product-Account
resolver, the real chat byte ceiling is not numeric, and no two-account real
Desktop delivery occurred. `Local preview` remains visible in the proof UI.
