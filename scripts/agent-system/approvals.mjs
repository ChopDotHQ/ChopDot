import { appendEvent, rebuildSnapshot } from './ledger.mjs';
import { digestObject, makeId, nowIso } from './core.mjs';
import { validateRuntimePacket } from './validate.mjs';

function assertApproval(value) {
  const validation = validateRuntimePacket(value, 'approval-record.v1.schema.json');
  if (!validation.valid) throw new Error(`Approval schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
}

export async function requestApproval(runDirectory, contract, input = {}) {
  if (!input.effect_id) throw new Error('Approval must name an effect ID');
  const approvalId = input.approval_id ?? makeId('approval');
  const payload = {
      approval_version: '1.0.0',
      approval_id: approvalId,
      run_id: contract.run_id,
      effect_id: input.effect_id,
      target: input.target,
      requested_at: input.requested_at ?? nowIso(),
      requested_by: input.requested_by ?? 'runner',
      scope_digest: input.scope_digest ?? digestObject({ effect_id: input.effect_id, target: input.target, risk: input.risk ?? 'medium' }),
      risk: input.risk ?? 'medium',
      decision: 'pending',
      decided_by: null,
      decided_at: null,
      expires_at: input.expires_at ?? null,
      single_use: input.single_use ?? true,
      consumed_at: null,
      conditions: input.conditions ?? [],
    };
  assertApproval(payload);
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'approval_requested',
    actor: input.requested_by ?? 'runner',
    payload,
  });
  return approvalId;
}

export async function recordApproval(runDirectory, contract, input = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const request = snapshot.approvals[input.approval_id];
  if (!request) throw new Error(`Unknown approval: ${input.approval_id}`);
  const decision = input.decision ?? input.state;
  if (!['approved', 'rejected', 'expired', 'revoked'].includes(decision)) throw new Error(`Invalid approval decision: ${decision}`);
  if (decision === 'approved' && request.expires_at && Date.parse(request.expires_at) <= Date.parse(input.recorded_at ?? nowIso())) {
    throw new Error(`Approval ${input.approval_id} is expired`);
  }
  const payload = { ...request, decision, decided_by: input.actor ?? 'operator', decided_at: input.recorded_at ?? nowIso(), expires_at: input.expires_at ?? request.expires_at };
  delete payload.state;
  assertApproval(payload);
  return appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'approval_recorded',
    actor: input.actor ?? 'operator',
    payload,
  });
}

export function approvalAllowsEffect(approval, effectId, now = Date.now()) {
  return Boolean(
    approval
    && (approval.decision === 'approved' || approval.state === 'approved')
    && approval.effect_id === effectId
    && !approval.consumed_at
    && (!approval.expires_at || Date.parse(approval.expires_at) > now),
  );
}
