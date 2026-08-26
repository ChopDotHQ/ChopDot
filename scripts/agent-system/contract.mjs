import { readFileSync } from 'node:fs';
import path from 'node:path';
import { digestObject, makeId, normalizeRoot, nowIso, sha256 } from './core.mjs';
import { loadGovernanceJson } from './schema.mjs';

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

export function loadLoopProfile(profileId) {
  if (!(profileId in INTENT_BY_PROFILE)) throw new Error(`Unknown loop profile: ${profileId}`);
  return loadGovernanceJson('loops', `${profileId}.v1.json`);
}

export function loadExampleContract(profileId) {
  if (!(profileId in INTENT_BY_PROFILE)) throw new Error(`Unknown loop profile: ${profileId}`);
  return loadGovernanceJson('loops', 'examples', `${profileId}.contract.v1.json`);
}

export function createContract(options = {}) {
  const root = normalizeRoot(options.root ?? process.cwd());
  const runId = options.runId ?? makeId('run');
  const createdAt = options.createdAt ?? nowIso();
  const sourcePath = options.sourcePath ?? 'PRODUCT_TRUTH.md';
  let sourceHash = '0'.repeat(64);
  try { sourceHash = sha256(readFileSync(path.join(root, sourcePath))); } catch { /* validation reports unavailable context later */ }
  const profileId = String(options.loopProfile ?? 'implementation').replace(/\.v1$/, '');
  const profile = loadLoopProfile(profileId);
  const template = clone(loadExampleContract(profileId));
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
    loop_profile: options.loopProfileObject ?? {
      id: profileId,
      version: '1.0.0',
      path: `governance/agent-system/loops/${profileId}.v1.json`,
    },
    task,
    intent_type: options.intentType ?? INTENT_BY_PROFILE[profileId],
    requirement_ids: options.requirementIds ?? profile.expected_outcome.assertions.map((entry) => entry.id),
    artifact_contract: options.artifactContract ?? {
      ...template.artifact_contract,
      artifact_types: clone(profile.artifact_contract.artifact_types),
      required_paths: options.inPaths?.length ? options.inPaths : template.artifact_contract.required_paths,
    },
    expected_outcome: options.expectedOutcome ?? {
      statement: profile.expected_outcome.statement,
      assertions: profile.expected_outcome.assertions.map(({ measurement, ...assertion }) => ({ ...assertion, subject: measurement })),
    },
    scope: options.scope ?? {
      root,
      branch: options.branch ?? 'UNKNOWN',
      starting_head: options.startingHead ?? 'UNKNOWN',
      starting_tree: options.startingTree ?? 'UNKNOWN',
      in_paths: options.inPaths?.length ? options.inPaths : template.scope.in_paths,
      out_paths: options.outPaths ?? [],
      dirty_paths: options.dirtyPaths ?? [],
    },
    authority: options.authority ?? {
      ...template.authority,
      allowed_reads: options.allowedReads ?? template.authority.allowed_reads,
      allowed_writes: options.allowedWrites ?? template.authority.allowed_writes,
    },
    context: options.context ?? {
      governing_sources: [{ path: sourcePath, sha256: sourceHash, authority_level: 'product_law', observed_at: createdAt }],
      max_age_seconds: 86_400,
      conflict_policy: 'block_same_level_conflict',
      wrong_root_policy: 'fail_closed',
    },
    architecture: options.architecture ?? template.architecture,
    budgets: options.budgets ?? {
      ...template.budgets,
      max_iterations: profile.budgets.max_iterations,
      max_retries: profile.budgets.max_retries,
    },
    evaluator: options.evaluator ?? {
      rubric_refs: [profile.evaluator.rubric_path],
      deterministic_commands: (options.deterministicCommands ?? template.evaluator.deterministic_commands).map((entry) => ({ ...entry, cwd: root })),
      reviewer_independence: options.reviewerIndependence ?? profile.evaluator.independence,
      pass_threshold: profile.evaluator.pass_threshold,
      hard_fail_assertion_ids: clone(profile.evaluator.hard_failures),
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
