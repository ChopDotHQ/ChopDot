import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { EFFECT_STATES, TERMINAL_STATES, digestObject, normalizeRoot, readJson } from './core.mjs';
import { contractBudgetLimits, contractRoot, verifyContractDigest } from './contract.mjs';
import { loadGovernanceJson, validateGovernanceInstance, validateSchemaDocument } from './schema.mjs';
import { routeExecutionMode } from './router.mjs';
import { validateTaskRoutingPolicy } from './routing-policy.mjs';

const REQUIRED_CONTRACT_FIELDS = [
  'contract_version', 'run_id', 'created_at', 'created_by', 'loop_profile', 'task',
  'intent_type', 'requirement_ids', 'artifact_contract', 'expected_outcome', 'scope',
  'authority', 'context', 'architecture', 'budgets', 'evaluator',
  'environment_observations', 'failure_outcome', 'terminal_states',
  'knowledge_policy', 'privacy_policy',
];
const EVIDENCE_LEVELS = ['source-only', 'unit', 'simulated-integration', 'simulated-host', 'exact-candidate', 'real-host-chain', 'live-user', 'release', 'local-blocked'];

function issue(pathName, message, code = 'invalid') {
  return { path: pathName, message, code };
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateAgentContract(contract, options = {}) {
  const schemaResult = validateGovernanceInstance(contract, 'agent-loop-contract.v1.schema.json');
  const issues = schemaResult.issues.map((entry) => ({ ...entry, path: entry.path.replace(/^\$?\/?/, '').replaceAll('/', '.') || '$' }));
  if (!object(contract)) return { valid: false, issues: [issue('$', 'Contract must be an object')] };
  for (const field of REQUIRED_CONTRACT_FIELDS) {
    if (!(field in contract)) issues.push(issue(field, 'Required field is missing', 'required'));
  }
  if (!/^1(?:\.|$)/.test(contract.contract_version ?? '')) {
    issues.push(issue('contract_version', 'Unknown major contract version; expected V1', 'unsupported_version'));
  }
  if (!/^run_[a-z0-9][a-z0-9_-]{7,95}$/.test(contract.run_id ?? '')) issues.push(issue('run_id', 'Must be a schema-compatible run_ ID'));
  if (!nonEmpty(contract.created_at)) issues.push(issue('created_at', 'Must be a non-empty date-time string'));
  if (!object(contract.created_by) || !nonEmpty(contract.created_by.id) || !['human', 'agent', 'deterministic_runner', 'external_system'].includes(contract.created_by.kind)) issues.push(issue('created_by', 'Created-by actor ID and kind are required'));
  if (!object(contract.loop_profile) || !nonEmpty(contract.loop_profile.id) || contract.loop_profile.version !== '1.0.0' || !nonEmpty(contract.loop_profile.path)) issues.push(issue('loop_profile', 'Profile ID, V1 version, and path are required'));
  if (contract.task_route) {
    if (contract.task_route.profile_id !== contract.loop_profile?.id) issues.push(issue('task_route.profile_id', 'Route and contract profile IDs differ', 'route_contract_mismatch'));
    if (routeExecutionMode({ execution_mode: contract.task_route.execution_mode }) !== contract.architecture?.mode) issues.push(issue('task_route.execution_mode', 'Route and contract execution modes differ', 'route_contract_mismatch'));
    if (contract.task_route.risk_tier === 'critical' && !contract.task_route.agent_ids?.includes('independent-evaluator')) issues.push(issue('task_route.agent_ids', 'Critical route binding requires an independent evaluator role', 'independent_evaluator_required'));
  }
  if (!object(contract.task) || !nonEmpty(contract.task.title) || !nonEmpty(contract.task.objective) || !nonEmpty(contract.task.deliverable)) issues.push(issue('task', 'Task title, objective, and deliverable are required'));
  if (!nonEmpty(contract.intent_type)) issues.push(issue('intent_type', 'Intent type is required'));
  if (!Array.isArray(contract.requirement_ids) || contract.requirement_ids.length === 0 || contract.requirement_ids.some((id) => !nonEmpty(id))) {
    issues.push(issue('requirement_ids', 'At least one requirement ID is required'));
  }
  if (!object(contract.artifact_contract) || !Array.isArray(contract.artifact_contract.artifact_types) || contract.artifact_contract.artifact_types.length === 0 || !Array.isArray(contract.artifact_contract.required_paths) || contract.artifact_contract.required_paths.length === 0 || contract.artifact_contract.hash_algorithm !== 'sha256') {
    issues.push(issue('artifact_contract', 'Artifact types, required paths, and SHA-256 rule are required'));
  }
  const outcome = contract.expected_outcome;
  if (!object(outcome) || !nonEmpty(outcome.statement) || !Array.isArray(outcome.assertions) || outcome.assertions.length === 0) {
    issues.push(issue('expected_outcome', 'Objective statement and at least one assertion are required'));
  } else {
    const subjective = /^(looks good|improve quality|finish the task)[.!]?$/i.test(outcome.statement.trim());
    if (subjective && outcome.assertions.length === 0) issues.push(issue('expected_outcome.statement', 'Subjective outcome has no objective evaluator', 'subjective'));
    const ids = new Set();
    outcome.assertions.forEach((assertion, index) => {
      if (!object(assertion) || !nonEmpty(assertion.id) || !nonEmpty(assertion.operator) || !nonEmpty(assertion.subject)) {
        issues.push(issue(`expected_outcome.assertions.${index}`, 'Assertion ID, subject, and operator are required'));
      } else if (ids.has(assertion.id)) {
        issues.push(issue(`expected_outcome.assertions.${index}.id`, 'Assertion IDs must be unique'));
      } else ids.add(assertion.id);
    });
  }
  if (!object(contract.scope) || !nonEmpty(contract.scope.root)) {
    issues.push(issue('scope.root', 'Exact root is required'));
  } else {
    const normalized = contractRoot(contract);
    if (normalized !== contract.scope.root) issues.push(issue('scope.root', 'Exact root must be absolute and normalized', 'wrong_root'));
    if (options.expectedRoot && normalized !== normalizeRoot(options.expectedRoot)) issues.push(issue('scope.root', `Wrong root: ${normalized}`, 'wrong_root'));
    if (!nonEmpty(contract.scope.branch)) issues.push(issue('scope.branch', 'Branch is required'));
    for (const field of ['starting_head', 'starting_tree']) if (!/^[0-9a-f]{40}$/.test(contract.scope[field] ?? '')) issues.push(issue(`scope.${field}`, 'Exact 40-character Git identity is required'));
    if (!Array.isArray(contract.scope.in_paths) || contract.scope.in_paths.length === 0) issues.push(issue('scope.in_paths', 'At least one in-scope path is required'));
  }
  if (!object(contract.authority) || !nonEmpty(contract.authority.policy_ref) || !Array.isArray(contract.authority.allowed_reads) || !Array.isArray(contract.authority.allowed_writes) || !Array.isArray(contract.authority.allowed_tools) || !Array.isArray(contract.authority.required_approvals)) {
    issues.push(issue('authority', 'Allowed reads/writes/tools and required approvals are required'));
  }
  const budget = contractBudgetLimits(contract);
  for (const field of ['iterations', 'retries', 'wall_time_ms', 'tool_calls', 'model_cost', 'external_cost']) {
    if (!object(budget) || !Number.isFinite(budget[field]) || budget[field] < 0) issues.push(issue(`budgets.${field}`, 'Budget must be a finite non-negative number'));
  }
  if (!object(contract.evaluator) || !Array.isArray(contract.evaluator.rubric_refs) || !Array.isArray(contract.evaluator.deterministic_commands) || !Number.isFinite(contract.evaluator.pass_threshold)) {
    issues.push(issue('evaluator', 'Evaluator and numeric required pass-rate threshold are required'));
  } else if (contract.evaluator.pass_threshold < 0 || contract.evaluator.pass_threshold > 1) {
    issues.push(issue('evaluator.thresholds.required_pass_rate', 'Pass rate must be between zero and one'));
  } else {
    const profileId = typeof contract.loop_profile === 'object' ? contract.loop_profile.id : String(contract.loop_profile ?? '').replace(/\.v1$/u, '');
    const semanticCommand = profileId === 'product-definition'
      ? { id: 'PROD-BENCHMARK-SEMANTICS', type: 'product-definition' }
      : profileId === 'ux-creation'
        ? { id: 'UX-BENCHMARK-SEMANTICS', type: 'ux-journey' }
        : null;
    if (semanticCommand) {
      const command = contract.evaluator.deterministic_commands.find((entry) => entry.id === semanticCommand.id);
      if (!command || !String(command.command).includes('scripts/agent-system/benchmark-semantics.mjs') || !String(command.command).includes(`--type ${semanticCommand.type}`)) {
        issues.push(issue('evaluator.deterministic_commands', `${profileId} requires the exact benchmark semantic command`, 'required_semantic_gate'));
      }
    }
  }
  if (!Array.isArray(contract.terminal_states) || contract.terminal_states.length === 0 || contract.terminal_states.some((state) => !TERMINAL_STATES.includes(state))) {
    issues.push(issue('terminal_states', 'Only recognized terminal states are allowed'));
  }
  if (!object(contract.failure_outcome) || !Array.isArray(contract.failure_outcome.required_fields) || contract.failure_outcome.required_fields.length === 0) {
    issues.push(issue('failure_outcome', 'Failure packet requirements are required'));
  }
  if (!object(contract.knowledge_policy) || contract.knowledge_policy.port_version !== '1.0.0' || !Array.isArray(contract.knowledge_policy.disallowed_fallbacks)) {
    issues.push(issue('knowledge_policy', 'Knowledge fallback behavior is required'));
  }
  if (!object(contract.privacy_policy) || !Array.isArray(contract.privacy_policy.prohibited_content) || typeof contract.privacy_policy.redaction_required !== 'boolean') {
    issues.push(issue('privacy_policy', 'Prohibited content and redaction policy are required'));
  }
  if (contract.contract_digest && !verifyContractDigest(contract)) issues.push(issue('contract_digest', 'Contract digest mismatch', 'digest_mismatch'));
  return { valid: issues.length === 0, issues };
}

export function validateLoopProfile(profile) {
  const schemaResult = validateGovernanceInstance(profile, 'loop-profile.v1.schema.json');
  const issues = [...schemaResult.issues];
  if (!object(profile)) return { valid: false, issues: [issue('$', 'Profile must be an object')] };
  const profileId = profile.profile_id ?? profile.id ?? profile.name;
  if (!nonEmpty(profileId)) issues.push(issue('profile_id', 'Profile ID is required'));
  const artifact = profile.artifact_contract ?? profile.creates ?? profile.artifact;
  if (!artifact) issues.push(issue('artifact_contract', 'Declared artifact is required'));
  const expected = profile.expected_outcome;
  if (!expected) issues.push(issue('expected_outcome', 'Expected outcome is required'));
  const evaluator = profile.evaluator;
  if (!evaluator) issues.push(issue('evaluator', 'Evaluator is required'));
  const budgets = profile.budgets ?? profile.default_budget;
  if (!budgets) issues.push(issue('budgets', 'Bounded retry/iteration budget is required'));
  const stop = profile.terminal_states ?? profile.stop_states ?? profile.stop;
  if (!stop) issues.push(issue('terminal_states', 'Explicit stop states are required'));
  if (typeof profile.profile_digest === 'string') {
    const { profile_digest: _ignored, ...unsigned } = profile;
    if (profile.profile_digest !== digestObject(unsigned)) issues.push(issue('profile_digest', 'Profile digest does not match canonical profile content', 'digest_mismatch'));
  }
  return { valid: issues.length === 0, issues };
}

export function validatePolicyCatalog(policy, kind = 'policy') {
  const issues = [];
  if (!object(policy)) return { valid: false, issues: [issue('$', `${kind} must be an object`)] };
  if (kind === 'terminal-states') {
    const states = policy.states ?? policy.terminal_states;
    const stateNames = Array.isArray(states) ? states.map((value) => typeof value === 'string' ? value : value.id ?? value.name) : [];
    for (const state of TERMINAL_STATES) if (!stateNames.includes(state)) issues.push(issue('states', `Missing terminal state ${state}`));
  }
  if (kind === 'effect-states') {
    const states = policy.states ?? [];
    for (const state of EFFECT_STATES) if (!states.includes(state)) issues.push(issue('states', `Missing effect state ${state}`));
  }
  if (kind === 'evidence-levels') {
    const levels = (policy.ordered_levels ?? []).map((entry) => entry.id);
    if (levels.length !== EVIDENCE_LEVELS.length || EVIDENCE_LEVELS.some((level) => !levels.includes(level))) issues.push(issue('ordered_levels', 'Evidence vocabulary must exactly match the accepted taxonomy'));
  }
  if (kind === 'authority-boundaries') {
    if (policy.policy_version !== '1.0.0' || policy.policy_id !== 'agent-authority-boundaries-v1' || policy.kind !== 'authority_boundary_policy') issues.push(issue('$', 'Authority policy V1 identity is required'));
    const expected = ['read_only', 'repo_local_write', 'repository_effect', 'external_effect', 'critical_external_effect'];
    const classes = Array.isArray(policy.classes) ? policy.classes : [];
    if (classes.length !== expected.length || expected.some((id) => !classes.some((entry) => entry.id === id))) issues.push(issue('classes', 'All five authority classes are required'));
    for (const entry of classes) if (!Array.isArray(entry.allowed) || !Array.isArray(entry.approval_required) || typeof entry.effect_record_required !== 'boolean') issues.push(issue(`classes.${entry.id ?? '?'}`, 'Authority class must declare allowed, approval_required, and effect_record_required'));
    if (!Array.isArray(policy.forbidden_authority_claims) || policy.forbidden_authority_claims.length < 4) issues.push(issue('forbidden_authority_claims', 'Fail-closed authority claims are required'));
    if (!Array.isArray(policy.effect_requirements) || !['payload_digest', 'idempotency_key', 'before_readback', 'after_readback'].every((field) => policy.effect_requirements.includes(field))) issues.push(issue('effect_requirements', 'Effect identity and readback requirements are incomplete'));
  }
  if (kind === 'retry-budgets') {
    if (policy.policy_version !== '1.0.0' || policy.policy_id !== 'agent-retry-budgets-v1' || policy.kind !== 'retry_budget_policy') issues.push(issue('$', 'Retry budget policy V1 identity is required'));
    const expected = ['research', 'product-definition', 'implementation', 'ux-creation', 'security-authority', 'incident-repair', 'release-outcome'];
    const budgets = Array.isArray(policy.budgets) ? policy.budgets : [];
    if (budgets.length !== expected.length || expected.some((profileId) => !budgets.some((entry) => entry.profile_id === profileId))) issues.push(issue('budgets', 'Every loop profile requires exactly one retry budget'));
    if (new Set(budgets.map((entry) => entry.id)).size !== budgets.length) issues.push(issue('budgets', 'Retry budget IDs must be unique'));
    for (const entry of budgets) for (const field of ['max_iterations', 'max_retries', 'same_blocker_limit', 'independent_rechecks']) if (!Number.isInteger(entry[field]) || entry[field] < (field === 'max_retries' ? 0 : 1)) issues.push(issue(`budgets.${entry.id ?? '?'}.${field}`, 'Bounded integer budget is required'));
    if (!Array.isArray(policy.consumption_rules) || policy.consumption_rules.length < 5) issues.push(issue('consumption_rules', 'Retry consumption and stop rules are required'));
  }
  if (kind === 'task-routing.v1') issues.push(...validateTaskRoutingPolicy(policy).issues);
  return { valid: issues.length === 0, issues };
}

export function validateJsonSchemaDefinition(schema) {
  const document = validateSchemaDocument(schema);
  const issues = [...document.issues];
  if (!object(schema)) return { valid: false, issues: [issue('$', 'Schema must be an object')] };
  if (!nonEmpty(schema.$schema) || !nonEmpty(schema.$id)) issues.push(issue('$schema', 'Schema dialect and ID are required'));
  if (schema.type !== 'object') issues.push(issue('type', 'Persisted packet schema must declare object type'));
  if (!Array.isArray(schema.required) || schema.required.length === 0) issues.push(issue('required', 'Schema must declare required fields'));
  if (schema.additionalProperties !== false) issues.push(issue('additionalProperties', 'Persisted packet schemas must fail closed on unknown fields'));
  return { valid: issues.length === 0, issues };
}

export function validateRubric(rubric) {
  const schemaResult = validateGovernanceInstance(rubric, 'rubric.v1.schema.json');
  const issues = [...schemaResult.issues];
  if (!object(rubric) || rubric.rubric_version !== '1.0.0' || !nonEmpty(rubric.rubric_id) || !nonEmpty(rubric.profile_id)) issues.push(issue('$', 'Rubric V1 identity is required'));
  if (!Number.isFinite(rubric.pass_threshold) || rubric.pass_threshold < 0) issues.push(issue('pass_threshold', 'Numeric pass threshold is required'));
  if (!Array.isArray(rubric.dimensions) || rubric.dimensions.length === 0) issues.push(issue('dimensions', 'At least one objective dimension is required'));
  const weight = (rubric.dimensions ?? []).reduce((sum, dimension) => sum + (Number(dimension.weight) || 0), 0);
  if (weight !== 100) issues.push(issue('dimensions', 'Rubric weights must sum to 100'));
  return { valid: issues.length === 0, issues };
}

async function jsonFiles(directory) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(directory, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function validateSystem(root = process.cwd()) {
  const exactRoot = normalizeRoot(root);
  const governanceRoot = path.join(exactRoot, 'governance', 'agent-system');
  const results = [];
  try {
    await access(governanceRoot);
  } catch {
    return { valid: false, root: exactRoot, checked: 0, issues: [issue('governance/agent-system', 'Governance directory is missing', 'missing')] };
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'loops'))) {
    const result = validateLoopProfile(await readJson(file));
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'policies'))) {
    const kind = path.basename(file).replace(/\.json$/, '');
    const result = validatePolicyCatalog(await readJson(file), kind);
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'contracts'))) {
    const result = validateJsonSchemaDefinition(await readJson(file));
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'frameworks'))) {
    const result = validateGovernanceInstance(await readJson(file), 'definition-framework.v1.schema.json');
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'profiles'))) {
    const result = validateGovernanceInstance(await readJson(file), 'definition-profile.v1.schema.json');
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  const steeringRegistry = path.join(governanceRoot, 'steering-surface-registry.v1.json');
  try {
    const result = validateGovernanceInstance(await readJson(steeringRegistry), 'steering-surface-registry.v1.schema.json');
    results.push({ file: path.relative(exactRoot, steeringRegistry), ...result });
  } catch (error) {
    results.push({ file: path.relative(exactRoot, steeringRegistry), valid: false, issues: [issue('$', `Steering registry is unavailable or invalid JSON: ${error.message}`, 'missing')] });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'evals', 'rubrics'))) {
    const result = validateRubric(await readJson(file));
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  for (const file of await jsonFiles(path.join(governanceRoot, 'loops', 'examples'))) {
    const result = validateAgentContract(await readJson(file));
    results.push({ file: path.relative(exactRoot, file), ...result });
  }
  const profiles = new Map();
  for (const file of await jsonFiles(path.join(governanceRoot, 'loops'))) {
    const profile = await readJson(file);
    profiles.set(profile.profile_id, profile);
  }
  const retryPolicy = await readJson(path.join(governanceRoot, 'policies', 'retry-budgets.json'));
  for (const file of await jsonFiles(path.join(governanceRoot, 'loops', 'examples'))) {
    const contract = await readJson(file);
    const profile = profiles.get(contract.loop_profile?.id);
    const alignment = profile ? validateContractProfileAlignment(contract, profile, retryPolicy) : { valid: false, issues: [issue('loop_profile.id', 'Selected profile does not exist')] };
    results.push({ file: `${path.relative(exactRoot, file)}#profile-alignment`, ...alignment });
  }
  const issues = results.flatMap((result) => result.issues.map((entry) => ({ file: result.file, ...entry })));
  return { valid: issues.length === 0 && results.length > 0, root: exactRoot, checked: results.length, issues, results };
}

