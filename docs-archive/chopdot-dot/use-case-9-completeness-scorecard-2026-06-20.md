# ChopDot 9/10 Use-Case Completeness Scorecard

Status: `active`
Date: 2026-06-20
Goal: raise core ChopDot use cases to measurable 9/10 completeness while keeping live `.dot` blockers separate from product truth.

## 9/10 Standard

A use case reaches 9/10 only when a real person can:

1. open the right surface without special explanation,
2. understand their own next step,
3. see why other people are blocking the group,
4. take the correct action from their own device,
5. avoid unsafe shortcuts such as treating paid, approved, released, confirmed, and closed as the same thing,
6. recover from delays or open items,
7. close with a readable receipt or know why it cannot close,
8. pass focused browser tests on the real app chrome,
9. keep live Polkadot host dependencies visible as blocked gates when they are not available.

## Current Scores

| Use case | Current score | Target | Status | Evidence | Gap to 9/10 |
| --- | ---: | ---: | --- | --- | --- |
| Group expenses | 8.98 | 9 | `near-local-pass` | `chopdot-dot-native-session.spec.ts`, capture link tests, 2026-06-23 receipt/pay-moment capture browser pass, unscripted agent screenshots, friend-pilot script + run packet | Receipt-first capture, rail choice, one-action pay link, and receiver confirmation are proven locally; real friend result must pass before full 9/10 promotion |
| Savings circles | 8.97 | 9 | `near` | `chopdot-dot-native-session.spec.ts`, `commitmentKernel.test.ts`, unscripted agent screenshots, friend-pilot script + run packet | Setup, active-person priority, done-for-now states, grouped pending confirmations, treasurer queue, and in-app participant copy links are proven locally; real friend result must pass before promotion |
| Emergency pots | 8.82 | 9 | `near` | native-session tests, redacted receipt tests, unscripted agent screenshots, friend-pilot script + run packet | Privacy/setup, contributor reassurance, organizer queue boundaries, waiting-state safety copy, redaction, protect-the-person guardrails, and participant copy links are clearer; stress-case friend pilot must pass |
| Community funds | 8.74 | 9 | `improving` | native-session tests, approval tests, release handoff tests, unscripted agent screenshots, friend-pilot script + run packet | Approval/handoff setup, contributor reassurance, admin queue boundaries, waiting-state safety copy, release handoff guidance, approval/payment guardrails, and participant copy links are clearer; first-time approver friend pilot must pass |
| Capture spend/pay/confirm | 8.92 | 9 | `near-local-pass` | capture Playwright specs, QR codec tests, remote capture link handoff tests, 2026-06-23 receipt checklist + right-rail pass, friend-pilot script + run packet | Pay-moment capture and no-app links are now materially stronger; still needs friend-pilot comprehension and real receipt/OCR before full 9/10 |
| Closeout receipts/history | 8.78 | 9 | `working-local` | native-session tests, receipt trust-summary tests, receipt export tests, full Playwright regression | Receipt meaning, trust summary, redaction, and local/live archive boundary are tested across desktop/mobile; still needs friend-pilot comprehension before 9/10 |
| Auth/onboarding | 7.75 | 9 | `improving` | `login-smoke.spec.ts`, `email-auth-provider.spec.ts`, `auth-provider-proof-ledger-2026-06-20.md`, `auth-provider-proof-run-packet-2026-06-21.md` | Guest entry, local email provider proof, start/join/wallet-later decision guide, friend-pilot entry guidance, sign-out, wallet visibility, setup-needed states, and provider-proof run instructions are ready; real desktop wallet, mobile WalletConnect, and Google provider completion remain unpromoted until the proof ledger records pass-provider evidence |
| Polkadot-native adapters | 4.0 | 9 | `blocked-live` | native map validators, host preflight fail-visible tests | Product Account, Statement Store, Bulletin/archive, Asset Hub, proof, and `.dot` publish require live host availability |
| Escrow/atomicity | 4.8 product / 7.4 lab | 9 product | `lab-only` | escrow Playwright specs, contract lab | Lab controls are safer and hidden from normal UI; still needs real-user comprehension before product exposure |

## Progress This Pass

### 2026-06-23 10x Capture Pass

Implemented and tested the first local version of the 10x group-expense path:

```text
I just paid
-> receipt/check-out capture
-> rail choice
-> one-action friend pay link
-> receiver confirmation
-> group record remains separate from payment evidence
```

Evidence:

```bash
npm run type-check
npx vitest run src/services/capture/KernelBridge.test.ts src/services/capture/PaymentEvidenceAdapter.test.ts src/services/capture/SettlementAdapterRegistry.test.ts src/chapter/chapterEngine.test.ts
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --workers=1
```

Result:

```text
type-check passed
22 focused unit/domain tests passed
4 focused capture browser tests passed across desktop and mobile projects
```

Claim boundary:

```text
This is local browser evidence. It improves the score but does not replace real friend-pilot comprehension evidence or live Polkadot host proof.
```

### Human-Like Agent Pilot

Ran a stricter normal-surface agent pilot where each simulated person used the
real ChopDot UI from their own person/device context. The runner did not call
the kernel, use developer flags, reset state through test endpoints, or count
hidden happy-path assertions.

Result:

```text
42 steps
41 visible app actions clicked
1 deliberate no-action state
0 expected actions missing after waiting
0 runtime errors
4/4 core scenarios reached closed receipt state
```

Evidence:

```text
docs/chopdot-dot/humanlike-agent-pilot-2026-06-22.md
artifacts/chopdot-humanlike-agents/2026-06-22/humanlike-agent-1782161788219/humanlike-agent-results.json
```

Claim boundary:

```text
This is agent-observed normal-surface evidence. It is not promoted to real
human pass or 9/10 until the operator reviews the reactions and screenshots.
```

### Auth / Onboarding Clarity

Improved first-run onboarding so users understand that they can coordinate first and connect wallets later.

Before:

- the auth screen showed valid options but did not explain the product path;
- wallet sign-in could appear like a prerequisite for using ChopDot;
- guest sign-out return was not covered in the focused smoke test.

After:

- onboarding states `Start with the group record`;
- guest mode explicitly covers pots, payment records, receipt confirmation, and closeout;
- wallet connection is framed as optional for settlement references, archive, and proof;
- the wallet accordion shows setup-needed guidance for missing browser wallets and mobile-handoff guidance for WalletConnect;
- guest sign-out returns to the onboarding screen.

Verification:

```bash
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --workers=1
```

Result:

```text
6 passed
```

New coverage:

- onboarding promise is visible;
- guest boundary says private coordination is available without a wallet;
- guest login reaches the dashboard without wallet-required copy;
- guest can sign out and return to onboarding;
- sign-out clears stale wallet connector, wallet source, wallet address, global wallet address, and capture acting-person state;
- wallet accordion shows setup-needed status for missing browser wallets and mobile-handoff status for WalletConnect;
- Google button visibility and desktop/mobile option parity still pass.

### Friend-Pilot Onboarding Guidance

Added a first-screen guide for trying ChopDot with real friends.

Before:

- guest mode was clear, but the first screen did not tell pilot participants how to enter from separate devices;
- wallet copy correctly said optional, but real users could still think a wallet was the first step for a group test;
- friend-pilot setup lived in docs rather than the product surface.

After:

- onboarding now includes `Trying ChopDot with friends?`;
- users are told to start as guest and open the group record;
- users are told each person should use their own device or browser profile;
- wallet connection is framed as later-only for settlement or proof testing;
- provider auth remains below 9/10 until real desktop wallet, mobile WalletConnect, and Google sign-in evidence exists.

Verification:

```bash
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1
npm run type-check
```

Results:

```text
12 login smoke tests passed
type-check passed
```

