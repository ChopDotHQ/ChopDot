import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import {verifyProductAccountSignature} from './groupKeyHandoff.ts';

const encoder = new TextEncoder();
const REQUEST_DOMAIN = 'chopdot:limited-no-app-action-request:v1';
const RESPONSE_DOMAIN = 'chopdot:limited-no-app-action-response:v1';

export type LimitedNoAppAction = 'MARK_PAID' | 'DECLINE_PAYMENT';
export type LimitedNoAppResponseDecision = 'MARKED_PAID' | 'DECLINED';

export interface SignedLimitedNoAppActionV1 {
  v: 1;
  requestId: string;
  organizerId: string;
  organizerAccountPublicKeyHex: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  groupId: string;
  expenseId: string;
  action: LimitedNoAppAction;
  amountMinor: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  signature: string;
}

export interface SignedLimitedNoAppResponseV1 {
  v: 1;
  responseId: string;
  requestId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  expenseId: string;
  action: LimitedNoAppAction;
  decision: LimitedNoAppResponseDecision;
  amountMinor: number;
  currency: string;
  respondedAt: string;
  signature: string;
}

export interface LimitedNoAppActionState {
  requests: Record<string, SignedLimitedNoAppActionV1>;
  responses: Record<string, SignedLimitedNoAppResponseV1>;
}

export interface LimitedNoAppTransition {
  state: LimitedNoAppActionState;
  outcome: 'applied' | 'idempotent' | 'rejected';
  reason?: string;
}

export function createLimitedNoAppActionState(): LimitedNoAppActionState {
  return {requests: {}, responses: {}};
}

export function assertSignedLimitedNoAppAction(value: unknown): asserts value is SignedLimitedNoAppActionV1 {
  canonicalRequest(value as SignedLimitedNoAppActionV1);
}

export async function createSignedLimitedNoAppAction(input: {
  requestId: string;
  organizerId: string;
  organizerAccountPublicKeyHex: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  groupId: string;
  expenseId: string;
  action: LimitedNoAppAction;
  amountMinor: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  signer: AccountMessageSigner;
}): Promise<SignedLimitedNoAppActionV1> {
  const unsigned = canonicalUnsignedRequest(input);
  const signature = await input.signer.signBytes(signingBytes(REQUEST_DOMAIN, unsigned));
  assertSignatureBytes(signature);
  return {...unsigned, signature: bytesToHex(signature)};
}

export async function createSignedLimitedNoAppResponse(input: {
  request: SignedLimitedNoAppActionV1;
  responseId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  decision: LimitedNoAppResponseDecision;
  respondedAt: string;
  signer: AccountMessageSigner;
  verifier?: AccountMessageVerifier;
}): Promise<SignedLimitedNoAppResponseV1> {
  const request = canonicalRequest(input.request);
  if (!await verifyRequest(request, input.verifier)) throw new Error('Limited action could not be verified.');
  if (
    input.recipientId.trim() !== request.recipientId
    || normalizeAccountKey(input.recipientAccountPublicKeyHex) !== request.recipientAccountPublicKeyHex
    || !isTimestamp(input.respondedAt)
    || Date.parse(input.respondedAt) < Date.parse(request.createdAt)
    || Date.parse(input.respondedAt) >= Date.parse(request.expiresAt)
    || !decisionMatches(request.action, input.decision)
  ) throw new Error('Limited response does not match this action.');
  const unsigned = canonicalUnsignedResponse({
    responseId: input.responseId,
    requestId: request.requestId,
    recipientId: request.recipientId,
    recipientAccountPublicKeyHex: request.recipientAccountPublicKeyHex,
    expenseId: request.expenseId,
    action: request.action,
    decision: input.decision,
    amountMinor: request.amountMinor,
    currency: request.currency,
    respondedAt: input.respondedAt,
  });
  const signature = await input.signer.signBytes(signingBytes(RESPONSE_DOMAIN, unsigned));
  assertSignatureBytes(signature);
  return {...unsigned, signature: bytesToHex(signature)};
}

