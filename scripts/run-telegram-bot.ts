#!/usr/bin/env node
import path from 'node:path';
import { startTelegramBot } from '../src/bot/telegramBot.ts';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN to run the ChopDot chapter bot.');
  process.exit(1);
}

const dataDir =
  process.env.CHOPDOT_BOT_DATA_DIR ??
  path.join(process.cwd(), '.chopdot-bot-data');

await startTelegramBot(token, dataDir);
