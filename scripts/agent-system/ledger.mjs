import { open, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  TERMINAL_STATES, canonicalJson, digestObject, errorRecord, makeId, nowIso,
  readJson, sha256, writeJsonAtomic,
} from './core.mjs';
import { contractBudgetLimits } from './contract.mjs';
import { validateGovernanceInstance } from './schema.mjs';

export const EVENT_TYPES = Object.freeze([
  'declared', 'preflight_passed', 'preflight_failed', 'work_started',
  'observation_recorded', 'artifact_recorded', 'evaluation_started',
  'evaluation_finished', 'repair_directed', 'approval_requested',
  'approval_recorded', 'effect_planned', 'effect_approved', 'effect_dispatching',
  'effect_dispatched', 'effect_read_back', 'effect_failed',
  'effect_reconciliation_required', 'budget_consumed', 'checkpointed', 'terminated',
]);

const ZERO_DIGEST = '0'.repeat(64);

function unsignedEvent(event) {
  const { event_digest: _ignored, ...unsigned } = event;
  return unsigned;
}

export function computeEventDigest(event) {
  return digestObject(unsignedEvent(event));
}

export async function readEvents(runDirectory) {
  const file = path.join(runDirectory, 'events.jsonl');
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!raw) return [];
  if (!raw.endsWith('\n')) throw new Error(`Corrupt ledger: incomplete trailing event in ${file}`);
  return raw.split('\n').filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`Corrupt ledger JSON at line ${index + 1}: ${error.message}`); }
  });
}

