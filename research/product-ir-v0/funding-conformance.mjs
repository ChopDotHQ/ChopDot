// One bounded model-to-implementation experiment. No production writes.
// Exit 0: full corpus conforms and mutation checks pass. Exit 1: a semantic
// mismatch or surviving mutant. Exit 2: harness/setup error (never a mutant kill).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const argument = process.argv.slice(2);
assert.ok(argument.length === 0 || (argument.length === 2 && argument[0] === '--output'),
  'Usage: node research/product-ir-v0/funding-conformance.mjs [--output DIRECTORY]');
const output = resolve(argument[1] ?? join(root, 'artifacts/funding-conformance'));
const paths = {
  model: 'research/product-ir-v0/MODEL.yaml',
  interpreter: 'research/product-ir-v0/model-driven-probe.mjs',
  core: 'src/domain/expenseFunding.ts',
  calculator: 'src/services/settlement/calc.ts',
  corpus: 'research/product-ir-v0/funding-conformance-cases.json',
  runner: 'research/product-ir-v0/funding-conformance.mjs',
  package: 'package.json', lock: 'package-lock.json',
};
const blob = data => createHash('sha1').update(`blob ${Buffer.byteLength(data)}\0`).update(data).digest('hex');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const text = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(join(root, path), 'utf8')]));
const sourceManifest = Object.fromEntries(Object.entries(paths).map(([key, path]) =>
  [path, { git_blob: blob(text[key]), sha256: sha256(text[key]) }]));
const corpus = JSON.parse(text.corpus);
assert.equal(corpus.schema, 'bounded-funding-conformance-v1');
assert.equal(new Set(corpus.cases.map(c => c.id)).size, corpus.cases.length, 'case IDs must be unique');
const work = mkdtempSync(join(tmpdir(), 'chopdot-conformance-'));
let report;

function once(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, `Expected one source anchor: ${from}`);
  return source.replace(from, to);
}
function ordered(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}
// Exact fixture-format conversion, not a Money engine. Never round output to
// make it compare equal. Numbers outside the test grid are a visible mismatch.
function toMinor(value, scale) {
  assert.ok(Number.isFinite(value), 'finite runtime output required');
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
  assert.ok(match, 'canonical numeric spelling required');
  const coefficient = BigInt(match[2] + (match[3] ?? '')) * (match[1] ? -1n : 1n);
  const power = Number(match[4] ?? 0) - (match[3]?.length ?? 0) + scale;
  let units;
  if (power >= 0) units = coefficient * (10n ** BigInt(power));
  else {
    const divisor = 10n ** BigInt(-power);
    assert.equal(coefficient % divisor, 0n, 'runtime value falls outside the exact fixture grid');
    units = coefficient / divisor;
  }
  const number = Number(units);
  assert.ok(Number.isSafeInteger(number) && BigInt(number) === units, 'safe fixture integer required');
  return number;
}
function major(money, scale) {
  assert.equal(scale, 2, 'this experiment only maps explicit hundredths');
  assert.ok(Number.isSafeInteger(money.minor_units) && Math.abs(money.minor_units) <= 1_000_000,
    'bounded fixture amount required');
  const value = money.minor_units / 100;
  assert.equal(toMinor(value, scale), money.minor_units, 'input conversion must round-trip exactly');
  return value;
}
function runtimeInput(test) {
  const e = test.expense;
  assert.ok(e.group_participants.length > 0 && e.group_participants.length <= 10);
  assert.equal(new Set(e.group_participants).size, e.group_participants.length);
  assert.ok(e.funding.length > 0, 'shared representation needs a legacy compatibility payer');
  const expense = {
    id: test.id, amount: major(e.amount, test.scale), currency: e.amount.currency,
    paidBy: e.funding[0].participant,
    split: e.allocations.map(a => ({ memberId: a.participant,
      amount: major(a.amount, test.scale), currency: a.amount.currency })),
  };
  if (test.representation === 'native') {
    expense.funding = e.funding.map(f => ({ memberId: f.participant,
      amount: major(f.amount, test.scale), currency: f.amount.currency }));
  } else {
    assert.equal(test.representation, 'legacy');
    assert.equal(e.funding.length, 1);
    assert.deepEqual(e.funding[0].amount, e.amount);
  }
  return { id: 'conformance-group', name: 'Research fixture', baseCurrency: e.amount.currency,
    members: e.group_participants.map(id => ({ id, name: id })), expenses: [expense] };
}