Additional focused verification:

```bash
npx vitest run src/services/auth/session-cleanup.test.ts
```

Result:

```text
1 passed
```

### Auth Provider Proof Ledger

Added a provider proof ledger so onboarding cannot be promoted from `setup visible` to `provider passed` without real sign-in evidence.

Before:

- wallet, email, and Google options could be visible without a separate record of whether a provider actually completed;
- missing wallet setup guidance was useful, but could still be mistaken for real wallet-login proof;
- auth/onboarding had one score even though guest mode and provider auth are different readiness levels.

After:

- `auth-provider-proof-ledger-2026-06-20.md` separates `pass-local`, `visible-only`, `blocked-config`, `fail`, and `pass-provider`;
- guest mode is current-pass only for guest onboarding;
- Polkadot.js, SubWallet, Talisman, WalletConnect, email, and Google remain unpromoted until a real configured-provider cycle is recorded;
- `npm run validate:auth-provider-proof` fails if a provider is marked `pass-provider` with missing sign-in, sign-out, cleanup, or dead-end evidence.

Verification:

```bash
npm run validate:auth-provider-proof
```

Current claim allowed:

```text
Guest-first onboarding and local email provider auth are proven locally; real desktop wallet/mobile WalletConnect/Google provider completion is not yet proven.
```

### Auth Provider Proof Run Packet

Added the provider proof run packet so the next auth test can be run by a person
without inventing evidence after the fact.

Before:

- the provider proof ledger had the right promotion guard, but not a dedicated
  field guide for running wallet, WalletConnect, email, and Google checks;
- auth/onboarding could still drift if someone treated setup-needed copy or
  button visibility as provider proof;
- the path from `blocked-config` or `visible-only` to `pass-provider` was
  correct, but too easy to interpret loosely.

After:

- `auth-provider-proof-run-packet-2026-06-21.md` lists the six provider families
  that must be tested;
- every provider run requires sign-in result, sign-out result, session cleanup
  result, and a no-dead-end/no-loop check;
- the packet explicitly says guest mode is already `pass-local` but provider
  auth must not be marked `pass-provider` until the ledger has complete evidence;
- `npm run validate:auth-provider-proof` now checks both the ledger and the run
  packet.

Verification:

```bash
npm run validate:auth-provider-proof
```

Current claim still allowed:

```text
The provider-auth test plan is ready; local email provider auth is proven;
real desktop wallet, mobile WalletConnect, and Google completion are not yet
proven.
```

### Email Provider Proof

Promoted the Email password provider row from `visible-only` to
`pass-provider` for a local Supabase auth run.

Before:

- email was visible on the first screen, but not proven as a real provider loop;
- provider proof could not distinguish guest success from configured email auth;
- the proof ledger still said no email provider completion had been recorded.

After:

- a disposable local Supabase email account signs up and reaches authenticated
  Pots;
- the user signs out and returns to onboarding;
- stale wallet and acting-person state is cleared on sign-out;
- the same email account signs back in and returns to authenticated Pots;
- this promotes Email password only, not desktop wallet, mobile WalletConnect,
  or Google.

Verification:

```bash
CHOPDOT_EMAIL_PROVIDER_PROOF=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status> npx playwright test tests/e2e/email-auth-provider.spec.ts --project=chromium --workers=1
```

Result:

```text
1 email provider proof test passed
```

### Onboarding Decision Guide

Improved the first-run login panel so a friend can choose the right entry path
without treating wallet setup as the product.

Before:

- the guest-first boundary was correct, but it still read like a proof note;
- someone joining a friend's pot had to infer that they should use their own
  phone or browser profile;
- wallet setup was optional, but the first screen did not separate start,
  join, and proof-testing jobs clearly enough.

After:

- the first screen says `Start with the group record, not the wallet`;
- new users see `Starting a pot?`, `Joining someone else's pot?`, and
  `Testing settlement or proof?`;
- the join path says to open the link on the person's own phone or browser
  profile so actions stay separate;
- friend-pilot copy now frames the test around each person taking only their
  own action and using the receipt to see what the group agreed happened;
- provider login is still not promoted without real provider proof.

Verification:

```bash
npm run type-check
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1
```

Results:

```text
type-check passed
12 login smoke tests passed
```

### 9/10 Scorecard Gate

Added a scorecard validator so this document cannot drift into a 9/10 claim without matching evidence.

Before:

- score rows were readable but not mechanically guarded;
- someone could raise a score to 9/10 while friend-pilot, provider-auth, or live-host evidence was still missing;
- the remaining gap was documented but not enforced.

After:

- `npm run validate:use-case-9` checks every required use case is present and
  also validates the generated readiness report/open-gate summary;
- core money modes cannot score 9/10 unless their friend-pilot ledger row is `pass`;
- auth/onboarding cannot score 9/10 unless desktop wallets, mobile WalletConnect, email, and Google are all `pass-provider`;
- Polkadot-native adapters cannot score 9/10 while still `blocked-live`;
- escrow/atomicity cannot score 9/10 product readiness while still lab-only.

Verification:

```bash
npm run validate:use-case-9
```

This now runs both:

```text
node scripts/validate-use-case-9-scorecard.mjs
node scripts/validate-use-case-9-readiness-report.mjs
```

For daily tracking, use:

```bash
npm run validate:readiness
```

That command runs the use-case gate plus friend-pilot, auth-provider, coverage,
native-map, and host-native-boundary validators.

### Capture Entry Polish

Improved Spend Card, `/pay`, and `/confirm` entry surfaces so they read like native ChopDot steps instead of utility handoff pages.

Before:

- Spend Card said `Pay now`, even though the app was creating the split rather than moving money;
- `/pay` led with `Payment handoff` and a raw reference;
- `/confirm` did not clearly explain that receiver confirmation is the separate closing step;
- successful confirm could leave the browser on a consumed `/confirm?t=...` URL and show `Link unavailable`.

After:

- Spend Card now says `Record the spend` and `Create split`;
- `/pay` says `Mark your payment` and explains that the receiver still confirms receipt;
- payment handoff details say `Pay outside ChopDot`;
- group status labels `claimed` as `Marked paid, waiting confirmation`;
- `/confirm` says `Confirm money arrived` and explains only the receiver should confirm;
- successful confirm clears the consumed link URL before returning to the pot.

Verification:

```bash
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts --project=chromium --workers=1
```

Result:

```text
3 passed
```

New coverage:

- Spend Card cold-load and in-app entry show native capture guidance;
- `/pay` proves marking paid does not equal receiver confirmation;
- `/confirm` proves receiver confirmation is a separate step;
- consumed confirm links no longer leave the user on `Link unavailable` after success.

### Capture Flow Boundary Pass

Added a native progress strip across Spend Card, `/pay`, `/confirm`, and group status so first-time users can see the whole flow instead of inferring it from ledger rows.

Before:

- the spend screen, pay handoff, confirm link, and group status each had correct local copy, but the whole sequence was not visible in one place;
- `Marked paid` could still feel like the main completion event for payers;
- webhook/Firma settlement evidence was tested as claim-only, but the product copy did not make that boundary prominent enough.

After:

- capture screens now show `Record split -> Pay outside ChopDot -> Mark paid -> Confirm received`;
- the boundary copy states that `Marked paid is only a claim`;
- group status explains whether open shares need payment claims or receivers need to confirm money arrived;
- Firma/webhook copy says it can support the paid claim only; the receiver still confirms separately;
- receipt preview now states that a closed receipt records what the group confirmed or noted, not automatic payment proof.

Verification:

```bash
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-firma-webhook.spec.ts --project=chromium --workers=1
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npm run type-check
```

Results:

