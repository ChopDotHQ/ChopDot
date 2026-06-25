import type { Pot } from '../schema/pot';
import { computeBalances, suggestSettlements, type Balance } from '../services/settlement/calc';
import type {
  ChapterDocument,
  ChapterExpense,
  ChapterMember,
  ChapterState,
  LegState,
  ParsedExpenseDraft,
  PotStatus,
  SettlementLeg,
} from './types';
import { CHOPDOT_CHAPTER_SCHEMA } from './types';
import { reconcileLegs } from './reconcileLegs';

function nowIso(): string {
  return new Date().toISOString();
}

function memberName(members: ChapterMember[], memberId: string): string {
  return members.find((m) => m.id === memberId)?.name ?? memberId;
}

function slugId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

function nextExpenseId(chapter: ChapterDocument): string {
  const baseId = `exp_${Date.now()}`;
  if (!chapter.expenses.some((expense) => expense.id === baseId)) {
    return baseId;
  }

  let suffix = 2;
  let id = `${baseId}_${suffix}`;
  while (chapter.expenses.some((expense) => expense.id === id)) {
    suffix += 1;
    id = `${baseId}_${suffix}`;
  }
  return id;
}

export function createChapter(input: {
  name: string;
  currency: ChapterDocument['currency'];
  telegramChatId: string;
  organizer: { name: string; telegramUserId: string };
}): ChapterDocument {
  const memberId = slugId(input.organizer.name) || 'organizer';
  return {
    schemaVersion: CHOPDOT_CHAPTER_SCHEMA,
    id: `chapter_${Date.now()}`,
    name: input.name,
    currency: input.currency,
    chapterState: 'open',
    telegramChatId: input.telegramChatId,
    members: [
      {
        id: memberId,
        name: input.organizer.name,
        telegramUserId: input.organizer.telegramUserId,
      },
    ],
    expenses: [],
    legs: [],
    spendCards: [],
    createdAt: nowIso(),
  };
}

export function createAppChapter(input: {
  name: string;
  currency: ChapterDocument['currency'];
  organizerMemberId: string;
  organizerName: string;
  potId?: string;
  organizerUserId?: string;
}): ChapterDocument {
  const defaultSpendCardId = `sc_${slugId(input.name) || 'default'}`;
  return {
    schemaVersion: CHOPDOT_CHAPTER_SCHEMA,
    id: `chapter_${input.potId ?? Date.now()}`,
    name: input.name,
    currency: input.currency,
    chapterState: 'open',
    potId: input.potId,
    members: [
      {
        id: input.organizerMemberId,
        name: input.organizerName,
        userId: input.organizerUserId,
      },
    ],
    expenses: [],
    legs: [],
    spendCards: [
      {
        id: defaultSpendCardId,
        label: input.name,
        recentParticipantIds: [input.organizerMemberId],
        settlementPreference: 'twint',
        defaultSplitRule: 'equal',
      },
    ],
    createdAt: nowIso(),
  };
}

export function chapterToPot(chapter: ChapterDocument): Pot {
  return {
    id: chapter.id,
    name: chapter.name,
    type: 'expense',
    baseCurrency: chapter.currency,
    members: chapter.members.map((m) => ({
      id: m.id,
      name: m.name,
    })),
    expenses: chapter.expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      currency: expense.currency,
      paidBy: expense.paidBy,
      memo: expense.memo,
      date: expense.createdAt,
      split: expense.splitMemberIds.map((memberId) => ({
        memberId,
        amount: expense.amount / expense.splitMemberIds.length,
      })),
    })),
    history: [],
    budgetEnabled: false,
    checkpointEnabled: true,
    archived: false,
    mode: 'auditable',
    confirmationsEnabled: true,
  };
}

function applyConfirmedSettlements(balances: Balance[], legs: SettlementLeg[]): Balance[] {
  const nets = new Map(balances.map((b) => [b.memberId, b.net]));
  for (const leg of legs) {
    if (leg.state !== 'confirmed') {
      continue;
    }
    nets.set(leg.fromMemberId, (nets.get(leg.fromMemberId) ?? 0) + leg.amount);
    nets.set(leg.toMemberId, (nets.get(leg.toMemberId) ?? 0) - leg.amount);
  }
  return balances.map((b) => ({ ...b, net: nets.get(b.memberId) ?? 0 }));
}