export function validateContractProfileAlignment(contract, profile, retryPolicy = loadGovernanceJson('policies', 'retry-budgets.json')) {
  const issues = [];
  if (contract.loop_profile?.id !== profile.profile_id) issues.push(issue('loop_profile.id', 'Contract and profile IDs differ'));
  if (contract.loop_profile?.path !== `governance/agent-system/loops/${profile.profile_id}.v1.json`) issues.push(issue('loop_profile.path', 'Contract profile path is not canonical'));
  const expectedArtifacts = profile.artifact_contract?.artifact_types ?? [];
  if (!expectedArtifacts.every((type) => contract.artifact_contract?.artifact_types?.includes(type))) issues.push(issue('artifact_contract.artifact_types', 'Contract omits profile-required artifact types'));
  const profileAssertions = new Map((profile.expected_outcome?.assertions ?? []).map((entry) => [entry.id, entry]));
  const contractAssertions = new Map((contract.expected_outcome?.assertions ?? []).map((entry) => [entry.id, entry]));
  if (!contract.task_route && profileAssertions.size !== contractAssertions.size) issues.push(issue('expected_outcome.assertions', 'Contract assertion count differs from selected profile'));
  if (contract.task_route && [...contractAssertions.keys()].some((id) => !profileAssertions.has(id) && !id.startsWith('ROUTE-'))) issues.push(issue('expected_outcome.assertions', 'Route-bound contract contains an ungoverned extra assertion'));
  for (const [id, expected] of profileAssertions) {
    const actual = contractAssertions.get(id);
    if (!actual || actual.subject !== expected.measurement || actual.operator !== expected.operator || JSON.stringify(actual.expected) !== JSON.stringify(expected.expected) || actual.minimum_evidence_level !== expected.minimum_evidence_level || actual.hard_fail !== expected.hard_fail) issues.push(issue(`expected_outcome.assertions.${id}`, 'Contract assertion differs from selected profile'));
  }
  const budget = (retryPolicy.budgets ?? []).find((entry) => entry.id === profile.budgets?.retry_budget_id && entry.profile_id === profile.profile_id);
  if (!budget) issues.push(issue('budgets', 'Selected profile retry budget is missing from policy'));
  else {
    if (contract.budgets?.max_iterations !== budget.max_iterations || contract.budgets?.max_retries !== budget.max_retries) issues.push(issue('budgets', 'Contract widens or changes the selected profile retry budget'));
    if (contract.failure_outcome?.same_blocker_limit !== budget.same_blocker_limit) issues.push(issue('failure_outcome.same_blocker_limit', 'Contract blocker limit differs from retry policy'));
  }
  const rubric = `governance/agent-system/evals/rubrics/${profile.profile_id}.v1.json`;
  if (!contract.evaluator?.rubric_refs?.includes(rubric)) issues.push(issue('evaluator.rubric_refs', 'Selected profile rubric is missing'));
  if (contract.evaluator?.reviewer_independence !== profile.evaluator?.independence || contract.evaluator?.pass_threshold !== profile.evaluator?.pass_threshold) issues.push(issue('evaluator', 'Contract evaluator differs from selected profile'));
  const routeHardFailures = contract.task_route ? [...contractAssertions.keys()].filter((id) => id.startsWith('ROUTE-')) : [];
  const expectedHardFailures = [...new Set([...(profile.evaluator?.hard_failures ?? []), ...routeHardFailures])];
  if (JSON.stringify(contract.evaluator?.hard_fail_assertion_ids ?? []) !== JSON.stringify(expectedHardFailures)) issues.push(issue('evaluator.hard_fail_assertion_ids', 'Contract hard-fail assertions differ from selected profile and routed evidence gates'));
  const failureFields = profile.failure_packet?.required_fields ?? [];
  if (JSON.stringify(contract.failure_outcome?.required_fields ?? []) !== JSON.stringify(failureFields)) issues.push(issue('failure_outcome.required_fields', 'Contract failure packet differs from selected profile'));
  if (JSON.stringify(contract.terminal_states ?? []) !== JSON.stringify(profile.terminal_states ?? [])) issues.push(issue('terminal_states', 'Contract terminal states differ from selected profile'));
  return { valid: issues.length === 0, issues };
}

export function validateRuntimePacket(packet, schemaFile) {
  return validateGovernanceInstance(packet, schemaFile);
}
