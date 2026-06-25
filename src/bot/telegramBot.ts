import { Bot, GrammyError, HttpError, InputFile } from 'grammy';
import {
  addExpense,
  addMember,
  buildPotStatus,
  closeChapter,
  confirmLeg,
  createChapter,
  exportChapterJson,
  formatStatusText,
  markLegPaid,
  refreshLegs,
  resolveMemberByTelegram,
} from '../chapter/chapterEngine';
import { parseExpenseMessage } from '../chapter/parseExpense';
import type { BaseCurrency } from '../schema/pot';
import { FileChapterStore } from './store/fileChapterStore';
import { ChapterStoreAdapter } from './store/chapterStoreAdapter';

const HELP_TEXT = `ChopDot chapter bot (L0)

/newpot <name> [EUR|USD|CHF] — start a group chapter
/join <your name> — join this group's chapter
/status — open legs + next actor
/paid — mark your leg paid (claim)
/confirm — receiver confirms payment
/linkpot <pot id> — link this chat chapter to an app pot
/close — export chapter JSON when all legs confirmed

Or write: "I paid €120 dinner split 3"`;

function parseCurrency(token?: string): BaseCurrency {
  const value = (token ?? 'EUR').toUpperCase();
  if (['EUR', 'USD', 'CHF', 'GBP'].includes(value)) {
    return value as BaseCurrency;
  }
  return 'EUR';
}

