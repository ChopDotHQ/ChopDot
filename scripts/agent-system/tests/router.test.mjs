import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createContract } from '../contract.mjs';
import { digestApprovalRef, digestApprovalRequest, digestTaskRoute, routeExecutionMode, routeTask, validateTaskRoute } from '../router.mjs';
import { validateAgentContract } from '../validate.mjs';
import { executeRunPreflight } from '../preflight.mjs';
import { startRun } from '../runner.mjs';
import { dispatchEffect, planEffect } from '../effects.mjs';
import { fixtureRoot } from './helpers.mjs';
import { validateGovernanceInstance } from '../schema.mjs';
import { sha256 } from '../core.mjs';
import { validateTaskRoutingPolicy } from '../routing-policy.mjs';

const SKILL_BYTES = '# test skill\n';

function registryForFixture() {
  return {
    external_surfaces: [
      { id: 'skill-webapp-testing', lifecycle: 'active', activation_mode: 'explicit_only', locator: { base: 'canonical_repo_root', path: '.agents/skills/webapp/SKILL.md' }, trusted_sha256: sha256(SKILL_BYTES) },
      { id: 'skill-ui-visual-validator', lifecycle: 'active', activation_mode: 'routed', locator: { base: 'canonical_repo_root', path: '.agents/skills/visual/SKILL.md' }, trusted_sha256: sha256(SKILL_BYTES) },
      { id: 'skill-chopdot-engineering-judgment', lifecycle: 'quarantined', activation_mode: 'disabled', locator: { base: 'canonical_repo_root', path: '.agents/skills/engineering/SKILL.md' }, trusted_sha256: sha256(SKILL_BYTES) },
    ],
  };
}

async function installFixtureSkills(root) {
  for (const name of ['webapp', 'visual', 'engineering']) {
    const directory = path.join(root, '.agents', 'skills', name);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'SKILL.md'), SKILL_BYTES);
  }
  const registryPath = path.join(root, 'governance', 'agent-system');
  await mkdir(registryPath, { recursive: true });
  await writeFile(path.join(registryPath, 'steering-surface-registry.v1.json'), `${JSON.stringify(registryForFixture())}\n`);
}

async function routed(input) {
  const root = await fixtureRoot();
  await installFixtureSkills(root);
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'install governed fixture skills'], { cwd: root, stdio: 'ignore' });
  const normalized = { ...input };
  if (normalized.approvalRef === 'fixture') {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const effectClass = normalized.effectClass ?? 'critical_external_effect';
    const effectTypes = normalized.effectTypes ?? (normalized.taskDomain === 'release' ? ['credential_use', 'publish', 'deploy', 'chain_write'] : []);
    const expectedOutcome = 'Produce the bounded expected outcome with objective evidence.';
    const candidateHead = git(['rev-parse', 'HEAD']);
    const candidateTree = git(['rev-parse', 'HEAD^{tree}']);
    const ref = { approval_id: 'approval_fixture_route_0001', granted_by: 'fixture-human', granted_by_kind: 'human', source: 'recorded_operator_envelope', effect_class: effectClass, effect_types: effectTypes, scope_root: root, candidate_head: candidateHead, candidate_tree: candidateTree, request_digest: digestApprovalRequest({ scopeRoot: root, candidateHead, candidateTree, effectClass, effectTypes, expectedOutcome }), granted_at: '2026-08-31T12:00:00.000Z', expires_at: '2099-01-01T00:00:00.000Z', evidence_ref: 'fixture-approved-envelope' };
    ref.approval_digest = digestApprovalRef(ref);
    normalized.approvalRef = ref;
  }
  return { root, route: routeTask({ expectedOutcome: 'Produce the bounded expected outcome with objective evidence.', ...normalized }, { root, registry: registryForFixture() }) };
}

