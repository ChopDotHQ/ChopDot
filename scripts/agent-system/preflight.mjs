import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './core.mjs';
import { contractProfileId, contractRoot, loadLoopProfile, routeEvidenceAssertions } from './contract.mjs';
import { validateAgentContract, validateContractProfileAlignment, validateLoopProfile } from './validate.mjs';
import { loadGovernanceJson, loadGovernanceJsonFrom } from './schema.mjs';
import { assertKnowledgePort, validateKnowledgeContext, validateKnowledgeReceipt } from './adapters/port.mjs';
import { validateTaskRoute } from './router.mjs';

function gitIdentity(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root });
  const tokens = dirty.toString('utf8').split('\0').filter(Boolean);
  const dirtyPaths = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const status = tokens[index].slice(0, 2);
    dirtyPaths.push(tokens[index].slice(3));
    if (/[RC]/.test(status) && tokens[index + 1]) dirtyPaths.push(tokens[++index]);
  }
  return { root, branch: run(['branch', '--show-current']), head: run(['rev-parse', 'HEAD']), tree: run(['rev-parse', 'HEAD^{tree}']), dirty_paths: [...new Set(dirtyPaths)].sort() };
}

function insideDeclaredScope(candidate, inPaths) {
  const normalized = String(candidate).replace(/^\.\//, '').replace(/\/$/, '');
  return inPaths.some((entry) => normalized === entry.replace(/\/$/, '') || normalized.startsWith(`${entry.replace(/\/$/, '')}/`));
}

export async function executeRunPreflight(contract, options = {}) {
  const issues = [];
  const root = contractRoot(contract);
  const validation = validateAgentContract(contract, { expectedRoot: options.expectedRoot ?? root });
  issues.push(...validation.issues.map((entry) => ({ gate: 'contract_schema', ...entry })));

  let profile = null;
  try {
    profile = loadLoopProfile(contractProfileId(contract), root);
    const profileValidation = validateLoopProfile(profile);
    issues.push(...profileValidation.issues.map((entry) => ({ gate: 'profile_schema', ...entry })));
    const alignment = validateContractProfileAlignment(contract, profile);
    issues.push(...alignment.issues.map((entry) => ({ gate: 'profile_alignment', ...entry })));
  } catch (error) { issues.push({ gate: 'profile_load', path: 'loop_profile', message: error.message, code: 'missing_profile' }); }

  const retryPolicy = loadGovernanceJson('policies', 'retry-budgets.json');
  const authorityPolicy = loadGovernanceJson('policies', 'authority-boundaries.json');
  const inPaths = contract.scope?.in_paths ?? [];
  for (const candidate of contract.authority?.allowed_writes ?? []) if (!insideDeclaredScope(candidate, inPaths)) issues.push({ gate: 'authority', path: 'authority.allowed_writes', message: `Write scope expansion is forbidden: ${candidate}`, code: 'authority_expansion' });
  const external = (contract.authority?.external_effects ?? []).filter((effect) => effect !== 'none');
  if (external.length && !(contract.authority?.required_approvals ?? []).length) issues.push({ gate: 'authority', path: 'authority.required_approvals', message: 'External effects require an explicit approval boundary', code: 'missing_approval' });
  if (!Array.isArray(authorityPolicy.classes) || !authorityPolicy.classes.length || !Array.isArray(retryPolicy.budgets) || !retryPolicy.budgets.length) issues.push({ gate: 'policy', path: 'policies', message: 'Authority and retry policy catalogs must be non-empty', code: 'empty_policy' });

  try { await access(root); } catch { issues.push({ gate: 'worktree', path: 'scope.root', message: 'Exact root does not exist', code: 'wrong_root' }); }
  let observedIdentity = options.observedIdentity;
  try { observedIdentity ??= gitIdentity(root); }
  catch (error) { issues.push({ gate: 'worktree', path: 'scope', message: `Git identity unavailable: ${error.message}`, code: 'git_unavailable' }); }
  if (observedIdentity) {
    if (observedIdentity.branch !== contract.scope?.branch) issues.push({ gate: 'worktree', path: 'scope.branch', message: `Expected ${contract.scope?.branch}, observed ${observedIdentity.branch}`, code: 'wrong_branch' });
    if (observedIdentity.head !== contract.scope?.starting_head) issues.push({ gate: 'worktree', path: 'scope.starting_head', message: `Expected ${contract.scope?.starting_head}, observed ${observedIdentity.head}`, code: 'stale_head' });
    if (observedIdentity.tree !== contract.scope?.starting_tree) issues.push({ gate: 'worktree', path: 'scope.starting_tree', message: `Expected ${contract.scope?.starting_tree}, observed ${observedIdentity.tree}`, code: 'stale_tree' });
    if (JSON.stringify(observedIdentity.dirty_paths ?? []) !== JSON.stringify([...(contract.scope?.dirty_paths ?? [])].sort())) issues.push({ gate: 'worktree', path: 'scope.dirty_paths', message: 'Observed dirty paths differ from the declared starting state', code: 'dirty_path_mismatch' });
  }

  if (contract.task_route) {
    const routePath = path.resolve(root, contract.task_route.source_path);
    if (routePath !== root && !routePath.startsWith(`${root}${path.sep}`)) issues.push({ gate: 'task_route', path: 'task_route.source_path', message: 'Route receipt escapes exact root', code: 'cross_root' });
    else {
      try {
        const route = JSON.parse(await readFile(routePath, 'utf8'));
        const routeValidation = validateTaskRoute(route, { expectedRoot: root, requireRouted: true });
        issues.push(...routeValidation.issues.map((entry) => ({ gate: 'task_route', ...entry })));
        const bindings = {
          route_id: route.route_id,
          route_digest: route.route_digest,
          task_domain: route.task_domain,
          run_type: route.run_type,
          risk_tier: route.risk_tier,
          profile_id: route.selection?.profile_id,
          execution_mode: route.execution_mode,
          agent_ids: route.selection?.agent_ids,
          skill_ids: route.selection?.skill_ids,
          expected_outcome: route.expected_outcome,
          evidence: route.evidence,
          approval_boundary: route.approval_boundary,
        };
        for (const [field, observed] of Object.entries(bindings)) if (JSON.stringify(observed) !== JSON.stringify(contract.task_route[field])) issues.push({ gate: 'task_route', path: `task_route.${field}`, message: `Contract binding differs from accepted route receipt: ${field}`, code: 'route_contract_mismatch' });
        if (route.scope.head !== contract.scope.starting_head || route.scope.tree !== contract.scope.starting_tree || route.scope.branch !== contract.scope.branch || JSON.stringify(route.scope.dirty_paths) !== JSON.stringify(contract.scope.dirty_paths)) issues.push({ gate: 'task_route', path: 'task_route.scope', message: 'Route receipt and contract candidate identity differ', code: 'route_candidate_mismatch' });
        if (contract.task?.objective !== route.expected_outcome) issues.push({ gate: 'task_route', path: 'task.objective', message: 'Contract objective differs from the accepted route outcome', code: 'route_outcome_mismatch' });
        const contractAssertions = new Map((contract.expected_outcome?.assertions ?? []).map((entry) => [entry.id, entry]));
        for (const expected of routeEvidenceAssertions(route)) {
          const observed = contractAssertions.get(expected.id);
          if (JSON.stringify(observed) !== JSON.stringify(expected) || !contract.evaluator?.hard_fail_assertion_ids?.includes(expected.id)) issues.push({ gate: 'task_route', path: `expected_outcome.assertions.${expected.id}`, message: `Contract does not enforce routed evidence assertion ${expected.id}`, code: 'route_evidence_mismatch' });
        }
        const routeTemplate = loadGovernanceJsonFrom(root, 'loops', 'examples', `${route.selection.profile_id}.contract.v1.json`);
        const templateAuthority = routeTemplate.authority;
        const expectedAuthority = {
          allowed_writes: route.approval_boundary.mutation_allowed ? routeTemplate.scope.in_paths : [],
          external_effects: route.approval_boundary.effect_types.length ? route.approval_boundary.effect_types : ['none'],
          required_approvals: route.approval_boundary.approval_required ? ['accepted-task-route-approval'] : templateAuthority.required_approvals,
        };
        for (const [field, expected] of Object.entries(expectedAuthority)) if (JSON.stringify(contract.authority?.[field]) !== JSON.stringify(expected)) issues.push({ gate: 'task_route', path: `authority.${field}`, message: `Contract ${field} widens or changes the accepted route boundary`, code: 'route_authority_mismatch' });
        const expectedArchitecture = route.execution_mode.replaceAll('-', '_');
        if (contract.architecture?.mode !== expectedArchitecture) issues.push({ gate: 'task_route', path: 'architecture.mode', message: 'Contract architecture differs from the accepted route', code: 'route_architecture_mismatch' });
        const budgetFields = ['max_iterations', 'max_retries', 'max_wall_seconds', 'max_tool_calls', 'max_model_cost_usd', 'max_external_cost_usd'];
        for (const field of budgetFields) if (contract.budgets?.[field] !== route.budget?.[field]) issues.push({ gate: 'task_route', path: `budgets.${field}`, message: `Contract ${field} differs from the accepted route budget`, code: 'route_budget_mismatch' });
      } catch (error) { issues.push({ gate: 'task_route', path: 'task_route.source_path', message: `Route receipt unavailable or invalid: ${error.code ?? error.message}`, code: 'route_unavailable' }); }
    }
  }

  for (const [index, source] of (contract.context?.governing_sources ?? []).entries()) {
    const absolute = path.resolve(root, source.path);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) { issues.push({ gate: 'context', path: `context.governing_sources.${index}.path`, message: 'Governing source escapes exact root', code: 'cross_root' }); continue; }
    try {
      const bytes = await readFile(absolute);
      if (sha256(bytes) !== source.sha256) issues.push({ gate: 'context', path: `context.governing_sources.${index}.sha256`, message: `Governing source digest changed: ${source.path}`, code: 'stale_source' });
    } catch (error) { issues.push({ gate: 'context', path: `context.governing_sources.${index}.path`, message: `Governing source unavailable: ${source.path} (${error.code ?? error.message})`, code: 'source_unavailable' }); }
    const ageSeconds = (Date.now() - Date.parse(source.observed_at)) / 1_000;
    if (!Number.isFinite(ageSeconds) || ageSeconds > contract.context.max_age_seconds) issues.push({ gate: 'context', path: `context.governing_sources.${index}.observed_at`, message: `Governing source observation is stale: ${source.path}`, code: 'stale_context' });
  }

  let knowledge = null;
  if (contract.knowledge_policy?.preflight_required) {
    if (!options.knowledgeAdapter) issues.push({ gate: 'knowledge', path: 'knowledge_policy.preflight_required', message: 'Knowledge preflight is required but no adapter was configured', code: 'knowledge_adapter_missing' });
    else {
      try {
        const adapter = assertKnowledgePort(options.knowledgeAdapter);
        const health = await adapter.health();
        validateKnowledgeReceipt(health, 'health');
        if (!health.accepted || health.fallback_status === 'unavailable' || contract.knowledge_policy.disallowed_fallbacks.includes(health.fallback_status)) throw new Error(`Health rejected or disallowed fallback: ${health.fallback_status}`);
        const context = await adapter.read_context({ root, branch: contract.scope.branch, commit: contract.scope.starting_head, source_paths: contract.context.governing_sources.map((entry) => entry.path) }, contract.task.objective, 'contract-governing-sources');
        validateKnowledgeContext(context);
        if (path.resolve(context.scope.root) !== root || context.scope.branch !== contract.scope.branch || context.scope.commit !== contract.scope.starting_head) throw new Error('Knowledge context scope does not match requested exact root, branch, and commit');
        if (context.freshness.status !== 'fresh' || context.stale_reasons.length) throw new Error(`Knowledge context is stale: ${context.stale_reasons.join(',')}`);
        if (!context.citations.length || !context.source_identities.length) throw new Error('Knowledge context lacks citations and source identities');
        const sources = new Map(context.source_identities.map((entry) => [entry.source_identity_id, entry]));
        for (const source of context.source_identities) if (path.resolve(source.root) !== root || source.branch !== contract.scope.branch || source.commit !== contract.scope.starting_head) throw new Error(`Cited source identity ${source.source_identity_id} is not bound to the requested exact worktree`);
        const citationIds = new Set();
        for (const citation of context.citations) {
          if (!sources.has(citation.source_identity_id)) throw new Error(`Citation ${citation.citation_id} references an unknown source identity`);
          citationIds.add(citation.citation_id);
        }
        for (const fact of context.facts) for (const citationId of fact.citation_ids ?? []) if (!citationIds.has(citationId)) throw new Error(`Fact ${fact.fact_id} references an unknown citation`);
        knowledge = { health, context };
      } catch (error) { issues.push({ gate: 'knowledge', path: 'knowledge_policy', message: error.message, code: 'knowledge_preflight_failed' }); }
    }
  }
  return { accepted: issues.length === 0, root, profile_id: profile?.profile_id ?? null, identity: observedIdentity ?? null, knowledge, issues };
}