async function loadRuntime(label, coreSource, calcSource, decimalUrl) {
  const directory = join(work, label);
  mkdirSync(directory);
  // Type erasure and import resolution only. Entire original modules are
  // compiled, not hand-copied function bodies or substituted arithmetic.
  writeFileSync(join(directory, 'core.mjs'), stripTypeScriptTypes(coreSource));
  let javascript = stripTypeScriptTypes(calcSource);
  javascript = once(javascript, "from '../../domain/expenseFunding'", "from './core.mjs'");
  javascript = once(javascript, "from 'decimal.js'", `from ${JSON.stringify(decimalUrl)}`);
  writeFileSync(join(directory, 'calculator.mjs'), javascript);
  const core = await import(pathToFileURL(join(directory, 'core.mjs')).href);
  const calc = await import(pathToFileURL(join(directory, 'calculator.mjs')).href);
  return { ...core, ...calc };
}
function observeRuntime(test, runtime) {
  const pot = runtimeInput(test);
  try {
    const balances = runtime.computeBalances(structuredClone(pot));
    const net = Object.fromEntries(balances.map(b => [b.memberId, b.net]));
    assert.equal(balances.length, Object.keys(net).length, 'duplicate balance identities');
    let deltas;
    try { deltas = ordered(Object.fromEntries(Object.entries(net).map(([id, n]) => [id, toMinor(n, test.scale)]))); }
    catch (error) { return { ok: true, output_grid_error: error.message, raw_net: net }; }
    return { ok: true, deltas, zero_sum: Object.values(deltas).reduce((a, b) => a + b, 0) === 0 };
  } catch (error) {
    if (error instanceof runtime.ExpenseFundingError) return { ok: false, code: error.code };
    throw error; // An import/setup/TypeError is not a successful mutation test.
  }
}
function compare(test, model, runtime) {
  const validation = model.validate(structuredClone(test.expense));
  const expected = { ...validation,
    ...(validation.ok ? { deltas: ordered(model.deltas(structuredClone(test.expense))) } : {}) };
  const actual = observeRuntime(test, runtime);
  const differences = [];
  if (expected.ok !== actual.ok) differences.push('acceptance');
  if (!expected.ok && !actual.ok && !expected.failed.includes(actual.code)) differences.push('rejection_reason');
  if (expected.ok && actual.ok) {
    if (actual.output_grid_error) differences.push('output_precision');
    else if (JSON.stringify(expected.deltas) !== JSON.stringify(actual.deltas)) differences.push('participant_attribution');
  }
  return { id: test.id, name: test.name, scope: test.scope, model: expected,
    implementation: actual, conforms: differences.length === 0, differences };
}

const mutations = [
  { id: 'M01', name: 'Collapse all funding onto the first contributor', target: 'core',
    from: '  return funding;', to: '  return [{ memberId: funding[0].memberId, amount: total }];' },
  { id: 'M02', name: 'Bypass funding conservation', target: 'core',
    from: 'if (!conserves(funding.map(entry => entry.amount), total)) {', to: 'if (false) {' },
  { id: 'M03', name: 'Bypass participant membership', target: 'core',
    from: 'if (memberIds && !memberIds.includes(value)) {', to: 'if (false) {' },
  { id: 'M04', name: 'Bypass contribution currency equality', target: 'core',
    from: 'if (entry.currency !== undefined && entry.currency !== expense.currency) {', to: 'if (false) {' },
  { id: 'M05', name: 'Bypass allocation conservation', target: 'core',
    from: 'if (!conserves(allocations, total)) {', to: 'if (false) {' },
  { id: 'M06', name: 'Reverse every participant balance while preserving zero sum', target: 'calculator',
    from: 'memberPaid.minus(memberOwed).toNumber()', to: 'memberOwed.minus(memberPaid).toNumber()' },
];