const matrix = [
  ['trivial deterministic turn', { taskDomain: 'research' }, { verdict: 'routed', risk: 'low', run: 'turn', mode: 'deterministic' }],
  ['moderate implementation', { taskDomain: 'implementation' }, { verdict: 'routed', risk: 'moderate', run: 'bounded_goal', mode: 'single-agent' }],
  ['user-facing UX', { taskDomain: 'ux', userFacing: true }, { verdict: 'routed', risk: 'moderate', screenshots: true }],
  ['money mutation', { taskDomain: 'implementation', criticalTopics: ['money'] }, { verdict: 'approval_required', risk: 'critical', independent: true }],
  ['recovery work', { taskDomain: 'security-authority', criticalTopics: ['recovery'] }, { verdict: 'routed', risk: 'critical', evidence: 'exact-candidate' }],
  ['unapproved release write', { taskDomain: 'release', externalWrite: true }, { verdict: 'approval_required', risk: 'critical' }],
  ['approved release write', { taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' }, { verdict: 'routed', risk: 'critical', readback: true }],
  ['approved repository effect', { taskDomain: 'implementation', effectClass: 'repository_effect', effectTypes: ['commit', 'push'], approvalRef: 'fixture' }, { verdict: 'routed', risk: 'critical', readback: true }],
  ['read-only monitoring', { taskDomain: 'research', runType: 'time_based', requestedMutation: false }, { verdict: 'routed', run: 'time_based', mutation: false }],
  ['proactive external mutation', { taskDomain: 'research', runType: 'proactive', effectClass: 'external_effect', effectTypes: ['message_send'] }, { verdict: 'approval_required', newRoute: true, mutation: false }],
  ['disabled skill', { taskDomain: 'implementation', skillIds: ['skill-chopdot-engineering-judgment'] }, { verdict: 'blocked', selectedSkills: 0 }],
  ['injected skill is observation only', { taskDomain: 'research', observedSkillIds: ['platform:injected-skill'] }, { verdict: 'routed', selectedSkills: 0, observedSkills: 1 }],
  ['conflicting authority', { taskDomain: 'product-definition', failureSignals: ['conflicting-authority'] }, { verdict: 'blocked', risk: 'moderate' }],
];

for (const [name, input, expected] of matrix) {
  test(`route matrix: ${name}`, async () => {
    const { root, route } = await routed(input);
    assert.equal(validateTaskRoute(route, { expectedRoot: root }).valid, true);
    if (expected.verdict) assert.equal(route.verdict, expected.verdict);
    if (expected.risk) assert.equal(route.risk_tier, expected.risk);
    if (expected.run) assert.equal(route.run_type, expected.run);
    if (expected.mode) assert.equal(route.execution_mode, expected.mode);
    if (expected.screenshots !== undefined) assert.equal(route.evidence.screenshots_required, expected.screenshots);
    if (expected.independent) assert.ok(route.selection.agent_ids.includes('independent-evaluator'));
    if (expected.evidence) assert.equal(route.evidence.minimum_level, expected.evidence);
    if (expected.readback !== undefined) assert.equal(route.evidence.readback_required, expected.readback);
    if (expected.mutation !== undefined) assert.equal(route.approval_boundary.mutation_allowed, expected.mutation);
    if (expected.newRoute !== undefined) assert.equal(route.approval_boundary.new_effect_route_required, expected.newRoute);
    if (expected.selectedSkills !== undefined) assert.equal(route.selection.skill_ids.length, expected.selectedSkills);
    if (expected.observedSkills !== undefined) assert.equal(route.selection.observed_unapproved_skill_ids.length, expected.observedSkills);
  });
}

test('route budget cannot widen policy defaults', async () => {
  const root = await fixtureRoot();
  assert.throws(() => routeTask({ taskDomain: 'research', expectedOutcome: 'Return a cited bounded research result.', budget: { max_tool_calls: 21 } }, { root, registry: registryForFixture() }), /cannot exceed 20/);
});

test('task routing policy schema and semantic floors reject weakened critical controls', async () => {
  const policy = JSON.parse(await readFile(path.resolve('governance/agent-system/policies/task-routing.v1.json'), 'utf8'));
  assert.equal(validateTaskRoutingPolicy(policy).valid, true);
  policy.minimum_risk.release = 'moderate';
  policy.risk_rules.critical.minimum_evidence_level = 'unit';
  policy.critical_topics = policy.critical_topics.filter((entry) => entry !== 'money');
  const validation = validateTaskRoutingPolicy(policy);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'const'));
  assert.ok(validation.issues.some((issue) => issue.code === 'routing_floor_changed'));
  assert.ok(validation.issues.some((issue) => issue.code === 'critical_topics_changed'));
});