export function verifyEventChain(events, expectedRunId) {
  let previous = ZERO_DIGEST;
  const seen = new Set();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const schema = validateGovernanceInstance(event, 'agent-run-event.v1.schema.json');
    if (!schema.valid) throw new Error(`Ledger event schema invalid at ${index + 1}: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
    if (event.sequence !== index) throw new Error(`Ledger sequence mismatch at ${index}`);
    if (expectedRunId && event.run_id !== expectedRunId) throw new Error(`Ledger run mismatch at ${index + 1}`);
    if (event.previous_digest !== (index === 0 ? null : previous)) throw new Error(`Ledger previous digest mismatch at ${index}`);
    if (seen.has(event.event_id)) throw new Error(`Duplicate event ID at ${index + 1}`);
    if (sha256(canonicalJson(event.payload ?? null)) !== event.payload_digest) throw new Error(`Ledger payload digest mismatch at ${index + 1}`);
    if (computeEventDigest(event) !== event.event_digest) throw new Error(`Ledger event digest mismatch at ${index + 1}`);
    seen.add(event.event_id);
    previous = event.event_digest;
  }
  return { valid: true, count: events.length, head_digest: previous };
}

export async function verifyLedger(runDirectory, expectedRunId) {
  const events = await readEvents(runDirectory);
  return { ...verifyEventChain(events, expectedRunId), events };
}

export async function appendEvent(runDirectory, input) {
  const events = await readEvents(runDirectory);
  verifyEventChain(events, input.run_id);
  if (!EVENT_TYPES.includes(input.event_type)) throw new Error(`Unknown event type: ${input.event_type}`);
  if (events.some((event) => event.event_type === 'terminated')) throw new Error('Terminated runs are immutable');
  const eventNow = input.now ?? (input.timestamp ? Date.parse(input.timestamp) : Date.now());
  if (events.length) {
    const snapshot = reduceEvents(events);
    const contract = await readJson(path.join(runDirectory, 'contract.json'));
    const budget = budgetStatus(contract, snapshot, eventNow);
    const boundedTermination = input.event_type === 'terminated' && input.payload?.terminal_state !== 'succeeded';
    const safetyReadback = ['effect_read_back', 'effect_failed', 'effect_reconciliation_required'].includes(input.event_type);
    if (budget.exhausted.length && !boundedTermination && !safetyReadback) throw new Error(`Run budget exhausted: ${budget.exhausted.join(', ')}`);
  }
  const payload = input.payload ?? {};
  const event = {
    event_version: '1.0.0',
    run_id: input.run_id,
    sequence: events.length,
    event_id: input.event_id ?? makeId('event'),
    event_type: input.event_type,
    timestamp: input.timestamp ?? new Date(eventNow).toISOString(),
    actor: normalizeActor(input.actor),
    previous_digest: events.at(-1)?.event_digest ?? null,
    payload,
    payload_digest: sha256(canonicalJson(payload)),
  };
  event.event_digest = computeEventDigest(event);
  const schema = validateGovernanceInstance(event, 'agent-run-event.v1.schema.json');
  if (!schema.valid) throw new Error(`Event schema invalid: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await appendLine(path.join(runDirectory, 'events.jsonl'), canonicalJson(event));
  const snapshot = reduceEvents([...events, event]);
  await writeJsonAtomic(path.join(runDirectory, 'snapshot.json'), snapshot);
  return { event, snapshot };
}

function normalizeActor(actor) {
  if (actor && typeof actor === 'object') return actor;
  return { id: actor ?? 'runner', kind: actor === 'operator' ? 'human' : 'deterministic_runner' };
}

async function appendLine(file, line) {
  const handle = await open(file, 'a', 0o600);
  try {
    await handle.write(`${line}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export function reduceEvents(events) {
  verifyEventChain(events, events[0]?.run_id);
  const state = {
    snapshot_version: '1.0.0',
    run_id: events[0]?.run_id ?? null,
    sequence: -1,
    head_digest: ZERO_DIGEST,
    status: 'empty',
    terminal_state: null,
    contract_digest: null,
    started_at: null,
    updated_at: null,
    iterations: 0,
    retries: 0,
    tool_calls: 0,
    model_cost: 0,
    external_cost: 0,
    observations: [],
    artifacts: [],
    evaluations: [],
    repairs: [],
    approvals: {},
    effects: {},
    checkpoints: [],
  };
  for (const event of events) {
    state.sequence = event.sequence;
    state.head_digest = event.event_digest;
    state.updated_at = event.timestamp;
    const payload = event.payload ?? {};
    switch (event.event_type) {
      case 'declared':
        state.status = 'declared'; state.contract_digest = payload.contract_digest; state.started_at = event.timestamp; break;
      case 'preflight_passed': state.status = 'ready'; break;
      case 'preflight_failed': state.status = 'blocked'; break;
      case 'work_started': state.status = 'running'; break;
      case 'observation_recorded': state.observations.push(payload); break;
      case 'artifact_recorded': state.artifacts.push(payload); break;
      case 'evaluation_started': state.status = 'evaluating'; break;
      case 'evaluation_finished': state.evaluations.push(payload); state.status = payload.verdict === 'accepted' ? 'evaluated' : 'failed_verification'; break;
      case 'repair_directed': state.repairs.push(payload); state.iterations += 1; state.retries += 1; state.status = 'repairing'; break;
      case 'approval_requested': state.approvals[payload.approval_id] = { ...payload, state: payload.decision ?? 'pending' }; state.status = 'approval_required'; break;
      case 'approval_recorded': state.approvals[payload.approval_id] = { ...(state.approvals[payload.approval_id] ?? {}), ...payload, state: payload.decision }; break;
      case 'effect_planned': state.effects[payload.effect_id] = { ...payload, state: 'planned' }; break;
      case 'effect_approved': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: 'approved' }; break;
      case 'effect_dispatching': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: 'dispatching' }; break;
      case 'effect_dispatched': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: 'unknown_needs_reconciliation' }; break;
      case 'effect_reconciliation_required': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: 'unknown_needs_reconciliation' }; break;
      case 'effect_read_back': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: payload.verified ? 'verified' : 'observed' }; break;
      case 'effect_failed': state.effects[payload.effect_id] = { ...state.effects[payload.effect_id], ...payload, state: 'failed' }; break;
      case 'budget_consumed':
        for (const key of ['tool_calls', 'model_cost', 'external_cost']) state[key] += payload[key] ?? 0;
        break;
      case 'checkpointed': state.checkpoints.push(payload); break;
      case 'terminated': state.status = payload.terminal_state; state.terminal_state = payload.terminal_state; break;
    }
  }
  return { ...state, snapshot_digest: digestObject({ ...state, snapshot_digest: undefined }) };
}

export async function rebuildSnapshot(runDirectory, expectedRunId) {
  const { events } = await verifyLedger(runDirectory, expectedRunId);
  const snapshot = reduceEvents(events);
  await writeJsonAtomic(path.join(runDirectory, 'snapshot.json'), snapshot);
  return snapshot;
}

export async function loadSnapshot(runDirectory, expectedRunId) {
  const rebuilt = await rebuildSnapshot(runDirectory, expectedRunId);
  try {
    const persisted = await readJson(path.join(runDirectory, 'snapshot.json'));
    if (persisted.snapshot_digest !== rebuilt.snapshot_digest) throw new Error('Snapshot digest mismatch');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return rebuilt;
}

export async function checkpoint(runDirectory, runId, actor = 'runner', options = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, runId);
  return appendEvent(runDirectory, {
    run_id: runId,
    event_type: 'checkpointed',
    actor,
    now: options.now,
    payload: { sequence: snapshot.sequence, head_digest: snapshot.head_digest, state_digest: snapshot.snapshot_digest },
  });
}

export async function terminate(runDirectory, runId, terminalState, details = {}, actor = 'runner', options = {}) {
  if (!TERMINAL_STATES.includes(terminalState)) throw new Error(`Unknown terminal state: ${terminalState}`);
  const snapshot = await rebuildSnapshot(runDirectory, runId);
  if (terminalState === 'succeeded') {
    const unresolved = Object.values(snapshot.effects).filter((effect) => !['verified', 'failed'].includes(effect.state));
    if (unresolved.length) throw new Error(`Cannot succeed with ${unresolved.length} unreconciled effect(s)`);
  }
  return appendEvent(runDirectory, { run_id: runId, event_type: 'terminated', actor, now: options.now, payload: { terminal_state: terminalState, ...details } });
}

export async function acquireLease(runDirectory, options = {}) {
  const leaseFile = path.join(runDirectory, 'lease.json');
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? 60_000;
  let existing = null;
  try { existing = await readJson(leaseFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing && Date.parse(existing.expires_at) > now) throw new Error(`Active lease held by ${existing.holder}`);
  if (existing) await rm(leaseFile, { force: true });
  const lease = {
    lease_id: makeId('lease'),
    holder: options.holder ?? `pid:${process.pid}`,
    acquired_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  };
  const handle = await open(leaseFile, 'wx', 0o600);
  try { await handle.write(`${canonicalJson(lease)}\n`); await handle.sync(); } finally { await handle.close(); }
  return lease;
}

export async function renewLease(runDirectory, lease, options = {}) {
  const current = await readJson(path.join(runDirectory, 'lease.json'));
  if (current.lease_id !== lease.lease_id) throw new Error('Lease ownership changed');
  return acquireLeaseAfterRemoval(runDirectory, { ...options, holder: lease.holder });
}

async function acquireLeaseAfterRemoval(runDirectory, options) {
  await rm(path.join(runDirectory, 'lease.json'), { force: true });
  return acquireLease(runDirectory, options);
}

export async function releaseLease(runDirectory, lease) {
  const leaseFile = path.join(runDirectory, 'lease.json');
  try {
    const current = await readJson(leaseFile);
    if (current.lease_id !== lease.lease_id) throw new Error('Cannot release another holder lease');
    await rm(leaseFile);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export function budgetStatus(contract, snapshot, now = Date.now()) {
  const elapsed = snapshot.started_at ? now - Date.parse(snapshot.started_at) : 0;
  const limits = contractBudgetLimits(contract);
  const consumed = {
    iterations: snapshot.iterations,
    retries: snapshot.retries,
    wall_time_ms: Math.max(0, elapsed),
    tool_calls: snapshot.tool_calls,
    model_cost: snapshot.model_cost,
    external_cost: snapshot.external_cost,
  };
  const exceeded = Object.keys(consumed).filter((key) => consumed[key] > limits[key]);
  const exhausted = Object.keys(consumed).filter((key) => limits[key] > 0 ? consumed[key] >= limits[key] : consumed[key] > limits[key]);
  return { limits, consumed, exceeded, exhausted, within_budget: exceeded.length === 0 };
}

export function remainingBudget(contract, snapshot, now = Date.now()) {
  const status = budgetStatus(contract, snapshot, now);
  return {
    iterations: Math.max(0, status.limits.iterations - status.consumed.iterations),
    retries: Math.max(0, status.limits.retries - status.consumed.retries),
    wall_seconds: Math.max(0, Math.floor((status.limits.wall_time_ms - status.consumed.wall_time_ms) / 1_000)),
    tool_calls: Math.max(0, status.limits.tool_calls - status.consumed.tool_calls),
    model_cost_usd: Math.max(0, status.limits.model_cost - status.consumed.model_cost),
    external_cost_usd: Math.max(0, status.limits.external_cost - status.consumed.external_cost),
  };
}

export async function assertRunBudgetAvailable(runDirectory, contract, options = {}) {
  const snapshot = options.snapshot ?? await rebuildSnapshot(runDirectory, contract.run_id);
  const status = budgetStatus(contract, snapshot, options.now);
  if (status.exhausted.length) throw new Error(`Run budget exhausted: ${status.exhausted.join(', ')}`);
  return { snapshot, budget: status, remaining: remainingBudget(contract, snapshot, options.now) };
}

export async function consumeBudget(runDirectory, contract, usage, actor = 'runner') {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const projected = {
    ...snapshot,
    tool_calls: snapshot.tool_calls + (usage.tool_calls ?? 0),
    model_cost: snapshot.model_cost + (usage.model_cost ?? 0),
    external_cost: snapshot.external_cost + (usage.external_cost ?? 0),
  };
  const status = budgetStatus(contract, projected);
  if (!status.within_budget) throw new Error(`Budget exceeded: ${status.exceeded.join(', ')}`);
  return appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'budget_consumed', actor, payload: usage });
}

export async function inspectRunDirectory(runDirectory) {
  const snapshot = await rebuildSnapshot(runDirectory);
  const ledgerFile = path.join(runDirectory, 'events.jsonl');
  return { run_directory: path.resolve(runDirectory), snapshot, ledger_bytes: (await stat(ledgerFile)).size };
}

export function asFailure(error) {
  return { terminal_state: 'failed_verification', error: errorRecord(error) };
}
