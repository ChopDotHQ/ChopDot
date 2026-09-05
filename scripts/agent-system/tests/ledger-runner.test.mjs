import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureContract, fixturePreflightIdentity, fixtureRoot } from './helpers.mjs';
import { startRun, resumeRun, finishResume, cancelRun, checkpointRun } from '../runner.mjs';
import { acquireLease, appendEvent, budgetStatus, computeEventDigest, consumeBudget, readEvents, rebuildSnapshot, releaseLease, terminate, verifyEventChain, verifyLedger } from '../ledger.mjs';
import { canonicalJson, sha256 } from '../core.mjs';

async function started() {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  const { run_directory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  return { root, contract, runDirectory: run_directory };
}

test('start writes declared, preflight, and work events starting at sequence zero', async () => {
  const { contract, runDirectory } = await started();
  const events = await readEvents(runDirectory);
  assert.deepEqual(events.map((event) => event.sequence), [0, 1, 2]);
  assert.equal(events[0].previous_digest, null);
  assert.equal((await verifyLedger(runDirectory, contract.run_id)).valid, true);
});

test('derived snapshot rebuild is deterministic', async () => {
  const { contract, runDirectory } = await started();
  const first = await rebuildSnapshot(runDirectory, contract.run_id);
  const second = await rebuildSnapshot(runDirectory, contract.run_id);
  assert.deepEqual(first, second);
});

test('tampered event payload fails digest verification', async () => {
  const { runDirectory } = await started();
  const file = path.join(runDirectory, 'events.jsonl');
  const lines = (await readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
  lines[1].payload.exact_root = '/tampered';
  await writeFile(file, `${lines.map(JSON.stringify).join('\n')}\n`);
  await assert.rejects(() => rebuildSnapshot(runDirectory), /payload digest mismatch/);
});

test('incomplete trailing JSON line fails closed', async () => {
  const { runDirectory } = await started();
  await appendFile(path.join(runDirectory, 'events.jsonl'), '{"partial":');
  await assert.rejects(() => readEvents(runDirectory), /incomplete trailing event/);
});

test('duplicate event ID fails chain verification', async () => {
  const { runDirectory } = await started();
  const events = await readEvents(runDirectory);
  events[1].event_id = events[0].event_id;
  assert.throws(() => verifyEventChain(events), /Duplicate event ID|event digest mismatch/);
});

test('unknown event types are rejected', async () => {
  const { contract, runDirectory } = await started();
  await assert.rejects(() => appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'magic' }), /Unknown event type/);
});

test('checkpoint records the current event head', async () => {
  const { runDirectory } = await started();
  const snapshot = await checkpointRun(runDirectory, 'checkpoint-agent');
  assert.equal(snapshot.checkpoints.length, 1);
  assert.match(snapshot.checkpoints[0].head_digest, /^[0-9a-f]{64}$/);
});

test('an active lease excludes another holder', async () => {
  const { runDirectory } = await started();
  const lease = await acquireLease(runDirectory, { holder: 'first', ttlMs: 60_000 });
  await assert.rejects(() => acquireLease(runDirectory, { holder: 'second', ttlMs: 60_000 }), /Active lease/);
  await releaseLease(runDirectory, lease);
});

test('a stale lease can be replaced', async () => {
  const { runDirectory } = await started();
  await acquireLease(runDirectory, { holder: 'old', ttlMs: 1, now: 0 });
  const replacement = await acquireLease(runDirectory, { holder: 'new', ttlMs: 1000, now: 10 });
  assert.equal(replacement.holder, 'new');
});

test('resume obtains and can release a lease', async () => {
  const { root, runDirectory } = await started();
  const resumed = await resumeRun(runDirectory, { expectedRoot: root, holder: 'resumer' });
  assert.equal(resumed.resumable, true);
  await finishResume(runDirectory, resumed.lease);
});

test('budget consumption is persisted', async () => {
  const { contract, runDirectory } = await started();
  await consumeBudget(runDirectory, contract, { tool_calls: 2, model_cost: 0, external_cost: 0 });
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assert.equal(snapshot.tool_calls, 2);
});

test('budget overrun is rejected without ledger mutation', async () => {
  const { contract, runDirectory } = await started();
  const before = (await readEvents(runDirectory)).length;
  await assert.rejects(() => consumeBudget(runDirectory, contract, { tool_calls: 101 }), /Budget exceeded/);
  assert.equal((await readEvents(runDirectory)).length, before);
});

test('budget status reports exhausted boundary separately from exceeded', async () => {
  const { contract, runDirectory } = await started();
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const result = budgetStatus(contract, { ...snapshot, tool_calls: 100 }, Date.parse(snapshot.started_at));
  assert.ok(result.exhausted.includes('tool_calls'));
  assert.equal(result.within_budget, true);
});

test('cancel is terminal and later append is rejected', async () => {
  const { runDirectory, contract } = await started();
  const snapshot = await cancelRun(runDirectory, { reason: 'test' });
  assert.equal(snapshot.terminal_state, 'cancelled');
  await assert.rejects(() => appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'work_started' }), /immutable/);
});

test('succeeded termination refuses unreconciled effect', async () => {
  const { contract, runDirectory } = await started();
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'effect_planned', payload: { effect_id: 'effect_fixture01', state: 'planned' } });
  await assert.rejects(() => terminate(runDirectory, contract.run_id, 'succeeded'), /unreconciled/);
});

test('100 deterministic randomized event sequences preserve digest invariants', () => {
  let prngState = 0x5eed1234;
  const random = () => { prngState = (prngState * 1664525 + 1013904223) >>> 0; return prngState; };
  for (let sample = 0; sample < 100; sample += 1) {
    const length = 3 + (random() % 20);
    const events = [];
    for (let sequence = 0; sequence < length; sequence += 1) {
      const payload = { sample, sequence, random: random() };
      const event = { event_version: '1.0.0', run_id: `run_property_${String(sample).padStart(8, '0')}`, sequence, event_id: `event_property_${sample}_${sequence}`, event_type: 'observation_recorded', timestamp: new Date(sequence * 1000).toISOString(), actor: { id: 'property-test', kind: 'deterministic_runner' }, previous_digest: events.at(-1)?.event_digest ?? null, payload, payload_digest: sha256(canonicalJson(payload)) };
      event.event_digest = computeEventDigest(event);
      events.push(event);
    }
    assert.equal(verifyEventChain(events).valid, true);
    const tampered = structuredClone(events);
    tampered[random() % tampered.length].payload.random += 1;
    assert.throws(() => verifyEventChain(tampered), /digest mismatch/);
  }
});
