# Invalid Auth Provider Fixture

## Current Status

No real desktop wallet, mobile WalletConnect, or social provider completion has been recorded yet.

## Evidence Rules

This fixture intentionally marks a visible-only provider as `pass-provider`.

## Provider Proof Ledger

| Provider | State | Route | Device/browser | Evidence | Sign-in result | Sign-out cleanup | Dead-end check | Promotion decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest mode | `pass-local` | `/` to `/pots` | Chromium desktop + mobile Chrome | `login-smoke.spec.ts` | guest reaches pots | stale wallet state cleared | no wallet-required dead end | promoted for guest-only onboarding; not promoted as provider proof |
| Polkadot.js browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| SubWallet browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Talisman browser extension | `blocked-config` | `/` wallet accordion | desktop browser with extension | setup-needed copy verified by `login-smoke.spec.ts`; real extension not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Mobile WalletConnect | `blocked-config` | `/` wallet accordion | mobile wallet plus browser | mobile-handoff copy verified by `login-smoke.spec.ts`; real signing loop not recorded | not recorded | not recorded | not recorded | blocked; not promoted |
| Email password | `pass-provider` | `/` auth options | Chromium desktop against local Supabase auth | `email-auth-provider.spec.ts` | disposable local email account signs up, reaches authenticated Pots, signs out, then signs back in | stale wallet connector, wallet source, wallet address, capture acting-person, and global wallet address are cleared on sign-out | no wallet-required dead end; returns to authenticated Pots after sign-in | promoted for local email provider proof; not proof of Google or wallet providers |
| Google OAuth | `pass-provider` | `/` auth options | desktop browser | option visibility covered by `login-smoke.spec.ts`; button visible only | Google button is visible | no cleanup verified | no loop checked | promoted |

## Promotion Guard

This fixture must fail validation because visible buttons are not provider proof.

## How To Fill A Row

Use the real auth provider ledger template, not this fixture.
