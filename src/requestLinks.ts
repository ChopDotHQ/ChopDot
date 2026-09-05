export type PayerRequestRoute = {
  groupId: string;
  memberId: string;
};

export type StandalonePayerRequest = {
  requestId: string;
  groupName: string;
  requesterName: string;
  payerName: string;
  amount: number;
  currency: string;
  paymentMethodLabel: string;
  recipientWalletAddress?: string;
  createdAt: string;
  expiresAt: string;
  live: {
    memberCapability: string;
    authority: 'native' | 'offline';
    requesterPublicKeyHex?: string;
  };
};

export type GroupInviteMember = {
  id: string;
  name: string;
  /**
   * Public receiving address, carried so a joining device can pay by wallet and
   * so RECORD_MATCHED_PAYMENT can check the receiver. Same shape and validation
   * as `StandalonePayerRequest.recipientWalletAddress`. A receiving address is
   * public by nature; no key material travels.
   */
  walletAddress?: string;
};

export type GroupInviteExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  date: string;
};

export type GroupInviteSplit = {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  /**
   * `confirmed` travels only for a *self-split* — where the person owing is the
   * person who paid the bill. That share is structurally settled and asserts
   * nothing about anyone else. For every other split a link may claim at most
   * `marked_paid`; only the receiver can confirm receipt.
   */
  status: 'open' | 'request_sent' | 'marked_paid' | 'confirmed';
};

/**
 * A snapshot of one group, shared so a second device can open the same group.
 *
 * This is a starting picture, not live sync and not authority. Per
 * SECURITY_FOUNDATION.md, URL packets are inputs. Two deliberate limits:
 *  - `confirmed` is not a transportable status. A link can never assert that a
 *    receiver confirmed receipt; only the receiver can. Anything confirmed at
 *    share time arrives as `marked_paid`.
 *  - No wallet receipts or request ids travel. Payment evidence is governed by
 *    PAYMENT_INTENT_CONTRACT.md and must not be assertable by a URL.
 */
export type GroupInvitePacket = {
  action: 'group_invite';
  groupId: string;
  groupName: string;
  /**
   * The group's currency. Without this a joining device relabels every amount
   * in its own default — "PAS 0.61" arrives as "$0.61" — and the wallet payment
   * path, which requires PAS, becomes unreachable. Currency is part of the
   * exact-match rule, so it must travel with the amounts.
   */
  currency: string;
  invitedBy: string;
  members: GroupInviteMember[];
  expenses: GroupInviteExpense[];
  splits: GroupInviteSplit[];
  createdAt: string;
  expiresAt: string;
};

const GROUP_PARAM = 'payGroupId';
const MEMBER_PARAM = 'payMemberId';
const REQUEST_PARAM = 'payRequest';
const MAX_PACKET_LENGTH = 2200;
const MAX_TEXT_LENGTH = 80;
const MAX_REQUEST_ID_LENGTH = 140;
const MAX_AMOUNT = 1_000_000;
const INVITE_PARAM = 'joinGroup';
const MAX_INVITE_MEMBERS = 12;
const MAX_INVITE_EXPENSES = 15;
const MAX_INVITE_SPLITS = 60;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRANSPORTABLE_SPLIT_STATUSES = new Set(['open', 'request_sent', 'marked_paid', 'confirmed']);

export function buildPayerRequestUrl(
  groupId: string,
  memberId: string,
  request?: StandalonePayerRequest,
  currentHref = window.location.href,
): string {
  const url = getPublicShareUrl(currentHref);
  url.searchParams.set(GROUP_PARAM, groupId);
  url.searchParams.set(MEMBER_PARAM, memberId);
  if (request) {
    url.searchParams.set(REQUEST_PARAM, encodeRequestPacket(request));
  }
  url.hash = '';
  return url.toString();
}

export function parsePayerRequestRoute(search = window.location.search): PayerRequestRoute | null {
  const params = new URLSearchParams(search);
  const groupId = params.get(GROUP_PARAM);
  const memberId = params.get(MEMBER_PARAM);

  if (!groupId || !memberId) {
    return null;
  }

  return { groupId, memberId };
}

export function parseStandalonePayerRequest(search = window.location.search): StandalonePayerRequest | null {
  const packet = new URLSearchParams(search).get(REQUEST_PARAM);
  if (!packet || packet.length > MAX_PACKET_LENGTH) {
    return null;
  }

  return decodeRequestPacket(packet);
}

