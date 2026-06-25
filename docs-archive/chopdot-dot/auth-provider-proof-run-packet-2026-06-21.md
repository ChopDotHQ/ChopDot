# ChopDot Auth Provider Proof Run Packet

Status: `ready-to-run`
Date: 2026-06-21
Programme: Track 1 onboarding readiness + Programme B native-boundary honesty

## Purpose

This is the short run sheet for proving real wallet, email, and social login
paths. It exists because guest mode is already pass-local, local email now has
a provider proof run, and visible provider buttons are not the same as real
provider proof.

Guest mode is already pass-local.

The goal is to prove that a real person can enter ChopDot, leave cleanly, and
avoid a dead end when using a configured provider. Do not mark pass-provider
from setup copy, mocked routes, or button visibility.

## Required Evidence

Each provider run must record:

- provider name;
- participant pseudonym only;
- route used;
- device or browser profile;
- account or wallet type, without private keys, seed phrases, email addresses,
  phone numbers, or full wallet addresses;
- sign-in result;
- sign-out result;
- session cleanup result;
- no dead-end or loop after returning to ChopDot;
- screenshot refs or focused test refs;
- pass/fail decision;
- promotion decision.

Do not record seed phrases, private keys, full emails, full phone numbers, or
direct payment identifiers.

## Provider Runs

Use a fresh browser profile or device for each provider family. Guest mode is
already pass-local and should be used only as the control run.

| Provider | Route | Device/browser | Required proof before promotion | Current promotion rule |
| --- | --- | --- | --- | --- |
| Polkadot.js browser extension | `/` wallet accordion | desktop browser with installed extension | real account selection, sign-in result, sign-out result, session cleanup result, no dead-end or loop | Do not mark pass-provider until `auth-provider-proof-ledger-2026-06-20.md` has a complete row |
| SubWallet browser extension | `/` wallet accordion | desktop browser with installed extension | real account selection, sign-in result, sign-out result, session cleanup result, no dead-end or loop | Do not mark pass-provider until `auth-provider-proof-ledger-2026-06-20.md` has a complete row |
| Talisman browser extension | `/` wallet accordion | desktop browser with installed extension | real account selection, sign-in result, sign-out result, session cleanup result, no dead-end or loop | Do not mark pass-provider until `auth-provider-proof-ledger-2026-06-20.md` has a complete row |
| Mobile WalletConnect | `/` wallet accordion | mobile wallet plus desktop or mobile browser | QR/deep-link return, sign-in result, sign-out result, session cleanup result, no dead-end or loop | Do not mark pass-provider until `auth-provider-proof-ledger-2026-06-20.md` has a complete row |
| Email password | `/` auth options | desktop and mobile browser | sign-in result, sign-out result, session cleanup result, no dead-end or loop, no stale user state | Desktop local Supabase run is `pass-provider`; mobile remains optional follow-up evidence |
| Google OAuth | `/` auth options | desktop and mobile browser | OAuth return, sign-in result, sign-out result, session cleanup result, no dead-end or loop, no stale user state | Do not mark pass-provider until `auth-provider-proof-ledger-2026-06-20.md` has a complete row |

## Fail Conditions

Fail the provider run if any of these happen:

- the user cannot tell whether they are signed in;
- sign-out leaves the previous wallet, account, or acting-person state behind;
- the user returns from a provider into a blank page, loop, or wrong route;
- wallet setup guidance is counted as a successful login;
- a provider account can bypass ChopDot's claim, confirmation, approval,
  release, or closeout rules;
- the result depends on Supabase for the native truth path without being labeled
  Track 1 hybrid;
- a screenshot or note exposes sensitive account, email, phone, seed, key, or
  payment details.

## Recording Results

Record results in:

```text
docs/chopdot-dot/auth-provider-proof-ledger-2026-06-20.md
```

Use this format under the ledger table:

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

Do not change a provider to `pass-provider` until every field is complete.

## Fast Verification Before Promotion

Run:

```bash
npm run validate:auth-provider-proof
npm run validate:use-case-9
```

Expected result before any provider is promoted:

```text
auth provider proof ledger OK
auth provider proof run packet OK
use-case 9/10 scorecard OK
```

Expected product claim before real provider evidence:

```text
Guest-first onboarding and local email provider auth are proven locally; real
desktop wallet/mobile WalletConnect/Google provider completion is not yet
proven.
```
