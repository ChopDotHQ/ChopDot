import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening, evaluateExpenseContract, allocateEqualByConstraint } from './hardening-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = n => JSON.parse(readFileSync(join(root, 'product-schema', n), 'utf8'));
const core = read('semantic-core.json'), graph = read('composition-graph.json'), frozen = read('frozen-baseline.json'), oracle = read('gate-b-authority-oracle.json');
const gitBlob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');

for (const a of oracle.assertions) {
  for (const e of a.evidence || []) {
    let bytes, text;
    if (e.commit) {
      bytes = Buffer.from(execFileSync('git', ['show', e.commit + ':' + e.path]));
      text = bytes.toString('utf8');
    } else {
      bytes = readFileSync(join(root, e.path));
      if (e.archive === 'zip_html') {
        const members = execFileSync('unzip', ['-Z1', join(root, e.path)], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(x => x.toLowerCase().endsWith('.html'));
        assert.ok(members.length, a.id + ' zip has no html');
        text = members.map(member => execFileSync('unzip', ['-p', join(root, e.path), member], { encoding: 'utf8' })).join('\n');
      } else text = bytes.toString('utf8');
    }
    assert.equal(gitBlob(bytes), e.git_blob, a.id + ' evidence blob mismatch ' + e.path);
    for (const phrase of e.contains || []) assert.ok(text.includes(phrase), a.id + ' evidence phrase missing: ' + phrase);
  }
}

assert.deepEqual(validateHardening(core, graph, frozen, oracle), []);

const valid = { operation:'expense.create', group_settlement_state:'idle', total_minor_units:1000, group_participants:['A','B','C'], selected_participants:['A','B'], allocations:[{participant_id:'A',minor_units:600},{participant_id:'B',minor_units:400}] };
assert.deepEqual(evaluateExpenseContract(core, valid), []);
assert.deepEqual(evaluateExpenseContract(core, { ...valid, allocations:[{participant_id:'A',minor_units:500},{participant_id:'B',minor_units:400}] }), ['LAW-EXP-01']);
assert.deepEqual(evaluateExpenseContract(core, { ...valid, allocations:[{participant_id:'A',minor_units:600},{participant_id:'C',minor_units:400}] }), ['LAW-EXP-03']);
assert.deepEqual(evaluateExpenseContract(core, { ...valid, allocations:[{participant_id:'A',minor_units:500},{participant_id:'A',minor_units:500}] }), ['LAW-EXP-03']);
assert.deepEqual(evaluateExpenseContract(core, { ...valid, operation:'expense.edit', group_settlement_state:'in_progress' }), ['LAW-EXP-GUARD-01']);

const eq = frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x => x.id === 'GATEA-MONEY-EQUAL-01').constraint;
assert.deepEqual(allocateEqualByConstraint(eq, 1000, ['C','A','B','A']), [{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:333},{participant_id:'C',minor_units:333}]);
assert.deepEqual(allocateEqualByConstraint(eq, 1001, ['C','A','B']), [{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:334},{participant_id:'C',minor_units:333}]);

console.log(JSON.stringify({
  hardening:'PASS',
  oracle_assertions:oracle.assertions.length,
  expense_contract_cases:5,
  equal_allocation_cases:2,
  resolved_interpretations:(core.resolved_authority_interpretations || []).map(x => x.id),
  authority_recoveries:(frozen.authority_recoveries || []).map(x => x.id),
  result:'PASS'
}, null, 2));
