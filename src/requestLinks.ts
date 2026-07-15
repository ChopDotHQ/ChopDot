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
};

export type PayerMarkedPaidUpdate = {
  action: 'marked_paid';
  requestId: string;
  groupId: string;
  memberId: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
};

const GROUP_PARAM = 'payGroupId';
const MEMBER_PARAM = 'payMemberId';
const REQUEST_PARAM = 'payRequest';
const UPDATE_PARAM = 'payUpdate';
const MAX_PACKET_LENGTH = 2200;
const MAX_TEXT_LENGTH = 80;
const MAX_REQUEST_ID_LENGTH = 140;
const MAX_AMOUNT = 1_000_000;

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

export function buildPayerMarkedPaidReturnUrl(
  groupId: string,
  memberId: string,
  request: StandalonePayerRequest,
  currentHref = window.location.href,
): string {
  const url = getPublicShareUrl(currentHref);
  url.searchParams.set(GROUP_PARAM, groupId);
  url.searchParams.set(MEMBER_PARAM, memberId);
  url.searchParams.set(UPDATE_PARAM, encodePacket({
    action: 'marked_paid',
    requestId: request.requestId,
    groupId,
    memberId,
    amount: request.amount,
    currency: request.currency,
    createdAt: new Date().toISOString(),
    expiresAt: request.expiresAt,
  } satisfies PayerMarkedPaidUpdate));
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

export function parsePayerMarkedPaidUpdate(search = window.location.search): PayerMarkedPaidUpdate | null {
  const packet = new URLSearchParams(search).get(UPDATE_PARAM);
  if (!packet || packet.length > MAX_PACKET_LENGTH) return null;

  const parsed = decodePacket<Partial<PayerMarkedPaidUpdate>>(packet);
  if (
    !parsed ||
    parsed.action !== 'marked_paid' ||
    typeof parsed.requestId !== 'string' ||
    typeof parsed.groupId !== 'string' ||
    typeof parsed.memberId !== 'string' ||
    typeof parsed.amount !== 'number' ||
    typeof parsed.currency !== 'string' ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.expiresAt !== 'string'
  ) {
    return null;
  }

  const normalized: PayerMarkedPaidUpdate = {
    action: 'marked_paid',
    requestId: normalizeText(parsed.requestId, MAX_REQUEST_ID_LENGTH),
    groupId: normalizeText(parsed.groupId, MAX_REQUEST_ID_LENGTH),
    memberId: normalizeText(parsed.memberId, MAX_REQUEST_ID_LENGTH),
    amount: parsed.amount,
    currency: parsed.currency.trim().toUpperCase(),
    createdAt: parsed.createdAt,
    expiresAt: parsed.expiresAt,
  };

  if (
    !normalized.requestId ||
    !normalized.groupId ||
    !normalized.memberId ||
    !Number.isFinite(normalized.amount) ||
    normalized.amount <= 0 ||
    normalized.amount > MAX_AMOUNT ||
    !/^[A-Z]{3}$/.test(normalized.currency) ||
    Number.isNaN(Date.parse(normalized.createdAt)) ||
    Number.isNaN(Date.parse(normalized.expiresAt)) ||
    Date.parse(normalized.expiresAt) <= Date.now()
  ) {
    return null;
  }

  return normalized;
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
      typeof parsed.createdAt !== 'string'
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
      || (normalized.recipientWalletAddress !== undefined && !/^0x[0-9a-f]{40}$/u.test(normalized.recipientWalletAddress))
    ) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

function getPublicShareUrl(currentHref: string): URL {
  const current = new URL(currentHref);
  const url = new URL(currentHref);

  if (url.hostname.endsWith('.app.paseo.li')) {
    url.hostname = url.hostname.replace(/\.app\.paseo\.li$/u, '.paseo.li');
    url.pathname = '/';
    const chainBackend = current.searchParams.get('chainBackend') ?? 'rpc-gateway';
    url.search = '';
    url.searchParams.set('chainBackend', chainBackend);
  }

  for (const key of [GROUP_PARAM, MEMBER_PARAM, REQUEST_PARAM, UPDATE_PARAM, 'cid', 'v']) {
    url.searchParams.delete(key);
  }
  return url;
}

function normalizeText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
