import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { canonicalJson, digestObject, parseDurationMs, sha256 } from '../core.mjs';
import { createContract, digestContract } from '../contract.mjs';
import { validateAgentContract, validateLoopProfile, validatePolicyCatalog } from '../validate.mjs';
import { fixtureContract, fixtureRoot } from './helpers.mjs';

test('canonical JSON sorts object keys recursively', () => assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}'));
test('canonical JSON preserves array order', () => assert.equal(canonicalJson({ a: [3, 1, 2] }), '{"a":[3,1,2]}'));
test('canonical JSON removes undefined object fields', () => assert.equal(canonicalJson({ a: 1, b: undefined }), '{"a":1}'));
test('canonical JSON rejects non-finite numbers', () => assert.throws(() => canonicalJson({ a: Infinity }), /non-finite/));
test('SHA-256 is lowercase 64 hex', () => assert.match(sha256('chopdot'), /^[0-9a-f]{64}$/));
test('object digest is independent of key order', () => assert.equal(digestObject({ b: 2, a: 1 }), digestObject({ a: 1, b: 2 })));
test('duration parser handles units', () => { assert.equal(parseDurationMs('5s'), 5000); assert.equal(parseDurationMs('2m'), 120000); });
test('duration parser rejects unbounded words', () => assert.throws(() => parseDurationMs('forever'), /Invalid duration/));

test('contract factory emits schema-aligned identity and exact root', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  assert.match(contract.run_id, /^run_/);
  assert.equal(contract.scope.root, root);
  assert.equal(contract.created_by.kind, 'agent');
  assert.equal(contract.expected_outcome.assertions[0].minimum_evidence_level, 'unit');
});

test('contract digest changes with a material field', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  const changed = structuredClone(contract);
  changed.task.objective = 'A different and still sufficiently long objective.';
  assert.notEqual(digestContract(contract), digestContract(changed));
});

test('valid contract passes fail-closed validator', async () => {
  const root = await fixtureRoot();
  assert.deepEqual(validateAgentContract(fixtureContract(root), { expectedRoot: root }).issues, []);
});

for (const [name, mutate, expectedPath] of [
  ['missing artifact', (value) => { delete value.artifact_contract; }, 'artifact_contract'],
  ['empty requirements', (value) => { value.requirement_ids = []; }, 'requirement_ids'],
  ['wrong root', (value) => { value.scope.root = '/tmp/wrong'; }, 'scope.root'],
  ['invalid Git head', (value) => { value.scope.starting_head = 'UNKNOWN'; }, 'scope.starting_head'],
  ['unbounded budget', (value) => { value.budgets.max_iterations = Infinity; }, 'budgets.iterations'],
  ['missing evaluator', (value) => { delete value.evaluator; }, 'evaluator'],
  ['unknown terminal state', (value) => { value.terminal_states.push('done'); }, 'terminal_states'],
  ['missing failure packet', (value) => { value.failure_outcome.required_fields = []; }, 'failure_outcome'],
]) {
  test(`contract rejects ${name}`, async () => {
    const root = await fixtureRoot();
    const contract = fixtureContract(root);
    mutate(contract);
    const result = validateAgentContract(contract, { expectedRoot: root });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((entry) => entry.path === expectedPath));
  });
}

test('profile validator requires artifact, outcome, evaluator, budget, and stops', () => {
  const result = validateLoopProfile({ profile_id: 'bad' });
  assert.equal(result.valid, false);
  for (const required of ['artifact_contract', 'expected_outcome', 'evaluator', 'budgets', 'terminal_states']) assert.ok(result.issues.some((entry) => entry.path.includes(required)));
});

test('terminal policy validator requires all terminal states', () => {
  const result = validatePolicyCatalog({ states: [{ id: 'succeeded' }] }, 'terminal-states');
  assert.equal(result.valid, false);
  assert.equal(result.issues.length, 5);
});