export type GroupInviteSource = {
  group: { id: string; name: string; memberIds: string[] };
  users: Record<string, { id: string; name: string; walletAddress?: string }>;
  expenses: Record<string, { id: string; groupId: string; description: string; amount: number; currency?: string; paidByUserId: string; date: string }>;
  splits: Record<string, { id: string; expenseId: string; userId: string; amount: number; status: string }>;
  currency: string;
};

export type GroupInviteBuildResult =
  | { ok: true; url: string; packetLength: number }
  | { ok: false; reason: 'too_large' | 'too_many_members' | 'too_many_expenses' | 'too_many_splits' };

/**
 * Build a shareable link that lets a second device open this group.
 *
 * Returns a discriminated result rather than throwing, because "this group is
 * too big to fit in a URL" is a real product state the caller must surface —
 * not an error to swallow. That ceiling is the honest limit of link-carried
 * delivery and the reason a relay eventually replaces it.
 */
export function buildGroupInviteUrl(
  source: GroupInviteSource,
  invitedByUserId: string,
  currentHref = window.location.href,
): GroupInviteBuildResult {
  const members = source.group.memberIds
    .map((id) => source.users[id])
    .filter((u): u is { id: string; name: string; walletAddress?: string } => Boolean(u))
    .map((u) => {
      const member: GroupInviteMember = { id: u.id, name: normalizeText(u.name, MAX_TEXT_LENGTH) };
      if (u.walletAddress) member.walletAddress = u.walletAddress.trim().toLowerCase();
      return member;
    });

  if (members.length > MAX_INVITE_MEMBERS) return { ok: false, reason: 'too_many_members' };

  const expenses = Object.values(source.expenses).filter((e) => e.groupId === source.group.id);
  if (expenses.length > MAX_INVITE_EXPENSES) return { ok: false, reason: 'too_many_expenses' };

  const expenseIds = new Set(expenses.map((e) => e.id));
  const splits = Object.values(source.splits).filter((sp) => expenseIds.has(sp.expenseId));
  if (splits.length > MAX_INVITE_SPLITS) return { ok: false, reason: 'too_many_splits' };

  const now = Date.now();
  const packet: GroupInvitePacket = {
    action: 'group_invite',
    groupId: source.group.id,
    groupName: normalizeText(source.group.name, MAX_TEXT_LENGTH),
    currency: source.currency.trim().toUpperCase(),
    invitedBy: invitedByUserId,
    members,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: normalizeText(e.description, MAX_TEXT_LENGTH),
      amount: e.amount,
      currency: (e.currency ?? source.currency).trim().toUpperCase(),
      paidByUserId: e.paidByUserId,
      date: e.date,
    })),
    // A URL must never assert that a receiver confirmed someone else's payment.
    // The one exception is a self-split (owed by the person who paid), which is
    // settled by construction and claims nothing about a third party.
    splits: splits.map((sp) => {
      const paidBy = source.expenses[sp.expenseId]?.paidByUserId;
      const isSelfSplit = paidBy !== undefined && paidBy === sp.userId;
      const status = (sp.status === 'confirmed' && !isSelfSplit) || sp.status === 'cleared'
        ? 'marked_paid'
        : (sp.status as GroupInviteSplit['status']);
      return { id: sp.id, expenseId: sp.expenseId, userId: sp.userId, amount: sp.amount, status };
    }),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + INVITE_TTL_MS).toISOString(),
  };

  const encoded = encodePacket(packet);
  if (encoded.length > MAX_PACKET_LENGTH) return { ok: false, reason: 'too_large' };

  const url = getPublicShareUrl(currentHref);
  url.searchParams.set(INVITE_PARAM, encoded);
  url.hash = '';
  return { ok: true, url: url.toString(), packetLength: encoded.length };
}

