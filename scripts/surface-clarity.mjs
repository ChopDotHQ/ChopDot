#!/usr/bin/env node
// Bookkeeping and source freshness only. This does not judge usability.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const base = 'product/surface-clarity';
const json = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const frozen = (root, commit, file) => JSON.parse(git(root, 'show', `${commit}:${file}`));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) && value.length > 0;
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function files(root, relative) {
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Symlink in runtime inputs: ${relative}`);
  if (!stat.isDirectory()) return [relative];
  return fs.readdirSync(absolute).sort().flatMap(n => ['node_modules', '.git'].includes(n) ? [] : files(root, `${relative}/${n}`));
}
function digestAt(root, policy, commit) {
  const paths = git(root, 'ls-tree', '-r', '--name-only', commit, '--', ...policy.runtime_roots)
    .split('\n').filter(p => p && policy.runtime_extensions.includes(path.extname(p))).sort();
  return sha256(JSON.stringify(paths.map(p => [p, sha256(execFileSync('git', ['show', `${commit}:${p}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 }))])));
}
export function context(root) {
  const policy = json(root, `${base}/policy.json`);
  for (const [commit, tree] of [[policy.schema_commit, policy.schema_tree], [policy.golden_commit, policy.golden_tree]]) {
    if (git(root, 'rev-parse', `${commit}^{tree}`) !== tree) throw new Error(`Frozen tree mismatch: ${commit}`);
  }
  const registry = json(root, policy.registry);
  if (!Array.isArray(registry) || registry.some(j => !/^\d{2,}$/.test(j.id))) throw new Error('Invalid journey registry');
  if (new Set(registry.map(j => j.id)).size !== registry.length) throw new Error('Duplicate registry journey');
  const runtime = [...new Set(policy.runtime_roots.flatMap(p => files(root, p)))].sort()
    .filter(p => policy.runtime_extensions.includes(path.extname(p)))
    .map(p => [p, sha256(fs.readFileSync(path.join(root, p)))]);
  if (!runtime.length) throw new Error('Empty runtime scope');
  const graph = frozen(root, policy.schema_commit, 'product-schema/composition-graph.json');
  const core = frozen(root, policy.schema_commit, 'product-schema/semantic-core.json');
  const tasks = frozen(root, policy.schema_commit, 'product-schema/task-paths-v1.json');
  const pieces = frozen(root, policy.schema_commit, 'product-schema/generated/reconstruction-pieces.json');
  return { policy, registry, graph, core, tasks, pieces, binding: {
    registry_digest: sha256(fs.readFileSync(path.join(root, policy.registry))),
    runtime_digest: sha256(JSON.stringify(runtime)), schema_commit: policy.schema_commit, golden_commit: policy.golden_commit
  }, implementation_sha: git(root, 'rev-parse', 'HEAD'), runtime_file_count: runtime.length };
}
function sourceBinding(c, j) {
  const projection = c.graph.journey_projections.find(p => p.id === j.id);
  if (!projection) return { status: 'mapping_required', registry_spec: j.spec_path, reason: 'Not represented by immutable Schema V1; record approved new authority before review.' };
  const operations = [...new Set([...projection.owns_operations, ...projection.participates_operations])];
  const contexts = [...new Set(['entry_contexts_any', 'ambient_contexts_required', 'effect_contexts_required', 'emits_contexts'].flatMap(k => projection[k] || []))];
  const ops = c.core.operations.filter(o => operations.includes(o.id));
  const objects = new Set(ops.flatMap(o => [o.owner, ...(o.reads || []), ...(o.changes || [])]));
  const related = [...new Set([
    ...ops.flatMap(o => o.law_refs || []),
    ...c.graph.contexts.filter(ctx => contexts.includes(ctx.id)).flatMap(ctx => ctx.laws || []),
    ...c.core.laws.filter(l => (l.applies_to || []).some(o => objects.has(o))).map(l => l.id)
  ])].sort();
  return { status: 'frozen_mapping_available', registry_spec: j.spec_path, schema_projection: j.id,
    owns_operations: projection.owns_operations, participates_operations: projection.participates_operations,
    contexts, related_laws_inspect_applicability: related,
    certified_task_ids: c.tasks.tasks.filter(t => t.journey === j.id && t.status === 'certified').map(t => t.id),
    approved_piece_count: c.pieces.pieces.filter(p => p.journey === j.id).length,
    piece_locator: 'product-schema/generated/reconstruction-pieces.json',
    note: 'Related laws are a navigation aid, not an assertion that every law applies in every state. Inspect composition units and approved later impacts too.' };
}
export function starter(c, j) {
  const pending = id => ({ id, result: 'unassessed', expectation: '', steps: [], evidence_ids: [], reason: '' });
  return { framework_version: c.policy.framework_version, journey: `J${j.id}`, name: j.name,
    binding: c.binding, status: 'not_reviewed', source_binding: sourceBinding(c, j),
    scope: { tasks: [], states: [], actors: [], incoming_routes: [], return_routes: [], viewports: [], fixtures: [], limitations: [] },
    checks: c.policy.checks.map(pending), scenarios: c.policy.scenario_categories.map(pending),
    decisions: [], hypotheses: [], additional_authority: [], evidence: [], finding_ids: [], historical_sample: null };
}
export function initialize(root, id) {
  const c = context(root);
  const targets = id === 'all' ? c.registry : c.registry.filter(j => `J${j.id}` === id);
  if (!targets.length) throw new Error(`Unregistered journey: ${id}`);
  fs.mkdirSync(path.join(root, base, 'journeys'), { recursive: true });
  const existing = targets.filter(j => fs.existsSync(path.join(root, base, 'journeys', `J${j.id}.json`)));
  if (existing.length) throw new Error(`Refusing to overwrite: ${existing.map(j => `J${j.id}`).join(', ')}`);
  for (const j of targets) fs.writeFileSync(path.join(root, base, 'journeys', `J${j.id}.json`), JSON.stringify(starter(c, j), null, 2) + '\n', { flag: 'wx' });
  return targets.length;
}
function artifact(root, a) {
  if (!a || !nonempty(a.path) || path.isAbsolute(a.path) || a.path.split(/[\\/]/).includes('..') || !hex(a.sha256)) return false;
  try {
    const absolute = fs.realpathSync(path.join(root, a.path));
    if (!absolute.startsWith(fs.realpathSync(root) + path.sep)) return false;
    return sha256(fs.readFileSync(absolute)) === a.sha256;
  } catch { return false; }
}
export function validate(root) {
  const c = context(root), errors = [], blockers = [], rows = [];
  const runtimeDigests = new Map();
  const findings = json(root, `${base}/findings.json`);
  if (!Array.isArray(findings) || findings.some(f => !nonempty(f.id) || !list(f.journeys))) throw new Error('Invalid findings register');
  if (new Set(findings.map(f => f.id)).size !== findings.length) errors.push('Duplicate finding ID');
  const registered = new Set(c.registry.map(j => `J${j.id}`));
  for (const f of findings) {
    if (!['open', 'fixed', 'accepted_limit', 'needs_product_decision', 'hypothesis_needs_test'].includes(f.status)) errors.push(`${f.id}: invalid disposition`);
    for (const j of f.journeys) if (!registered.has(j)) errors.push(`${f.id}: unknown journey ${j}`);
  }
  const folder = path.join(root, base, 'journeys');
  const recordNames = fs.existsSync(folder) ? fs.readdirSync(folder).filter(n => n.endsWith('.json')) : [];
  for (const file of recordNames) if (!registered.has(file.slice(0, -5))) errors.push(`Orphan journey record: ${file}`);
  if (c.policy.inherited_audit.results_sha256 && !artifact(root, { path: `${base}/historical-audit/results.json`, sha256: c.policy.inherited_audit.results_sha256 })) errors.push('Historical audit integrity mismatch');
  for (const j of c.registry) {
    const id = `J${j.id}`, record = `${base}/journeys/${id}.json`;
    if (!fs.existsSync(path.join(root, record))) { errors.push(`${id}: missing record`); rows.push({ id, name: j.name, status: 'missing', checks: 0, scenarios: 0, findings: 0 }); continue; }
    const r = json(root, record), before = blockers.length;
    if (r.journey !== id || r.name !== j.name || r.framework_version !== c.policy.framework_version) errors.push(`${id}: identity/version mismatch`);
    if (!same(r.binding, c.binding)) errors.push(`${id}: stale runtime/registry/authority binding`);
    if (!same(r.source_binding, sourceBinding(c, j))) errors.push(`${id}: stale or invented schema mapping`);
    if (!['not_reviewed', 'in_progress', 'reviewed', 'blocked'].includes(r.status)) errors.push(`${id}: invalid review status`);
    if (r.status !== 'reviewed') blockers.push(`${id}: not reviewed`);
    const scopeKeys = ['tasks', 'states', 'actors', 'incoming_routes', 'return_routes', 'viewports', 'fixtures', 'limitations'];
    if (!r.scope || scopeKeys.some(k => !Array.isArray(r.scope[k]))) errors.push(`${id}: malformed scope`);
    else if (['tasks', 'states', 'actors', 'incoming_routes', 'return_routes', 'viewports'].some(k => !list(r.scope[k]))) blockers.push(`${id}: task/actor/route/viewport scope incomplete`);
    if (!Array.isArray(r.decisions) || !Array.isArray(r.hypotheses)) errors.push(`${id}: missing decision/hypothesis arrays`);
    const additional = Array.isArray(r.additional_authority) ? r.additional_authority : [];
    for (const a of additional) {
      if (!/^[a-f0-9]{40}$/.test(a.commit || '') || !nonempty(a.path) || !hex(a.sha256) || !nonempty(a.approval_reference) || !nonempty(a.role)) { errors.push(`${id}: invalid additional authority`); continue; }
      try {
        if (sha256(execFileSync('git', ['show', `${a.commit}:${a.path}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 })) !== a.sha256) errors.push(`${id}: additional authority bytes mismatch`);
      } catch { errors.push(`${id}: additional authority unavailable`); }
    }
    if (r.source_binding.status !== 'frozen_mapping_available' && !additional.length) blockers.push(`${id}: new approved authority mapping required`);
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    if (!Array.isArray(r.evidence)) errors.push(`${id}: missing evidence array`);
    if (new Set(evidence.map(e => e.id)).size !== evidence.length) errors.push(`${id}: duplicate evidence ID`);
    const ev = new Map(evidence.map(e => [e.id, e]));
    for (const e of evidence) {
      if (!nonempty(e.id) || !c.policy.evidence_kinds.includes(e.kind) || !/^[a-f0-9]{40}$/.test(e.implementation_sha || '') || !hex(e.runtime_digest) || !nonempty(e.scope) || !nonempty(e.environment) || !list(e.artifacts)) { errors.push(`${id}: malformed evidence ${e.id}`); continue; }
      try {
        git(root, 'cat-file', '-e', `${e.implementation_sha}^{commit}`);
        if (!runtimeDigests.has(e.implementation_sha)) runtimeDigests.set(e.implementation_sha, digestAt(root, c.policy, e.implementation_sha));
        if (runtimeDigests.get(e.implementation_sha) !== e.runtime_digest) errors.push(`${id}: evidence SHA does not match tested runtime ${e.id}`);
      } catch { errors.push(`${id}: evidence commit unavailable ${e.id}`); }
      if (e.runtime_digest !== c.binding.runtime_digest) errors.push(`${id}: stale evidence ${e.id}`);
      if (e.artifacts.some(a => !artifact(root, a))) errors.push(`${id}: missing/changed evidence artifact ${e.id}`);
      if (e.automated === true && (!nonempty(e.command) || !Number.isInteger(e.exit_code) || !e.artifacts.some(a => a.path === e.log))) errors.push(`${id}: command/exit/log missing ${e.id}`);
      if (e.kind === 'USER_STUDY' && (!nonempty(e.protocol) || !nonempty(e.participant_scope) || !nonempty(e.observations))) errors.push(`${id}: incomplete human study ${e.id}`);
      if (e.kind === 'INDEPENDENT_REVIEW' && !nonempty(e.reviewer)) errors.push(`${id}: unnamed separate reviewer ${e.id}`);
    }
    function entries(entries, required, label) {
      if (!Array.isArray(entries)) { errors.push(`${id}: missing ${label}`); return 0; }
      if (new Set(entries.map(x => x.id)).size !== entries.length) errors.push(`${id}: duplicate ${label} ID`);
      for (const key of required) if (!entries.some(x => x.id === key)) errors.push(`${id}: missing ${label} ${key}`);
      let assessed = 0;
      for (const x of entries) {
        if (!nonempty(x.id) || !['unassessed', 'pass', 'fail', 'not_applicable'].includes(x.result) || !Array.isArray(x.evidence_ids)) { errors.push(`${id}: invalid ${label} ${x.id}`); continue; }
        for (const ref of x.evidence_ids) if (!ev.has(ref)) errors.push(`${id}: unknown evidence ${ref}`);
        if (x.result === 'pass') {
          if (!nonempty(x.expectation) || !list(x.steps) || !list(x.evidence_ids)) errors.push(`${id}: unsupported pass ${x.id}`);
          for (const ref of x.evidence_ids) if (ev.get(ref)?.automated && ev.get(ref).exit_code !== 0) errors.push(`${id}: failed command used for pass ${x.id}`);
          assessed++;
        } else if (x.result === 'not_applicable') {
          if (!nonempty(x.reason) || !list(x.evidence_ids)) errors.push(`${id}: unjustified not_applicable ${x.id}`);
          assessed++;
        } else blockers.push(`${id}: ${x.id} ${x.result}`);
      }
      return assessed;
    }
    const checked = entries(r.checks, c.policy.checks, 'check'), scenarios = entries(r.scenarios, c.policy.scenario_categories, 'scenario');
    const related = findings.filter(f => f.journeys.includes(id));
    if (!Array.isArray(r.finding_ids) || !same([...r.finding_ids].sort(), related.map(f => f.id).sort())) errors.push(`${id}: finding coverage mismatch`);
    for (const f of related) {
      if (f.status === 'fixed' || f.status === 'accepted_limit') {
        const d = f.disposition;
        if (!d || !nonempty(d.rationale) || !list(d.evidence_ids) || d.evidence_ids.some(ref => !ev.has(ref)) || d.runtime_digest !== c.binding.runtime_digest || (f.status === 'accepted_limit' && (!nonempty(d.approved_by) || !nonempty(d.approval_reference)))) errors.push(`${id}: unsupported finding disposition ${f.id}`);
      } else blockers.push(`${id}: ${f.id} ${f.status}`);
    }
    rows.push({ id, name: j.name, status: blockers.length === before ? 'review_record_complete' : r.status, checks: checked, scenarios, findings: related.length });
  }
  return { framework_version: c.policy.framework_version, current_sha: c.implementation_sha, binding: c.binding,
    runtime_file_count: c.runtime_file_count, journey_count: c.registry.length, errors, blockers, rows,
    structure: errors.length ? 'INVALID_OR_STALE' : 'VALID', readiness: errors.length || blockers.length ? 'INCOMPLETE' : 'RECORDS_COMPLETE_REQUIRES_HUMAN_ACCEPTANCE' };
}
export function report(result) {
  const clean = x => String(x).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return [`# Surface Clarity coverage`, '', `Registry: ${result.journey_count} journeys. Structure: ${result.structure}. Review readiness: ${result.readiness}.`,
    'Bookkeeping only; not a usability verdict or acceptance.', '', '| Journey | Name | Review | Checks assessed | Scenarios assessed | Findings |', '|---|---|---|---:|---:|---:|',
    ...result.rows.map(r => `| ${r.id} | ${clean(r.name)} | ${r.status} | ${r.checks} | ${r.scenarios} | ${r.findings} |`), '',
    `Structural errors: ${result.errors.length}. Pending/failing obligations: ${result.blockers.length}.`, ''].join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const command = process.argv[2] || 'check';
    if (command === 'context') {
      const c = context(root); console.log(JSON.stringify({ implementation_sha: c.implementation_sha, binding: c.binding, runtime_file_count: c.runtime_file_count }, null, 2));
    } else if (command === 'init') console.log(`Created ${initialize(root, process.argv[3])} unassessed record(s).`);
    else if (['check', 'ready', 'report'].includes(command)) {
      const result = validate(root);
      console.log(command === 'report' ? report(result) : JSON.stringify(result, null, 2));
      process.exitCode = result.errors.length ? 1 : command === 'ready' && result.blockers.length ? 2 : 0;
    } else throw new Error('Usage: node scripts/surface-clarity.mjs context|init Jxx|check|report|ready');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
