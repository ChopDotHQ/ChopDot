import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const TERMINAL_STATES = Object.freeze([
  'succeeded',
  'failed_verification',
  'blocked',
  'approval_required',
  'budget_exhausted',
  'cancelled',
]);

export const EFFECT_STATES = Object.freeze([
  'planned',
  'approved',
  'dispatching',
  'observed',
  'verified',
  'failed',
  'unknown_needs_reconciliation',
]);

export function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON rejects non-finite numbers');
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

export function digestObject(value) {
  return sha256(canonicalJson(value));
}

export function nowIso(clock = Date) {
  return new clock().toISOString();
}

export function makeId(prefix = 'id') {
  return `${prefix}_${randomUUID()}`;
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${canonicalJson(value)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

export function assertSafeChild(root, candidate, label = 'path') {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label} escapes root: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

export function parseDurationMs(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== 'string') throw new TypeError('Duration must be a number or duration string');
  const match = /^(\d+)(ms|s|m|h)$/.exec(value.trim());
  if (!match) throw new TypeError(`Invalid duration: ${value}`);
  const multipliers = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 };
  return Number(match[1]) * multipliers[match[2]];
}

export function normalizeRoot(root) {
  if (!root || typeof root !== 'string') throw new TypeError('Exact root is required');
  return path.resolve(root);
}

export function errorRecord(error) {
  return {
    name: error?.name ?? 'Error',
    message: String(error?.message ?? error),
    code: error?.code ?? null,
  };
}