export function parseGroupInvite(search = window.location.search): GroupInvitePacket | null {
  const packet = new URLSearchParams(search).get(INVITE_PARAM);
  if (!packet || packet.length > MAX_PACKET_LENGTH) return null;

  const parsed = decodePacket<Partial<GroupInvitePacket>>(packet);
  if (
    !parsed ||
    parsed.action !== 'group_invite' ||
    typeof parsed.groupId !== 'string' ||
    typeof parsed.groupName !== 'string' ||
    typeof parsed.currency !== 'string' ||
    typeof parsed.invitedBy !== 'string' ||
    !Array.isArray(parsed.members) ||
    !Array.isArray(parsed.expenses) ||
    !Array.isArray(parsed.splits) ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.expiresAt !== 'string'
  ) {
    return null;
  }

  if (
    Number.isNaN(Date.parse(parsed.createdAt)) ||
    Number.isNaN(Date.parse(parsed.expiresAt)) ||
    Date.parse(parsed.expiresAt) <= Date.now()
  ) {
    return null;
  }

  const groupId = normalizeText(parsed.groupId, MAX_REQUEST_ID_LENGTH);
  const groupName = normalizeText(parsed.groupName, MAX_TEXT_LENGTH);
  const currency = parsed.currency.trim().toUpperCase();
  const invitedBy = normalizeText(parsed.invitedBy, MAX_REQUEST_ID_LENGTH);
  if (!groupId || !groupName || !invitedBy || !/^[A-Z]{3}$/.test(currency)) return null;

  const members: GroupInviteMember[] = [];
  for (const raw of parsed.members.slice(0, MAX_INVITE_MEMBERS)) {
    if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
    const id = normalizeText(raw.id, MAX_REQUEST_ID_LENGTH);
    const name = normalizeText(raw.name, MAX_TEXT_LENGTH);
    if (!id || !name) return null;

    const member: GroupInviteMember = { id, name };
    if (raw.walletAddress !== undefined) {
      if (typeof raw.walletAddress !== 'string') return null;
      const addr = raw.walletAddress.trim().toLowerCase();
      if (!/^0x[0-9a-f]{40}$/u.test(addr)) return null;
      member.walletAddress = addr;
    }
    members.push(member);
  }
  if (!members.some((m) => m.id === invitedBy)) return null;

  const memberIds = new Set(members.map((m) => m.id));

  const expenses: GroupInviteExpense[] = [];
  for (const raw of parsed.expenses.slice(0, MAX_INVITE_EXPENSES)) {
    if (
      !raw ||
      typeof raw.id !== 'string' ||
      typeof raw.description !== 'string' ||
      typeof raw.amount !== 'number' ||
      typeof raw.currency !== 'string' ||
      typeof raw.paidByUserId !== 'string' ||
      typeof raw.date !== 'string'
    ) {
      return null;
    }
    const id = normalizeText(raw.id, MAX_REQUEST_ID_LENGTH);
    const currency = raw.currency.trim().toUpperCase();
    if (
      !id ||
      !Number.isFinite(raw.amount) ||
      raw.amount <= 0 ||
      raw.amount > MAX_AMOUNT ||
      !/^[A-Z]{3}$/.test(currency) ||
      !memberIds.has(raw.paidByUserId) ||
      Number.isNaN(Date.parse(raw.date))
    ) {
      return null;
    }
    expenses.push({
      id,
      description: normalizeText(raw.description, MAX_TEXT_LENGTH),
      amount: raw.amount,
      currency,
      paidByUserId: raw.paidByUserId,
      date: raw.date,
    });
  }

  const expenseIds = new Set(expenses.map((e) => e.id));

  const splits: GroupInviteSplit[] = [];
  for (const raw of parsed.splits.slice(0, MAX_INVITE_SPLITS)) {
    if (
      !raw ||
      typeof raw.id !== 'string' ||
      typeof raw.expenseId !== 'string' ||
      typeof raw.userId !== 'string' ||
      typeof raw.amount !== 'number' ||
      typeof raw.status !== 'string'
    ) {
      return null;
    }
    const id = normalizeText(raw.id, MAX_REQUEST_ID_LENGTH);
    if (
      !id ||
      !expenseIds.has(raw.expenseId) ||
      !memberIds.has(raw.userId) ||
      !Number.isFinite(raw.amount) ||
      raw.amount <= 0 ||
      raw.amount > MAX_AMOUNT ||
      !TRANSPORTABLE_SPLIT_STATUSES.has(raw.status)
    ) {
      return null;
    }
    if (raw.status === 'confirmed') {
      const owner = expenses.find((e) => e.id === raw.expenseId);
      if (!owner || owner.paidByUserId !== raw.userId) return null;
    }

    splits.push({
      id,
      expenseId: raw.expenseId,
      userId: raw.userId,
      amount: raw.amount,
      status: raw.status as GroupInviteSplit['status'],
    });
  }

  return {
    action: 'group_invite',
    groupId,
    groupName,
    currency,
    invitedBy,
    members,
    expenses,
    splits,
    createdAt: parsed.createdAt,
    expiresAt: parsed.expiresAt,
  };
}

function encodeRequestPacket(request: StandalonePayerRequest): string {
  return encodePacket(request);
}

