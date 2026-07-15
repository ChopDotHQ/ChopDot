export type TelegramBotSafetyOptions = {
  allowedChatIds: Set<string>;
  allowMutations: boolean;
};

export function parseAllowedChatIds(raw?: string): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function telegramSafetyOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): TelegramBotSafetyOptions {
  return {
    allowedChatIds: parseAllowedChatIds(env.CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS),
    allowMutations: env.CHOPDOT_TELEGRAM_ALLOW_MUTATIONS === 'true',
  };
}

export function assertLiveTelegramSafety(options: TelegramBotSafetyOptions): void {
  if (options.allowedChatIds.size === 0) {
    throw new Error('Set CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS before running the live ChopDot Telegram bot.');
  }
}

export function isChatAllowed(chatId: string, options: TelegramBotSafetyOptions): boolean {
  return options.allowedChatIds.size === 0 || options.allowedChatIds.has(chatId);
}
