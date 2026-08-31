import { appendEvent, rebuildSnapshot } from './ledger.mjs';
import { approvalAllowsEffect } from './approvals.mjs';
import { digestObject, errorRecord, makeId, nowIso } from './core.mjs';
import { contractRoot, digestContract } from './contract.mjs';
import { validateRuntimePacket } from './validate.mjs';

function assertEffect(value) {
  const validation = validateRuntimePacket(value, 'effect-record.v1.schema.json');
  if (!validation.valid) throw new Error(`Effect schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
}

function normalizedReadback(value, status, observedAt) {
  if (value === null || value === undefined) return null;
  if (value.observed_at && value.source && value.digest && value.status) return value;
  return { observed_at: observedAt, source: 'effect-readback', digest: digestObject(value), status };
}

function expectedEffectRisk(contract) {
  return contract.task_route?.risk_tier === 'critical' ? 'critical' : contract.task_route?.risk_tier === 'moderate' ? 'medium' : 'low';
}

export function assertContractEffectAuthority(contract, input = {}) {
  const allowed = contract.authority?.external_effects ?? [];
  if (!input.effect_type || !allowed.includes(input.effect_type) || input.effect_type === 'none') throw new Error(`Effect type ${input.effect_type ?? '(missing)'} is not authorized by the contract`);
  const root = contractRoot(contract);
  if (input.scope !== undefined && input.scope !== root) throw new Error('Effect scope differs from the contract exact root');
  const approvalRequired = contract.task_route
    ? Boolean(contract.task_route.approval_boundary?.approval_required)
    : Boolean((contract.authority?.required_approvals ?? []).length);
  const risk = contract.task_route ? expectedEffectRisk(contract) : (input.risk ?? 'low');
  const authoritySource = contract.task_route ? `task-route:${contract.task_route.route_id}` : 'contract';
  if (input.approval_required !== undefined && Boolean(input.approval_required) !== approvalRequired) throw new Error('Caller approval_required differs from the contract authority boundary');
  if (input.risk !== undefined && contract.task_route && input.risk !== risk) throw new Error('Caller risk differs from the routed risk tier');
  if (input.authority_source !== undefined && input.authority_source !== authoritySource) throw new Error('Caller authority_source differs from the bound authority source');
  return { root, approvalRequired, risk, authoritySource, readbackRequired: Boolean(contract.task_route?.evidence?.readback_required || contract.task_route?.approval_boundary?.required_readback) };
}

function assertDeclaredContract(snapshot, contract) {
  if (!snapshot.contract_digest || snapshot.contract_digest !== digestContract(contract)) throw new Error('Runtime contract differs from the immutable declared contract digest');
}

export function effectIdempotencyKey(input) {
  for (const field of ['run_id', 'requirement_id', 'effect_type', 'target', 'intended_payload']) {
    if (input[field] === undefined || input[field] === null || input[field] === '') throw new Error(`Idempotency input is missing ${field}`);
  }
  return `idem_${digestObject({
    run_id: input.run_id,
    requirement_id: input.requirement_id,
    effect_type: input.effect_type,
    target: input.target,
    intended_payload_digest: digestObject(input.intended_payload),
  })}`;
}

export async function planEffect(runDirectory, contract, input = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  const authority = assertContractEffectAuthority(contract, input);
  if (authority.approvalRequired && (!input.approval_id || !input.approval_expires_at)) {
    throw new Error('Approval-required effects must bind approval_id and approval_expires_at when planned');
  }
  const key = effectIdempotencyKey({ ...input, run_id: contract.run_id });
  const existing = Object.values(snapshot.effects).find((effect) => effect.idempotency_key === key);
  if (existing) return { effect: existing, duplicate: true };
  const effect = {
    effect_version: '1.0.0',
    effect_id: input.effect_id ?? makeId('effect'),
    run_id: contract.run_id,
    requirement_id: input.requirement_id,
    effect_type: input.effect_type,
    target: input.target,
    normalized_parameters: input.normalized_parameters ?? {},
    scope: authority.root,
    risk: authority.risk,
    expected_change: input.expected_change,
    payload_digest: digestObject(input.intended_payload),
    idempotency_key: key,
    authority_source: authority.authoritySource,
    approval_required: authority.approvalRequired,
    ...(input.approval_id ? { approval_id: input.approval_id } : {}),
    ...(input.approval_expires_at ? { approval_expires_at: input.approval_expires_at } : {}),
    state: 'planned',
    before_readback: null,
    after_readback: null,
    recovery_strategy: input.recovery_strategy ?? input.rollback_strategy ?? 'forward_repair',
    created_at: input.planned_at ?? nowIso(),
    updated_at: input.planned_at ?? nowIso(),
  };
  assertEffect(effect);
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'effect_planned', actor: input.actor ?? 'runner', payload: effect });
  return { effect, duplicate: false };
}

export async function approveEffect(runDirectory, contract, effectId, approvalId, actor = 'runner') {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  const effect = snapshot.effects[effectId];
  if (!effect) throw new Error(`Unknown effect: ${effectId}`);
  const approval = snapshot.approvals[approvalId];
  if (!approvalAllowsEffect(approval, effectId)) throw new Error(`Approval ${approvalId} does not authorize effect ${effectId}`);
  const result = await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'effect_approved',
    actor,
    payload: { effect_id: effectId, approval_id: approvalId, approval_expires_at: approval.expires_at },
  });
  return result;
}

export async function beginEffectDispatch(runDirectory, contract, effectId, options = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  const effect = snapshot.effects[effectId];
  if (!effect) throw new Error(`Unknown effect: ${effectId}`);
  assertContractEffectAuthority(contract, effect);
  if (['dispatching', 'unknown_needs_reconciliation', 'observed', 'verified'].includes(effect.state)) {
    throw new Error(`Effect ${effectId} cannot be blindly redispatched from ${effect.state}`);
  }
  if (effect.approval_required) {
    const approvalId = effect.approval_id ?? options.approval_id;
    const approval = snapshot.approvals[approvalId];
    if (!approvalAllowsEffect(approval, effectId)) throw new Error(`Effect ${effectId} requires a current approval`);
  }
  const result = await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'effect_dispatching',
    actor: options.actor ?? 'runner',
    payload: { effect_id: effectId, dispatch_started_at: options.dispatch_started_at ?? nowIso() },
  });
  if (effect.approval_required) {
    const approvalId = effect.approval_id ?? options.approval_id;
    const latest = (await rebuildSnapshot(runDirectory, contract.run_id)).approvals[approvalId];
    const approvalPayload = { ...latest, consumed_at: nowIso() };
    delete approvalPayload.state;
    await appendEvent(runDirectory, {
      run_id: contract.run_id,
      event_type: 'approval_recorded',
      actor: options.actor ?? 'runner',
      payload: approvalPayload,
    });
  }
  return result;
}

export async function markEffectDispatched(runDirectory, contract, effectId, dispatchReceipt = {}, actor = 'runner') {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  if (snapshot.effects[effectId]?.state !== 'dispatching') throw new Error(`Effect ${effectId} is not dispatching`);
  return appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'effect_dispatched',
    actor,
    payload: { effect_id: effectId, dispatch_receipt: dispatchReceipt, dispatched_at: nowIso() },
  });
}

export async function failEffect(runDirectory, contract, effectId, error, actor = 'runner') {
  return appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'effect_failed',
    actor,
    payload: { effect_id: effectId, error: errorRecord(error), failed_at: nowIso() },
  });
}

export async function reconcileEffect(runDirectory, contract, effectId, observation, actor = 'reconciler') {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  const effect = snapshot.effects[effectId];
  if (!effect) throw new Error(`Unknown effect: ${effectId}`);
  if (!['dispatching', 'unknown_needs_reconciliation', 'observed'].includes(effect.state)) {
    throw new Error(`Effect ${effectId} does not require reconciliation from ${effect.state}`);
  }
  if (!observation || typeof observation.verified !== 'boolean') throw new Error('Readback must provide a boolean verified result');
  const observedAt = observation.observed_at ?? nowIso();
  return appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'effect_read_back',
    actor,
    payload: {
      effect_id: effectId,
      before_readback: normalizedReadback(observation.before, 'unknown', observedAt),
      after_readback: normalizedReadback(observation.after, observation.verified ? 'matches' : 'mismatch', observedAt),
      verified: observation.verified,
      observed_at: observedAt,
      evidence: observation.evidence ?? [],
    },
  });
}

export async function dispatchEffect(runDirectory, contract, effectId, executor, readback, options = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assertDeclaredContract(snapshot, contract);
  const effect = snapshot.effects[effectId];
  if (!effect) throw new Error(`Unknown effect: ${effectId}`);
  const authority = assertContractEffectAuthority(contract, effect);
  if (authority.readbackRequired && !readback) throw new Error(`Effect ${effectId} requires readback before dispatch`);
  await beginEffectDispatch(runDirectory, contract, effectId, options);
  let receipt;
  try {
    receipt = await executor();
  } catch (error) {
    await failEffect(runDirectory, contract, effectId, error, options.actor);
    throw error;
  }
  await markEffectDispatched(runDirectory, contract, effectId, receipt, options.actor);
  if (!readback) return { receipt, state: 'unknown_needs_reconciliation' };
  const observation = await readback(receipt);
  await reconcileEffect(runDirectory, contract, effectId, observation, options.actor);
  return { receipt, state: observation.verified ? 'verified' : 'observed', observation };
}

export async function markInterruptedEffects(runDirectory, contract, actor = 'runner') {
  let snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const interrupted = Object.values(snapshot.effects).filter((effect) => effect.state === 'dispatching');
  for (const effect of interrupted) {
    await appendEvent(runDirectory, {
      run_id: contract.run_id,
      event_type: 'effect_reconciliation_required',
      actor,
      payload: { effect_id: effect.effect_id, reason: 'resume_found_incomplete_dispatch', detected_at: nowIso() },
    });
  }
  snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  return { interrupted: interrupted.map((effect) => effect.effect_id), snapshot };
}
