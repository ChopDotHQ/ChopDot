import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { digestObject, makeId, normalizeRoot, nowIso, sha256 } from './core.mjs';
import { loadLoopProfile, resolveProfileCommands } from './contract.mjs';
import { loadGovernanceJson, loadGovernanceJsonFrom, validateGovernanceInstance } from './schema.mjs';
import { validateTaskRoutingPolicy } from './routing-policy.mjs';

const EVIDENCE_ORDER = ['source-only', 'unit', 'simulated-integration', 'simulated-host', 'exact-candidate', 'real-host-chain', 'live-user', 'release', 'local-blocked'];
const EXECUTION_MODE_TO_CONTRACT = {
  deterministic: 'deterministic',
  'single-agent': 'single_agent',
  'parallel-workers': 'parallel_workers',
  'orchestrator-workers': 'orchestrator_workers',
  'evaluator-optimizer': 'evaluator_optimizer',
};
const RISK_RANK = { low: 0, moderate: 1, critical: 2 };
const RESOURCE_DEFAULTS = {
  low: { max_wall_seconds: 900, max_tool_calls: 20, max_model_cost_usd: 2, max_external_cost_usd: 0 },
  moderate: { max_wall_seconds: 3600, max_tool_calls: 80, max_model_cost_usd: 15, max_external_cost_usd: 0 },
  critical: { max_wall_seconds: 7200, max_tool_calls: 160, max_model_cost_usd: 30, max_external_cost_usd: 0 },
};
const EFFECTS_BY_CLASS = {
  read_only: [],
  repo_local_write: [],
  repository_effect: ['commit', 'push', 'pr_create', 'pr_update'],
  external_effect: ['credential_use', 'chain_write', 'message_send'],
  critical_external_effect: ['repository_setting', 'credential_use', 'publish', 'deploy', 'chain_write', 'message_send', 'payment'],
};
const BLOCKING_SIGNALS = new Map([
  ['universal-product-action', 'A routing method cannot turn one action into universal product priority.'],
  ['named-contributor-required', 'A contributor identity cannot become required project or review authority.'],
  ['conflicting-authority', 'Conflicting authority must be resolved by its accountable owner before routing.'],
  ['missing-visible-product-checkpoint', 'User-facing governance progress requires a visible product checkpoint before acceptance.'],
]);

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function dirtyPaths(root) {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root });
  const tokens = output.toString('utf8').split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const status = token.slice(0, 2);
    paths.push(token.slice(3));
    if (/[RC]/.test(status) && tokens[index + 1]) paths.push(tokens[++index]);
  }
  return [...new Set(paths)].sort();
}

