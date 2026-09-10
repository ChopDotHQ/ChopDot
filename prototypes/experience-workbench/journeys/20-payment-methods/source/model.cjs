'use strict';

const crypto = require('node:crypto');

const METHOD_TYPES = Object.freeze({
  BANK: 'bank',
  TWINT: 'twint',
  PAYPAL: 'paypal',
  CRYPTO: 'crypto',
});

const SECRET_FIELDS = /(^|_)(seed|mnemonic|private.?key|password|passphrase|secret|signing.?key|recovery.?phrase)(_|$)/i;

const DEMO_METHODS = Object.freeze([
  {
    id: 'm-bank-chf', kind: METHOD_TYPES.BANK, label: 'Main CHF account', version: 3,
    supportedAssets: ['CHF'], available: true,
    fields: { holder: 'Dev Demo', iban: 'CH9300762011623852957', reference: 'ChopDot demo' },
  },
  {
    id: 'm-twint-chf', kind: METHOD_TYPES.TWINT, label: 'TWINT', version: 2,
    supportedAssets: ['CHF'], available: true,
    fields: { phone: '+41790000000', handle: '' },
  },
  {
    id: 'm-paypal-chf', kind: METHOD_TYPES.PAYPAL, label: 'PayPal', version: 1,
    supportedAssets: ['CHF'], available: false,
    fields: { email: 'demo.user@example.invalid', username: 'demo-user' },
  },
  {
    id: 'm-dot-polkadot', kind: METHOD_TYPES.CRYPTO, label: 'DOT receiving destination', version: 4,
    supportedAssets: ['DOT'], network: 'polkadot', available: true,
    fields: { address: '5DemoDotDestination111111111111111111111111111111', network: 'polkadot', asset: 'DOT' },
  },
]);

const DEMO_PREFERENCES = Object.freeze({
  'fiat:CHF': 'm-bank-chf',
  'crypto:DOT:polkadot': 'm-dot-polkadot',
});

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function normSpace(v) { return String(v ?? '').trim().replace(/\s+/g, ' '); }
function normalizeIban(v) { return String(v ?? '').replace(/\s+/g, '').toUpperCase(); }
function normalizePhone(v) { return String(v ?? '').replace(/[^+\d]/g, ''); }
function normalizeEmail(v) { return String(v ?? '').trim().toLowerCase(); }
function normalizeHandle(v) { return String(v ?? '').trim().replace(/^@/, '').toLowerCase(); }
function normalizeAddress(v) { return String(v ?? '').trim(); }
function normalizeNetwork(v) { return String(v ?? '').trim().toLowerCase(); }
function normalizeAsset(v) { return String(v ?? '').trim().toUpperCase(); }

function containsSecretFields(input) {
  const stack = [input];
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_FIELDS.test(key)) return true;
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return false;
}

function normalizeDraft(draft) {
  const d = clone(draft || {});
  d.kind = String(d.kind || '').toLowerCase();
  d.label = normSpace(d.label);
  d.fields = d.fields || {};
  if (d.kind === METHOD_TYPES.BANK) {
    d.fields.holder = normSpace(d.fields.holder);
    d.fields.iban = normalizeIban(d.fields.iban);
    d.fields.reference = normSpace(d.fields.reference);
    d.supportedAssets = ['CHF'];
  } else if (d.kind === METHOD_TYPES.TWINT) {
    d.fields.phone = normalizePhone(d.fields.phone);
    d.fields.handle = normalizeHandle(d.fields.handle);
    d.supportedAssets = ['CHF'];
  } else if (d.kind === METHOD_TYPES.PAYPAL) {
    d.fields.email = normalizeEmail(d.fields.email);
    d.fields.username = normalizeHandle(d.fields.username);
    d.supportedAssets = [normalizeAsset(d.asset || 'CHF') || 'CHF'];
  } else if (d.kind === METHOD_TYPES.CRYPTO) {
    d.fields.address = normalizeAddress(d.fields.address);
    d.fields.network = normalizeNetwork(d.fields.network || d.network);
    d.fields.asset = normalizeAsset(d.fields.asset || d.asset);
    d.network = d.fields.network;
    d.supportedAssets = d.fields.asset ? [d.fields.asset] : [];
  }
  return d;
}