try {
  // The unexported existing probe is exposed by an appended export in a
  // throwaway module; its evaluator, model, self-tests and formulas are intact.
  const modelDir = join(work, 'model'); mkdirSync(modelDir);
  writeFileSync(join(modelDir, 'MODEL.yaml'), text.model);
  writeFileSync(join(modelDir, 'probe.mjs'), text.interpreter + '\nexport { validate, deltas, rules };\n');
  const model = await import(pathToFileURL(join(modelDir, 'probe.mjs')).href);
  const decimalPath = require.resolve('decimal.js');
  const decimalPackage = JSON.parse(readFileSync(join(dirname(decimalPath), 'package.json'), 'utf8'));
  const lockedDecimal = JSON.parse(text.lock).packages['node_modules/decimal.js'];
  assert.equal(decimalPackage.version, lockedDecimal.version, 'use the locked Decimal version');
  const decimalUrl = pathToFileURL(decimalPath).href;
  const runtime = await loadRuntime('baseline', text.core, text.calculator, decimalUrl);
  const baseline = corpus.cases.map(test => compare(test, model, runtime));
  const shared = corpus.cases.filter(test => test.scope === 'shared-domain');
  assert.ok(shared.length > 0);
  assert.ok(baseline.filter(row => row.scope === 'shared-domain').every(row => row.conforms),
    'Baseline shared-domain failure: cannot score mutations against a failing baseline');
  // An independently hand-checked anchor prevents mutual agreement on this
  // known wrong attribution. The general oracle remains the existing IR probe.
  assert.deepEqual(baseline.find(row => row.id === 'C01').model.deltas, { A: 5000, B: -1000, C: -4000 });
  const mutationResults = [];
  for (const mutation of mutations) {
    let mutated;
    if (mutation.id === 'M04') {
      // The identical text also guards allocation currency. Restrict the
      // mutation to the funding section, preserving the allocation check.
      const boundary = text.core.indexOf('\nfunction validation(');
      assert.ok(boundary > 0);
      mutated = once(text.core.slice(0, boundary), mutation.from, mutation.to) + text.core.slice(boundary);
    } else mutated = once(text[mutation.target], mutation.from, mutation.to);
    const candidate = await loadRuntime(mutation.id,
      mutation.target === 'core' ? mutated : text.core,
      mutation.target === 'calculator' ? mutated : text.calculator, decimalUrl);
    const observations = shared.map(test => compare(test, model, candidate));
    const killedBy = observations.filter(row => !row.conforms);
    mutationResults.push({ id: mutation.id, name: mutation.name, target: paths[mutation.target],
      replacement: { from: mutation.from, to: mutation.to }, mutated_git_blob: blob(mutated),
      loaded_successfully: true, detected: killedBy.length > 0,
      killed_by: killedBy.map(row => row.id), observations });
  }
  const control = await loadRuntime('comment-control', text.core + '\n// Semantically inert control.\n', text.calculator, decimalUrl);
  const controlObservations = corpus.cases.map(test => compare(test, model, control));
  assert.deepEqual(controlObservations, baseline, 'A harmless source edit must not create a behavioral failure');
  for (const [key, path] of Object.entries(paths)) assert.equal(readFileSync(join(root, path), 'utf8'), text[key], `Original source changed: ${path}`);
  let commit = 'not-a-git-checkout';
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* standalone snapshot */ }
  const differences = baseline.filter(row => !row.conforms);
  const allKilled = mutationResults.every(row => row.detected);
  report = { experiment: 'bounded-funding-model-implementation-conformance',
    status: differences.length === 0 && allKilled ? 'CONFORMS' : 'NONCONFORMING',
    experiment_completed: true, tested_commit: commit, runtime: process.version,
    decimal: { version: decimalPackage.version, lock_integrity: lockedDecimal.integrity, source_sha256: sha256(readFileSync(decimalPath)) },
    source_manifest: sourceManifest, model_rule_ids: model.rules.map(rule => rule.id),
    source_files_unchanged: true,
    summary: { cases: baseline.length, conforming: baseline.length - differences.length,
      divergent: differences.length, shared_cases: shared.length,
      shared_conforming: baseline.filter(row => row.scope === 'shared-domain' && row.conforms).length,
      mutation_variants: mutationResults.length, mutations_detected: mutationResults.filter(row => row.detected).length,
      harmless_edit_control: 'unchanged behavior, including the same diagnostic divergences' },
    baseline, mutations: mutationResults,
    limitations: ['Hand-authored bounded corpus and hand-authored existing interpreter, not automatic code generation or independent/blind-agent evidence.',
      'Declared model rules outside executable_rules are not automatically enforced. Differential agreement is not an independent proof.',
      'Explicit fixture-grid conversion only; no general asset precision, rounding or remainder policy.',
      'Calculation/read path only. Persistence, service transactions, concurrency, UI and settlement execution are not tested.',
      'Mutation results are scored only on baseline-conforming shared cases. Existing diagnostic failures cannot kill a mutant.',
      'A surviving mutation or semantic divergence exits 1. A setup/import error exits 2 and is not counted as detection.'] };
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Funding conformance experiment', '', `**${report.status}** — source ${commit}`, '',
    `Matched ${baseline.length - differences.length}/${baseline.length} cases; ${differences.length} divergences.`,
    `The explicitly shared domain matched ${shared.length}/${shared.length}.`,
    `Detected ${mutationResults.filter(row => row.detected).length}/${mutationResults.length} targeted implementation mutations.`,
    'A harmless comment edit produced unchanged behavior. Original input source files are unchanged.', '',
    '## Baseline divergences', ...differences.map(row => `- ${row.id}: ${row.name}; model ${row.model.ok ? 'accepts' : 'rejects'}, implementation ${row.implementation.ok ? 'accepts' : `rejects (${row.implementation.code})`}.`),
    '', '## Deliberate mutations', ...mutationResults.map(row => `- ${row.id}: ${row.name}: ${row.detected ? 'DETECTED' : 'SURVIVED'} (${row.killed_by.join(', ')}).`),
    '', '## Limits', ...report.limitations.map(line => `- ${line}`), '',
    'Reproduction snapshot is partial, not a full app checkout. From snapshot/:',
    '```sh', 'node research/product-ir-v0/funding-conformance.mjs --output ../rerun', '```',
    'Exit 1 is the observed strict conformance failure, not a successful all-green contract gate.', ''];
  writeFileSync(join(output, 'SUMMARY.md'), lines.join('\n'));
  const snapshot = join(output, 'snapshot');
  for (const [key, path] of Object.entries(paths)) {
    const destination = join(snapshot, path); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, text[key]);
  }
  // Include the exact installed pure-JS dependency, never a handwritten stub.
  cpSync(dirname(decimalPath), join(snapshot, 'node_modules/decimal.js'), { recursive: true });
  console.log(JSON.stringify({ status: report.status, ...report.summary }, null, 2));
  process.exitCode = report.status === 'CONFORMS' ? 0 : 1;
} catch (error) {
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'harness-error.json'), JSON.stringify({ status: 'HARNESS_ERROR',
    message: error.message, stack: error.stack, source_manifest: sourceManifest }, null, 2) + '\n');
  console.error(error); process.exitCode = 2;
} finally { rmSync(work, { recursive: true, force: true }); }
