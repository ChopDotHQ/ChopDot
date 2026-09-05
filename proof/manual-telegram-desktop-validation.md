# Manual Telegram Desktop Validation

Date: 2026-07-07
Environment: Telegram Desktop for macOS
Bot: @ChopDotMiniAppBot
Mini App URL: https://portable-shell-trial.vercel.app

## Result

PASS with follow-up polish issues.

The deployed ChopDot portable shell opens inside the real Telegram mini-app webview, receives Telegram launch parameters, completes the core group-money journey, persists state across a close/reopen cycle, and exposes the launch-shell trust surfaces.

## Verified Journey

1. Opened ChopDot from Telegram.
2. Continued as guest.
3. Entered display name `Mina`.
4. Created `Weekend Trip`.
5. Added `Leo` and `Nina`.
6. Added spend: `$120.00` for `Dinner at Gusto`.
7. Reviewed equal split: Mina, Leo, Nina at `$40.00` each.
8. Saved spend.
9. Used `Settle up`.
10. Sent link to Leo.
11. Opened Leo payer view.
12. Marked `I paid Mina`.
13. Confirmed received from Leo.
14. Finished group while Nina remained open.
15. Viewed Group Summary.
16. Returned Home.

## State Proof

After reopening in Telegram, the app restored:

- User: `Mina`
- Group: `Weekend Trip`
- Members: `Mina`, `Leo`, `Nina`
- Home net position: `$40.00`
- History row: `Weekend Trip`, total `$120.00`, open `$40.00`
- Friends persisted: `Leo`, `Nina`

## Telegram-Specific Proof

The app opened with Telegram WebApp launch parameters, including:

- `tgWebAppData`
- `tgWebAppVersion=9.6`
- `tgWebAppPlatform=macos`
- `tgWebAppThemeParams`

This confirms the app is running as a Telegram Mini App webview rather than only as a normal browser tab.

## Trust Surfaces Checked

- Home: persisted net position and group card.
- History: saved summary was reachable and showed total/open amounts.
- Pay: receive money methods rendered with honest local/prototype copy.
- Friends: persisted Leo/Nina and showed copy invite actions.
- Settings: appearance, currency, privacy/data, and about sections rendered.

## Issues Found

1. The app does not use Telegram profile data to prefill or suggest the guest name. Telegram provided first name `Dev`, but onboarding still asked for manual entry.
2. Create Group and Add Spend use realistic placeholder examples (`Weekend Trip`, `Dinner at Gusto`) that can look like already-filled values.
3. The payer-side screen title `Payer View` feels internal. It should be user-facing language such as `Payment request` or `Pay Mina`.
4. In the Group Summary screen, the fixed bottom `Done` action visually crowds the lower member rows at Telegram Desktop height. Add more bottom padding or reserve action-bar space.
5. Telegram Desktop is validated. Real mobile Telegram remains unverified for keyboard, safe areas, back behavior, and bottom action reachability.

## Next Recommended Spec

Change name: `telegram-mobile-polish-v1`

Scope in:

- Use Telegram WebApp user data to suggest/prefill the first-run guest name.
- Replace internal payer labels with user-facing request/payment language.
- Make example placeholders visually distinct from entered values.
- Reserve bottom action-bar space so summaries and lists are never covered.
- Run a real phone Telegram check after the patch.

Scope out:

- Real backend auth.
- Real payment processing.
- BotFather Main Mini App setup.
- Chain or protocol features.