```text
3 capture Playwright tests passed
13 native-session Playwright tests passed
type-check passed
72 full Playwright regression tests passed, 4 skipped. The local email provider proof is opt-in and intentionally skipped in the default desktop/mobile full suite unless the local proof env is enabled.
```

### Emergency And Community Guardrail Pass

Added mode-specific guidance for the two most sensitive coordination modes.

Before:

- emergency pots had privacy setup and redacted receipt behavior, but first-time contributors still had to infer what should stay private during the flow;
- community funds had approval and handoff steps, but first-time approvers could still confuse approval readiness with money movement;
- both modes relied on the timeline and setup card without a compact “what to protect” layer.

After:

- emergency pots show `Protect the person first`;
- emergency guardrails explain what the group can show, what stays private, and that closeout defaults to a redacted receipt;
- community funds show `Keep approval separate from payment`;
- community guardrails explain that approvers approve readiness, the payer records money released outside ChopDot, and the receiver confirms what arrived before closeout;
- the new copy is tested on the native ChopDot surface, not a standalone lab page.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npm run type-check
```

Results:

```text
13 native-session Playwright tests passed
type-check passed
72 full Playwright regression tests passed, 4 skipped. The local email provider proof is opt-in and intentionally skipped in the default desktop/mobile full suite unless the local proof env is enabled.
```

### Request Payment Amount Wiring

Fixed the saved request record so it uses the same currency-aware amount as the visible request surface.

Before:

- request text could show DOT, USDC, or mixed pot breakdowns correctly;
- the in-app notification path still defaulted to a hard-coded dollar amount;
- mixed-currency requests could lose their per-pot breakdown after being sent.

After:

- DOT requests stay recorded as DOT;
- mixed requests stay recorded as a pot-by-pot breakdown instead of a fake total currency;
- custom sender notes still become the notification body;
- delivery method context is preserved without changing payment, confirmation, or closeout truth.

Verification:

```bash
npx vitest run src/utils/requestPayment.test.ts src/routing/screen-props/misc-screens.test.ts
```

Result:

```text
5 passed
```

New coverage:

- route-level request notifications cannot silently convert DOT requests into dollars;
- mixed USD/USDC requests cannot be collapsed into one invented aggregate amount;
- personal sender messages still override generated request copy.

### Receipt Review

Implemented a user-facing receipt review panel in `ChapterHome`.

Before:

- the receipt area was a small readiness preview;
- the top receipt/export icon had no visible user outcome;
- live archive/proof boundaries were not explained in the normal receipt surface.

After:

- the top icon opens the receipt review area;
- users can see confirmed counts, releases, notes, disputes, open blockers, and closeout state;
- emergency receipts show `Redacted export` and `Hidden from export`;
- sensitive fields such as participant names, sensitive reasons, payment refs, private notes, and blocker detail are called out as excluded;
- live Polkadot archive/proof remains explicitly labeled as gated until the host path is available;
- the panel reviews the kernel receipt and does not create a second source of truth.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Result:

```text
10 passed
```

New coverage:

- receipt review explains local receipt and live archive/proof boundary;
- emergency receipt review stays redacted;
- emergency review does not expose private medical details or the private pot title;
- existing timeline, future-actor guidance, and separate-device convergence still pass.

### Mode Timelines

Implemented mode-specific guided timelines in `ChapterHome`.

Before:

- users saw their immediate next action, but not the whole journey;
- group expenses, savings circles, emergency pots, and community funds relied too much on the user inferring the lifecycle.

After:

- group expenses show `How this split closes`;
- savings circles show `How this round closes`;
- emergency pots show `How this support closes`;
- community funds show `How this fund period closes`;
- each timeline uses user language for mark paid, confirm, approve, release, close, and redacted receipt;
- the timeline is read-only guidance and does not change kernel truth or adapter behavior.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Result:

```text
8 passed
```

New coverage:

- group expense timeline explains mark paid, confirm received, and close split;
- savings circle timeline explains member payments, delay notes, payout, and close round;
- emergency pot timeline explains approval, recipient confirmation, and redacted receipt;
- community fund timeline explains approvals, receiver confirmation, and handoff closeout.

### Future-Actor Guidance

Implemented a guidance improvement in `ChapterHome` for people who are not the current actor.

Before:

- future approvers, recipients, organizers, and viewers could land on "Nothing for you yet";
- this made emergency pots and community funds feel like process boards instead of a human flow.

After:

- approvers see `Approval comes later` while payments are still open;
- recipients see that they will confirm the release later;
- organizers see `Waiting on the group` plus delay guidance;
- viewers see read-only review language;
- the guidance is mode-aware and does not change kernel truth or adapter behavior.

## Verification Added

Command:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Result:

```text
4 passed
```

New coverage:

- emergency approver sees why approval is not available yet;
- emergency recipient sees why release confirmation is not available yet;
- emergency organizer sees that the group is still blocking the flow;
- community approver sees why approval comes later;
- existing separate-device convergence still passes for savings circle, emergency pot, and community fund.

### Escrow / Atomicity Safety Boundary

Tightened the escrow lab so it cannot be mistaken for a normal custody or payout feature.

Before:

- the overview card said `Held for this round`, which could sound like ChopDot was holding money;
- release evidence could look like the payout had happened;
- developer controls did not explicitly reject protected-funds or guaranteed-payout interpretations;
- the focused browser tests did not prove the escrow lab was hidden from the normal ChopDot surface.

After:

- the overview card says `Lab evidence only`;
- the UI states that ChopDot is not holding funds, protecting funds, or guaranteeing payout;
- lab evidence still leaves payment, confirmation, approval, release, and closeout blockers intact;
- release evidence says receiver confirmation is still required;
- the normal `/pots` surface has no escrow status or escrow controls unless the lab flag is present.

Verification:

```bash
npx playwright test tests/e2e/chopdot-escrow-agent-devices.spec.ts tests/e2e/chopdot-escrow-atomicity.spec.ts --project=chromium --workers=1
```

New coverage:

- held evidence does not mark paid across group expense, savings circle, emergency pot, or community fund;
- release evidence does not become receiver confirmation;
- a viewer cannot add another person's lab-held evidence;
- escrow controls stay hidden from the normal ChopDot surface.

### Native Friend-Pilot Evidence Refresh

Regenerated the unscripted agent simulation against the normal native product surface.

Before:

- the pilot report still reflected older no-action states such as `Nothing for you yet`;
- the pilot opened with developer/escrow flags, which was not valid friend-style evidence;
- setup context for savings circles, emergency pots, and community funds was missing from the normal overview.

After:

- the pilot uses the normal native product surface without developer checks or escrow controls;
- each simulated person runs in a separate browser context;
- contributors still see `Mark paid` from their own device;
- approvers and recipients now see personal waiting states such as `Approval comes later` and `You’ll confirm the release later`;
- every mode shows a setup card:
  - group expense: receiver and closeout setup;
  - savings circle: amount, treasurer, payout recipient, delay policy;
  - emergency pot: privacy, approvers, redacted receipt default;
  - community fund: contribution, approval, and handoff setup.

Artifacts:

- `docs/chopdot-dot/unscripted-agent-simulation-2026-06-20.md`
- `artifacts/chopdot-unscripted-agents/2026-06-20/unscripted-agent-results.json`
- `artifacts/chopdot-unscripted-agents/2026-06-20/*.png`

Verification:

```bash
CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5174 node scripts/run-chopdot-unscripted-agent-simulation.mjs
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

### Post-Payment Reassurance

Improved the first moment after a contributor marks paid.

Before:

- contributors saw a correct but system-like state: `You are waiting for confirmation`;
- the screen named the receiver, but did not clearly tell the contributor they were done for now.

After:

- contributors see `You’re done for now`;
- the detail still names who must confirm, for example `Mina still needs to confirm your $100 payment`;
- the detail explicitly says `Nothing else is needed from you yet`;
- this does not mutate confirmation, release, closeout, or receipt state.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5174 npm run pilot:chopdot-agents
```

New evidence:

- Leo, Nina, Omar, Casey, and Sam all see the done-for-now state after marking paid;
- organizers still see the confirmation queue;
- blockers still show that receiver confirmation remains required.

### Organizer Queue

Added an ordered organizer queue to the normal `ChapterHome` overview.

Before:

- organizers saw one primary action plus a full status board;
- the next several tasks were discoverable, but they were not presented as a worklist;
- treasurers/admins had to infer the order from blockers and the People tab.

After:

- organizers and treasurers see `Organizer queue`;
- the queue lists work in order, such as `Confirm Leo`, `Check Omar`, `Prepare payout`, `Approve release`, `Record the release`, and `Close record`;
- each confirmation row says `Confirm only if money arrived`;
- contributors, approvers, recipients, and viewers do not see the organizer queue;
- queue actions reuse existing kernel actions and do not create a second product truth path.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5174 npm run pilot:chopdot-agents
```

New evidence:

- Mina sees an ordered queue in group expense and savings circle flows;
- Riley sees an ordered queue in the emergency pot flow;
- Alex sees an ordered queue in the community fund flow;
- Leo does not see the organizer queue after marking paid from his own device.

### Waiting Guidance

Added a personal waiting guide for people who cannot act yet.

Before:

- approvers and recipients had a correct hero state, but had to read the broader blocker list to understand the reason;
- future actors could see that they were waiting, but not always what was unsafe to do early;
- emergency and community flows still felt like process boards for non-organizers.

After:

- waiting users see `Why you’re waiting`;
- approvers see that approval opens after contributions are confirmed or noted;
- recipients see that they confirm only after a release is prepared and marked released outside ChopDot;
- the guide names the blocker and says what not to do yet, such as `Do not approve before payments are handled`;
- organizers do not get this card because they already get the organizer queue.

Verification:

```bash
npm run type-check
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5174 npm run pilot:chopdot-agents
```

New evidence:

- Taylor sees why emergency approval is not available yet;
- Jordan sees why recipient confirmation is not available yet;
- Priya sees why community-fund approval is not available yet;
- Riley does not see the waiting guide because the organizer queue is the right surface for her.

### Waiting-State Safety Copy

Improved the waiting guide so future approvers and recipients can explain the next safe event and the unsafe shortcut.

Before:

- approvers and recipients saw why they were waiting;
- the guide named the blocker, but the state boundary was still a little implicit;
- a first-time approver could still confuse approval with confirmation or money movement.

After:

- approvers see `Next safe step: Organizer confirms or notes each payment first`;
- approvers see `Unsafe shortcut: Approval cannot replace confirmation`;
- recipients see that the organizer prepares and marks the release before they confirm;
- recipients see `Unsafe shortcut: Do not confirm before money arrives`;
- approved/released waiting states keep approval, release record, and receipt confirmation separate.

Verification:

```bash
npm run type-check
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "future actors"
```

Result:

```text
type-check passed
1 future-actor guidance test passed
```

### Friend-Pilot Readiness Script And Results Ledger

Added a real-person pilot script and results ledger so the remaining 9/10 gap is measurable and auditable.

Before:

- `needs real friend pilot` was correct but too vague to execute consistently;
- simulated agents proved mechanics, not whether friends could explain the flow;
- promotion to 9/10 had no reusable pass/fail contract or result ledger.

After:

- `friend-pilot-script-2026-06-20.md` defines scenarios for group expense, savings circle, emergency pot, community fund, capture/pay/confirm, onboarding, and Polkadot-native boundaries;
- `friend-pilot-results-ledger-2026-06-20.md` records whether real participants passed, failed, or have not run each scenario;
- each scenario includes participant roles, separate-device expectations, pass/fail gates, unsafe-assumption falsifiers, and evidence fields;
- the script explicitly fails custody, escrow, guaranteed-payout, token-confirmation, public-emergency-detail, and live `.dot` overclaim interpretations;
- `npm run validate:friend-pilot` guards both the script and the ledger, and refuses any `pass` row with missing participant/device/action/receipt evidence.

Verification:

```bash
npm run validate:friend-pilot
npm run validate:chopdot-coverage
```

New evidence:

- all four core money modes now have real-person pilot gates;
- capture/pay/confirm and onboarding have pilot gates;
- Polkadot-native blocked-live boundaries have a user comprehension gate;
- no score is promoted to 9/10 until real people pass the script and the ledger records complete evidence.

### Friend-Pilot Run Packet

Added a short run packet so the pilot can be executed without reading the full scorecard.

Before:

- the long script had the right scenarios and pass/fail gates, but the facilitator still had to assemble exact local links and role entry points;
- it was easy to accidentally role-switch on one browser and call that real pilot evidence;
- the validation command did not check a run-ready handoff sheet.

After:

- `friend-pilot-run-packet-2026-06-21.md` lists exact local URLs for group expense, savings circle, emergency pot, community fund, and onboarding;
- the packet repeats the separate-device/profile rule;
- the packet lists required evidence, unsafe assumptions, and ledger recording instructions;
- `npm run validate:friend-pilot` now validates the long script, run packet, and results ledger.

Verification:

```bash
npm run validate:friend-pilot
npm run validate:chopdot-coverage
```

Results:

```text
friend-pilot script OK
friend-pilot run packet OK
friend-pilot results ledger OK
coverage OK with 51 markdown files registered
```

### Friend-Pilot Session Generator

Added a session-specific pilot packet generator so the facilitator does not have
to hand-edit local URLs before running the real friend pilot.

Before:

- the run packet gave generic `friend-pilot-YYYY-MM-DD` links;
- a facilitator still had to manually replace session names and assemble a
  paste-ready ledger template;
- setup friction made it easier to delay the real friend pilot or accidentally
  reuse one browser profile.

After:

- `npm run pilot:friend-session` generates a concrete run sheet under
  `artifacts/friend-pilot/<session>/run-sheet.md`;
- the generated sheet includes per-person links for group expense, savings
  circle, emergency pot, community fund, and onboarding;
- it repeats the five pre-click questions, unsafe assumptions, evidence
  checklist, and paste-ready ledger sections;
- the sheet generated for `friend-pilot-2026-06-22` is ready to run, but the
  friend-pilot ledger remains `not_run`.

Verification:

```bash
npm run pilot:friend-session -- --session friend-pilot-2026-06-22 --base-url http://127.0.0.1:5173
```

Result:

```text
artifacts/friend-pilot/friend-pilot-2026-06-22/run-sheet.md
```

Claim boundary:

```text
The real friend-pilot setup is easier to run. No scenario is promoted until the
results ledger records real participant evidence.
```

### Agent Wallet Trial Generator

Added a disposable agent-wallet packet generator so Leo, Nina, Omar, Mina, and
the emergency/community roles can be mapped to public testnet addresses before
running wallet-backed user journeys.

Command:

```bash
npm run trial:agent-wallets -- --session agent-wallet-trial-YYYY-MM-DD --base-url http://127.0.0.1:5173
```

Optional public-testnet funding with a disposable operator key:

```bash
POLKADOT_HUB_TESTNET_PRIVATE_KEY=<funded-disposable-key> \
  npm run trial:agent-wallets -- --session agent-wallet-trial-YYYY-MM-DD --fund
```

Public-testnet PAS scenario execution:

```bash
npm run trial:agent-wallets:pas -- --session agent-wallet-trial-YYYY-MM-DD --execute
```

Generated outputs:

```text
artifacts/agent-wallet-trials/<session>/run-sheet.md
artifacts/agent-wallet-trials/<session>/profiles.public.json
artifacts/agent-wallet-trials/<session>/funding-report.json
artifacts/agent-wallet-trials/<session>/pas-scenario-report.json
artifacts/agent-wallet-trials/<session>/pas-scenario-report.md
.local-private/agent-wallet-trials/<session>/wallets.private.json
```

Claim boundary:

```text
Agent wallets make wallet-backed journeys runnable. They do not promote a
scenario until screenshots, tx hashes, receipts, and participant observations
show that real users understood the flow.
```

Current browser proof:

```bash
npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1
```

Result:

```text
5 passed
```

What this proves now:

- funded public-testnet PAS movements can be imported into the real ChopDot pot
  chrome;
- group expense, savings circle, emergency pot, and community fund records close
  from signed session events;
- the Activity tab shows `PAS evidence applied` instead of forcing users to read
  chain details;
- emergency receipt review remains redacted and does not expose the sensitive
  reason or PAS tx hash.

Corrected payment model:

```text
weak evidence -> claim
verified recipient+amount receipt evidence -> cleared payment leg
all scenario rules resolved -> closeout
```

### Current Smoke Coverage Ledger

Added a June smoke ledger that separates current evidence from stale/historical smoke coverage.

Before:

- the main smoke artifact was from March and mixed current confidence with old UI assumptions;
- request-payment, auth cleanup, native modes, and capture evidence were spread across separate tests and reports;
- import, contribution, and withdraw flows could be mistaken as current even though their evidence was historical.

After:

- `SMOKE_15_FLOWS_REPORT_2026-06-20.md` lists 15 current-pass flows;
- auth, guest entry, logout cleanup, request-payment, group expense, savings circle, emergency pot, community fund, receipt review, Spend Cards, pay/confirm links, wallet pass, and webhook-lite are covered by current commands;
- valid and invalid import links, savings contribution records, and savings withdrawal records now have current browser-route evidence;
- real provider wallet login, mobile WalletConnect, friend-pilot comprehension, and live `.dot` remain explicitly outside the current 9/10 claim.

Verification:

```bash
npx vitest run src/utils/requestPayment.test.ts src/routing/screen-props/misc-screens.test.ts src/services/auth/session-cleanup.test.ts
npx vitest run src/components/screens/SavingsRecordScreens.test.tsx
npx playwright test tests/e2e/import-pot-smoke.spec.ts tests/e2e/savings-record-routes.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --workers=1
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts tests/e2e/capture-firma-webhook.spec.ts --project=chromium --workers=1
npm run type-check
npm run validate:chopdot-coverage
npm run build
```

Results:

```text
6 unit/regression tests passed
3 savings record copy tests passed
3 import/savings browser-route tests passed
6 login smoke tests passed
13 native-session tests passed
4 capture tests passed
type-check passed
coverage registry passed with 50 registered markdown files
build passed
```

### Grouped Pending Confirmations

Fixed a first-time savings-circle comprehension gap from the agent observations.

Before:

- if multiple contributors marked paid before the treasurer acted, the group-state headline could still read like one pending receipt confirmation;
- first-time users had to infer that Mina had multiple confirmation jobs from the detailed rows;
- this made the global blocker true but less useful.

After:

- the group-state panel summarizes multiple waiting claims as `Mina needs to confirm 2 payments`;
- the detail names the people and total marked paid;
- the organizer queue remains per-person, with separate `Confirm Leo` and `Confirm Nina` actions;
- the primary action still confirms one receipt at a time and does not merge payment truth.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "grouped pending confirmations"
```

Result:

```text
1 passed
```

### Active Person Priority

Fixed another first-time savings-circle comprehension gap from the People tab.

Before:

- the People tab listed seeded participants in default order;
- a contributor could open their own view but still have to scan for their own row;
- the active person's payment row was already prioritized, but the participant card did not reinforce whose device/view this was.

After:

- the active participant appears first in People;
- the active participant card shows `You`;
- the active person's payment detail row remains first and keeps its normal action;
- this is view ordering only and does not change permissions, claims, confirmations, closeout, or signed-event truth.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "active person"
```

Result:

```text
1 passed
```

### Organizer Queue State Boundaries

Improved the organizer queue so the worklist explains why each state transition is separate.

Before:

- organizer rows showed the right next action, but friend-pilot comprehension still depended on the organizer understanding the state model;
- `Confirm`, `Record delay`, `Prepare payout`, `Approve`, `Mark released`, and `Close` could read like a sequence of buttons rather than separate product truths;
- the queue made action order clear, but did not always explain why unsafe shortcuts were blocked.

After:

- confirmation rows say why a claim is not a receipt confirmation;
- delay rows say a note keeps the record honest without pretending payment happened;
- release rows say outside transfer evidence still needs recipient confirmation;
- closeout rows say closing only follows handled or annotated items;
- the queue still calls the same kernel actions and does not merge claim, confirmation, release, or closeout.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Result:

```text
12 passed
```

### Settlement Status Clarity

Added a visible tracked-settlement status card so wallet/network/proof states are understandable without console output or chain explorers.

Before:

- tracked settlement had a progress list, but the top status language was not consistent across pending, in-flight, recorded, confirmed, and failed states;
- failed or cancelled wallet attempts were mostly toast-only;
- payment evidence could still feel too close to final confirmation in the screen language.

After:

- tracked settlement shows a status card with `Pending`, `In progress`, `Waiting for confirmation`, `Confirmed`, or `Needs attention`;
- cancelled or failed attempts remain visible on the page after the toast;
- payment evidence is labeled as waiting for confirmation until the tracked confirmation is complete;
- normal cash/bank collection remains simple and unchanged.

Verification:

```bash
npx vitest run src/components/screens/SettleHome.test.ts src/hooks/__tests__/useSettlementTx.test.ts
```

Result:

```text
8 passed
```

### Legacy Savings Record Routes

Reframed the older savings add/withdraw surfaces so they do not imply ChopDot holds, invests, deposits, withdraws, or guarantees money movement.

Before:

- add contribution said `Add Funds`, `Direct on-chain deposit`, and yield/APY copy;
- withdraw said `Withdraw Funds`, protocol/yield copy, network-fee copy, and wording that implied funds would be withdrawn by ChopDot;
- the `/pots` savings card still advertised APY and pooled funds before the user opened the pot;
- route wiring passed zero balances into both screens, making the guard and totals misleading.

After:

- the `/pots` savings card says `Record only`, `Recorded total`, and `Money movement: Outside app`;
- the savings tab says `Recorded total`, `Record contribution`, `Record withdrawal`, and `No custody`;
- add contribution says `Record Contribution`, `Amount to record`, and `External wallet transfer`;
- withdrawal says `Record Withdrawal`, `After external transfer`, and `Record only`;
- both screens say money moved outside ChopDot and the app is recording evidence/history;
- route wiring passes the pot's recorded pooled amount into the screens instead of `0`.

Verification:

```bash
npx vitest run src/components/screens/SavingsRecordScreens.test.tsx
npx playwright test tests/e2e/savings-record-routes.spec.ts --project=chromium --workers=1
```

Result:

```text
3 unit tests passed
1 browser-route test passed
```

### Import Route Recovery And Valid Add

Fixed and covered the `cid` import route so bad/stale import links fail visibly and valid import links add durable pots to the normal list.

Before:

- `ImportPot` supported an `initialCid`, but the router did not pass the URL `cid` into the screen;
- opening `/pots?cid=...` could land on the import screen without attempting the import;
- users with a bad link would see a blank import form instead of a clear failed-import state.
- a valid import could open the imported pot detail screen, then be overwritten by an older local startup save before it reached the durable pot list.

After:

- the router passes `cid` into `ImportPot`;
- the screen auto-attempts the import;
- a missing IPFS object shows `Failed to import pot: Pot not found on IPFS` inline and via toast;
- a valid IPFS fixture previews the pot, adds it to `My Pots`, and survives return to `/pots`;
- the import action recommits after the stale startup save window so the older local list cannot erase a newly imported pot.

Verification:

```bash
npx playwright test tests/e2e/import-pot-smoke.spec.ts --project=chromium --workers=1
```

Result:

```text
2 passed
```

### 2026-06-21 Verification Refresh

Re-ran the current verification stack after the auth-provider run packet and host-native boundary gate were added.

Result:

- `npm run type-check` passed;
- `npm run validate:use-case-9` passed;
- `npm run validate:friend-pilot` passed;
- `npm run validate:auth-provider-proof` passed;
- `npm run validate:chopdot-native-map` passed, including the host-native boundary gate;
- `npm run validate:chopdot-coverage` passed with 52 registered markdown files;
- native-session Playwright passed 13 tests, including participant-specific copy links;
- focused capture Playwright passed 4 tests;
- full Playwright passed 72 tests and skipped 2;
- `npm run build` passed with existing Rollup eval/chunk-size warnings.

What changed in confidence:

- local product behavior is current-green across desktop and mobile browser coverage;
- native-critical imports are guarded against silent Supabase/EVM/PVM truth drift;
- friend-pilot and auth-provider promotion remain blocked by their proof ledgers, not by missing run instructions.

What did not change:

- no real friend pilot result is recorded;
- no real desktop wallet, mobile WalletConnect, or Google provider cycle is recorded;
- live `.dot` and host-native gates remain externally blocked.

### Community Fund Release Handoff

Added a release handoff card to the native Chapter overview so community fund users can track the final money-out sequence without collapsing the steps.

Before:

- community fund approval/payment separation was correct, but the final handoff still required users to connect the release panel, waiting guide, and receipt preview;
- the interface could name a release requester even when the payer role was the person expected to record the outside release;
- first-time users could still treat approval or a release record as if it were enough to close.

After:

- the overview shows `Release handoff` once a release is planned or created;
- the card states that approval is readiness, not payment;
- after approval, the card says the payer records money released outside ChopDot;
- before recipient confirmation, the card says the receiver confirms what arrived;
- closeout stays blocked until confirmation or notes.

Verification:

```bash
npm run type-check
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "community-pot period"
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npm run build
```

Results:

```text
type-check passed
focused community native-session test passed
13 native-session tests passed
build passed
```

### Capture Action Queue

Added a compact action queue to the capture status panel so payers, receivers, and organizers can see who acts next after a split is created.

Before:

- the capture flow guide correctly showed record, pay, mark paid, and confirm received;
- the status panel showed open and claimed legs, but first-time users still had to infer the next actor from each row;
- after a payer marked paid, the payer could still need reassurance that their part was done and the receiver was next.

After:

- `capture-action-queue` shows `What happens next`;
- open shares show who still needs to mark paid;
- claimed shares show that the receiver confirms next;
- the payer sees that their paid claim is recorded but still needs receiver confirmation;
- the receiver sees `Your turn: confirm received` and `Confirm only if [payer]'s money arrived`;
- the queue repeats the product law: `Mark paid is a claim. Confirm received is the proof that money arrived.`

Verification:

```bash
npm run type-check
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts tests/e2e/capture-firma-webhook.spec.ts --project=chromium --workers=1
npm run build
```

Results:

```text
type-check passed
2 focused capture action-queue tests passed
4 focused capture tests passed
build passed
```

### Shared Capture Link Handoff

Fixed the capture route handoff so a friend opening a shared `/pay`, `/spend`,
or `/confirm` link after onboarding can resolve through the remote-capable token
service instead of being treated as a same-browser local token only.

Before:

- the initial route parser could only resolve tokens already present in local
  browser storage;
- a friend opening a valid shared link from another device could be pushed
  toward an invalid-link state before the async shared-token lookup had a chance
  to run;
- this contradicted the first-run promise that a person can open a friend's
  link on their own phone or browser profile.

After:

- the auth-time capture link flow parses the route and asks the remote-capable
  `CaptureLinkService` for the token first;
- URL sync no longer converts a remote-only capture token into a local
  invalid-link screen before that lookup runs;
- the resolved token still maps to the normal Spend Card, Pay, or Confirm
  screen, with the same claim-vs-confirmation boundaries;
- invalid links still fail visibly after auth.

Verification:

```bash
npx vitest run src/hooks/useCaptureLinkFlow.test.tsx
npm run type-check
npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1
```

Results:

```text
2 capture link handoff unit tests passed
type-check passed
1 capture pay/confirm browser test passed
```

### Receipt Trust Summary

Added a scan-friendly trust summary to the receipt review so people can understand what the record proves later.

Before:

- the receipt review showed counts, redaction, open blockers, and local/live archive status;
- the meaning text correctly said the receipt was not a bank statement or automatic payment proof;
- first-time users still had to assemble the audit meaning from several sections.

After:

- `receipt-trust-summary` states what was confirmed;
- it states how many exception notes are included;
- it says the receipt does not prove bank settlement, custody, or automatic payout;
- redacted receipts say names, payment refs, and sensitive details are hidden;
- emergency receipt tests still prove private names and sensitive details do not leak.

Verification:

```bash
npm run type-check
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "receipt review"
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npm run build
```

Results:

```text
type-check passed
2 focused receipt tests passed
13 native-session tests passed
build passed
```

### Participant Link Handoff

Moved friend-pilot entry links closer to the product surface so a facilitator
does not have to rely only on the run packet during a live pilot.

Before:

- the friend-pilot run packet listed exact local URLs, but the app did not help
  a facilitator share person-specific links;
- the chapter Share icon was visible but did not copy a usable chapter link;
- a participant opening the wrong link had fewer in-product cues for correcting
  identity before taking action.

After:

- the normal People tab in native-session mode tells the facilitator to use one
  device or browser profile per person;
- each participant row has a `Copy link` action that keeps the same session and
  switches only the person;
- the top Share action copies the current participant's chapter link;
- generated links strip developer-only query flags so pilot links do not expose
  lab controls.

Verification:

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Results:

```text
13 native-session tests passed
```

### Capture Friend-Pilot Run Sheet

Made Capture / Pay / Confirm a first-class friend-pilot scenario instead of a
side note.

Before:

- the results ledger had a Capture / Pay / Confirm row;
- the long pilot script had a capture scenario;
- the generated session run sheet only listed group expense, savings circle,
  emergency pot, community fund, and onboarding;
- checkout capture could still be skipped during the real friend pilot even
  though it is the current product wedge.

After:

- `npm run pilot:friend-session` generates Capture / Pay / Confirm links and a
  ledger template section;
- the run packet requires the scenario and says to use app-generated `/spend`,
  `/pay`, and `/confirm` links rather than handwritten tokens;
- participants must explain that checkout evidence can support a payment claim
  but does not automatically mean receiver confirmation;
- the score remains below 9/10 until the results ledger records real
  participant evidence.

Verification:

```bash
npm run validate:friend-pilot
npm run pilot:friend-session -- --session friend-pilot-2026-06-22-over-line --base-url http://127.0.0.1:5173
npm run validate:use-case-9
```

Results:

```text
friend-pilot script OK
friend-pilot run packet OK
friend-pilot results ledger OK
generated run sheet includes Capture / Pay / Confirm
use-case 9/10 scorecard OK
```

### Focused Browser Verification Refresh

Re-ran the locally controllable browser suites that matter most for the current
friend-pilot finish line.

Scope:

- checkout capture through Spend Card;
- generated pay/confirm link handoff;
- group expense, savings circle, emergency pot, and community fund native-session
  flows;
- receipt explanation, emergency redaction, pending confirmations, participant
  links, and separate-device convergence.

Verification:

```bash
npx playwright test tests/e2e/capture-spend-loop.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
```

Results:

```text
1 capture spend loop test passed
1 capture pay/confirm link test passed
13 native-session tests passed
```

Interpretation:

- local product behavior remains green for the checkout capture wedge and the
  four core group-money modes;
- real friend-pilot evidence is still required before any row can move to 9/10;
- live `.dot` and host-native gates remain separate and must not be counted as
  complete from these local tests.

### Auth / Onboarding Verification Refresh

Reran the weakest current product lane after the friend-pilot and capture
refreshes.

Before:

- email provider proof was documented, but needed a current rerun;
- a first attempt against the already-running dev server failed with `Failed to
  fetch`, which showed the proof was using stale provider configuration;
- onboarding still needed a sharper split between current local proof and
  unproven provider families.

After:

- reran the email sign-up, sign-out, stale-session cleanup, and sign-in cycle
  against local Supabase with explicit local provider env;
- confirmed the test passes when the app is started with the correct local proof
  configuration;
- kept desktop wallet, mobile WalletConnect, and social provider completion
  unpromoted until their proof-ledger rows have real pass-provider evidence.

Verification:

```bash
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1
npm run validate:auth-provider-proof
CHOPDOT_EMAIL_PROVIDER_PROOF=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<local publishable key> npx playwright test tests/e2e/email-auth-provider.spec.ts --project=chromium --workers=1
```

Results:

```text
12 login-smoke tests passed
auth provider proof ledger passed
auth provider proof run packet passed
1 email-provider proof test passed
```

Interpretation:

- guest-first onboarding and local email auth are current-pass;
- provider setup/config drift is a real failure mode and must stay visible;
- auth/onboarding is stronger, but not 9/10 until desktop wallet, mobile
  WalletConnect, and social provider cycles pass from real configured-provider
  runs.

### Friend-Pilot Evidence Strictness Refresh

Tightened the real-user promotion gate so a pilot pass cannot be recorded from
vague facilitator notes.

Before:

- the run packet and ledger required first interpretation and action evidence,
  but a row could still be filled with shallow notes that did not prove whether
  the user needed coaching;
- the evidence template did not separately require a plain-language money-model
  check;
- receipt evidence focused on screenshots more than whether the participant knew
  what record they would trust or where they would return.

After:

- every pilot row now records `Coaching needed: none/minor/blocking`;
- a scenario cannot be promoted if the participant needed minor or blocking
  coaching;
- every result must include a money-model check covering claim/payment evidence,
  confirmation, approval, release, and closeout boundaries;
- every result must include a receipt or return-state comprehension check;
- generated friend-pilot run sheets now include the same stricter fields.
- the friend-pilot validator now has a negative self-test fixture proving that a
  coached scenario cannot be marked `pass`.

Verification:

```bash
npm run pilot:friend-session -- --session friend-pilot-2026-06-22-evidence-strict --base-url http://127.0.0.1:5173
npm run validate:friend-pilot
npm run validate:friend-pilot:selftest
npm run validate:use-case-9
```

Results:

```text
friend-pilot session generated
friend-pilot script OK
friend-pilot run packet OK
friend-pilot results ledger OK
friend-pilot results selftest OK
use-case 9/10 scorecard OK
```

Interpretation:

- the next real pilot has less facilitator discretion and a clearer pass/fail
  bar;
- no mode is promoted from this change because no real participant has run the
  stricter script yet;
- this is progress toward 9/10 because it makes the missing evidence sharper and
  prevents us from treating simulated or coached success as product readiness.

### Goal-Gate Verification Refresh

Reran the broad local gates and focused product browser coverage after the
friend-pilot evidence strictness update.

Before:

- the stricter pilot gate had passed its own validators, but the broader
  product/build/native checks needed a current rerun;
- the scorecard needed one current checkpoint that covered build health,
  registry coverage, native-boundary honesty, onboarding smoke, capture, and
  mode-specific native-session flows together.

After:

- production build passed;
- ChopDot.dot coverage registry passed with 59 registered markdown files;
- Polkadot-native map and host-native boundary validators passed;
- friend-pilot positive and negative validators passed;
- login/onboarding smoke passed on desktop and mobile;
- capture spend and pay/confirm link flows passed;
- no-Supabase native-session browser coverage passed for group expense, savings
  circle, emergency pot, community fund, receipt/redaction, participant links,
  and separate-device convergence.
- full Playwright regression passed across desktop and mobile coverage, including
  PAS evidence import, capture/webhook/wallet-pass flows, native pot modes,
  host-required fail-visible checks, escrow-lab boundaries, email auth proof,
  import links, guest settlement views, onboarding, and savings record routes.

Verification:

```bash
npm run build
npm run validate:chopdot-coverage
npm run validate:chopdot-native-map
npm run validate:friend-pilot
npm run validate:friend-pilot:selftest
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test --workers=1
```

Results:

```text
production build passed
coverage registry passed
native map and host-native boundary passed
friend-pilot validators passed
friend-pilot coached-pass selftest passed
12 login-smoke tests passed
2 capture browser tests passed
13 native-session browser tests passed
82 full Playwright regression tests passed, 4 skipped
```

Interpretation:

- current local mechanics for the core modes are green;
- current local proof guards keep live `.dot`, host-native, provider-auth, and
  real friend-pilot promotion boundaries visible;
- this still does not prove 9/10 because real friend-pilot results, real
  desktop wallet/mobile WalletConnect/social provider cycles, and live
  host-dependent Polkadot gates remain unproven.

### Unit And Static Gate Refresh

Reran unit/domain tests and restored the lint gate after it exposed local tooling
drift.

Before:

- unit/domain tests had not been included in the latest goal-gate checkpoint;
- `npm run lint` crashed before linting app code because ESLint walked an
  archived private clone under `.local-private`;
- after generated/private paths were excluded, lint exposed one malformed
  `.mjs` script containing TypeScript-only syntax.

After:

- unit/domain tests passed across the chapter engine, commitment kernel,
  Polkadot session, capture adapters, payment evidence, receipt packets,
  closeout recovery, data repositories, savings record screens, and auth/session
  cleanup;
- ESLint now ignores private/generated/archive outputs instead of crashing on
  stale files;
- `scripts/sync-bot-chapter-to-pot.mjs` parses as JavaScript while preserving
  the same bot chapter-to-pot sync behavior;
- build and the 9/10 evidence validators still pass after the lint fix.

Verification:

```bash
npm test
npm run lint
node --check scripts/sync-bot-chapter-to-pot.mjs
npm run build
npm run validate:use-case-9
npm run validate:friend-pilot
npm run validate:friend-pilot:selftest
npm run validate:chopdot-native-map
npm run validate:chopdot-coverage
```

Results:

```text
421 unit/domain tests passed
lint passed
sync-bot-chapter-to-pot syntax check passed
production build passed
use-case 9/10 validator passed
friend-pilot validators passed
native map and host-native boundary passed
coverage registry passed
```

Interpretation:

- the product and domain test baseline is current;
- static/tooling health no longer blocks local readiness verification;
- this still does not promote real-user, real-provider, or live-host gates.

### Dot-Host And Host-Sim Refresh

Reran the locally controllable Programme A/B host checks after the app, unit,
lint, and browser regression gates were green.

Before:

- the static `.dot` bundle path was already known, but the latest 9/10 checkpoint
  had not refreshed dot-host build, host-sim, deploy preflight, and native
  boundary checks together;
- it was still easy to confuse local host-sim proof with live Polkadot host
  proof if the evidence was not recorded next to the product scorecard.

After:

- `dist-dot-host` built successfully with the dot-host profile;
- deploy preparation removed dev artifacts and rewrote `dot-lab.html` to
  `index.html`;
- host-sim embedded the dot-host savings-circle bundle in the simulated host
  iframe;
- native map, host-native boundary, and coverage registry validators passed;
- static deploy preflight passed local bundle/toolchain checks and stopped at
  the expected signer-session setup gate.

Verification:

```bash
npm run build:dot-host
npm run e2e:host-sim
npm run validate:chopdot-native-map
npm run validate:host-native-boundary
npm run validate:chopdot-coverage
node scripts/preflight-dot-host-deploy.mjs
```

Results:

```text
dot-host build passed
host-sim smoke passed
native map and host-native boundary passed
coverage registry passed
deploy preflight passed local checks
deploy signer session remains setup_required
```

Artifact:

```text
artifacts/polkadot-native/dot-deploy-preflight-2026-06-22.json
```

Interpretation:

- local static `.dot` readiness is current;
- host-sim proof is current;
- live publish is not complete because `polkadot-app-deploy login` / signer
  session is still required;
- host-native Product Account, Statement Store, Bulletin, Asset Hub, and proof
  gates remain unpromoted until real host proof passes.

### Auth Provider Promotion Guard Refresh

Tightened the auth proof gate so wallet/social providers cannot be promoted from
visible buttons, setup copy, or mocked local routes.

Before:

- the auth provider ledger separated guest, email, wallet, WalletConnect, and
  social provider states;
- it rejected obvious missing evidence, but did not have a negative self-test
  proving that a visible-only provider row fails if marked `pass-provider`;
- auth/onboarding could still drift if a future edit treated setup guidance as
  provider completion.

After:

- `pass-provider` rows now reject visibility/setup/mock evidence;
- `pass-provider` rows must show a completed sign-in cycle, sign-out cleanup,
  and no dead-end/loop return path;
- an invalid fixture marks Google OAuth as `pass-provider` using button
  visibility only, and the self-test proves the validator rejects it.

Verification:

```bash
npm run validate:auth-provider-proof
npm run validate:auth-provider-proof:selftest
npm run validate:use-case-9
```

Results:

```text
auth provider proof ledger passed
auth provider proof run packet passed
auth provider proof selftest passed
use-case 9/10 validator passed
```

Interpretation:

- guest-first onboarding and local email provider proof remain current-pass;
- wallet extensions, mobile WalletConnect, and Google OAuth remain unpromoted;
- auth/onboarding still cannot reach 9/10 until real configured-provider cycles
  pass and are recorded in the ledger.

### Consolidated Readiness Report

Added a generated readiness report so the current 9/10 state can be read from one
artifact instead of reconstructing it from the scorecard, friend-pilot ledger,
auth-provider ledger, and `.dot` deploy preflight.

Before:

- local green checks, friend-pilot gaps, provider gaps, and dot-host setup gates
  were spread across multiple files;
- it was possible to know the truth, but slow to audit in one glance;
- the remaining gates were easy to talk around because there was no single
  `completionAllowed` value.

After:

- `npm run report:use-case-9` generates JSON and Markdown reports under
  `artifacts/use-case-9-readiness/`;
- `npm run validate:use-case-9-report` regenerates and validates that the report's
  completion/open-gate claim matches the source ledgers;
- the report summarizes use-case scores, friend-pilot statuses, auth-provider
  states, dot-host preflight status, and open gates;
- the current report says `not_9_10_yet` and `completionAllowed: false`.

Verification:

```bash
npm run report:use-case-9
npm run validate:use-case-9-report
npm run validate:use-case-9
npm run validate:friend-pilot
npm run validate:auth-provider-proof
npm run validate:auth-provider-proof:selftest
node --check scripts/generate-use-case-9-readiness-report.mjs
```

Results:

```text
readiness report generated
readiness report validator passed
status: not_9_10_yet
open gates: 5
use-case 9/10 validator passed
friend-pilot validators passed
auth provider proof validators passed
auth provider proof selftest passed
report generator syntax check passed
```

Generated artifacts:

```text
artifacts/use-case-9-readiness/current-use-case-9-readiness-report.json
artifacts/use-case-9-readiness/current-use-case-9-readiness-report.md
```

Interpretation:

- the current state is easier to audit;
- no use case is promoted by the generated report;
- the remaining 9/10 gates are still real friend-pilot evidence,
  real-provider evidence, and live `.dot`/host-dependent proof.

### 90% Remaining-Gap Execution Pass

Ran the mixed human+agent execution pass from the master-plan gap list.

What changed:

- generated `friend-pilot-2026-06-22-mixed` run packet for Dev/Jeanine plus
  agent roles;
- reran the agent pilot against a live local product surface on `127.0.0.1:5173`;
- recorded the result as agent-supported evidence only, not human promotion;
- refreshed auth/provider evidence without promoting Jeanine, wallet, mobile
  WalletConnect, or Google before real sign-in/sign-out proof;
- reran dot-host preflight and host-sim proof;
- added dependency-risk triage so CI warnings do not become hidden production
  claims.

Verification:

```bash
npm run validate:readiness
npm run ci:fast
npm run pilot:friend-session -- --session friend-pilot-2026-06-22-mixed --base-url http://127.0.0.1:5173
CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5173 npm run pilot:chopdot-agents
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1
npm run e2e:host-sim
npm run preflight:dot-host:paseo
npx playwright test --workers=1
```

Results:

```text
readiness validators passed
ci:fast passed with npm audit warning
421 unit/domain tests passed
agent pilot: 13 routes loaded, 9 obvious primary actions clicked, 0 runtime errors
native-session: 13 passed
agent-wallet PAS browser import: 5 passed
capture focused browser suite: 3 passed
login smoke: 12 passed
host-sim: 1 passed
dot-host preflight: local checks pass, signer session setup_required
full Playwright: 82 passed, 4 skipped
```

Interpretation:

- this closes a large part of the locally controllable evidence gap;
- it does not promote use cases to 9/10 because Dev/Jeanine human evidence is
  still pending;
- it does not promote live `.dot` or host-native readiness because signer and
  real host gates remain open;
- it does not promote production security clearance because dependency audit
  advisories remain active.

## Remaining 9/10 Work

1. Improve onboarding/auth confidence:
   - prove real provider login cycles for desktop wallet, mobile WalletConnect, and social auth;
   - keep local email auth current after provider/env changes;
   - avoid making wallet connection a prerequisite for basic coordination.
2. Run real friend-pilot comprehension:
   - use `friend-pilot-script-2026-06-20.md`;
   - record outcomes in `friend-pilot-results-ledger-2026-06-20.md`;
   - group expense and savings circle first;
   - emergency/community only after users can explain waiting, approval, release, and receipt states back correctly.
3. Keep escrow and atomicity lab-only:
   - run an unscripted friend-pilot comprehension test before exposing it;
   - keep lab evidence separate from paid, confirmed, released, and closed.
4. Keep verification current after the next product/UI change:
   - rerun `npm run type-check`;
   - rerun `npm run validate:use-case-9`;
   - rerun focused native-session coverage;
   - rerun focused capture coverage;
   - rerun `npm run build`;
   - rerun full Playwright when the next UI pass changes the app chrome or money flow.

## Claim Boundary

Allowed:

```text
ChopDot is moving toward 9/10 local/friend-pilot completeness for the core coordination flows, with separate-device native-session proof and blocked live Polkadot host gates kept visible.
```

Not allowed:

```text
ChopDot is fully live-native.
ChopDot holds funds.
Escrow is production-ready.
Asset Hub evidence confirms payment by itself.
Bulletin/archive/proof is live until the host gates pass.
```
