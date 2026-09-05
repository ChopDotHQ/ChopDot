import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fixtureContract, fixturePreflightIdentity, fixtureRoot } from './helpers.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { startRun, resumeRun, finishResume } from '../runner.mjs';
import { approvalAllowsEffect, recordApproval, requestApproval } from '../approvals.mjs';
import { approveEffect, beginEffectDispatch, dispatchEffect, effectIdempotencyKey, markEffectDispatched, markInterruptedEffects, planEffect, reconcileEffect } from '../effects.mjs';
import { rebuildSnapshot } from '../ledger.mjs';

async function started() {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  contract.authority.external_effects = ['commit'];
  contract.authority.required_approvals = ['operator approval for the exact effect'];
  const { run_directory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  return { root, contract, runDirectory: run_directory };
}

function input(overrides = {}) {
  return { requirement_id: 'REQ-FIXTURE', effect_type: 'commit', target: 'fixture://target', intended_payload: { value: 1 }, expected_change: 'The fixture target changes once.', risk: 'low', approval_id: 'approval_fixture_default', approval_expires_at: '2099-01-01T00:00:00.000Z', ...overrides };
}

async function authorize(runDirectory, contract, effect) {
  await requestApproval(runDirectory, contract, { approval_id: effect.approval_id, effect_id: effect.effect_id, target: effect.target, expires_at: effect.approval_expires_at });
  await recordApproval(runDirectory, contract, { approval_id: effect.approval_id, decision: 'approved' });
  await approveEffect(runDirectory, contract, effect.effect_id, effect.approval_id);
}

test('idempotency key is stable over key order', () => {
  const first = effectIdempotencyKey({ run_id: 'run_fixture_12345678', requirement_id: 'REQ-FIXTURE', effect_type: 'commit', target: 'x', intended_payload: { a: 1, b: 2 } });
  const second = effectIdempotencyKey({ run_id: 'run_fixture_12345678', requirement_id: 'REQ-FIXTURE', effect_type: 'commit', target: 'x', intended_payload: { b: 2, a: 1 } });
  assert.equal(first, second); assert.match(first, /^idem_[0-9a-f]{64}$/);
});

test('idempotency input requires all effect identity fields', () => assert.throws(() => effectIdempotencyKey({ run_id: 'x' }), /missing requirement_id/));

test('duplicate effect plan returns the original record without appending', async () => {
  const { contract, runDirectory } = await started();
  const first = await planEffect(runDirectory, contract, input());
  const second = await planEffect(runDirectory, contract, input());
  assert.equal(second.duplicate, true);
  assert.equal(second.effect.effect_id, first.effect.effect_id);
});

test('approval-required effect must bind approval identity at plan time', async () => {
  const { contract, runDirectory } = await started();
  await assert.rejects(() => planEffect(runDirectory, contract, input({ approval_id: undefined, approval_expires_at: undefined })), /bind approval_id/);
});

test('expired approval cannot be approved', async () => {
  const { contract, runDirectory } = await started();
  const approvalId = 'approval_fixture_expired';
  const effect = await planEffect(runDirectory, contract, input({ approval_id: approvalId, approval_expires_at: '2020-01-01T00:00:00.000Z' }));
  await requestApproval(runDirectory, contract, { approval_id: approvalId, effect_id: effect.effect.effect_id, target: effect.effect.target, expires_at: '2020-01-01T00:00:00.000Z' });
  await assert.rejects(() => recordApproval(runDirectory, contract, { approval_id: approvalId, decision: 'approved', recorded_at: '2021-01-01T00:00:00.000Z' }), /expired/);
});

test('wrong approval cannot authorize another effect', async () => {
  const { contract, runDirectory } = await started();
  const effect = await planEffect(runDirectory, contract, input());
  const approvalId = await requestApproval(runDirectory, contract, { effect_id: 'effect_other_123456', target: 'other' });
  await recordApproval(runDirectory, contract, { approval_id: approvalId, decision: 'approved' });
  await assert.rejects(() => approveEffect(runDirectory, contract, effect.effect.effect_id, approvalId), /does not authorize/);
});

test('approved effect is consumed when dispatch starts', async () => {
  const { contract, runDirectory } = await started();
  const approvalId = 'approval_fixture_approved';
  const expires = new Date(Date.now() + 60_000).toISOString();
  const { effect } = await planEffect(runDirectory, contract, input({ approval_id: approvalId, approval_expires_at: expires }));
  await requestApproval(runDirectory, contract, { approval_id: approvalId, effect_id: effect.effect_id, target: effect.target, expires_at: expires });
  await recordApproval(runDirectory, contract, { approval_id: approvalId, decision: 'approved' });
  await approveEffect(runDirectory, contract, effect.effect_id, approvalId);
  await beginEffectDispatch(runDirectory, contract, effect.effect_id);
  const approval = (await rebuildSnapshot(runDirectory, contract.run_id)).approvals[approvalId];
  assert.ok(approval.consumed_at);
  assert.equal(approvalAllowsEffect(approval, effect.effect_id), false);
});

test('crash after dispatch start becomes unknown and blocks resume', async () => {
  const { root, contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  await beginEffectDispatch(runDirectory, contract, effect.effect_id);
  const resumed = await resumeRun(runDirectory, { expectedRoot: root, holder: 'recovery' });
  assert.equal(resumed.resumable, false);
  assert.equal(resumed.unresolved_effects[0].state, 'unknown_needs_reconciliation');
  await finishResume(runDirectory, resumed.lease);
});

test('unknown effect cannot be blindly redispatched', async () => {
  const { contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  await beginEffectDispatch(runDirectory, contract, effect.effect_id);
  await markInterruptedEffects(runDirectory, contract);
  await assert.rejects(() => beginEffectDispatch(runDirectory, contract, effect.effect_id), /blindly redispatched/);
});

test('dispatch plus verified readback reaches verified state', async () => {
  const { contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  const result = await dispatchEffect(runDirectory, contract, effect.effect_id, async () => ({ remote_id: 1 }), async () => ({ verified: true, before: { value: 0 }, after: { value: 1 }, evidence: ['fixture'] }));
  assert.equal(result.state, 'verified');
  assert.equal((await rebuildSnapshot(runDirectory, contract.run_id)).effects[effect.effect_id].state, 'verified');
});

test('dispatch without readback stays unknown', async () => {
  const { contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  const result = await dispatchEffect(runDirectory, contract, effect.effect_id, async () => ({ sent: true }));
  assert.equal(result.state, 'unknown_needs_reconciliation');
});

test('reconciliation requires explicit boolean verification', async () => {
  const { contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  await beginEffectDispatch(runDirectory, contract, effect.effect_id);
  await markEffectDispatched(runDirectory, contract, effect.effect_id, {});
  await assert.rejects(() => reconcileEffect(runDirectory, contract, effect.effect_id, { after: {} }), /boolean verified/);
});

test('mismatched readback remains observed, not verified', async () => {
  const { contract, runDirectory } = await started();
  const { effect } = await planEffect(runDirectory, contract, input());
  await authorize(runDirectory, contract, effect);
  await beginEffectDispatch(runDirectory, contract, effect.effect_id);
  await markEffectDispatched(runDirectory, contract, effect.effect_id, {});
  await reconcileEffect(runDirectory, contract, effect.effect_id, { verified: false, after: { value: 2 } });
  assert.equal((await rebuildSnapshot(runDirectory, contract.run_id)).effects[effect.effect_id].state, 'observed');
});

test('post-start contract tampering is rejected against the declared digest', async () => {
  const { contract, runDirectory } = await started();
  const contractPath = path.join(runDirectory, 'contract.json');
  const persisted = JSON.parse(await readFile(contractPath, 'utf8'));
  persisted.authority.external_effects = ['publish'];
  await writeFile(contractPath, `${JSON.stringify(persisted)}\n`);
  await assert.rejects(() => planEffect(runDirectory, persisted, { ...input(), effect_type: 'publish' }), /immutable declared contract digest/);
});
