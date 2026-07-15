# Telegram Chat Agent

ChopDot's Telegram path follows the same boundary as the YourTurn Concierge:
Telegram is a transport over existing ChopDot chapter actions, not a separate
business-logic engine.

## Status

Live today:

- polling bot runtime through `scripts/run-telegram-bot.ts`
- allowlisted chat gate
- mutation gate
- chat expense draft from messages like `I paid CHF 120 dinner split 3`
- explicit `/addlast` before the draft becomes a chapter expense
- `/paid` and `/confirm` remain separate explicit actions

Not claimed live:

- OpenClaw ACP gateway execution
- WhatsApp private-chat reading
- silent expense, payment, or confirmation mutation

## Environment

Required to run the live bot:

```bash
TELEGRAM_BOT_TOKEN=
CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS=
```

Required before Telegram can change a pot:

```bash
CHOPDOT_TELEGRAM_ALLOW_MUTATIONS=true
```

Optional data directory:

```bash
CHOPDOT_BOT_DATA_DIR=.chopdot-bot-data
```

## Commands

```bash
npm run product:validate
npm test
TELEGRAM_BOT_TOKEN=... CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS=... npm exec tsx scripts/run-telegram-bot.ts
```

## Product Contract

- A normal chat message can create a draft.
- `/addlast` commits the last draft for the sender.
- Telegram starts in preview mode unless mutations are explicitly enabled.
- Live use requires an allowlisted chat.
- Any future OpenClaw descriptor should point to the same bounded chapter
  actions and should stay descriptor-only until a real gateway/runtime exists.