test('router loads policy and profiles from the exact target root', async () => {
  const root = await fixtureRoot();
  const policyPath = path.join(root, 'governance', 'agent-system', 'policies', 'task-routing.v1.json');
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  policy.minimum_risk.release = 'moderate';
  await writeFile(policyPath, `${JSON.stringify(policy)}\n`);
  assert.throws(() => routeTask({ taskDomain: 'research', expectedOutcome: 'Use only exact-root governed routing sources.' }, { root, registry: registryForFixture() }), /Task routing policy is invalid/);
});

test('active skill still fails closed when its trusted repository bytes drift', async () => {
  const root = await fixtureRoot();
  await installFixtureSkills(root);
  const registry = registryForFixture();
  registry.external_surfaces[0].trusted_sha256 = 'f'.repeat(64);
  const route = routeTask({ taskDomain: 'implementation', expectedOutcome: 'Use only byte-verified repository skills.', skillIds: ['skill-webapp-testing'] }, { root, registry });
  assert.equal(route.verdict, 'blocked');
  assert.deepEqual(route.selection.skill_ids, []);
});

test('route digest and exact root fail closed', async () => {
  const { root, route } = await routed({ taskDomain: 'implementation' });
  route.expected_outcome = 'Tampered expected outcome that was not routed.';
  assert.ok(validateTaskRoute(route, { expectedRoot: root }).issues.some((issue) => issue.code === 'digest_mismatch'));
  assert.ok(validateTaskRoute(route, { expectedRoot: '/tmp/not-the-route-root' }).issues.some((issue) => issue.code === 'wrong_root'));
});

test('semantic route validation rejects profile, evidence, and retry-budget downgrades even with a recomputed digest', async () => {
  const { root, route } = await routed({ taskDomain: 'security-authority' });
  route.selection.profile_id = 'research';
  route.evidence.minimum_level = 'unit';
  route.budget.max_retries = 0;
  route.route_digest = digestTaskRoute(route);
  const issues = validateTaskRoute(route, { expectedRoot: root }).issues.map((issue) => issue.code);
  assert.ok(issues.includes('profile_mismatch'));
  assert.ok(issues.includes('evidence_downgrade'));
  assert.ok(issues.includes('budget_mismatch'));
});

test('semantic route validation rejects forged skills, agents, approval boundaries, and candidate identity with a recomputed digest', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  route.selection.skill_ids = ['skill-platform-injected'];
  route.selection.agent_ids = ['task-owner'];
  route.approval_boundary = { effect_class: 'repo_local_write', effect_types: [], mutation_allowed: true, approval_required: false, approval_ref: null, new_effect_route_required: false, required_readback: false };
  route.scope.branch = 'codex/forged';
  route.route_digest = digestTaskRoute(route);
  const issues = validateTaskRoute(route, { expectedRoot: root, requireRouted: true }).issues.map((issue) => issue.code);
  assert.ok(issues.includes('unapproved_skill_selected'));
  assert.ok(issues.includes('agent_selection_mismatch'));
  assert.ok(issues.includes('mutation_readback_missing'));
  assert.ok(issues.includes('stale_route'));
});