function validateDraft(input) {
  if (containsSecretFields(input)) return { ok: false, code: 'secret-field', formatComplete: false, providerVerified: false };
  const d = normalizeDraft(input);
  const fail = (code) => ({ ok: false, code, formatComplete: false, providerVerified: false, normalized: d });
  if (!Object.values(METHOD_TYPES).includes(d.kind)) return fail('unsupported-kind');
  if (!d.label) return fail('missing-label');
  if (d.kind === METHOD_TYPES.BANK) {
    if (!d.fields.holder) return fail('missing-holder');
    if (!/^CH\d{19}$/.test(d.fields.iban)) return fail('invalid-iban-format');
  }
  if (d.kind === METHOD_TYPES.TWINT && !d.fields.phone && !d.fields.handle) return fail('missing-twint-destination');
  if (d.kind === METHOD_TYPES.TWINT && d.fields.phone && !/^\+?\d{9,15}$/.test(d.fields.phone)) return fail('invalid-phone-format');
  if (d.kind === METHOD_TYPES.PAYPAL && !d.fields.email && !d.fields.username) return fail('missing-paypal-destination');
  if (d.kind === METHOD_TYPES.PAYPAL && d.fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.fields.email)) return fail('invalid-email-format');
  if (d.kind === METHOD_TYPES.CRYPTO) {
    if (!d.fields.asset) return fail('missing-asset');
    if (!d.fields.network) return fail('missing-network');
    if (!d.fields.address || d.fields.address.length < 12) return fail('invalid-address-format');
  }
  return { ok: true, code: 'format-complete', formatComplete: true, providerVerified: false, normalized: d };
}

function maskIban(v) {
  const x = normalizeIban(v);
  if (x.length < 8) return '••••';
  return `${x.slice(0,4)} •••• •••• ${x.slice(-4)}`;
}
function maskPhone(v) {
  const x = normalizePhone(v);
  if (x.length < 6) return '••••';
  return `${x.slice(0,5)} ••• •• ${x.slice(-2)}`;
}
function maskEmail(v) {
  const x = normalizeEmail(v);
  const [local, domain] = x.split('@');
  if (!domain) return '••••';
  return `${(local || '•').slice(0,1)}•••@${domain}`;
}
function maskHandle(v) { const x = normalizeHandle(v); return x ? `@${x.slice(0,2)}•••` : ''; }
function maskAddress(v) { const x = normalizeAddress(v); return x.length >= 12 ? `${x.slice(0,6)}…${x.slice(-6)}` : '••••'; }

function maskedDestination(method) {
  const m = normalizeDraft(method);
  if (m.kind === METHOD_TYPES.BANK) return maskIban(m.fields.iban);
  if (m.kind === METHOD_TYPES.TWINT) return m.fields.phone ? maskPhone(m.fields.phone) : maskHandle(m.fields.handle);
  if (m.kind === METHOD_TYPES.PAYPAL) return m.fields.email ? maskEmail(m.fields.email) : maskHandle(m.fields.username);
  if (m.kind === METHOD_TYPES.CRYPTO) return maskAddress(m.fields.address);
  return 'Unsupported';
}