function normalizeRoutePaths(values, label, { required = false } = {}) {
  if (!Array.isArray(values)) {
    if (!required && values === undefined) return [];
    throw new Error(`${label} must be an array of repository-relative paths`);
  }
  const normalized = values.map((value) => {
    const raw = String(value).trim();
    if (!raw || raw.includes('\\') || path.isAbsolute(raw)) throw new Error(`${label} contains an invalid repository-relative path: ${raw || '(empty)'}`);
    const candidate = path.posix.normalize(raw.replace(/^\.\//u, '').replace(/\/$/u, ''));
    if (!candidate || candidate === '.' || candidate === '..' || candidate.startsWith('../') || candidate.includes('\0')) throw new Error(`${label} contains an invalid repository-relative path: ${raw}`);
    if (raw !== candidate) throw new Error(`${label} contains a noncanonical repository-relative path: ${raw}`);
    return candidate;
  });
  const result = [...new Set(normalized)].sort();
  if (required && result.length === 0) throw new Error(`${label} requires at least one repository-relative path`);
  return result;
}

function pathContains(parent, child) {
  return parent === child || child.startsWith(`${parent}/`);
}

export function observeRouteScope(rootValue = process.cwd()) {
  const root = normalizeRoot(rootValue);
  return {
    root,
    branch: git(root, ['branch', '--show-current']),
    head: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
    dirty_paths: dirtyPaths(root),
  };
}

function highestEvidence(...levels) {
  return levels.reduce((highest, level) => EVIDENCE_ORDER.indexOf(level) > EVIDENCE_ORDER.indexOf(highest) ? level : highest, 'source-only');
}

function highestRisk(...tiers) {
  return tiers.reduce((highest, tier) => RISK_RANK[tier] > RISK_RANK[highest] ? tier : highest, 'low');
}

function selectedAgents(executionMode, independence, riskTier) {
  const byMode = {
    deterministic: ['deterministic-runner'],
    'single-agent': ['task-owner'],
    'parallel-workers': ['task-owner', 'parallel-worker'],
    'orchestrator-workers': ['orchestrator', 'parallel-worker'],
    'evaluator-optimizer': ['task-owner', 'independent-evaluator'],
  };
  const agents = [...byMode[executionMode]];
  if ((independence === 'different_actor' || riskTier === 'critical') && !agents.includes('independent-evaluator')) agents.push('independent-evaluator');
  return agents;
}

function registryFor(root, supplied) {
  if (supplied) return supplied;
  return JSON.parse(readFileSync(path.join(root, 'governance', 'agent-system', 'steering-surface-registry.v1.json'), 'utf8'));
}

function skillEligibility(registry, root, requestedSkillIds = [], observedSkillIds = []) {
  const surfaces = new Map((registry.external_surfaces ?? []).map((surface) => [surface.id, surface]));
  const selected = [];
  const rejected = [];
  for (const id of requestedSkillIds) {
    const surface = surfaces.get(id);
    let trusted = false;
    if (surface?.lifecycle === 'active' && ['routed', 'explicit_only'].includes(surface.activation_mode) && surface.locator?.base === 'canonical_repo_root' && surface.locator?.path && surface.trusted_sha256) {
      const candidate = path.resolve(root, surface.locator.path);
      try { trusted = candidate.startsWith(`${root}${path.sep}`) && sha256(readFileSync(candidate)) === surface.trusted_sha256; } catch { trusted = false; }
    }
    if (trusted) selected.push(id);
    else rejected.push(id);
  }
  return {
    selected: [...new Set(selected)],
    rejected: [...new Set(rejected)],
    observed: [...new Set([...observedSkillIds, ...rejected])],
  };
}

function boundedResources(riskTier, requested = {}) {
  const limits = RESOURCE_DEFAULTS[riskTier];
  const result = { ...limits };
  for (const key of Object.keys(limits)) {
    if (requested[key] === undefined) continue;
    if (!Number.isFinite(requested[key]) || requested[key] < 0 || requested[key] > limits[key]) throw new Error(`Requested budget ${key} must be finite and cannot exceed ${limits[key]}`);
    result[key] = requested[key];
  }
  return result;
}

export function digestTaskRoute(route) {
  const { route_digest: _ignored, ...unsigned } = route;
  return digestObject(unsigned);
}

export function digestApprovalRef(approvalRef) {
  const { approval_digest: _ignored, ...unsigned } = approvalRef;
  return digestObject(unsigned);
}

export function digestApprovalRequest(input) {
  return digestObject({
    scope_root: normalizeRoot(input.scopeRoot),
    candidate_head: input.candidateHead,
    candidate_tree: input.candidateTree,
    effect_class: input.effectClass,
    effect_types: [...input.effectTypes],
    in_paths: [...input.inPaths],
    out_paths: [...input.outPaths],
    expected_outcome: String(input.expectedOutcome).trim(),
  });
}

export function validateTaskRoute(route, options = {}) {
  const schema = validateGovernanceInstance(route, 'task-route.v1.schema.json');
  const issues = [...schema.issues];
  const authorityRoot = route?.scope?.root ?? options.expectedRoot;
  const policy = options.policy ?? loadGovernanceJsonFrom(authorityRoot, 'policies', 'task-routing.v1.json');
  const policyValidation = validateTaskRoutingPolicy(policy);
  issues.push(...policyValidation.issues.map((entry) => ({ ...entry, path: `/routing_policy${entry.path === '$' ? '' : entry.path}` })));
  const retryPolicy = options.retryPolicy ?? loadGovernanceJsonFrom(authorityRoot, 'policies', 'retry-budgets.json');
  if (route?.route_digest && route.route_digest !== digestTaskRoute(route)) issues.push({ path: '/route_digest', code: 'digest_mismatch', message: 'Route digest does not match canonical receipt content' });
  if (options.expectedRoot && route?.scope?.root !== normalizeRoot(options.expectedRoot)) issues.push({ path: '/scope/root', code: 'wrong_root', message: `Route root does not match ${normalizeRoot(options.expectedRoot)}` });
  let expectedScope = options.expectedScope;
  if (!expectedScope && options.requireRouted && route?.scope?.root) {
    try { expectedScope = observeRouteScope(route.scope.root); }
    catch (error) { issues.push({ path: '/scope', code: 'scope_unavailable', message: `Exact route scope cannot be observed: ${error.message}` }); }
  }
  if (expectedScope) for (const field of ['root', 'branch', 'head', 'tree', 'dirty_paths']) if (JSON.stringify(route?.scope?.[field]) !== JSON.stringify(expectedScope[field])) issues.push({ path: `/scope/${field}`, code: 'stale_route', message: `Route ${field} does not match the current exact-worktree state` });
  try {
    const inPaths = normalizeRoutePaths(route?.scope?.in_paths, 'scope.in_paths', { required: true });
    const outPaths = normalizeRoutePaths(route?.scope?.out_paths, 'scope.out_paths');
    if (JSON.stringify(inPaths) !== JSON.stringify(route?.scope?.in_paths) || JSON.stringify(outPaths) !== JSON.stringify(route?.scope?.out_paths)) issues.push({ path: '/scope', code: 'scope_paths_noncanonical', message: 'Route paths must be sorted, unique, normalized repository-relative paths' });
    if (inPaths.some((inPath) => outPaths.some((outPath) => pathContains(outPath, inPath) || pathContains(inPath, outPath)))) issues.push({ path: '/scope', code: 'scope_path_conflict', message: 'In-scope and out-of-scope paths cannot overlap' });
  } catch (error) { issues.push({ path: '/scope', code: 'scope_path_invalid', message: error.message }); }
  try {
    const sourcePath = normalizeRoutePaths([route?.contract_inputs?.source_path], 'contract_inputs.source_path', { required: true })[0];
    if (sourcePath !== route?.contract_inputs?.source_path) issues.push({ path: '/contract_inputs/source_path', code: 'contract_input_noncanonical', message: 'Governing source path must be canonical' });
    readFileSync(path.join(authorityRoot, sourcePath));
  } catch (error) { issues.push({ path: '/contract_inputs/source_path', code: 'contract_input_unavailable', message: error.message }); }
  if (Array.isArray(route?.contract_inputs?.deterministic_commands)) {
    const ids = route.contract_inputs.deterministic_commands.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length || route.contract_inputs.deterministic_commands.some((entry) => entry.cwd !== normalizeRoot(authorityRoot))) issues.push({ path: '/contract_inputs/deterministic_commands', code: 'contract_input_invalid', message: 'Deterministic commands require unique IDs and the exact route root as cwd' });
  }
  if (options.requireRouted && route?.verdict !== 'routed') issues.push({ path: '/verdict', code: 'route_not_accepted', message: `Contract creation requires routed; received ${route?.verdict ?? 'missing'}` });
  if (route?.risk_tier === 'critical' && !route.selection?.agent_ids?.includes('independent-evaluator')) issues.push({ path: '/selection/agent_ids', code: 'independent_evaluator_required', message: 'Critical routes require a separate evaluator role' });
  if (route?.selection?.profile_id) {
    try {
      const profile = loadLoopProfile(route.selection.profile_id, authorityRoot);
      const expectedAgents = selectedAgents(route.execution_mode, profile.evaluator.independence, route.risk_tier);
      if (JSON.stringify(route.selection.agent_ids) !== JSON.stringify(expectedAgents)) issues.push({ path: '/selection/agent_ids', code: 'agent_selection_mismatch', message: 'Selected agent roles do not match execution mode, risk, and profile policy' });
    } catch (error) { issues.push({ path: '/selection/profile_id', code: 'profile_unavailable', message: error.message }); }
  }
  if (route?.scope?.root && Array.isArray(route?.selection?.skill_ids) && route.selection.skill_ids.length > 0) {
    try {
      const checkedSkills = skillEligibility(registryFor(route.scope.root, options.registry), normalizeRoot(route.scope.root), route.selection.skill_ids, []);
      if (checkedSkills.rejected.length || JSON.stringify(checkedSkills.selected) !== JSON.stringify(route.selection.skill_ids)) issues.push({ path: '/selection/skill_ids', code: 'unapproved_skill_selected', message: `Selected skills are not currently active, repository-approved, and byte-verified: ${checkedSkills.rejected.join(', ')}` });
    } catch (error) { issues.push({ path: '/selection/skill_ids', code: 'skill_registry_unavailable', message: error.message }); }
  }
  if (route?.task_domain && route.selection?.profile_id !== policy.domain_profiles[route.task_domain]) issues.push({ path: '/selection/profile_id', code: 'profile_mismatch', message: 'Selected profile does not match the task-domain policy' });
  if (route?.task_domain && route?.risk_tier in RISK_RANK && policy.minimum_risk[route.task_domain] && RISK_RANK[route.risk_tier] < RISK_RANK[policy.minimum_risk[route.task_domain]]) issues.push({ path: '/risk_tier', code: 'risk_downgrade', message: 'Route risk is weaker than the task-domain minimum' });
  if (policy.risk_rules[route?.risk_tier] && route.evidence?.minimum_level && EVIDENCE_ORDER.indexOf(route.evidence.minimum_level) < EVIDENCE_ORDER.indexOf(policy.risk_rules[route.risk_tier].minimum_evidence_level)) issues.push({ path: '/evidence/minimum_level', code: 'evidence_downgrade', message: 'Route evidence is weaker than the risk-tier minimum' });
  if (route?.risk_tier === 'critical' && (!route.evidence?.exact_candidate_required || !route.evidence?.readback_required)) issues.push({ path: '/evidence', code: 'critical_evidence_missing', message: 'Critical routes require exact candidate identity and readback' });
  if (route?.risk_tier === 'critical' && route?.scope?.dirty_paths?.length && (options.requireRouted || route?.verdict === 'routed')) issues.push({ path: '/scope/dirty_paths', code: 'critical_candidate_dirty', message: 'Critical routes require a clean committed candidate because dirty path names do not bind working-tree bytes' });
  const retry = retryPolicy.budgets.find((entry) => entry.profile_id === route.selection?.profile_id);
  if (retry && (route.budget?.max_iterations !== retry.max_iterations || route.budget?.max_retries !== retry.max_retries || route.budget?.same_blocker_limit !== retry.same_blocker_limit)) issues.push({ path: '/budget', code: 'budget_mismatch', message: 'Route retry budget differs from the selected profile policy' });
  if ((route?.run_type === 'time_based' || route?.run_type === 'proactive') && route?.approval_boundary?.mutation_allowed) issues.push({ path: '/approval_boundary/mutation_allowed', code: 'scheduled_mutation_forbidden', message: 'Time-based and proactive routes are read-only; mutation requires a new effect route' });
  const boundary = route?.approval_boundary;
  const scheduled = route?.run_type === 'time_based' || route?.run_type === 'proactive';
  const readOnly = boundary?.effect_class === 'read_only';
  const externalEffect = ['external_effect', 'critical_external_effect'].includes(boundary?.effect_class);
  const allowedEffects = EFFECTS_BY_CLASS[boundary?.effect_class] ?? [];
  if (!Array.isArray(boundary?.effect_types) || boundary.effect_types.some((effect) => !allowedEffects.includes(effect)) || (allowedEffects.length === 0 && boundary?.effect_types?.length) || (['repository_effect', 'external_effect', 'critical_external_effect'].includes(boundary?.effect_class) && !boundary?.effect_types?.length)) issues.push({ path: '/approval_boundary/effect_types', code: 'effect_type_boundary_mismatch', message: 'Effect types must be a non-empty authorized subset for recorded effect classes and empty for read/local-only classes' });
  const approvalRef = boundary?.approval_ref;
  if (approvalRef) {
    if (approvalRef.approval_digest !== digestApprovalRef(approvalRef)) issues.push({ path: '/approval_boundary/approval_ref/approval_digest', code: 'approval_digest_mismatch', message: 'Approval reference digest does not match its content' });
    const expectedRequestDigest = digestApprovalRequest({ scopeRoot: route.scope.root, candidateHead: route.scope.head, candidateTree: route.scope.tree, effectClass: boundary.effect_class, effectTypes: boundary.effect_types, inPaths: route.scope.in_paths, outPaths: route.scope.out_paths, expectedOutcome: route.expected_outcome });
    if (approvalRef.scope_root !== route?.scope?.root || approvalRef.effect_class !== boundary.effect_class || approvalRef.candidate_head !== route.scope.head || approvalRef.candidate_tree !== route.scope.tree || JSON.stringify(approvalRef.effect_types) !== JSON.stringify(boundary.effect_types) || JSON.stringify(approvalRef.in_paths) !== JSON.stringify(route.scope.in_paths) || JSON.stringify(approvalRef.out_paths) !== JSON.stringify(route.scope.out_paths) || approvalRef.request_digest !== expectedRequestDigest) issues.push({ path: '/approval_boundary/approval_ref', code: 'approval_scope_mismatch', message: 'Approval reference does not match route root, candidate, paths, purpose, effect class, and effect types' });
    if (approvalRef.granted_by_kind !== 'human') issues.push({ path: '/approval_boundary/approval_ref/granted_by_kind', code: 'human_approval_required', message: 'Critical or external mutation approval must trace to a human operator' });
    const grantedAt = Date.parse(approvalRef.granted_at);
    const expiresAt = Date.parse(approvalRef.expires_at);
    if (grantedAt > Date.parse(route.created_at) || grantedAt >= expiresAt) issues.push({ path: '/approval_boundary/approval_ref/granted_at', code: 'approval_time_invalid', message: 'Approval must be granted before route creation and before its expiry' });
    if (options.requireRouted && expiresAt <= Date.now()) issues.push({ path: '/approval_boundary/approval_ref/expires_at', code: 'approval_expired', message: 'Approval reference has expired' });
  }
  if (readOnly && (boundary?.mutation_allowed || boundary?.approval_required || boundary?.new_effect_route_required)) issues.push({ path: '/approval_boundary', code: 'read_only_boundary_mismatch', message: 'A read-only route cannot allow mutation, require mutation approval, or require a new effect route' });
  if (!readOnly && !boundary?.required_readback) issues.push({ path: '/approval_boundary/required_readback', code: 'mutation_readback_missing', message: 'Every mutating or external effect route requires readback' });
  if (externalEffect && (!boundary?.approval_required || route?.risk_tier !== 'critical')) issues.push({ path: '/approval_boundary', code: 'external_effect_boundary_mismatch', message: 'External effects require critical risk and explicit approval' });
  if (boundary?.approval_required && route?.verdict === 'routed' && !approvalRef) issues.push({ path: '/approval_boundary/approval_ref', code: 'approval_evidence_missing', message: 'An accepted approval-required route needs a bound human approval reference; a caller boolean is insufficient' });
  if (scheduled && route?.verdict === 'routed' && !readOnly) issues.push({ path: '/approval_boundary/effect_class', code: 'scheduled_effect_route_forbidden', message: 'An accepted time-based or proactive route must remain read-only' });
  if (scheduled && !readOnly && !boundary?.new_effect_route_required) issues.push({ path: '/approval_boundary/new_effect_route_required', code: 'scheduled_effect_route_missing', message: 'A scheduled mutation request must require a new approved effect route' });
  if (route?.risk_tier === 'critical' && !boundary?.required_readback) issues.push({ path: '/approval_boundary/required_readback', code: 'critical_readback_missing', message: 'Critical routes require readback' });
  if (route?.risk_tier === 'critical' && !readOnly && (!boundary?.approval_required || (route?.verdict === 'routed' && !boundary?.mutation_allowed))) issues.push({ path: '/approval_boundary', code: 'critical_mutation_boundary_mismatch', message: 'An accepted critical mutation requires explicit approval and mutation authority' });
  if (route?.verdict === 'routed' && boundary?.new_effect_route_required) issues.push({ path: '/approval_boundary/new_effect_route_required', code: 'routed_effect_route_mismatch', message: 'A route requiring a new effect route cannot already be accepted for execution' });
  return { valid: issues.length === 0, issues };
}

export function routeExecutionMode(route) {
  return EXECUTION_MODE_TO_CONTRACT[route.execution_mode];
}

export function routeTask(input, options = {}) {
  const root = normalizeRoot(options.root ?? process.cwd());
  const policy = options.policy ?? loadGovernanceJsonFrom(root, 'policies', 'task-routing.v1.json');
  const policyValidation = validateTaskRoutingPolicy(policy);
  if (!policyValidation.valid) throw new Error(`Task routing policy is invalid: ${policyValidation.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ')}`);
  const profileId = policy.domain_profiles[input.taskDomain];
  if (!profileId) throw new Error(`Unknown task domain: ${input.taskDomain ?? '(missing)'}`);
  if (!String(input.expectedOutcome ?? '').trim()) throw new Error('Expected outcome is required');
  const profile = loadLoopProfile(profileId, root);
  const inPaths = normalizeRoutePaths(input.inPaths, 'inPaths', { required: true });
  const outPaths = normalizeRoutePaths(input.outPaths, 'outPaths');
  if (inPaths.some((inPath) => outPaths.some((outPath) => pathContains(outPath, inPath) || pathContains(inPath, outPath)))) throw new Error('inPaths and outPaths cannot overlap');
  const sourcePath = normalizeRoutePaths([input.sourcePath ?? (['product-definition', 'ux'].includes(input.taskDomain) ? 'PRODUCT_TRUTH.md' : 'governance/agent-system/policies/task-routing.v1.json')], 'sourcePath', { required: true })[0];
  try { readFileSync(path.join(root, sourcePath)); } catch (error) { throw new Error(`sourcePath is unavailable in the exact root: ${sourcePath} (${error.code ?? error.message})`); }
  const requirementIds = input.requirementIds === undefined ? profile.expected_outcome.assertions.map((entry) => entry.id) : [...new Set(input.requirementIds.map((entry) => String(entry).trim()))];
  if (!requirementIds.length || requirementIds.some((entry) => entry.length < 2)) throw new Error('requirementIds requires non-empty stable requirement IDs');
  const deterministicCommands = resolveProfileCommands(profileId, profile, root, input.deterministicCommands);
  const criticalTopics = [...new Set(input.criticalTopics ?? [])];
  const unknownCriticalTopics = criticalTopics.filter((topic) => !policy.critical_topics.includes(topic));
  if (unknownCriticalTopics.length) throw new Error(`Unknown critical topics: ${unknownCriticalTopics.join(', ')}`);

  const minimumRisk = policy.minimum_risk[input.taskDomain];
  if (input.approvalGranted !== undefined) throw new Error('Boolean approvalGranted is not accepted; provide a digest-bound human approvalRef');
  const domainNormallyWrites = ['product-definition', 'implementation', 'ux', 'incident'].includes(input.taskDomain);
  const defaultMutation = Boolean(input.requestedMutation ?? domainNormallyWrites);
  const effectClass = input.effectClass ?? (input.externalWrite ? 'critical_external_effect' : defaultMutation ? 'repo_local_write' : 'read_only');
  if (!(effectClass in EFFECTS_BY_CLASS)) throw new Error(`Unknown effect class: ${effectClass}`);
  const effectTypes = [...new Set(input.effectTypes ?? (effectClass === 'critical_external_effect' && input.taskDomain === 'release' ? ['credential_use', 'publish', 'deploy', 'chain_write'] : []))];
  if (effectTypes.some((effect) => !EFFECTS_BY_CLASS[effectClass].includes(effect))) throw new Error(`Effect types are not authorized for ${effectClass}: ${effectTypes.join(', ')}`);
  if (['repository_effect', 'external_effect', 'critical_external_effect'].includes(effectClass) && !effectTypes.length) throw new Error(`${effectClass} requires explicit effect types`);
  const topicRisk = criticalTopics.length || ['repository_effect', 'external_effect', 'critical_external_effect'].includes(effectClass) ? 'critical' : 'low';
  const collaborationRisk = ['parallel-workers', 'orchestrator-workers', 'evaluator-optimizer'].includes(input.executionMode) ? 'moderate' : 'low';
  const riskTier = highestRisk(minimumRisk, input.riskTier ?? 'low', topicRisk, collaborationRisk);
  const riskRule = policy.risk_rules[riskTier];
  const runType = input.runType ?? riskRule.default_run_type;
  const executionMode = input.executionMode ?? riskRule.default_execution_mode;
  if (!EXECUTION_MODE_TO_CONTRACT[executionMode]) throw new Error(`Unknown execution mode: ${executionMode}`);
  const observedScope = options.scope ?? observeRouteScope(root);
  const branch = options.branch ?? observedScope.branch;
  const head = options.head ?? observedScope.head;
  const tree = options.tree ?? observedScope.tree;
  const createdAt = options.createdAt ?? nowIso(options.clock);

  const skills = skillEligibility(registryFor(root, options.registry), root, input.skillIds, input.observedSkillIds);
  const failureSignals = [...new Set(input.failureSignals ?? [])];
  const rationale = [
    `Domain ${input.taskDomain} maps to the existing ${profileId} loop profile.`,
    `Risk ${riskTier} requires at least ${riskRule.minimum_evidence_level} process evidence.`,
  ];
  let verdict = 'routed';
  if (skills.rejected.length) {
    verdict = 'blocked';
    rationale.push(`Unapproved or disabled skills cannot be selected: ${skills.rejected.join(', ')}.`);
  }
  for (const signal of failureSignals) {
    if (BLOCKING_SIGNALS.has(signal)) {
      verdict = 'blocked';
      rationale.push(BLOCKING_SIGNALS.get(signal));
    }
  }
  if (input.contextTransportOk && Number(input.contextFactCount ?? 0) === 0) {
    if (verdict === 'routed') verdict = 'unverified';
    rationale.push('Knowledge transport succeeded but populated cited context was not proven.');
  }

  const scheduled = runType === 'time_based' || runType === 'proactive';
  const requestedMutation = effectClass !== 'read_only';
  const approvalRequired = Boolean(['repository_effect', 'external_effect', 'critical_external_effect'].includes(effectClass) || requestedMutation && riskTier === 'critical');
  const approvalRef = input.approvalRef ?? null;
  if (approvalRef && approvalRef.approval_digest !== digestApprovalRef(approvalRef)) throw new Error('Approval reference digest is invalid');
  const expectedApprovalRequest = digestApprovalRequest({ scopeRoot: root, candidateHead: head, candidateTree: tree, effectClass, effectTypes, inPaths, outPaths, expectedOutcome: input.expectedOutcome });
  const approvalGranted = Boolean(approvalRef && approvalRef.scope_root === root && approvalRef.effect_class === effectClass && approvalRef.candidate_head === head && approvalRef.candidate_tree === tree && JSON.stringify(approvalRef.effect_types) === JSON.stringify(effectTypes) && JSON.stringify(approvalRef.in_paths) === JSON.stringify(inPaths) && JSON.stringify(approvalRef.out_paths) === JSON.stringify(outPaths) && approvalRef.request_digest === expectedApprovalRequest && approvalRef.granted_by_kind === 'human' && Date.parse(approvalRef.granted_at) <= Date.parse(createdAt) && Date.parse(approvalRef.expires_at) > Date.now());
  if (scheduled && requestedMutation) {
    if (verdict === 'routed') verdict = 'approval_required';
    rationale.push('Time-based and proactive work is read-only; mutation requires a new approved effect route.');
  } else if (approvalRequired && !approvalGranted && verdict === 'routed') {
    verdict = 'approval_required';
    rationale.push('The requested critical or external mutation requires explicit approval before dispatch.');
  }
  if (input.hostParserRequired) rationale.push('Hosted parser acceptance is required in addition to local workflow syntax checks.');
  if (input.userFacing) rationale.push('User-facing work requires production-entrypoint integration proof and screenshots.');

  const retryPolicy = options.retryPolicy ?? loadGovernanceJsonFrom(root, 'policies', 'retry-budgets.json');
  const retry = retryPolicy.budgets.find((entry) => entry.profile_id === profileId);
  if (!retry) throw new Error(`Missing retry budget for ${profileId}`);
  const resources = boundedResources(riskTier, input.budget);
  const profileMinimum = profile.evidence.minimum_level;
  const minimumEvidence = highestEvidence(profileMinimum, riskRule.minimum_evidence_level);
  const route = {
    route_version: '1.0.0',
    route_id: input.routeId ?? makeId('route'),
    created_at: createdAt,
    scope: { root, branch, head, tree, dirty_paths: options.dirtyPaths ?? observedScope.dirty_paths, in_paths: inPaths, out_paths: outPaths },
    task_domain: input.taskDomain,
    run_type: runType,
    execution_mode: executionMode,
    risk_tier: riskTier,
    selection: {
      profile_id: profileId,
      agent_ids: selectedAgents(executionMode, profile.evaluator.independence, riskTier),
      skill_ids: skills.selected,
      observed_unapproved_skill_ids: skills.observed,
    },
    contract_inputs: {
      source_path: sourcePath,
      requirement_ids: requirementIds,
      deterministic_commands: deterministicCommands,
    },
    expected_outcome: String(input.expectedOutcome).trim(),
    evidence: {
      minimum_level: minimumEvidence,
      focused_proof: riskTier !== 'low',
      integration_proof: riskTier !== 'low',
      screenshots_required: Boolean(input.userFacing),
      exact_candidate_required: riskTier === 'critical' || ['exact-candidate', 'real-host-chain', 'live-user', 'release'].includes(minimumEvidence),
      readback_required: riskTier === 'critical' || requestedMutation,
    },
    budget: {
      max_iterations: retry.max_iterations,
      max_retries: retry.max_retries,
      same_blocker_limit: retry.same_blocker_limit,
      ...resources,
    },
    stop_condition: {
      success: 'Every declared assertion passes with the required evidence.',
      failure: 'Terminate with an honest non-success verdict and remaining work.',
      retry_exit: `Stop after ${retry.same_blocker_limit} identical blockers or when the finite budget is exhausted.`,
    },
    approval_boundary: {
      effect_class: effectClass,
      effect_types: effectTypes,
      mutation_allowed: requestedMutation && !scheduled && (!approvalRequired || approvalGranted),
      approval_required: approvalRequired,
      approval_ref: approvalRef,
      new_effect_route_required: scheduled && requestedMutation,
      required_readback: riskTier === 'critical' || requestedMutation,
    },
    routing_rationale: [...new Set(rationale)],
    verdict,
  };
  if (riskTier === 'critical' && route.scope.dirty_paths.length) {
    if (route.verdict === 'routed') route.verdict = 'blocked';
    route.routing_rationale.push('Critical exact-candidate work requires a clean committed tree; dirty path names do not bind working-tree bytes.');
  }
  route.route_digest = digestTaskRoute(route);
  const validation = validateTaskRoute(route, { expectedRoot: root, registry: options.registry });
  if (!validation.valid) throw new Error(`Generated route is invalid: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
  return route;
}
