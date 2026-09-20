// Product IR V0 model-driven invariant probe.
// Reads MODEL.yaml itself. Research-only; no production imports.
//
// Deliberately supports only the tiny V0 rule vocabulary. If the model needs a
// new rule kind, the interpreter must gain that capability explicitly.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modelText = readFileSync(new URL('./MODEL.yaml', import.meta.url), 'utf8');

function parseExecutableRules(text) {
  const marker = '\nexecutable_rules:\n';
  const start = text.indexOf(marker);
  assert.ok(start >= 0, 'MODEL.yaml must contain executable_rules');
  const lines = text.slice(start + marker.length).split('\n');
  const rules = [];
  let current = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const idMatch = raw.match(/^  - id: (.+)$/);
    if (idMatch) {
      if (current) rules.push(current);
      current = { id: idMatch[1] };
      continue;
    }
    const kv = raw.match(/^    ([a-z_]+): (.+)$/);
    if (kv && current) current[kv[1]] = kv[2];
  }
  if (current) rules.push(current);
  return rules;
}

const rules = parseExecutableRules(modelText);
assert.ok(rules.length > 0, 'at least one executable rule required');

const scales = { CHF: 2, EUR: 2, USD: 2, DOT: 6 };
function money(currency, value) {
  const scale = scales[currency];
  assert.notEqual(scale, undefined, `unsupported currency ${currency}`);
  const minorUnits = Math.round(Number(value) * (10 ** scale));
  assert.ok(Number.isSafeInteger(minorUnits));
  return { currency, minor_units: minorUnits };
}
function get(obj, path) {
  return path.split('.').reduce((v, key) => v?.[key], obj);
}
function evaluate(rule, expense) {
  if (rule.kind === 'sum_equals') {
    const actual = expense[rule.collection].reduce((n,x)=>n+get(x,rule.value_path),0);
    return actual === get(expense, rule.equals_path);
  }
  if (rule.kind === 'all_equal_path') {
    const expected = get(expense, rule.equals_path);
    return expense[rule.collection].every(x => get(x,rule.value_path) === expected);
  }
  if (rule.kind === 'all_members_in') {
    const allowed = new Set(get(expense, rule.set_path));
    return expense[rule.collection].every(x => allowed.has(get(x,rule.member_path)));
  }
  if (rule.kind === 'participant_delta_zero_sum') {
    const funded = expense[rule.funding_collection].reduce((n,x)=>n+get(x,rule.value_path),0);
    const allocated = expense[rule.allocation_collection].reduce((n,x)=>n+get(x,rule.value_path),0);
    return funded - allocated === 0;
  }
  throw new Error(`unsupported Product IR rule kind: ${rule.kind}`);
}
function validate(expense) {
  const failed = rules.filter(rule => !evaluate(rule, expense)).map(rule=>rule.id);
  return { ok: failed.length === 0, failed };
}
function deltas(expense) {
  const ids = new Set([...expense.group_participants, ...expense.funding.map(x=>x.participant), ...expense.allocations.map(x=>x.participant)]);
  return Object.fromEntries([...ids].map(id => [
    id,
    expense.funding.filter(x=>x.participant===id).reduce((n,x)=>n+x.amount.minor_units,0) -
    expense.allocations.filter(x=>x.participant===id).reduce((n,x)=>n+x.amount.minor_units,0)
  ]));
}

const validMulti = {
  amount: money('CHF',100),
  group_participants:['dev','jeanine','marc'],
  funding:[
    {participant:'dev',amount:money('CHF',70)},
    {participant:'jeanine',amount:money('CHF',30)}
  ],
  allocations:[
    {participant:'dev',amount:money('CHF',20)},
    {participant:'jeanine',amount:money('CHF',40)},
    {participant:'marc',amount:money('CHF',40)}
  ]
};

const fixtures = [
  { name:'valid multi-payer', expense:validMulti, ok:true },
  { name:'funding short by CHF 1', expense:{...validMulti,funding:[{participant:'dev',amount:money('CHF',99)}]}, ok:false, fails:'FUND-001' },
  { name:'10 / 3 rounded independently', expense:{
      amount:money('CHF',10), group_participants:['a','b','c'],
      funding:[{participant:'a',amount:money('CHF',10)}],
      allocations:['a','b','c'].map(participant=>({participant,amount:money('CHF',3.33)}))
    }, ok:false, fails:'SPLIT-003' },
  { name:'10 / 3 conserving allocation', expense:{
      amount:money('CHF',10), group_participants:['a','b','c'],
      funding:[{participant:'a',amount:money('CHF',10)}],
      allocations:[
        {participant:'a',amount:money('CHF',3.34)},
        {participant:'b',amount:money('CHF',3.33)},
        {participant:'c',amount:money('CHF',3.33)}
      ]
    }, ok:true },
  { name:'funding currency mismatch', expense:{...validMulti,funding:[
      {participant:'dev',amount:money('EUR',70)},
      {participant:'jeanine',amount:money('EUR',30)}
    ]}, ok:false, fails:'FUND-002' },
  { name:'unknown funder', expense:{...validMulti,funding:[
      {participant:'outsider',amount:money('CHF',70)},
      {participant:'jeanine',amount:money('CHF',30)}
    ]}, ok:false, fails:'FUND-003' },
];

for (const fixture of fixtures) {
  const result=validate(fixture.expense);
  assert.equal(result.ok, fixture.ok, fixture.name);
  if(fixture.fails) assert.ok(result.failed.includes(fixture.fails), `${fixture.name} expected ${fixture.fails}; got ${result.failed}`);
}
assert.deepEqual(deltas(validMulti), {dev:5000,jeanine:-1000,marc:-4000});
assert.equal(Object.values(deltas(validMulti)).reduce((a,b)=>a+b,0),0);

console.log(JSON.stringify({
  source:'MODEL.yaml',
  executableRuleIds:rules.map(r=>r.id),
  fixtures:fixtures.length,
  passed:fixtures.length,
  multiPayerDeltas:deltas(validMulti)
},null,2));