test('scheduled and critical effect semantics fail closed even with a recomputed digest', async () => {
  const proactive = await routed({ taskDomain: 'research', runType: 'proactive', requestedMutation: false });
  proactive.route.approval_boundary = { effect_class: 'repo_local_write', effect_types: [], mutation_allowed: false, approval_required: false, approval_ref: null, new_effect_route_required: false, required_readback: true };
  proactive.route.route_digest = digestTaskRoute(proactive.route);
  const proactiveCodes = validateTaskRoute(proactive.route, { expectedRoot: proactive.root, requireRouted: true }).issues.map((issue) => issue.code);
  assert.ok(proactiveCodes.includes('scheduled_effect_route_forbidden'));
  assert.ok(proactiveCodes.includes('scheduled_effect_route_missing'));

  const critical = await routed({ taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' });
  critical.route.approval_boundary.approval_required = false;
  critical.route.route_digest = digestTaskRoute(critical.route);
  const criticalCodes = validateTaskRoute(critical.route, { expectedRoot: critical.root, requireRouted: true }).issues.map((issue) => issue.code);
  assert.ok(criticalCodes.includes('external_effect_boundary_mismatch'));
  assert.ok(criticalCodes.includes('critical_mutation_boundary_mismatch'));
});

test('self-asserted approval booleans cannot authorize a critical route', async () => {
  const root = await fixtureRoot();
  assert.throws(() => routeTask({ taskDomain: 'release', expectedOutcome: 'Publish an exact reviewed release candidate.', externalWrite: true, approvalGranted: true }, { root, registry: registryForFixture() }), /Boolean approvalGranted is not accepted/);
});

test('approval reference must be digest-bound to the exact root and effect class', async () => {
  const { root, route } = await routed({ taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' });
  route.approval_boundary.approval_ref.scope_root = '/tmp/forged-root';
  route.approval_boundary.approval_ref.approval_digest = digestApprovalRef(route.approval_boundary.approval_ref);
  route.route_digest = digestTaskRoute(route);
  const codes = validateTaskRoute(route, { expectedRoot: root, requireRouted: true }).issues.map((issue) => issue.code);
  assert.ok(codes.includes('approval_scope_mismatch'));
});

test('approval reference cannot be replayed for a different critical effect set', async () => {
  const { root, route } = await routed({ taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' });
  route.approval_boundary.effect_types = [...route.approval_boundary.effect_types, 'payment'];
  route.route_digest = digestTaskRoute(route);
  const codes = validateTaskRoute(route, { expectedRoot: root, requireRouted: true }).issues.map((issue) => issue.code);
  assert.ok(codes.includes('approval_scope_mismatch'));
});

test('critical routes fail closed when the exact candidate has uncommitted bytes', async () => {
  const root = await fixtureRoot();
  await writeFile(path.join(root, 'PRODUCT_TRUTH.md'), '# Changed product truth\n');
  const route = routeTask({ taskDomain: 'security-authority', expectedOutcome: 'Review one exact committed security candidate.' }, { root, registry: registryForFixture() });
  assert.equal(route.verdict, 'blocked');
  assert.ok(route.routing_rationale.some((entry) => entry.includes('clean committed tree')));
  assert.ok(validateTaskRoute(route, { expectedRoot: root, requireRouted: true, registry: registryForFixture() }).issues.some((issue) => issue.code === 'critical_candidate_dirty'));
});

test('contract consumes accepted route profile, architecture, budget, and immutable receipt binding', async () => {
  const { root, route } = await routed({ taskDomain: 'ux', userFacing: true, skillIds: ['skill-ui-visual-validator'] });
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const contract = createContract({
    root,
    runId: 'run_route_contract_0001',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'output/routes/ux.json',
    routeExecutionMode: routeExecutionMode(route),
    objective: route.expected_outcome,
    branch: git(['branch', '--show-current']),
    startingHead: git(['rev-parse', 'HEAD']),
    startingTree: git(['rev-parse', 'HEAD^{tree}']),
  });
  assert.equal(contract.loop_profile.id, 'ux-creation');
  assert.equal(contract.architecture.mode, 'single_agent');
  assert.equal(contract.budgets.max_tool_calls, route.budget.max_tool_calls);
  assert.equal(contract.task_route.route_digest, route.route_digest);
  assert.equal(contract.context.governing_sources[0].authority_level, 'product_law');
  assert.equal(validateAgentContract(contract, { expectedRoot: root }).valid, true);
});

test('route-bound contract cannot widen read-only writes, candidate, architecture, budget, or routing-policy authority', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  const contract = createContract({
    root,
    runId: 'run_route_read_only_0001',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'runs/route.json',
    routeExecutionMode: routeExecutionMode(route),
    sourcePath: 'governance/agent-system/policies/task-routing.v1.json',
    allowedWrites: ['docs/research/new.md'],
    branch: 'codex/forged',
    startingHead: 'f'.repeat(40),
    startingTree: 'e'.repeat(40),
    architecture: { mode: 'parallel_workers', justification: 'forged' },
    budgets: { max_iterations: 20, max_retries: 20, max_wall_seconds: 99999, max_tool_calls: 99999, max_model_cost_usd: 99999, max_external_cost_usd: 99999 },
  });
  assert.deepEqual(contract.authority.allowed_writes, []);
  assert.equal(contract.scope.branch, route.scope.branch);
  assert.equal(contract.scope.starting_head, route.scope.head);
  assert.equal(contract.scope.starting_tree, route.scope.tree);
  assert.equal(contract.architecture.mode, routeExecutionMode(route));
  assert.equal(contract.budgets.max_tool_calls, route.budget.max_tool_calls);
  assert.equal(contract.context.governing_sources[0].authority_level, 'guardrail');
});

test('CLI contract-new rejects a non-routed receipt and profile override', async () => {
  const { root, route } = await routed({ taskDomain: 'implementation', failureSignals: ['conflicting-authority'] });
  const receipt = path.join(root, 'route.json');
  const output = path.join(root, 'contract.json');
  await writeFile(receipt, `${JSON.stringify(route)}\n`);
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const run = (extra = []) => {
    try {
      execFileSync(process.execPath, [cli, 'contract-new', '--root', root, '--route', receipt, '--output', output, '--run-id', 'run_cli_route_0001', ...extra], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' });
      return '';
    } catch (error) { return `${error.stdout ?? ''}${error.stderr ?? ''}`; }
  };
  assert.match(run(), /Contract creation requires routed/);
  assert.match(run(['--loop-profile', 'research']), /cannot be combined/);
  await assert.rejects(readFile(output), /ENOENT/);
});

test('CLI contract-new consumes a routed receipt without selecting a second profile', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  const receipt = path.join(root, 'runs', 'route.json');
  const output = path.join(root, 'runs', 'contract.json');
  await writeFile(receipt, `${JSON.stringify(route)}\n`);
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  execFileSync(process.execPath, [cli, 'contract-new', '--root', root, '--route', receipt, '--source-path', 'PRODUCT_TRUTH.md', '--output', output, '--run-id', 'run_cli_route_0002'], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' });
  const contract = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(contract.loop_profile.id, route.selection.profile_id);
  assert.equal(contract.task_route.route_digest, route.route_digest);
  assert.equal(contract.architecture.mode, routeExecutionMode(route));
});

test('CLI contract-new rejects route authority and candidate overrides', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  const receipt = path.join(root, 'runs', 'route.json');
  const output = path.join(root, 'runs', 'contract.json');
  await writeFile(receipt, `${JSON.stringify(route)}\n`);
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  for (const args of [['--allowed-writes', 'docs'], ['--branch', 'codex/forged'], ['--starting-head', 'f'.repeat(40)], ['--starting-tree', 'e'.repeat(40)]]) {
    let message = '';
    try { execFileSync(process.execPath, [cli, 'contract-new', '--root', root, '--route', receipt, '--output', output, '--run-id', 'run_cli_route_override_0001', ...args], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' }); }
    catch (error) { message = `${error.stdout ?? ''}${error.stderr ?? ''}`; }
    assert.match(message, /route-authority overrides/);
  }
});

test('CLI contract-new rejects an objective that differs from the routed expected outcome', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  const receipt = path.join(root, 'runs', 'route.json');
  const output = path.join(root, 'runs', 'contract.json');
  await writeFile(receipt, `${JSON.stringify(route)}\n`);
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  let message = '';
  try { execFileSync(process.execPath, [cli, 'contract-new', '--root', root, '--route', receipt, '--output', output, '--run-id', 'run_cli_route_objective_0001', '--objective', 'Do something materially different from the accepted route.'], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' }); }
  catch (error) { message = `${error.stdout ?? ''}${error.stderr ?? ''}`; }
  assert.match(message, /cannot be combined.*--objective/);
});

test('run preflight reads back the route receipt and rejects post-contract tampering', async () => {
  const { root, route } = await routed({ taskDomain: 'implementation' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  const receipt = path.join(root, 'runs', 'route.json');
  await writeFile(receipt, `${JSON.stringify(route)}\n`);
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const contract = createContract({
    root,
    runId: 'run_route_preflight_0001',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'runs/route.json',
    routeExecutionMode: routeExecutionMode(route),
    sourcePath: 'PRODUCT_TRUTH.md',
    branch: git(['branch', '--show-current']),
    startingHead: git(['rev-parse', 'HEAD']),
    startingTree: git(['rev-parse', 'HEAD^{tree}']),
    dirtyPaths: route.scope.dirty_paths,
    knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] },
  });
  const accepted = await executeRunPreflight(contract);
  assert.equal(accepted.accepted, true, JSON.stringify(accepted.issues));
  const tampered = { ...route, expected_outcome: 'Tampered after contract generation without a matching route digest.' };
  await writeFile(receipt, `${JSON.stringify(tampered)}\n`);
  const failed = await executeRunPreflight(contract);
  assert.equal(failed.accepted, false);
  assert.ok(failed.issues.some((issue) => issue.gate === 'task_route' && issue.code === 'digest_mismatch'));
});

test('run preflight rejects a contract that widens a bound read-only route', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  await writeFile(path.join(root, 'runs', 'route.json'), `${JSON.stringify(route)}\n`);
  const contract = createContract({
    root,
    runId: 'run_route_preflight_0002',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'runs/route.json',
    routeExecutionMode: routeExecutionMode(route),
    sourcePath: 'PRODUCT_TRUTH.md',
    knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] },
  });
  contract.authority.allowed_writes = ['scripts/agent-system'];
  const failed = await executeRunPreflight(contract);
  assert.equal(failed.accepted, false);
  assert.ok(failed.issues.some((issue) => issue.code === 'route_authority_mismatch'));
});

test('run preflight rejects routed outcome and evidence weakening', async () => {
  const { root, route } = await routed({ taskDomain: 'ux', userFacing: true });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  await writeFile(path.join(root, 'runs', 'route.json'), `${JSON.stringify(route)}\n`);
  const contract = createContract({
    root,
    runId: 'run_route_preflight_0003',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'runs/route.json',
    routeExecutionMode: routeExecutionMode(route),
    sourcePath: 'PRODUCT_TRUTH.md',
    knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] },
  });
  contract.task.objective = 'A weakened and unrelated objective that was never routed.';
  contract.expected_outcome.assertions = contract.expected_outcome.assertions.filter((entry) => entry.id !== 'ROUTE-SCREENSHOTS');
  const failed = await executeRunPreflight(contract);
  assert.equal(failed.accepted, false);
  assert.ok(failed.issues.some((issue) => issue.code === 'route_outcome_mismatch'));
  assert.ok(failed.issues.some((issue) => issue.code === 'route_evidence_mismatch'));
});

test('read-only routed contract cannot plan an effect', async () => {
  const { root, route } = await routed({ taskDomain: 'research' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  await writeFile(path.join(root, 'runs', 'route.json'), `${JSON.stringify(route)}\n`);
  const contract = createContract({ root, runId: 'run_route_effect_readonly_0001', loopProfile: route.selection.profile_id, taskRoute: route, taskRoutePath: 'runs/route.json', routeExecutionMode: routeExecutionMode(route), knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] } });
  const { run_directory: runDirectory } = await startRun(contract, { runsRoot: path.join(root, 'runs') });
  await assert.rejects(() => planEffect(runDirectory, contract, { requirement_id: 'REQ-ROUTE', effect_type: 'commit', target: 'git://fixture', intended_payload: { value: 1 }, expected_change: 'Commit once.' }), /not authorized by the contract/);
});

test('critical routed effect forces bound approval identity and readback', async () => {
  const { root, route } = await routed({ taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' });
  await mkdir(path.join(root, 'runs'), { recursive: true });
  await writeFile(path.join(root, 'runs', 'route.json'), `${JSON.stringify(route)}\n`);
  const contract = createContract({ root, runId: 'run_route_effect_critical_0001', loopProfile: route.selection.profile_id, taskRoute: route, taskRoutePath: 'runs/route.json', routeExecutionMode: routeExecutionMode(route), knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] } });
  const { run_directory: runDirectory } = await startRun(contract, { runsRoot: path.join(root, 'runs') });
  const base = { requirement_id: 'REQ-ROUTE', effect_type: 'deploy', target: 'testnet://fixture', intended_payload: { cid: 'fixture' }, expected_change: 'Deploy once.' };
  await assert.rejects(() => planEffect(runDirectory, contract, base), /bind approval_id/);
  const { effect } = await planEffect(runDirectory, contract, { ...base, approval_id: 'approval_effect_fixture_0001', approval_expires_at: '2099-01-01T00:00:00.000Z' });
  await assert.rejects(() => dispatchEffect(runDirectory, contract, effect.effect_id, async () => ({ ok: true })), /requires readback before dispatch/);
});

test('every accepted route class creates a runnable route-bound contract', async () => {
  const cases = [
    ['research', { taskDomain: 'research' }],
    ['product', { taskDomain: 'product-definition' }],
    ['implementation', { taskDomain: 'implementation' }],
    ['ux', { taskDomain: 'ux', userFacing: true }],
    ['incident', { taskDomain: 'incident' }],
    ['security-read', { taskDomain: 'security-authority', requestedMutation: false }],
    ['repository-effect', { taskDomain: 'implementation', effectClass: 'repository_effect', effectTypes: ['commit'], approvalRef: 'fixture' }],
    ['release', { taskDomain: 'release', externalWrite: true, approvalRef: 'fixture' }],
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [name, input] = cases[index];
    const { root, route } = await routed(input);
    assert.equal(route.verdict, 'routed', name);
    await mkdir(path.join(root, 'runs'), { recursive: true });
    await writeFile(path.join(root, 'runs', 'route.json'), `${JSON.stringify(route)}\n`);
    const contract = createContract({ root, runId: `run_route_domain_${String(index).padStart(8, '0')}`, loopProfile: route.selection.profile_id, taskRoute: route, taskRoutePath: 'runs/route.json', routeExecutionMode: routeExecutionMode(route), knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: false, disallowed_fallbacks: [] } });
    const started = await startRun(contract, { runsRoot: path.join(root, 'runs') });
    assert.equal(started.preflight.accepted, true, name);
  }
});

test('three retrospective package replays are schema-valid and keep unavailable telemetry explicit', async () => {
  const replay = JSON.parse(await readFile(path.resolve('docs/evidence/agent-pilots/2026-08-31-task-route-replays.v1.json'), 'utf8'));
  const validation = validateGovernanceInstance(replay, 'package-replay.v1.schema.json');
  assert.deepEqual(validation.issues, []);
  assert.equal(replay.packages.length, 3);
  assert.equal(replay.run_store_inventory.run_named_directories, 27);
  assert.equal(replay.run_store_inventory.contract_run_ids, 26);
  assert.deepEqual(replay.packages.map((entry) => entry.tools.status), ['unavailable', 'unavailable', 'unavailable']);
  assert.deepEqual(replay.packages.map((entry) => entry.interruptions.status), ['unavailable', 'unavailable', 'unavailable']);
});