function encodePacket(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodePacket<T>(packet: string): T | null {
  try {
    const padded = packet.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(packet.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

function decodeRequestPacket(packet: string): StandalonePayerRequest | null {
  try {
    const parsed = decodePacket<Partial<StandalonePayerRequest>>(packet);
    if (!parsed) return null;

    if (
      typeof parsed.requestId !== 'string' ||
      typeof parsed.groupName !== 'string' ||
      typeof parsed.requesterName !== 'string' ||
      typeof parsed.payerName !== 'string' ||
      typeof parsed.amount !== 'number' ||
      typeof parsed.currency !== 'string' ||
      typeof parsed.paymentMethodLabel !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      !parsed.live ||
      typeof parsed.live.memberCapability !== 'string' ||
      Object.hasOwn(parsed.live, 'roomId') ||
      Object.hasOwn(parsed.live, 'secret') ||
      (parsed.live.authority !== 'native' && parsed.live.authority !== 'offline') ||
      (parsed.live.requesterPublicKeyHex !== undefined && typeof parsed.live.requesterPublicKeyHex !== 'string')
    ) {
      return null;
    }

    const normalized = {
      requestId: normalizeText(parsed.requestId, MAX_REQUEST_ID_LENGTH),
      groupName: normalizeText(parsed.groupName, MAX_TEXT_LENGTH),
      requesterName: normalizeText(parsed.requesterName, MAX_TEXT_LENGTH),
      payerName: normalizeText(parsed.payerName, MAX_TEXT_LENGTH),
      amount: parsed.amount,
      currency: parsed.currency.trim().toUpperCase(),
      paymentMethodLabel: normalizeText(parsed.paymentMethodLabel, MAX_TEXT_LENGTH),
      recipientWalletAddress: typeof parsed.recipientWalletAddress === 'string'
        ? parsed.recipientWalletAddress.trim().toLowerCase()
        : undefined,
      createdAt: parsed.createdAt,
      expiresAt: typeof parsed.expiresAt === 'string'
        ? parsed.expiresAt
        : new Date(Date.parse(parsed.createdAt) + 24 * 60 * 60 * 1000).toISOString(),
      live: {
        memberCapability: parsed.live.memberCapability.trim(),
        authority: parsed.live.authority,
        requesterPublicKeyHex: typeof parsed.live.requesterPublicKeyHex === 'string'
          ? normalizeHex32(parsed.live.requesterPublicKeyHex)
          : undefined,
      },
    };

    if (
      !normalized.requestId ||
      !normalized.groupName ||
      !normalized.requesterName ||
      !normalized.payerName ||
      !normalized.paymentMethodLabel ||
      !Number.isFinite(normalized.amount) ||
      normalized.amount <= 0 ||
      normalized.amount > MAX_AMOUNT ||
      !/^[A-Z]{3}$/.test(normalized.currency) ||
      Number.isNaN(Date.parse(normalized.createdAt)) ||
      Number.isNaN(Date.parse(normalized.expiresAt)) ||
      Date.parse(normalized.expiresAt) <= Date.now()
      || !/^[A-Za-z0-9_-]{20,160}$/u.test(normalized.live.memberCapability)
      || (normalized.live.authority === 'native' && !normalized.live.requesterPublicKeyHex)
      || (normalized.live.requesterPublicKeyHex !== undefined && !/^0x[0-9a-f]{64}$/u.test(normalized.live.requesterPublicKeyHex))
      || (normalized.recipientWalletAddress !== undefined && !/^0x[0-9a-f]{40}$/u.test(normalized.recipientWalletAddress))
    ) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

function normalizeHex32(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  return /^[0-9a-f]{64}$/u.test(normalized) ? `0x${normalized}` : '';
}

function getPublicShareUrl(currentHref: string): URL {
  const current = new URL(currentHref);
  const url = new URL(currentHref);

  if (url.hostname.endsWith('.app.paseo.li') || url.hostname.endsWith('.app.dev-dot.li')) {
    url.hostname = url.hostname
      .replace(/\.app\.paseo\.li$/u, '.paseo.li')
      .replace(/\.app\.dev-dot\.li$/u, '.dev-dot.li');
    url.pathname = '/';
    const chainBackend = current.searchParams.get('chainBackend') ?? 'rpc-gateway';
    url.search = '';
    url.searchParams.set('chainBackend', chainBackend);
  }

  for (const key of [GROUP_PARAM, MEMBER_PARAM, REQUEST_PARAM, INVITE_PARAM, 'payUpdate', 'cid', 'v']) {
    url.searchParams.delete(key);
  }
  return url;
}

function normalizeText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
