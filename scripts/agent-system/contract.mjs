import { readFileSync } from 'node:fs';
import path from 'node:path';
import { digestObject, makeId, normalizeRoot, nowIso, sha256 } from './core.mjs';
import { loadGovernanceJson, loadGovernanceJsonFrom } from './schema.mjs';

const INTENT_BY_PROFILE = {
  research: 'research',
  'product-definition': 'product_definition',
  implementation: 'implementation',
  'ux-creation': 'ux_creation',
  'security-authority': 'security_authority',
  'incident-repair': 'incident_repair',
  'release-outcome': 'release_outcome',
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function routeEvidenceAssertions(route) {
  const assertions = [];
  const add = (id, subject, minimumEvidenceLevel) => assertions.push({ id, description: `${subject.replaceAll('_', ' ')} is passed.`, subject, operator: 'one_of', expected: ['passed'], minimum_evidence_level: minimumEvidenceLevel, hard_fail: true });
  if (route?.evidence?.focused_proof) add('ROUTE-FOCUSED', 'focused_proof_status', 'unit');
  if (route?.evidence?.integration_proof) add('ROUTE-INTEGRATION', 'integration_proof_status', 'simulated-integration');
  if (route?.evidence?.screenshots_required) add('ROUTE-SCREENSHOTS', 'screenshot_review_status', 'simulated-integration');
  if (route?.evidence?.exact_candidate_required) add('ROUTE-EXACT-CANDIDATE', 'exact_candidate_status', 'exact-candidate');
  if (route?.evidence?.readback_required) add('ROUTE-READBACK', 'required_readback_status', route.evidence.minimum_level);
  return assertions;
}

function requiredProfileCommands(profileId, profile) {
  if (!profile.evaluator?.deterministic_checks?.includes('benchmark_packet_semantics_check')) return [];
  if (profileId === 'product-definition') return [{
    id: 'PROD-BENCHMARK-SEMANTICS',
    command: 'node scripts/agent-system/benchmark-semantics.mjs --packet artifacts/agentops/outcomes/example/product-definition.json --type product-definition',
    expected_exit_code: 0,
    timeout_seconds: 120,
  }];
  if (profileId === 'ux-creation') return [{
    id: 'UX-BENCHMARK-SEMANTICS',
    command: 'node scripts/agent-system/benchmark-semantics.mjs --packet artifacts/agentops/outcomes/example/ux-journey.json --type ux-journey',
    expected_exit_code: 0,
    timeout_seconds: 120,
  }];
  throw new Error(`benchmark_packet_semantics_check has no command mapping for ${profileId}`);
}

export function loadLoopProfile(profileId, root) {
  if (!(profileId in INTENT_BY_PROFILE)) throw new Error(`Unknown loop profile: ${profileId}`);
  return root ? loadGovernanceJsonFrom(root, 'loops', `${profileId}.v1.json`) : loadGovernanceJson('loops', `${profileId}.v1.json`);
}

export function loadExampleContract(profileId, root) {
  if (!(profileId in INTENT_BY_PROFILE)) throw new Error(`Unknown loop profile: ${profileId}`);
  return root ? loadGovernanceJsonFrom(root, 'loops', 'examples', `${profileId}.contract.v1.json`) : loadGovernanceJson('loops', 'examples', `${profileId}.contract.v1.json`);
}

export function resolveProfileCommands(profileId, profile, root, requested) {
  const template = loadExampleContract(profileId, root);
  const selected = requested === undefined ? template.evaluator.deterministic_commands : requested;
  if (!Array.isArray(selected)) throw new Error('Deterministic commands must be an array');
  const required = requiredProfileCommands(profileId, profile);
  const requiredIds = new Set(required.map((entry) => entry.id));
  const combined = [...required, ...selected.filter((entry) => !requiredIds.has(entry.id))];
  const ids = new Set();
  return combined.map((entry) => {
    if (!entry || typeof entry !== 'object' || !String(entry.id ?? '').trim() || !String(entry.command ?? '').trim() || !Number.isInteger(entry.expected_exit_code) || !Number.isInteger(entry.timeout_seconds) || entry.timeout_seconds < 1) throw new Error('Every deterministic command requires id, command, integer expected_exit_code, and positive timeout_seconds');
    if (ids.has(entry.id)) throw new Error(`Duplicate deterministic command ID: ${entry.id}`);
    ids.add(entry.id);
    return { ...entry, cwd: root };
  });
}

export function createContract(options = {}) {
  const root = normalizeRoot(options.root ?? process.cwd());
  const runId = options.runId ?? makeId('run');
  const createdAt = options.createdAt ?? nowIso();
  const routeNeedsProductLaw = ['product-definition', 'ux'].includes(options.taskRoute?.task_domain);
  const sourcePath = options.taskRoute?.contract_inputs?.source_path ?? options.sourcePath ?? (options.taskRoute && !routeNeedsProductLaw ? 'governance/agent-system/policies/task-routing.v1.json' : 'PRODUCT_TRUTH.md');
  let sourceHash = '0'.repeat(64);
  try { sourceHash = sha256(readFileSync(path.join(root, sourcePath))); } catch { /* validation reports unavailable context later */ }
  const profileId = String(options.loopProfile ?? 'implementation').replace(/\.v1$/, '');
  const profile = loadLoopProfile(profileId, options.taskRoute ? root : undefined);
  const template = clone(loadExampleContract(profileId, options.taskRoute ? root : undefined));
  const routeBound = Boolean(options.taskRoute);
  const routeScope = options.taskRoute?.scope;
  const routeBoundary = options.taskRoute?.approval_boundary;
  const routeAllowsMutation = Boolean(routeBoundary?.mutation_allowed);
  const profileAssertions = profile.expected_outcome.assertions.map(({ measurement, ...assertion }) => ({ ...assertion, subject: measurement }));
  const routeAssertions = routeBound ? routeEvidenceAssertions(options.taskRoute) : [];
  const routeAssertionIds = new Set(routeAssertions.map((entry) => entry.id));
  const contractAssertions = [...profileAssertions.filter((entry) => !routeAssertionIds.has(entry.id)), ...routeAssertions];
  const task = typeof options.task === 'object' ? options.task : {
    title: String(options.task ?? 'Bounded agent task').slice(0, 120),
    objective: options.objective ?? 'Produce the declared artifact and pass every objective assertion.',
    deliverable: options.deliverable ?? 'Verified outcome packet',
  };
  const contract = {
    ...template,
    run_id: runId,
    created_at: createdAt,
    created_by: typeof options.createdBy === 'object' ? options.createdBy : { id: options.createdBy ?? 'operator', kind: options.createdByKind ?? 'human' },
    ...(options.taskRoute ? {
      task_route: {
        route_id: options.taskRoute.route_id,
        route_digest: options.taskRoute.route_digest,
        source_path: options.taskRoutePath,
        task_domain: options.taskRoute.task_domain,
        run_type: options.taskRoute.run_type,
        risk_tier: options.taskRoute.risk_tier,
        profile_id: options.taskRoute.selection.profile_id,
        execution_mode: options.taskRoute.execution_mode,
        agent_ids: clone(options.taskRoute.selection.agent_ids),
        skill_ids: clone(options.taskRoute.selection.skill_ids),
        contract_inputs: clone(options.taskRoute.contract_inputs),
        expected_outcome: options.taskRoute.expected_outcome,
        evidence: clone(options.taskRoute.evidence),
        approval_boundary: clone(options.taskRoute.approval_boundary),
      },
    } : {}),
    loop_profile: options.loopProfileObject ?? {
      id: profileId,
      version: '1.0.0',
      path: `governance/agent-system/loops/${profileId}.v1.json`,
    },
    task: routeBound ? { ...task, objective: options.taskRoute.expected_outcome } : task,
    intent_type: options.intentType ?? INTENT_BY_PROFILE[profileId],
    requirement_ids: routeBound ? clone(options.taskRoute.contract_inputs.requirement_ids) : options.requirementIds ?? profile.expected_outcome.assertions.map((entry) => entry.id),
    artifact_contract: options.artifactContract ?? {
      ...template.artifact_contract,
      artifact_types: clone(profile.artifact_contract.artifact_types),
      required_paths: routeBound ? clone(routeScope.in_paths) : options.inPaths?.length ? options.inPaths : template.artifact_contract.required_paths,
    },
    expected_outcome: routeBound ? {
      statement: profile.expected_outcome.statement,
      assertions: contractAssertions,
    } : options.expectedOutcome ?? {
      statement: profile.expected_outcome.statement,
      assertions: profileAssertions,
    },
    scope: routeBound ? {
      root,
      branch: routeScope.branch,
      starting_head: routeScope.head,
      starting_tree: routeScope.tree,
      in_paths: clone(routeScope.in_paths),
      out_paths: clone(routeScope.out_paths),
      dirty_paths: clone(routeScope.dirty_paths),
    } : options.scope ?? {
      root,
      branch: options.branch ?? 'UNKNOWN',
      starting_head: options.startingHead ?? 'UNKNOWN',
      starting_tree: options.startingTree ?? 'UNKNOWN',
      in_paths: options.inPaths?.length ? options.inPaths : template.scope.in_paths,
      out_paths: options.outPaths ?? [],
      dirty_paths: options.dirtyPaths ?? [],
    },
    authority: routeBound ? {
      ...template.authority,
      allowed_reads: template.authority.allowed_reads,
      allowed_writes: routeAllowsMutation ? clone(routeScope.in_paths) : [],
      external_effects: routeBoundary.effect_types.length ? clone(routeBoundary.effect_types) : ['none'],
      required_approvals: routeBoundary.approval_required ? ['accepted-task-route-approval'] : template.authority.required_approvals,
    } : options.authority ?? {
      ...template.authority,
      allowed_reads: options.allowedReads ?? template.authority.allowed_reads,
      allowed_writes: options.allowedWrites ?? template.authority.allowed_writes,
      external_effects: template.authority.external_effects,
      required_approvals: template.authority.required_approvals,
    },
    context: options.context ?? {
      governing_sources: [{ path: sourcePath, sha256: sourceHash, authority_level: sourcePath === 'PRODUCT_TRUTH.md' ? 'product_law' : 'guardrail', observed_at: createdAt }],
      max_age_seconds: 86_400,
      conflict_policy: 'block_same_level_conflict',
      wrong_root_policy: 'fail_closed',
    },
    architecture: routeBound ? {
      mode: options.routeExecutionMode,
      justification: options.taskRoute.routing_rationale.join(' '),
    } : options.architecture ?? template.architecture,
    budgets: routeBound ? {
      max_iterations: options.taskRoute.budget.max_iterations,
      max_retries: options.taskRoute.budget.max_retries,
      max_wall_seconds: options.taskRoute.budget.max_wall_seconds,
      max_tool_calls: options.taskRoute.budget.max_tool_calls,
      max_model_cost_usd: options.taskRoute.budget.max_model_cost_usd,
      max_external_cost_usd: options.taskRoute.budget.max_external_cost_usd,
    } : options.budgets ?? {
      ...template.budgets,
      max_iterations: profile.budgets.max_iterations,
      max_retries: profile.budgets.max_retries,
    },
    evaluator: options.evaluator ?? {
      rubric_refs: [profile.evaluator.rubric_path],
      deterministic_commands: routeBound ? clone(options.taskRoute.contract_inputs.deterministic_commands) : resolveProfileCommands(profileId, profile, root, options.deterministicCommands),
      reviewer_independence: options.reviewerIndependence ?? profile.evaluator.independence,
      pass_threshold: profile.evaluator.pass_threshold,
      hard_fail_assertion_ids: routeBound ? [...new Set([...profile.evaluator.hard_failures, ...routeAssertions.map((entry) => entry.id)])] : clone(profile.evaluator.hard_failures),
    },
    environment_observations: options.environmentObservations ?? template.environment_observations,
    failure_outcome: options.failureOutcome ?? {
      required_fields: clone(profile.failure_packet.required_fields),
      same_blocker_limit: profile.budgets.same_blocker_limit,
      continuation_required: profile.failure_packet.continuation_required,
    },
    terminal_states: options.terminalStates ?? clone(profile.terminal_states),
    knowledge_policy: options.knowledgePolicy ?? template.knowledge_policy,
    privacy_policy: options.privacyPolicy ?? template.privacy_policy,
  };
  return contract;
}

export function contractRoot(contract) {
  return normalizeRoot(contract?.scope?.root ?? contract?.scope?.exact_root);
}

export function contractCreatorId(contract) {
  return typeof contract.created_by === 'object' ? contract.created_by.id : contract.created_by;
}

export function contractProfileId(contract) {
  return typeof contract.loop_profile === 'object' ? contract.loop_profile.id : String(contract.loop_profile).replace(/\.v1$/, '');
}

export function contractBudgetLimits(contract) {
  const value = contract.budgets ?? {};
  return {
    iterations: value.max_iterations ?? value.iterations,
    retries: value.max_retries ?? value.retries,
    wall_time_ms: value.max_wall_seconds !== undefined ? value.max_wall_seconds * 1_000 : value.wall_time_ms,
    tool_calls: value.max_tool_calls ?? value.tool_calls,
    model_cost: value.max_model_cost_usd ?? value.model_cost,
    external_cost: value.max_external_cost_usd ?? value.external_cost,
  };
}

export function digestContract(contract) {
  const { contract_digest: _ignored, ...unsigned } = contract;
  return digestObject(unsigned);
}

export function verifyContractDigest(contract) {
  return typeof contract?.contract_digest === 'string' && contract.contract_digest === digestContract(contract);
}