export async function applyLimitedNoAppRequest(
  current: LimitedNoAppActionState,
  value: SignedLimitedNoAppActionV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<LimitedNoAppTransition> {
  let request: SignedLimitedNoAppActionV1;
  try { request = canonicalRequest(value); } catch { return rejected(current, 'Limited action is invalid.'); }
  const existing = current.requests[request.requestId];
  if (existing) {
    return stableSerialize(existing) === stableSerialize(request)
      ? {state: current, outcome: 'idempotent'}
      : rejected(current, 'Limited action identifier is already in use.');
  }
  if (!await verifyRequest(request, verifier)) return rejected(current, 'Limited action could not be verified.');
  return {state: {...current, requests: {...current.requests, [request.requestId]: request}}, outcome: 'applied'};
}

export async function applyLimitedNoAppResponse(
  current: LimitedNoAppActionState,
  value: SignedLimitedNoAppResponseV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<LimitedNoAppTransition> {
  let response: SignedLimitedNoAppResponseV1;
  try { response = canonicalResponse(value); } catch { return rejected(current, 'Limited response is invalid.'); }
  const request = current.requests[response.requestId];
  if (!request) return rejected(current, 'Limited action is not available.');
  if (
    response.recipientId !== request.recipientId
    || response.recipientAccountPublicKeyHex !== request.recipientAccountPublicKeyHex
    || response.expenseId !== request.expenseId
    || response.action !== request.action
    || !decisionMatches(request.action, response.decision)
    || response.amountMinor !== request.amountMinor
    || response.currency !== request.currency
    || Date.parse(response.respondedAt) < Date.parse(request.createdAt)
    || Date.parse(response.respondedAt) >= Date.parse(request.expiresAt)
  ) return rejected(current, 'Limited response does not match this action.');
  const existing = current.responses[response.requestId];
  if (existing) {
    return stableSerialize(existing) === stableSerialize(response)
      ? {state: current, outcome: 'idempotent'}
      : rejected(current, 'This limited action already has another response.');
  }
  if (!await verifyResponse(response, verifier)) return rejected(current, 'Limited response could not be verified.');
  return {state: {...current, responses: {...current.responses, [response.requestId]: response}}, outcome: 'applied'};
}

function canonicalRequest(value: SignedLimitedNoAppActionV1): SignedLimitedNoAppActionV1 {
  assertExactKeys(value, [
    'v', 'requestId', 'organizerId', 'organizerAccountPublicKeyHex', 'recipientId',
    'recipientAccountPublicKeyHex', 'groupId', 'expenseId', 'action', 'amountMinor',
    'currency', 'createdAt', 'expiresAt', 'signature',
  ]);
  if (value.v !== 1 || !/^0x[0-9a-f]{128}$/u.test(value.signature.toLowerCase())) throw new Error('Invalid request.');
  return {...canonicalUnsignedRequest(value), signature: value.signature.toLowerCase()};
}

function canonicalUnsignedRequest(value: Omit<SignedLimitedNoAppActionV1, 'v' | 'signature'>): Omit<SignedLimitedNoAppActionV1, 'signature'> {
  const result = {
    v: 1 as const,
    requestId: required(value.requestId),
    organizerId: required(value.organizerId),
    organizerAccountPublicKeyHex: normalizeAccountKey(value.organizerAccountPublicKeyHex),
    recipientId: required(value.recipientId),
    recipientAccountPublicKeyHex: normalizeAccountKey(value.recipientAccountPublicKeyHex),
    groupId: required(value.groupId),
    expenseId: required(value.expenseId),
    action: value.action,
    amountMinor: value.amountMinor,
    currency: canonicalCurrency(value.currency),
    createdAt: canonicalTimestamp(value.createdAt),
    expiresAt: canonicalTimestamp(value.expiresAt),
  };
  if (
    !result.organizerAccountPublicKeyHex
    || !result.recipientAccountPublicKeyHex
    || result.organizerId === result.recipientId
    || !['MARK_PAID', 'DECLINE_PAYMENT'].includes(result.action)
    || !Number.isSafeInteger(result.amountMinor)
    || result.amountMinor <= 0
    || Date.parse(result.expiresAt) <= Date.parse(result.createdAt)
  ) throw new Error('Invalid request.');
  return result;
}

function canonicalResponse(value: SignedLimitedNoAppResponseV1): SignedLimitedNoAppResponseV1 {
  assertExactKeys(value, [
    'v', 'responseId', 'requestId', 'recipientId', 'recipientAccountPublicKeyHex',
    'expenseId', 'action', 'decision', 'amountMinor', 'currency', 'respondedAt', 'signature',
  ]);
  if (value.v !== 1 || !/^0x[0-9a-f]{128}$/u.test(value.signature.toLowerCase())) throw new Error('Invalid response.');
  return {...canonicalUnsignedResponse(value), signature: value.signature.toLowerCase()};
}

function canonicalUnsignedResponse(value: Omit<SignedLimitedNoAppResponseV1, 'v' | 'signature'>): Omit<SignedLimitedNoAppResponseV1, 'signature'> {
  const result = {
    v: 1 as const,
    responseId: required(value.responseId),
    requestId: required(value.requestId),
    recipientId: required(value.recipientId),
    recipientAccountPublicKeyHex: normalizeAccountKey(value.recipientAccountPublicKeyHex),
    expenseId: required(value.expenseId),
    action: value.action,
    decision: value.decision,
    amountMinor: value.amountMinor,
    currency: canonicalCurrency(value.currency),
    respondedAt: canonicalTimestamp(value.respondedAt),
  };
  if (
    !result.recipientAccountPublicKeyHex
    || !['MARK_PAID', 'DECLINE_PAYMENT'].includes(result.action)
    || !['MARKED_PAID', 'DECLINED'].includes(result.decision)
    || !Number.isSafeInteger(result.amountMinor)
    || result.amountMinor <= 0
  ) throw new Error('Invalid response.');
  return result;
}

async function verifyRequest(value: SignedLimitedNoAppActionV1, verifier = verifyProductAccountSignature): Promise<boolean> {
  return verifier(
    value.organizerAccountPublicKeyHex,
    signingBytes(REQUEST_DOMAIN, unsignedRequest(value)),
    hexToBytes(value.signature),
  );
}

async function verifyResponse(value: SignedLimitedNoAppResponseV1, verifier = verifyProductAccountSignature): Promise<boolean> {
  return verifier(
    value.recipientAccountPublicKeyHex,
    signingBytes(RESPONSE_DOMAIN, unsignedResponse(value)),
    hexToBytes(value.signature),
  );
}

function unsignedRequest(value: SignedLimitedNoAppActionV1): Omit<SignedLimitedNoAppActionV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function unsignedResponse(value: SignedLimitedNoAppResponseV1): Omit<SignedLimitedNoAppResponseV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function decisionMatches(action: LimitedNoAppAction, decision: LimitedNoAppResponseDecision): boolean {
  return (action === 'MARK_PAID' && decision === 'MARKED_PAID')
    || (action === 'DECLINE_PAYMENT' && decision === 'DECLINED');
}

function signingBytes(domain: string, value: unknown): Uint8Array {
  return encoder.encode(stableSerialize([domain, value]));
}

function canonicalCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3,8}$/u.test(normalized)) throw new Error('Invalid currency.');
  return normalized;
}

function canonicalTimestamp(value: string): string {
  if (!isTimestamp(value)) throw new Error('Invalid timestamp.');
  return new Date(value).toISOString();
}

function required(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error('Required value is missing.');
  return normalized;
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function assertExactKeys(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid envelope.');
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error('Limited action contains unsupported authority or state.');
  }
}

function assertSignatureBytes(value: Uint8Array): void {
  if (value.byteLength !== 64) throw new Error('Limited action could not be signed.');
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/u, '');
  if (!/^[0-9a-f]{128}$/u.test(normalized)) throw new Error('Invalid signature.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function rejected(state: LimitedNoAppActionState, reason: string): LimitedNoAppTransition {
  return {state, outcome: 'rejected', reason};
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
