# ChopDot Auth Provider Proof Ledger

Status: `partial`
Date: 2026-06-22
Programme: Track 1 onboarding readiness + Programme B native-boundary honesty

## Current Status

No real desktop wallet, mobile WalletConnect, or social provider completion has been recorded yet. Email password has a local provider proof run recorded below.

Guest entry, friend-pilot entry guidance, guest sign-out cleanup, wallet option visibility, missing-wallet setup guidance, and WalletConnect mobile-handoff guidance are current-pass. The provider proof run packet in `auth-provider-proof-run-packet-2026-06-21.md` is ready for real wallet/email/social runs. That does not prove real provider login.

This ledger separates three different truths:

- users can enter ChopDot as a guest today;
- users can see where wallet/email/social options will fit;
- configured provider login is not promoted until a real sign-in and sign-out loop is recorded.

## Evidence Rules

Each provider row can move to `pass-provider` only when it includes:

- route used;
- browser or device used;
- provider account or wallet type, using pseudonyms only;
- sign-in result;
- sign-out result;
- session cleanup result;
- no dead-end or loop after return to the app;
- screenshot or test evidence;
- promotion decision.

Do not mark a provider `pass-provider` if the evidence only proves button visibility, setup copy, or a mocked local route.

Use `auth-provider-proof-run-packet-2026-06-21.md` before changing any row. It defines the required sign-in result, sign-out result, session cleanup result, and no-dead-end check for each provider family.

## Provider Proof Ledger

| Provider | State | Route | Device/browser | Evidence | Sign-in result | Sign-out cleanup | Dead-end check | Promotion decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest mode | `pass-local` | `/` to `/pots` | Chromium desktop + mobile Chrome | `login-smoke.spec.ts`, `session-cleanup.test.ts`; friend-pilot guide visible on first screen | guest reaches pots; first screen tells groups to use separate devices/profiles | stale wallet and acting-person state cleared | no wallet-required dead end | promoted for guest-only onboarding; not promoted as provider proof |
| Polkadot.js browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| SubWallet browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Talisman browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Mobile WalletConnect | `blocked-config` | `/` wallet accordion | mobile wallet plus desktop/mobile browser | mobile-handoff copy verified by `login-smoke.spec.ts`; real signing loop not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Email password | `pass-provider` | `/` auth options | Chromium desktop against local Supabase auth | `email-auth-provider.spec.ts` | disposable local email account signs up, reaches authenticated Pots, signs out, then signs back in | stale wallet connector, wallet source, wallet address, capture acting-person, and global wallet address are cleared on sign-out | no wallet-required dead end; returns to authenticated Pots after sign-in | promoted for local email provider proof; not proof of Google or wallet providers |
| Google OAuth | `visible-only` | `/` auth options | desktop browser | option visibility covered by `login-smoke.spec.ts` | not recorded | not recorded | not recorded | not promoted |

## Promotion Guard

Allowed current claim:

```text
ChopDot supports a proven guest-first onboarding path, shows friend-pilot entry guidance, shows provider setup clearly, and has a ledger ready for real wallet/email/social provider proof.
```

Not allowed:

```text
Real desktop wallet login is proven.
Real mobile WalletConnect login is proven.
Google login has completed a provider cycle.
Provider auth is 9/10.
```

## Provider Proof Notes

Provider: Guest mode / visible providers control
Date: 2026-06-22
Participant pseudonym: Codex browser tester
Device/browser: Chromium desktop + mobile Chrome
Route: `/` auth options and `/pots`
Account/wallet type: guest mode plus visible wallet/email/social options
Sign-in result: pass for guest mode; wallet and Google options visible only
Sign-out result: pass for guest mode
Session cleanup result: pass through existing smoke/session cleanup coverage
Dead-end or loop observed: none in smoke run
Screenshot refs: Playwright run artifact for `login-smoke.spec.ts`
Test command: `npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1`
Pass/fail: pass for guest control only
Required product fix: real desktop wallet, mobile WalletConnect, Google OAuth, and Jeanine connected-account cycles still need complete provider proof rows before promotion
Promotion decision: no new provider promoted

Provider: Email password
Date: 2026-06-22
Participant pseudonym: Codex local email tester
Device/browser: Chromium desktop + mobile Chrome in full regression
Route: `/` auth options
Account/wallet type: disposable local Supabase email account
Sign-in result: pass in full Playwright regression
Sign-out result: pass in full Playwright regression
Session cleanup result: pass; no stale state assertion remains covered by the focused provider proof
Dead-end or loop observed: none
Screenshot refs: Playwright run artifact for `email-auth-provider.spec.ts`
Test command: `npx playwright test --workers=1`
Pass/fail: pass
Required product fix: none for local email provider loop; hosted/provider-specific evidence remains separate
Promotion decision: retain Email password as `pass-provider` for local provider proof only

Provider: Jeanine connected account
Date: 2026-06-22
Participant pseudonym: Jeanine
Device/browser: pending
Route: pending
Account/wallet type: connected account, details intentionally not recorded
Sign-in result: not recorded
Sign-out result: not recorded
Session cleanup result: not recorded
Dead-end or loop observed: not recorded
Screenshot refs: pending
Test command: human/device proof required
Pass/fail: pending
Required product fix: run the provider proof packet with Jeanine on her actual account/device
Promotion decision: not promoted

## Prior Provider Proof Notes

Provider: Email password
Date: 2026-06-21
Participant pseudonym: Codex local email tester
Device/browser: Chromium desktop
Route: `/pots` -> `Email & password` -> `Need an account? Create one` -> sign out -> email sign-in
Account/wallet type: disposable local Supabase email account
Sign-in result: pass; signup reached authenticated Pots screen and subsequent email sign-in returned to authenticated Pots screen
Sign-out result: pass; user returned to `Sign in to ChopDot`
Session cleanup result: pass; stale wallet connector, wallet source, wallet address, capture acting-person, and global wallet address were cleared
Dead-end or loop observed: none after local Supabase URL/key override
Screenshot refs: Playwright run artifact for `email-auth-provider.spec.ts`
Test command: `CHOPDOT_EMAIL_PROVIDER_PROOF=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status> npx playwright test tests/e2e/email-auth-provider.spec.ts --project=chromium --workers=1`
Pass/fail: pass
Required product fix: none for local email provider loop; hosted `.env` provider reachability remains separate environment evidence
Promotion decision: promote Email password to `pass-provider` for local provider proof only

## How To Fill A Row

Use this format in a follow-up note under the table when a provider is tested:

```text
Provider:
Date:
Participant pseudonym:
Device/browser:
Route:
Account/wallet type:
Sign-in result:
Sign-out result:
Session cleanup result:
Dead-end or loop observed:
Screenshot refs:
Test command:
Pass/fail:
Required product fix:
Promotion decision:
```
