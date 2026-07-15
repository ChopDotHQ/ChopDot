/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  assertLiveTelegramSafety,
  isChatAllowed,
  parseAllowedChatIds,
  telegramSafetyOptionsFromEnv,
} from '../bot/telegramSafety';

describe('telegram bot safety options', () => {
  it('parses allowlisted chat ids from env-style lists', () => {
    expect([...parseAllowedChatIds('123, -456, ,789')]).toEqual(['123', '-456', '789']);
  });

  it('keeps mutations off unless explicitly enabled', () => {
    expect(
      telegramSafetyOptionsFromEnv({
        CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS: 'chat-1',
      }).allowMutations,
    ).toBe(false);
    expect(
      telegramSafetyOptionsFromEnv({
        CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS: 'chat-1',
        CHOPDOT_TELEGRAM_ALLOW_MUTATIONS: 'true',
      }).allowMutations,
    ).toBe(true);
  });

  it('requires a live allowlist and rejects other chats', () => {
    const options = {
      allowedChatIds: parseAllowedChatIds('chat-1'),
      allowMutations: false,
    };
    expect(() => assertLiveTelegramSafety({ allowedChatIds: new Set(), allowMutations: false })).toThrow(
      /CHOPDOT_TELEGRAM_ALLOWED_CHAT_IDS/,
    );
    expect(isChatAllowed('chat-1', options)).toBe(true);
    expect(isChatAllowed('chat-2', options)).toBe(false);
  });
});