function fingerprint(input) {
  const m = normalizeDraft(input);
  let payload;
  if (m.kind === METHOD_TYPES.BANK) payload = ['bank', m.fields.iban];
  else if (m.kind === METHOD_TYPES.TWINT) payload = ['twint', m.fields.phone || '', m.fields.handle || ''];
  else if (m.kind === METHOD_TYPES.PAYPAL) payload = ['paypal', m.fields.email || '', m.fields.username || ''];
  else if (m.kind === METHOD_TYPES.CRYPTO) payload = ['crypto', m.fields.asset || '', m.fields.network || '', m.fields.address || ''];
  else payload = ['unsupported'];
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function duplicateOf(input, methods = DEMO_METHODS, excludeId = null) {
  const target = fingerprint(input);
  return methods.find(m => m.id !== excludeId && fingerprint(m) === target) || null;
}

function preferenceScope(context) {
  const asset = normalizeAsset(context?.asset);
  const network = normalizeNetwork(context?.network);
  if (!asset) return null;
  return network ? `crypto:${asset}:${network}` : `fiat:${asset}`;
}

function compatibility(method, context) {
  const m = normalizeDraft(method);
  const asset = normalizeAsset(context?.asset);
  const network = normalizeNetwork(context?.network);
  if (!asset) return { compatible: false, reason: 'missing-context-asset' };
  if (!(m.supportedAssets || []).map(normalizeAsset).includes(asset)) return { compatible: false, reason: 'asset-mismatch' };
  if (m.kind === METHOD_TYPES.CRYPTO) {
    if (!network) return { compatible: false, reason: 'network-required' };
    if (normalizeNetwork(m.network || m.fields.network) !== network) return { compatible: false, reason: 'network-mismatch' };
  } else if (network) {
    return { compatible: false, reason: 'network-not-supported' };
  }
  return { compatible: true, reason: 'compatible' };
}

function suggestedMethod(methods, preferences, context) {
  const scope = preferenceScope(context);
  const preferredId = scope ? preferences?.[scope] : null;
  const preferred = methods.find(m => m.id === preferredId && m.available !== false && compatibility(m, context).compatible);
  if (preferred) return preferred;
  return methods.find(m => m.available !== false && compatibility(m, context).compatible) || null;
}

function setPreference(preferences, methods, methodId, context) {
  const method = methods.find(m => m.id === methodId);
  if (!method) return { ok: false, code: 'method-not-found', preferences: clone(preferences || {}) };
  const compat = compatibility(method, context);
  if (!compat.compatible) return { ok: false, code: compat.reason, preferences: clone(preferences || {}) };
  const scope = preferenceScope(context);
  const next = clone(preferences || {});
  next[scope] = methodId;
  return { ok: true, code: 'preference-saved', scope, preferences: next, paymentAuthorized: false };
}

function createMethod(draft, existing = DEMO_METHODS, id = 'm-new') {
  const val = validateDraft(draft);
  if (!val.ok) return { ok: false, code: val.code };
  const dup = duplicateOf(val.normalized, existing);
  if (dup) return { ok: false, code: 'duplicate-method', existingId: dup.id };
  return { ok: true, code: 'created', method: { ...val.normalized, id, version: 1, available: Boolean(draft.available) }, paymentAuthorized: false };
}

function editMethod(existing, patch, allMethods = DEMO_METHODS) {
  if (!existing || existing.removed) return { ok: false, code: 'method-unavailable' };
  const merged = { ...clone(existing), ...clone(patch), fields: { ...(existing.fields || {}), ...(patch?.fields || {}) } };
  const val = validateDraft(merged);
  if (!val.ok) return { ok: false, code: val.code };
  const dup = duplicateOf(val.normalized, allMethods, existing.id);
  if (dup) return { ok: false, code: 'duplicate-method', existingId: dup.id };
  const next = { ...existing, ...val.normalized, id: existing.id, version: Number(existing.version || 0) + 1, available: patch?.available ?? existing.available };
  return { ok: true, code: 'updated', method: next, previousVersion: existing.version, paymentAuthorized: false };
}

function bindReference(method, purpose = 'share') {
  return { purpose, methodId: method.id, version: method.version, createdFromActiveMethod: !method.removed };
}

function resolveReference(binding, methods) {
  const method = methods.find(m => m.id === binding.methodId);
  if (!method || method.removed) return { state: 'stale-removed', usable: false };
  if (method.version !== binding.version) return { state: 'stale-edited', usable: false, currentVersion: method.version };
  return { state: 'current', usable: true, method };
}

function removeMethod(existing) {
  if (!existing || existing.removed) return { ok: false, code: 'already-removed' };
  return { ok: true, code: 'removed', method: { ...clone(existing), removed: true, available: false, version: Number(existing.version || 0) + 1 }, balancesChanged: false, paymentReversed: false, historyDeleted: false };
}

function historicalPayment(method) {
  return { id: 'payment-demo-1', methodId: method.id, methodVersion: method.version, kind: method.kind, asset: method.supportedAssets?.[0] || null, settled: true };
}

function applyCommand(ledger, command) {
  const next = clone(ledger || {});
  if (!command?.id) return { ok: false, code: 'missing-command-id', ledger: next };
  if (next[command.id]) return { ok: true, code: 'idempotent-replay', record: next[command.id], ledger: next };
  const outcome = command.simulatedOutcome || 'accepted';
  const record = { id: command.id, operation: command.operation, outcome, accepted: outcome === 'accepted' ? true : outcome === 'failed' ? false : null };
  next[command.id] = record;
  return { ok: true, code: outcome === 'unknown' ? 'result-unknown' : outcome, record, ledger: next };
}

function retryPolicy(record) {
  if (!record) return { canRetry: true, mustRecover: false, reason: 'no-prior-attempt' };
  if (record.accepted === null) return { canRetry: false, mustRecover: true, reason: 'original-result-unknown' };
  if (record.accepted === true) return { canRetry: false, mustRecover: false, reason: 'already-accepted' };
  return { canRetry: true, mustRecover: false, reason: 'verified-not-accepted' };
}

function recoverCommand(ledger, commandId, recoveredAccepted) {
  const next = clone(ledger || {});
  const record = next[commandId];
  if (!record) return { ok: false, code: 'command-not-found', ledger: next };
  if (record.accepted !== null) return { ok: true, code: 'already-known', record, ledger: next };
  record.accepted = Boolean(recoveredAccepted);
  record.outcome = recoveredAccepted ? 'accepted' : 'failed';
  return { ok: true, code: 'recovered', record, ledger: next };
}

module.exports = {
  METHOD_TYPES, SECRET_FIELDS, DEMO_METHODS, DEMO_PREFERENCES,
  clone, containsSecretFields, normalizeDraft, validateDraft,
  maskIban, maskPhone, maskEmail, maskHandle, maskAddress, maskedDestination,
  fingerprint, duplicateOf, preferenceScope, compatibility, suggestedMethod, setPreference,
  createMethod, editMethod, bindReference, resolveReference, removeMethod, historicalPayment,
  applyCommand, retryPolicy, recoverCommand,
};
