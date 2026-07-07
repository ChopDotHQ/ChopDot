# Telegram Mini App Sandbox

## Deployed URL

Use this HTTPS URL for the Telegram sandbox:

```text
https://portable-shell-trial.vercel.app
```

## Sandbox Bot

Bot username:

```text
@ChopDotMiniAppBot
```

Configured through the Telegram Bot API on 2026-07-06:

- bot description
- bot short description
- global commands: `/start`, `/help`, `/settings`
- default menu button:
  - text: `Open ChopDot`
  - URL: `https://portable-shell-trial.vercel.app`

Not configured by API:

- BotFather Main Mini App short name
- public `t.me/<bot>/<app>` Mini App link

Telegram keeps the Main Mini App registration inside BotFather. Complete that
manually with `/newapp` when the sandbox is ready to test as a direct Mini App
link.

Preview deployment details:

- Vercel project: `portable-shell-trial`
- Deployment URL: `https://portable-shell-trial-jn5shlwpf-devinsons-projects-b5ab981e.vercel.app`
- Alias: `https://portable-shell-trial.vercel.app`
- Inspect: `https://vercel.com/devinsons-projects-b5ab981e/portable-shell-trial/AHzcgvvTNEucvQBehX3ZZ62x2EHM`

## What Is Ready

- The app conditionally loads Telegram's web app script only for Telegram-like launches.
- The app detects `window.Telegram.WebApp` and classifies the host as `telegram-mini-app`.
- The app calls `ready()` and `expand()` when Telegram is present.
- The app maps Telegram's host Back button to the same back behavior as visible in-app back buttons.
- The app reads Telegram launch params through the environment seam.
- The app mirrors local state writes into Telegram `CloudStorage` when available.
- Normal web mode does not expose or depend on Telegram APIs.

## Proof

Local proof:

- `proof/portable-shell-web/report.json`
- `proof/portable-shell-telegram/report.json`

Live HTTPS proof:

- `proof/portable-shell-web-live/report.json`
- `proof/portable-shell-telegram-live/report.json`

Live Telegram-style proof completed:

```text
first run
-> guest setup
-> empty home
-> create group
-> group before spend
-> add spend
-> review split
-> open balances
-> settle up
-> request sent
-> payment request
-> needs confirm
-> confirm received
-> finish group
-> group summary
-> history/home
-> reload with persisted state
```

Live Telegram-style capability result:

```json
{
  "canUseLocalStorage": true,
  "canUseClipboard": true,
  "canUseShareSheet": true,
  "canUseTelegramCloudStorage": true,
  "launchStartParam": "portable-proof",
  "telegramPlatform": "ios",
  "hostBackButton": true,
  "hostMainButton": true,
  "hasTelegramWebApp": true
}
```

## BotFather Setup

Telegram's official docs say Mini Apps can be launched from a bot menu button,
configured through `@BotFather` with `/setmenubutton` or Bot Settings > Menu
Button. They also describe setting up a bot's Main Mini App through BotFather.

Recommended sandbox path:

1. Open Telegram and message `@ChopDotMiniAppBot`.
2. Confirm the bot menu button shows `Open ChopDot`.
3. Tap `Open ChopDot` and validate the app launches inside Telegram.
4. Open `@BotFather` and configure the Main Mini App if available:
   - select the same bot;
   - choose Main Mini App / Mini App setup;
   - use the same deployed URL;
   - use a short name such as `chopdot_trial`.
5. Open the bot in Telegram mobile and launch the app from the menu button or
   direct Mini App link.

Official references:

- `https://core.telegram.org/bots/webapps`
- `https://core.telegram.org/bots/features`
- `https://docs.telegram-mini-apps.com/platform/back-button`
- `https://docs.telegram-mini-apps.com/platform/main-button`
- `https://docs.telegram-mini-apps.com/platform/viewport`

## Manual Telegram Client Validation

In the real Telegram client, validate:

1. App opens inside Telegram, not Safari/Chrome.
2. First screen shows `ChopDot` and `Continue as guest`.
3. Create guest `Mina`, or accept the Telegram-suggested name.
4. Create `Weekend Trip` with `Leo` and `Nina`.
5. Add `$120` spend for `Dinner at Gusto`.
6. Save equal split.
7. Send link to Leo.
8. Open the payment request and mark paid.
9. Confirm received from Leo.
10. Finish group.
11. Group Summary shows:
    - total spend `$120.00`;
    - still open `$40.00`;
    - Mina gets `$40.00`;
    - Leo settled;
    - Nina owes `$40.00`.
12. Close and reopen the Mini App.
13. Confirm the state persists or record the persistence limitation.
14. Use Telegram's native Back button and confirm it follows the same route as
    visible in-app back buttons.

## What This Still Does Not Prove

- Real server-side Telegram `initData` validation.
- Real bot backend behavior.
- Real cross-device sync.
- Real payment processing.
- Real Telegram Stars or wallet behavior.
- Telegram review/submission readiness.

This sandbox proves the current portable shell can enter Telegram's Mini App
surface without changing the user-facing product model.
