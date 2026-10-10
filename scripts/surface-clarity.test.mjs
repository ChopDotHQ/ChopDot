import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate, initialize, context, sha256 } from './surface-clarity.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'product/surface-clarity';
function fixture(t, live = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-clarity-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const p of [base, 'prototypes/integrated-product-preview-v2', 'prototypes/experience-workbench/registry/journeys.json', 'scripts/package-preview-v2-gate-b.mjs']) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.cpSync(path.join(source, p), path.join(root, p), { recursive: true });
  }
  // Git access is read-only in the tested functions; mutations target copied files.
  const gitdir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: source, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(root, '.git'), `gitdir: ${gitdir}\n`);
  // Unit cases start from pending obligations, independent of accumulated audits.
  // Only disposable test files are changed; live coverage is tested separately.
  if (!live) for (const name of fs.readdirSync(path.join(root, base, 'journeys'))) {
    const p = path.join(root, base, 'journeys', name), r = JSON.parse(fs.readFileSync(p));
    r.status = 'not_reviewed'; r.evidence = [];
    for (const x of [...r.checks, ...r.scenarios]) Object.assign(x, {
      result: 'unassessed', expectation: '', steps: [], evidence_ids: [], reason: ''
    });
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n');
  }
  return root;
}
const read = (root, p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (root, p, x) => fs.writeFileSync(path.join(root, p), JSON.stringify(x, null, 2) + '\n');
function change(root, p, fn) { const x = read(root, p); fn(x); write(root, p, x); }
const j01 = `${base}/journeys/J01.json`;
function browserEvidence(root) {
  const c = context(root), p = `${base}/synthetic-test-evidence.txt`, text = 'Synthetic regression fixture; not real ChopDot browser clearance.\n';
  fs.writeFileSync(path.join(root, p), text);
  return { id: 'fixture', kind: 'BROWSER', implementation_sha: '3738c7307d8223d37bfd7d3cd8a51eadbf4b798a',
    runtime_digest: c.binding.runtime_digest, scope: 'Synthetic metadata fixture only', environment: 'Node unit fixture, no browser executed',
    artifacts: [{ path: p, sha256: sha256(text) }] };
}
test('all registered journeys have coherent records; imported samples are not readiness', t => {
  const r = validate(fixture(t));
  assert.deepEqual(r.errors, []); assert.equal(r.journey_count, 28);
  assert.equal(r.readiness, 'INCOMPLETE'); assert.ok(r.blockers.length > 0);
  assert.ok(r.rows.every(j => j.checks === 0 && j.scenarios === 0));
});
test('missing current journey cannot shrink coverage', t => {
  const root = fixture(t); fs.unlinkSync(path.join(root, base, 'journeys/J28.json'));
  const r = validate(root); assert.equal(r.journey_count, 28); assert.ok(r.errors.includes('J28: missing record'));
});
test('future registered journey is counted and init remains pending without new authority', t => {
  const root = fixture(t), p = 'prototypes/experience-workbench/registry/journeys.json';
  change(root, p, x => x.push({ id: '29', name: 'Synthetic future journey', spec_path: 'not-approved' }));
  let r = validate(root); assert.equal(r.journey_count, 29); assert.ok(r.errors.includes('J29: missing record'));
  assert.equal(initialize(root, 'J29'), 1);
  r = validate(root); assert.ok(!r.errors.includes('J29: missing record'));
  assert.ok(r.blockers.includes('J29: new approved authority mapping required'));
});
test('init refuses existing records and unregistered journey IDs', t => {
  const root = fixture(t);
  assert.throws(() => initialize(root, 'J01'), /overwrite/);
  assert.throws(() => initialize(root, 'J99'), /Unregistered/);
});
test('runtime edit invalidates bindings without resetting them', t => {
  const root = fixture(t); fs.appendFileSync(path.join(root, 'prototypes/integrated-product-preview-v2/demo.js'), '\n// changed\n');
  assert.ok(validate(root).errors.some(e => /stale runtime/.test(e)));
});
test('docs-only changes retain runtime binding', t => {
  const root = fixture(t); fs.appendFileSync(path.join(root, base, 'FRAMEWORK.md'), '\nTest documentation.\n');
  assert.deepEqual(validate(root).errors, []);
});
test('invented certified task mapping is rejected', t => {
  const root = fixture(t); change(root, j01, r => r.source_binding.certified_task_ids.push('INVENTED'));
  assert.ok(validate(root).errors.some(e => /invented schema mapping/.test(e)));
});
test('a pass needs steps, an expectation and referenced evidence', t => {
  const root = fixture(t); change(root, j01, r => { r.checks[0].result = 'pass'; });
  assert.ok(validate(root).errors.includes('J01: unsupported pass truth'));
});
test('not applicable cannot silently replace unexecuted checks', t => {
  const root = fixture(t); change(root, j01, r => { r.scenarios[1].result = 'not_applicable'; });
  assert.ok(validate(root).errors.includes('J01: unjustified not_applicable alternate_paths'));
});
test('bounded supported check is allowed without clearing unrelated paths', t => {
  const root = fixture(t), e = browserEvidence(root);
  change(root, j01, r => { r.evidence.push(e); Object.assign(r.checks[0], { result: 'pass', expectation: 'Synthetic expectation', steps: ['Synthetic metadata step'], evidence_ids: ['fixture'] }); });
  const r = validate(root); assert.deepEqual(r.errors, []);
  assert.equal(r.rows[0].checks, 1); assert.equal(r.readiness, 'INCOMPLETE');
});
test('failed command cannot support pass', t => {
  const root = fixture(t), e = browserEvidence(root);
  Object.assign(e, { automated: true, command: 'synthetic failing command', exit_code: 1, log: e.artifacts[0].path });
  change(root, j01, r => { r.evidence.push(e); Object.assign(r.checks[0], { result: 'pass', expectation: 'Synthetic', steps: ['Synthetic'], evidence_ids: ['fixture'] }); });
  assert.ok(validate(root).errors.includes('J01: failed command used for pass truth'));
});
test('changed artifact bytes invalidate evidence', t => {
  const root = fixture(t), e = browserEvidence(root);
  change(root, j01, r => r.evidence.push(e)); fs.appendFileSync(path.join(root, e.artifacts[0].path), 'changed');
  assert.ok(validate(root).errors.includes('J01: missing/changed evidence artifact fixture'));
});
test('artifact paths cannot escape the disposable evidence root', t => {
  const root = fixture(t), e = browserEvidence(root); e.artifacts[0].path = '../outside.txt';
  change(root, j01, r => r.evidence.push(e));
  assert.ok(validate(root).errors.some(x => /missing\/changed evidence/.test(x)));
});
test('borrowed available commit cannot attest different runtime bytes', t => {
  const root = fixture(t), e = browserEvidence(root);
  e.implementation_sha = '8548313791e4ef7b436ee742cd18c1fa48d74eeb';
  change(root, j01, r => r.evidence.push(e));
  assert.ok(validate(root).errors.some(x => /evidence SHA does not match tested runtime/.test(x)));
});
test('fixed finding requires linked evidence and current runtime disposition', t => {
  const root = fixture(t); change(root, `${base}/findings.json`, f => { f[0].status = 'fixed'; });
  assert.ok(validate(root).errors.some(x => /unsupported finding disposition UX-001/.test(x)));
});
test('historical result bytes cannot be silently reclassified', t => {
  const root = fixture(t); fs.appendFileSync(path.join(root, base, 'historical-audit/results.json'), ' ');
  assert.ok(validate(root).errors.includes('Historical audit integrity mismatch'));
});
test('frozen authority tree mismatch stops the check', t => {
  const root = fixture(t); change(root, `${base}/policy.json`, p => { p.schema_tree = '0000000000000000000000000000000000000000'; });
  assert.throws(() => validate(root), /Frozen tree mismatch/);
});
test('live J01 failures and unexecuted paths remain incomplete with valid bookkeeping', t => {
  const root = fixture(t, true), r = validate(root), record = read(root, j01);
  assert.deepEqual(r.errors, []);
  assert.equal(r.readiness, 'INCOMPLETE');
  for (const x of [...record.checks, ...record.scenarios].filter(x => ['fail', 'unassessed'].includes(x.result))) {
    assert.ok(r.blockers.includes(`J01: ${x.id} ${x.result}`));
  }
  for (const id of record.finding_ids) assert.ok(r.blockers.some(b => b.startsWith(`J01: ${id} `)));
});
