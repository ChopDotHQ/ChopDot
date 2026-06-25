# ChopDot Native Friends Iteration

Status: `implemented-local`
Date: 2026-06-20
Programme: `B` native truth, with Track 1 UX reuse

## Local Implementation Result

Status: `pass-local`

The local/native-session iteration now covers all three modes from separate person/device perspectives:

- savings circle: Leo, Nina, Omar, and Mina
- emergency fund: Riley, Casey, Morgan, Taylor, and Jordan
- community pot: Alex, Sam, Noor, Priya, and Jordan

The remaining blocker is not product flow. It is live host proof: Product Account, Statement Store, Bulletin/archive, Asset Hub, and closeout proof must still pass inside the real Polkadot host before this can be called live-native.

## Goal

By the next iteration, ChopDot is usable by me and a small group of friends as a Polkadot-native shared money coordination app across three ready-to-use modes:

- savings circle
- emergency fund
- community pot

A real person can create a chapter, invite friends, each friend can join from their own device, see one clear next action, record a payment or attach Polkadot payment evidence, get the right confirmation, see blockers, resolve delays or approvals, and close with a private receipt.

The app must hide Polkadot complexity from users. Users should only understand:

```text
join -> know my job -> record payment -> confirm receipt -> resolve blockers -> close with receipt
```

## Non-Negotiable Product Bar

- No normal-user `Act as` mode.
- No technical copy in the main flow: no Product SDK, Statement Store, Bulletin, adapter, kernel, rail, or raw JSON.
- No custody language.
- No token transfer auto-confirms anything.
- No closeout without confirmation or explicit annotation.
- No public sensitive emergency details by default.
- No community fund release without required approvals.

## Native Truth Bar

Native readiness means the shared product truth is derived from signed participant events, not Supabase rows.

Required adapter posture:

- Product Account signing: works or fails visibly.
- Statement Store sync: works or fails visibly.
- Bulletin/archive receipt storage: works or fails visibly.
- Asset Hub payment reference: evidence only, never confirmation.
- Supabase: allowed only outside the native truth path.
- localStorage: allowed only as local cache/lab fallback, not shared truth.

## Mode 1: Savings Circle

### User job

Run a recurring contribution round where members know who owes, who paid, who confirmed, who is delayed, who receives the payout, and when the round can close.

### Done means

- Organizer creates a circle with members, amount, schedule, payout recipient, and missed-payment policy.
- Leo, Nina, Omar, and Mina join from separate device views.
- Leo can mark paid.
- Mina sees Leo waiting and confirms receipt.
- Nina can mark paid or be recorded as delayed.
- Omar can mark paid or record the release if he is the payer.
- Payout is prepared only after contributions are confirmed or annotated.
- Receiver confirms payout receipt.
- Round closes with a private receipt.

### Falsifier

If a contributor can close the round alone, or if payment evidence confirms without Mina/receiver confirmation, this mode is not ready.

## Mode 2: Emergency Fund

### User job

Coordinate urgent help privately, with dignity, approval, contribution tracking, release confirmation, and a redacted record.

### Done means

- Organizer creates an emergency fund with target amount, privacy level, recipient, and approval rule.
- Contributors join from invite links and see only the minimum necessary information.
- Contributors can record external payment or attach payment evidence.
- Organizer/receiver confirms received contributions.
- Required approvers approve release readiness.
- Payer records release outside ChopDot.
- Recipient confirms release.
- Closeout receipt defaults to redacted and hides sensitive reason, private names, and payment references.

### Falsifier

If a public or exported receipt leaks the emergency reason, recipient identity, contributor names, or raw payment references by default, this mode is not ready.

## Mode 3: Community Pot

### User job

Manage shared group funds, contribution records, spending requests, approvals, payment claims, receiver confirmation, and handoff to the next treasurer without pretending to be a bank or DAO.

### Done means

- Admin creates a community pot with roles: admin, contributor, approver, payer, receiver, viewer.
- Members join from invite links.
- Contributors record contributions.
- Admin creates a release/spend request.
- Required approvers approve or reject.
- Payer records payment/release outside ChopDot only after approval requirements are met.
- Receiver confirms receipt.
- Period closes with a receipt showing approved releases, unresolved items, and handoff notes.

### Falsifier

If the payer can release before required approvals, or if approval is treated as payment, this mode is not ready.

## Friend Test

Run this with real people or realistic agent sessions:

- Device A: organizer/admin
- Device B: contributor
- Device C: approver
- Device D: receiver/payer

Each person must be able to answer without explanation:

- What am I part of?
- What do I need to do next?
- Who is waiting on whom?
- What has been claimed?
- What has been confirmed?
- What is blocking closeout?
- What record will remain?

## Execution Order

1. Build native invite/session onboarding that assigns the correct person without demo switching.
2. Extend signed-event shared session from savings circle to emergency fund and community pot.
3. Add mode-specific user guidance for each role and next action.
4. Wire payment evidence as evidence-only across all three modes.
5. Wire receipt export/archive path for all three modes, with emergency redaction as default.
6. Add multi-device Playwright flows for all three modes.
7. Run an adversarial pass for wrong person, premature closeout, privacy leak, approval bypass, and payment-evidence overclaim.
8. Produce a plain-English friend-readiness report.

## Verification Target

Required before calling the iteration ready:

```bash
npx tsc --noEmit
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/simulationAgents.test.ts
npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium
npm run build
```

Add or update Playwright coverage so emergency fund and community pot have the same separate-device expectation as savings circle.

## Not Done Until

- All three modes can be used as real ChopDot modes, not just lab scenes.
- Each mode has onboarding, recording, payment evidence, confirmation, blockers, and closeout.
- Each mode works from separate person/device perspectives.
- Each mode keeps Polkadot invisible to normal users.
- Host-required adapter gaps fail visibly and do not masquerade as native readiness.