export function createTelegramBot(token: string, store: ChapterStoreAdapter): Bot {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply(HELP_TEXT);
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(HELP_TEXT);
  });

  bot.command('newpot', async (ctx) => {
    const chatId = String(ctx.chat?.id ?? '');
    const from = ctx.from;
    if (!from || !chatId) {
      return;
    }

    const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
    if (args.length === 0) {
      await ctx.reply('Usage: /newpot Summer trip EUR');
      return;
    }

    const maybeCurrency = args[args.length - 1]?.toUpperCase();
    const hasCurrency = maybeCurrency && ['EUR', 'USD', 'CHF', 'GBP'].includes(maybeCurrency);
    const currency = hasCurrency ? parseCurrency(maybeCurrency) : 'EUR';
    const name = (hasCurrency ? args.slice(0, -1) : args).join(' ').trim();
    if (!name) {
      await ctx.reply('Usage: /newpot Summer trip EUR');
      return;
    }

    const organizerName = from.first_name ?? 'Organizer';
    const chapter = createChapter({
      name,
      currency,
      telegramChatId: chatId,
      organizer: {
        name: organizerName,
        telegramUserId: String(from.id),
      },
    });

    await store.save(chapter);
    await ctx.reply(`📂 Chapter "${chapter.name}" created (${chapter.currency}). Others: /join <name>`);
  });

  bot.command('join', async (ctx) => {
    const chatId = String(ctx.chat?.id ?? '');
    const from = ctx.from;
    if (!from || !chatId) {
      return;
    }

    const name = ctx.message?.text?.split(/\s+/).slice(1).join(' ').trim();
    if (!name) {
      await ctx.reply('Usage: /join Sam');
      return;
    }

    const chapter = await store.getByChatId(chatId);
    if (!chapter) {
      await ctx.reply('No chapter here. Organizer runs /newpot first.');
      return;
    }

    const updated = addMember(chapter, {
      name,
      telegramUserId: String(from.id),
    });
    await store.save(updated);
    await ctx.reply(`✅ ${name} joined "${updated.name}"`);
  });

  bot.command('status', async (ctx) => {
    const chapter = await loadOpenChapter(ctx, store);
    if (!chapter) {
      return;
    }
    const status = buildPotStatus(refreshLegs(chapter));
    await ctx.reply(formatStatusText(status));
  });

  bot.command('paid', async (ctx) => {
    const chapter = await loadOpenChapter(ctx, store);
    const from = ctx.from;
    if (!chapter || !from) {
      return;
    }

    const member = resolveMemberByTelegram(chapter, String(from.id));
    if (!member) {
      await ctx.reply('Run /join <name> first.');
      return;
    }

    try {
      const updated = markLegPaid(chapter, { payerMemberId: member.id });
      await store.save(updated);
      await ctx.reply(`💸 Marked paid — receiver should /confirm`);
      await ctx.reply(formatStatusText(buildPotStatus(updated)));
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : 'Could not mark paid');
    }
  });

  bot.command('confirm', async (ctx) => {
    const chapter = await loadOpenChapter(ctx, store);
    const from = ctx.from;
    if (!chapter || !from) {
      return;
    }

    const member = resolveMemberByTelegram(chapter, String(from.id));
    if (!member) {
      await ctx.reply('Run /join <name> first.');
      return;
    }

    try {
      const updated = confirmLeg(chapter, { creditorMemberId: member.id });
      await store.save(updated);
      await ctx.reply('✅ Payment confirmed');
      await ctx.reply(formatStatusText(buildPotStatus(updated)));
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : 'Nothing to confirm');
    }
  });

  bot.command('linkpot', async (ctx) => {
    const chatId = String(ctx.chat?.id ?? '');
    if (!chatId) {
      return;
    }

    const potId = ctx.message?.text?.split(/\s+/).slice(1).join(' ').trim();
    if (!potId) {
      await ctx.reply('Usage: /linkpot capture-test-pot');
      return;
    }

    const linked = await store.linkPotToChat(chatId, potId);
    if (!linked) {
      await ctx.reply('No chapter here. Organizer runs /newpot first.');
      return;
    }

    await ctx.reply(`🔗 Linked "${linked.name}" to app pot \`${potId}\``);
  });

  bot.command('close', async (ctx) => {
    const chapter = await store.getByChatId(String(ctx.chat?.id ?? ''));
    if (!chapter) {
      await ctx.reply('No chapter in this chat.');
      return;
    }

    try {
      const closed = closeChapter(refreshLegs(chapter));
      await store.save(closed);
      const json = exportChapterJson(closed);
      const filename = `${closed.name.replace(/\s+/g, '-').toLowerCase()}.chopdot.json`;
      await ctx.replyWithDocument(new InputFile(Buffer.from(json, 'utf8'), filename), {
        caption: `📦 Chapter closed — ${closed.name}`,
      });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : 'Cannot close yet');
      if (chapter.chapterState === 'open') {
        await ctx.reply(formatStatusText(buildPotStatus(refreshLegs(chapter))));
      }
    }
  });

  bot.on('message:text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) {
      return;
    }

    const draft = parseExpenseMessage(ctx.message.text);
    if (!draft) {
      return;
    }

    const chatId = String(ctx.chat?.id ?? '');
    const from = ctx.from;
    if (!from || !chatId) {
      return;
    }

    let chapter = await store.getByChatId(chatId);
    if (!chapter) {
      await ctx.reply('No chapter — /newpot <name> first');
      return;
    }

    let member = resolveMemberByTelegram(chapter, String(from.id));
    if (!member) {
      chapter = addMember(chapter, {
        name: from.first_name ?? 'Member',
        telegramUserId: String(from.id),
      });
      member = resolveMemberByTelegram(chapter, String(from.id));
    }

    if (!member) {
      return;
    }

    try {
      const updated = addExpense(chapter, {
        paidByMemberId: member.id,
        draft,
        source: 'chat_nl',
        sourceRef: String(ctx.message.message_id),
      });
      await store.save(updated);
      await ctx.reply(
        `📝 ${draft.memo} · ${draft.amount.toFixed(2)} ${updated.currency} · paid by ${member.name}\n${formatStatusText(buildPotStatus(updated))}`,
      );
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : 'Could not add expense');
    }
  });

  bot.catch((error) => {
    const ctx = error.ctx;
    console.error(`Bot error for update ${ctx.update.update_id}:`);
    const e = error.error;
    if (e instanceof GrammyError) {
      console.error('Grammy error:', e.description);
    } else if (e instanceof HttpError) {
      console.error('HTTP error:', e);
    } else {
      console.error('Unknown error:', e);
    }
  });

  return bot;
}

async function loadOpenChapter(
  ctx: { chat?: { id: number }; reply: (text: string) => Promise<unknown> },
  store: ChapterStoreAdapter,
) {
  const chapter = await store.getByChatId(String(ctx.chat?.id ?? ''));
  if (!chapter) {
    await ctx.reply('No chapter — /newpot <name> first');
    return null;
  }
  if (chapter.chapterState === 'closed') {
    await ctx.reply('Chapter closed. Start /newpot for a new one.');
    return null;
  }
  return chapter;
}

export async function startTelegramBot(token: string, dataDir: string): Promise<void> {
  const fileStore = new FileChapterStore(dataDir);
  const store = new ChapterStoreAdapter(fileStore, dataDir);
  await store.init();
  const bot = createTelegramBot(token, store);
  console.info(`ChopDot bot starting — data dir: ${dataDir}`);
  await bot.start();
}