export function refreshLegs(chapter: ChapterDocument): ChapterDocument {
  const pot = chapterToPot(chapter);
  const rawBalances = computeBalances(pot);
  const adjusted = applyConfirmedSettlements(rawBalances, chapter.legs);
  const suggestions = suggestSettlements(adjusted);
  const confirmed = chapter.legs.filter((leg) => leg.state === 'confirmed');
  const reconciledOpen = reconcileLegs(suggestions, chapter.legs.filter((l) => l.state !== 'confirmed'), chapter.currency);
  return {
    ...chapter,
    legs: [...confirmed, ...reconciledOpen],
  };
}

export function addMember(
  chapter: ChapterDocument,
  input: {
    name: string;
    telegramUserId?: string;
    userId?: string;
    memberId?: string;
  },
): ChapterDocument {
  if (chapter.chapterState === 'closed') {
    throw new Error('Chapter is closed');
  }

  if (input.userId) {
    const existingByUser = chapter.members.find((m) => m.userId === input.userId);
    if (existingByUser) {
      return chapter;
    }
  }

  if (input.telegramUserId) {
    const existingByTelegram = chapter.members.find((m) => m.telegramUserId === input.telegramUserId);
    if (existingByTelegram) {
      return chapter;
    }
  }

  const baseId = input.memberId ?? slugId(input.name) ?? `member_${chapter.members.length + 1}`;
  let id = baseId;
  let suffix = 2;
  while (chapter.members.some((m) => m.id === id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return refreshLegs({
    ...chapter,
    members: [
      ...chapter.members,
      {
        id,
        name: input.name,
        telegramUserId: input.telegramUserId,
        userId: input.userId,
      },
    ],
  });
}

export function addExpense(
  chapter: ChapterDocument,
  input: {
    paidByMemberId: string;
    draft: ParsedExpenseDraft;
    source?: ChapterExpense['source'];
    sourceRef?: string;
    evidenceRefs?: ChapterExpense['evidenceRefs'];
    receiptItems?: ChapterExpense['receiptItems'];
    splitMemberIds?: string[];
  },
): ChapterDocument {
  if (chapter.chapterState === 'closed') {
    throw new Error('Chapter is closed');
  }

  if (!chapter.members.some((m) => m.id === input.paidByMemberId)) {
    throw new Error('Unknown payer');
  }

  const splitMemberIds =
    input.splitMemberIds ??
    (() => {
      const splitCount = input.draft.splitCount ?? chapter.members.length;
      return chapter.members.slice(0, splitCount).map((m) => m.id);
    })();

  if (splitMemberIds.length === 0) {
    throw new Error('No members to split with');
  }

  for (const memberId of splitMemberIds) {
    if (!chapter.members.some((m) => m.id === memberId)) {
      throw new Error(`Unknown split member: ${memberId}`);
    }
  }

  const expense: ChapterExpense = {
    id: nextExpenseId(chapter),
    amount: input.draft.amount,
    currency: chapter.currency,
    paidBy: input.paidByMemberId,
    memo: input.draft.memo,
    createdAt: nowIso(),
    splitMemberIds,
    source: input.source ?? 'chat_nl',
    sourceRef: input.sourceRef,
    evidenceRefs: input.evidenceRefs,
    receiptItems: input.receiptItems,
  };

  return refreshLegs({
    ...chapter,
    expenses: [...chapter.expenses, expense],
  });
}

function findLegForPayer(chapter: ChapterDocument, payerMemberId: string): SettlementLeg | undefined {
  return chapter.legs.find(
    (leg) => leg.fromMemberId === payerMemberId && leg.state !== 'confirmed',
  );
}

function findLegForCreditorClaim(
  chapter: ChapterDocument,
  creditorMemberId: string,
): SettlementLeg | undefined {
  return chapter.legs.find(
    (leg) => leg.toMemberId === creditorMemberId && leg.state === 'claimed',
  );
}

export function markLegPaid(
  chapter: ChapterDocument,
  input: { payerMemberId: string; legId?: string },
): ChapterDocument {
  assertOpen(chapter);
  const leg =
    (input.legId ? chapter.legs.find((l) => l.id === input.legId) : undefined) ??
    findLegForPayer(chapter, input.payerMemberId);

  if (!leg) {
    throw new Error('No open leg for payer');
  }
  if (leg.fromMemberId !== input.payerMemberId) {
    throw new Error('Only the debtor can mark paid');
  }
  if (leg.state === 'confirmed') {
    throw new Error('Leg already confirmed');
  }

  return {
    ...chapter,
    legs: chapter.legs.map((item) =>
      item.id === leg.id
        ? { ...item, state: 'claimed' as LegState, claimedAt: nowIso() }
        : item,
    ),
  };
}

export function confirmLeg(
  chapter: ChapterDocument,
  input: { creditorMemberId: string; legId?: string },
): ChapterDocument {
  assertOpen(chapter);
  const leg =
    (input.legId ? chapter.legs.find((l) => l.id === input.legId) : undefined) ??
    findLegForCreditorClaim(chapter, input.creditorMemberId);

  if (!leg) {
    throw new Error('No claimed leg waiting for confirm');
  }
  if (leg.toMemberId !== input.creditorMemberId) {
    throw new Error('Only the receiver can confirm');
  }
  if (leg.state !== 'claimed') {
    throw new Error('Leg must be claimed before confirm');
  }

  return {
    ...chapter,
    legs: chapter.legs.map((item) =>
      item.id === leg.id
        ? { ...item, state: 'confirmed' as LegState, confirmedAt: nowIso() }
        : item,
    ),
  };
}

export function buildPotStatus(chapter: ChapterDocument): PotStatus {
  const synced = refreshLegs(chapter);
  const openLegs = synced.legs.filter((leg) => leg.state !== 'confirmed');

  const legs = openLegs.map((leg) => {
    const nextAction = leg.state === 'claimed' ? ('confirm' as const) : ('pay' as const);
    const nextActor =
      nextAction === 'confirm'
        ? memberName(synced.members, leg.toMemberId)
        : memberName(synced.members, leg.fromMemberId);

    return {
      ...leg,
      fromName: memberName(synced.members, leg.fromMemberId),
      toName: memberName(synced.members, leg.toMemberId),
      nextActor,
      nextAction,
    };
  });

  const blockers = legs.map(
    (leg) =>
      `${leg.fromName} → ${leg.toName} ${leg.amount.toFixed(2)} ${leg.currency} (${leg.state})`,
  );

  const first = legs[0];
  const nextHint = first
    ? `Next: ${first.nextActor} — ${first.nextAction}`
    : 'All legs confirmed';

  return {
    potId: synced.id,
    name: synced.name,
    chapterState: synced.chapterState,
    openLegCount: openLegs.length,
    legs,
    blockers: blockers.length > 0 ? blockers : [nextHint],
    updatedAt: nowIso(),
  };
}

export function closeChapter(chapter: ChapterDocument): ChapterDocument {
  assertOpen(chapter);
  const status = buildPotStatus(chapter);
  if (status.openLegCount > 0) {
    throw new Error(`Cannot close: ${status.openLegCount} open leg(s)`);
  }

  return {
    ...chapter,
    chapterState: 'closed',
    closedAt: nowIso(),
  };
}

export function exportChapterJson(chapter: ChapterDocument): string {
  const payload = {
    schemaVersion: CHOPDOT_CHAPTER_SCHEMA,
    exportedAt: nowIso(),
    chapter,
    pot: chapterToPot(chapter),
  };
  return JSON.stringify(payload, null, 2);
}

function assertOpen(chapter: ChapterDocument): void {
  if (chapter.chapterState !== 'open') {
    throw new Error('Chapter is closed');
  }
}

export function formatStatusText(status: PotStatus): string {
  if (status.openLegCount === 0 && status.chapterState === 'open') {
    return `✅ ${status.name}\nAll legs confirmed — ready to /close`;
  }

  const lines = [
    `📊 ${status.name}`,
    `${status.openLegCount} open leg(s)`,
    ...status.blockers.slice(0, 5),
  ];
  return lines.join('\n');
}

export function resolveMemberByTelegram(
  chapter: ChapterDocument,
  telegramUserId: string,
): ChapterMember | undefined {
  return chapter.members.find((m) => m.telegramUserId === telegramUserId);
}

export function assertChapterState(chapter: ChapterDocument, expected: ChapterState): void {
  if (chapter.chapterState !== expected) {
    throw new Error(`Expected chapter state ${expected}`);
  }
}
