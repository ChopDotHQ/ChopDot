#!/usr/bin/env node
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createContract, digestContract } from './contract.mjs';
import { readJson, sha256, writeJsonAtomic } from './core.mjs';
import { evaluateContractAssertions, gradeTrajectory, recordEvaluation } from './evaluator.mjs';
import { recordRepairDirective } from './evaluator.mjs';
import { runEvaluationSuite } from './eval-runner.mjs';
import { appendEvent, consumeBudget, inspectRunDirectory, rebuildSnapshot, terminate } from './ledger.mjs';
import { buildContinuationPacket, promoteContinuation, promoteOutcome } from './outcome.mjs';
import { cancelRun, finishResume, resumeRun, startRun, terminateRun } from './runner.mjs';
import { checkpointRun } from './runner.mjs';
import { recordArtifact } from './artifacts.mjs';
import { recordApproval, requestApproval } from './approvals.mjs';
import { beginEffectDispatch, failEffect, markEffectDispatched, planEffect, reconcileEffect } from './effects.mjs';
import { validateAgentContract, validateSystem } from './validate.mjs';
import { probeKnownsCompatibility, validateInstructionSurfaces } from './compatibility.mjs';
import { createExactSourceAdapter } from './adapters/exact-source.mjs';
import { createRepoGraphAdapter } from './adapters/repo-graph.mjs';
import { createKgv2Adapter } from './adapters/kgv2.mjs';
import { createMockKgv3Adapter } from './adapters/mock-kgv3.mjs';
import { runKnowledgeAdapterConformance, validateKnowledgeContext, validateKnowledgeRecall } from './adapters/port.mjs';
import { observeRouteScope, routeExecutionMode, routeTask, validateTaskRoute } from './router.mjs';

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = { _: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!argument.startsWith('--')) { options._.push(argument); continue; }
    const [rawKey, inline] = argument.slice(2).split('=', 2);
    const key = rawKey.replace(/-/g, '_');
    const assign = (value) => {
      if (key === 'required_sources' && options[key] !== undefined) options[key] = [options[key], value].flat();
      else options[key] = value;
    };
    if (inline !== undefined) assign(inline);
    else if (rest[index + 1] && !rest[index + 1].startsWith('--')) assign(rest[++index]);
    else options[key] = true;
  }
  return { command, options };
}

function bool(value) { return value === true || value === 'true' || value === '1'; }

function commaList(value) {
  if (!value) return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function deterministicCommands(value, root) {
  return commaList(value).map((command, index) => ({
    id: `CHECK-${String(index + 1).padStart(3, '0')}`,
    command,
    cwd: root,
    expected_exit_code: 0,
    timeout_seconds: 600,
  }));
}

function jsonOption(value, fallback = {}) {
  if (value === undefined) return fallback;
  return JSON.parse(String(value));
}

const EVIDENCE_LEVELS = ['source-only', 'unit', 'simulated-integration', 'simulated-host', 'exact-candidate', 'real-host-chain', 'live-user', 'release', 'local-blocked'];

const USAGE = `Portable Agent Outcome System CLI

Usage: node scripts/agent-system/cli.mjs <command> [options]

Core commands:
  validate --contract FILE [--expected-root ROOT]
  route --output FILE --task-domain DOMAIN --expected-outcome TEXT
    --in-paths A,B [--out-paths A,B]
    [--run-type turn|bounded_goal|time_based|proactive]
    [--execution-mode deterministic|single-agent|parallel-workers|orchestrator-workers|evaluator-optimizer]
    [--risk-tier low|moderate|critical] [--critical-topics A,B]
    [--skills A,B] [--observed-skills A,B] [--user-facing]
    [--requested-mutation] [--external-write]
    [--effect-class CLASS] [--effect-types A,B] [--approval-ref-json JSON]
    [--requirements A,B] [--source-path REPO_PATH]
    [--deterministic-commands "node --test file,npm run check"]
    [--failure-signals A,B] [--budget-json JSON] [--input FILE]
  contract-new --output FILE --root ROOT --run-id run_<id>
    --branch NAME --starting-head SHA --starting-tree SHA
    [--created-by ACTOR_ID --created-by-kind human|agent|deterministic_runner|external_system]
    [--intent-type TYPE] [--requirements A,B] [--in-paths A,B]
    [--out-paths A,B] [--allowed-writes A,B]
    [--deterministic-commands "node --test file,npm run check"]
    [--from TEMPLATE] [--route RECEIPT] [--source-path REPO_PATH]
  run-start --contract FILE [--runs-root DIR]
  run-resume|run-status|run-cancel --run-dir DIR
  run-terminate --run-dir DIR --state blocked|approval_required|budget_exhausted|cancelled|failed_verification [--details-json JSON]
  run-checkpoint --run-dir DIR
  run-observe --run-dir DIR --surface NAME --readback-json JSON
  run-artifact --run-dir DIR --path PATH [--artifact-type TYPE]
  run-budget --run-dir DIR [--tool-calls N] [--model-cost N]
  run-repair --run-dir DIR --failed-assertion ID --changed-hypothesis TEXT
  effect-plan --run-dir DIR --requirement ID --effect-type TYPE --target TARGET
  approval-request|approval-record --run-dir DIR ...
  effect-dispatch-start|effect-dispatched|effect-readback|effect-fail --run-dir DIR ...
  evaluate --run-dir DIR [--measurements-json TYPED_BINDINGS|--measurements-file FILE] [--finalize]
  outcome-promote --run-dir DIR --output FILE
  continuation-promote --run-dir DIR --output FILE [--next-bounded-task TEXT]
  knowledge-preflight|knowledge-read|knowledge-record|knowledge-verify
    knowledge-read --adapter NAME --question TEXT [--required-sources A,B] [--required-sources C]
  eval --suite FILE | knowns-probe | instruction-validate | ci

All commands support --json. Effectful commands support --dry-run.`;

function emit(value, json = false) {
  process.stdout.write(json ? `${JSON.stringify(value)}\n` : `${format(value)}\n`);
}

function format(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function requireOption(options, name) {
  if (!options[name]) throw new Error(`Missing --${name.replace(/_/g, '-')}`);
  return options[name];
}

async function contractForRun(runDirectory) {
  const contract = await readJson(path.join(runDirectory, 'contract.json'));
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  if (!snapshot.contract_digest || snapshot.contract_digest !== digestContract(contract)) throw new Error('Persisted run contract differs from the immutable declared contract digest');
  return contract;
}

function gitIdentity(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return { root, branch: run(['branch', '--show-current']), commit: run(['rev-parse', 'HEAD']) };
}

async function loadAdapter(options) {
  const root = path.resolve(options.root ?? process.cwd());
  switch (options.adapter ?? 'exact-source') {
    case 'exact-source': return createExactSourceAdapter({ root, recordsRoot: options.records_root });
    case 'repo-graph': return createRepoGraphAdapter({ root, packetPath: requireOption(options, 'packet') });
    case 'mock-kgv3': return createMockKgv3Adapter();
    case 'kgv2': {
      if (!options.client_module) return createKgv2Adapter(null);
      const module = await import(pathToFileURL(path.resolve(options.client_module)));
      return createKgv2Adapter(module.default ?? module.client ?? module);
    }
    default: throw new Error(`Unknown adapter: ${options.adapter}`);
  }
}

async function runCoreTests(root) {
  const testsRoot = path.join(root, 'scripts', 'agent-system', 'tests');
  const files = (await readdir(testsRoot)).filter((name) => name.endsWith('.test.mjs')).sort().map((name) => path.join(testsRoot, name));
  const run = spawnSync(process.execPath, ['--test', ...files], { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 10_000_000, shell: false });
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const count = (label) => Number(new RegExp(`(?:ℹ|#) ${label} (\\d+)`).exec(output)?.[1] ?? 0);
  return { passed: run.status === 0, exit_code: run.status, counts: { tests: count('tests'), pass: count('pass'), fail: count('fail'), skipped: count('skipped') }, output_tail: output.slice(-4_000) };
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArguments(argv);
  const root = path.resolve(options.root ?? process.cwd());
  let result;
  let exitCode = 0;
  switch (command) {
    case 'help': case '--help': case '-h': case undefined:
      process.stdout.write(`${USAGE}\n`);
      return 0;
    case 'validate': {
      if (options.contract) {
        const contract = await readJson(path.resolve(options.contract));
        result = { root, ...validateAgentContract(contract, { expectedRoot: options.expected_root ?? contract.scope?.exact_root }) };
      } else result = await validateSystem(root);
      if (!result.valid) exitCode = 1;
      break;
    }
    case 'route': {
      const output = path.resolve(requireOption(options, 'output'));
      const supplied = options.input ? await readJson(path.resolve(options.input)) : {};
      const input = {
        ...supplied,
        taskDomain: options.task_domain ?? supplied.taskDomain,
        expectedOutcome: options.expected_outcome ?? supplied.expectedOutcome,
        inPaths: options.in_paths ? commaList(options.in_paths) : supplied.inPaths,
        outPaths: options.out_paths ? commaList(options.out_paths) : supplied.outPaths,
        requirementIds: options.requirements ? commaList(options.requirements) : supplied.requirementIds,
        sourcePath: options.source_path ?? supplied.sourcePath,
        deterministicCommands: options.deterministic_commands === undefined ? supplied.deterministicCommands : deterministicCommands(options.deterministic_commands, root),
        runType: options.run_type ?? supplied.runType,
        executionMode: options.execution_mode ?? supplied.executionMode,
        riskTier: options.risk_tier ?? supplied.riskTier,
        criticalTopics: options.critical_topics ? commaList(options.critical_topics) : supplied.criticalTopics,
        skillIds: options.skills ? commaList(options.skills) : supplied.skillIds,
        observedSkillIds: options.observed_skills ? commaList(options.observed_skills) : supplied.observedSkillIds,
        failureSignals: options.failure_signals ? commaList(options.failure_signals) : supplied.failureSignals,
        userFacing: options.user_facing === undefined ? supplied.userFacing : bool(options.user_facing),
        requestedMutation: options.requested_mutation === undefined ? supplied.requestedMutation : bool(options.requested_mutation),
        externalWrite: options.external_write === undefined ? supplied.externalWrite : bool(options.external_write),
        effectClass: options.effect_class ?? supplied.effectClass,
        effectTypes: options.effect_types ? commaList(options.effect_types) : supplied.effectTypes,
        approvalRef: options.approval_ref_json ? jsonOption(options.approval_ref_json) : supplied.approvalRef,
        contextTransportOk: options.context_transport_ok === undefined ? supplied.contextTransportOk : bool(options.context_transport_ok),
        contextFactCount: options.context_fact_count === undefined ? supplied.contextFactCount : Number(options.context_fact_count),
        hostParserRequired: options.host_parser_required === undefined ? supplied.hostParserRequired : bool(options.host_parser_required),
        budget: options.budget_json ? jsonOption(options.budget_json) : supplied.budget,
      };
      const route = routeTask(input, { root });
      if (!bool(options.dry_run)) await writeJsonAtomic(output, route);
      result = { root, output, dry_run: bool(options.dry_run), route };
      if (route.verdict !== 'routed') exitCode = route.verdict === 'approval_required' ? 2 : 1;
      break;
    }
    case 'contract-new': {
      const output = path.resolve(requireOption(options, 'output'));
      const hasCreatorId = options.created_by !== undefined;
      const hasCreatorKind = options.created_by_kind !== undefined;
      if (hasCreatorId !== hasCreatorKind) throw new Error('--created-by and --created-by-kind must be provided together');
      if (hasCreatorKind && !['human', 'agent', 'deterministic_runner', 'external_system'].includes(options.created_by_kind)) {
        throw new Error(`Unsupported --created-by-kind: ${options.created_by_kind}`);
      }
      const creator = hasCreatorId ? { id: String(options.created_by), kind: String(options.created_by_kind) } : null;
      let contract;
      let route = null;
      let routePath = null;
      if (options.route) {
        if (options.loop_profile || options.intent_type || options.objective) throw new Error('--route cannot be combined with --loop-profile, --intent-type, or --objective');
        const forbiddenRouteOverrides = ['allowed_writes', 'branch', 'starting_head', 'starting_tree', 'in_paths', 'out_paths', 'requirements', 'source_path', 'deterministic_commands'];
        const suppliedOverrides = forbiddenRouteOverrides.filter((name) => options[name] !== undefined);
        if (suppliedOverrides.length) throw new Error(`--route cannot be combined with route-authority overrides: ${suppliedOverrides.map((name) => `--${name.replaceAll('_', '-')}`).join(', ')}`);
        routePath = path.resolve(options.route);
        const relativeRoutePath = path.relative(root, routePath);
        if (!relativeRoutePath || relativeRoutePath.startsWith('..') || path.isAbsolute(relativeRoutePath)) throw new Error('--route must be a file inside the exact root');
        route = await readJson(routePath);
        const routeValidation = validateTaskRoute(route, { expectedRoot: root, expectedScope: observeRouteScope(root), requireRouted: true });
        if (!routeValidation.valid) throw new Error(`Route receipt is not accepted: ${routeValidation.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ')}`);
        routePath = relativeRoutePath;
      }
      if (options.from) {
        if (route) throw new Error('--route cannot be combined with --from');
        contract = await readJson(path.resolve(options.from));
        contract = {
          ...contract,
          run_id: options.run_id ?? contract.run_id,
          ...(creator ? { created_by: creator } : {}),
          scope: {
            ...contract.scope,
            root,
            branch: options.branch ?? contract.scope.branch,
            starting_head: options.starting_head ?? contract.scope.starting_head,
            starting_tree: options.starting_tree ?? contract.scope.starting_tree,
          },
        };
      } else {
        const commands = options.deterministic_commands === undefined ? undefined : deterministicCommands(options.deterministic_commands, root);
        contract = createContract({
          root,
          runId: options.run_id,
          loopProfile: route?.selection.profile_id ?? options.loop_profile,
          taskRoute: route,
          taskRoutePath: routePath,
          routeExecutionMode: route ? routeExecutionMode(route) : undefined,
          sourcePath: options.source_path,
          task: options.task,
          objective: options.objective ?? route?.expected_outcome,
          deliverable: options.deliverable,
          ...(creator ? { createdBy: creator } : {}),
          intentType: options.intent_type,
          requirementIds: commaList(options.requirements).length ? commaList(options.requirements) : undefined,
          inPaths: commaList(options.in_paths).length ? commaList(options.in_paths) : undefined,
          outPaths: commaList(options.out_paths),
          allowedWrites: route ? undefined : commaList(options.allowed_writes),
          deterministicCommands: commands,
          branch: route?.scope.branch ?? options.branch,
          startingHead: route?.scope.head ?? options.starting_head,
          startingTree: route?.scope.tree ?? options.starting_tree,
          dirtyPaths: route?.scope.dirty_paths,
        });
      }
      const validation = validateAgentContract(contract, { expectedRoot: root });
      if (!validation.valid) throw new Error(`Generated contract is invalid: ${validation.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ')}`);
      if (!bool(options.dry_run)) await writeJsonAtomic(output, contract);
      result = { root, output, dry_run: bool(options.dry_run), contract_digest: digestContract(contract), contract };
      break;
    }
    case 'run-start': {
      const contract = await readJson(path.resolve(requireOption(options, 'contract')));
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_run_directory: path.join(path.resolve(options.runs_root ?? path.join(root, 'output', 'agent-runs')), contract.run_id), dry_run: true };
      else {
        const knowledgeAdapter = contract.knowledge_policy?.preflight_required ? await loadAdapter(options) : null;
        result = await startRun(contract, { runsRoot: options.runs_root, expectedRoot: root, actor: options.actor, knowledgeAdapter });
      }
      break;
    }
    case 'run-status': result = await inspectRunDirectory(path.resolve(requireOption(options, 'run_dir'))); break;
    case 'run-resume': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      if (bool(options.dry_run)) { result = { ...(await inspectRunDirectory(runDirectory)), dry_run: true, proposed_action: 'resume_and_reconcile' }; break; }
      result = await resumeRun(runDirectory, { expectedRoot: root, holder: options.holder });
      if (result.lease) { await finishResume(runDirectory, result.lease); result = { ...result, lease: { ...result.lease, released: true } }; }
      if (!result.resumable && result.unresolved_effects?.length) exitCode = 2;
      break;
    }
    case 'run-cancel': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      if (bool(options.dry_run)) result = { root, run_directory: runDirectory, proposed_terminal_state: 'cancelled', dry_run: true };
      else result = await cancelRun(runDirectory, { reason: options.reason, actor: options.actor });
      break;
    }
    case 'run-terminate': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const state = requireOption(options, 'state');
      const details = jsonOption(options.details_json, {});
      if (bool(options.dry_run)) result = { root, run_directory: runDirectory, proposed_terminal_state: state, details, dry_run: true };
      else result = await terminateRun(runDirectory, state, { details, actor: options.actor });
      break;
    }
    case 'run-checkpoint': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      if (bool(options.dry_run)) result = { ...(await inspectRunDirectory(runDirectory)), dry_run: true, proposed_action: 'checkpoint' };
      else result = await checkpointRun(runDirectory, options.actor);
      break;
    }
    case 'run-observe': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const evidenceLevel = options.evidence_level ?? 'source-only';
      if (!EVIDENCE_LEVELS.includes(evidenceLevel)) throw new Error(`Unknown evidence level: ${evidenceLevel}`);
      const payload = { observation_id: options.observation_id ?? `observation_${Date.now()}`, surface: requireOption(options, 'surface'), readback: jsonOption(options.readback_json), evidence_level: evidenceLevel, observed_at: new Date().toISOString() };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_event: { event_type: 'observation_recorded', payload }, dry_run: true };
      else result = await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'observation_recorded', actor: options.actor, payload });
      break;
    }
    case 'run-artifact': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const candidate = requireOption(options, 'path');
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_artifact_path: candidate, dry_run: true };
      else result = await recordArtifact(runDirectory, contract, candidate, { artifactType: options.artifact_type, mediaType: options.media_type, actor: options.actor });
      break;
    }
    case 'run-budget': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const usage = { tool_calls: Number(options.tool_calls ?? 0), model_cost: Number(options.model_cost ?? 0), external_cost: Number(options.external_cost ?? 0) };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_budget_usage: usage, dry_run: true };
      else result = await consumeBudget(runDirectory, contract, usage, options.actor);
      break;
    }
    case 'run-repair': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const directive = {
        failed_assertion: requireOption(options, 'failed_assertion'),
        falsifying_evidence: commaList(requireOption(options, 'falsifying_evidence')),
        prior_hypothesis: requireOption(options, 'prior_hypothesis'),
        changed_hypothesis: requireOption(options, 'changed_hypothesis'),
        implementation_target: requireOption(options, 'implementation_target'),
        allowed_paths: commaList(options.allowed_paths),
        required_regression_scope: commaList(requireOption(options, 'regression_scope')),
      };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_repair: directive, dry_run: true };
      else result = await recordRepairDirective(runDirectory, contract, directive, options.actor);
      break;
    }
    case 'effect-plan': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const effect = {
        requirement_id: requireOption(options, 'requirement'), effect_type: requireOption(options, 'effect_type'), target: requireOption(options, 'target'),
        intended_payload: jsonOption(options.payload_json), expected_change: requireOption(options, 'expected_change'),
        ...(options.risk !== undefined ? { risk: options.risk } : {}),
        ...(options.approval_required !== undefined ? { approval_required: bool(options.approval_required) } : {}), approval_id: options.approval_id, approval_expires_at: options.approval_expires_at,
        recovery_strategy: options.recovery_strategy ?? 'forward_repair', actor: options.actor,
      };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_effect: effect, dry_run: true };
      else result = await planEffect(runDirectory, contract, effect);
      break;
    }
    case 'approval-request': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const request = { approval_id: options.approval_id, effect_id: requireOption(options, 'effect_id'), target: requireOption(options, 'target'), risk: options.risk ?? 'medium', expires_at: options.expires_at, requested_by: options.actor };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_approval_request: request, dry_run: true };
      else result = { approval_id: await requestApproval(runDirectory, contract, request) };
      break;
    }
    case 'approval-record': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const record = { approval_id: requireOption(options, 'approval_id'), decision: requireOption(options, 'decision'), actor: options.actor, recorded_at: options.recorded_at };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_approval_record: record, dry_run: true };
      else result = await recordApproval(runDirectory, contract, record);
      break;
    }
    case 'effect-dispatch-start': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_effect_id: requireOption(options, 'effect_id'), proposed_state: 'dispatching', dry_run: true };
      else result = await beginEffectDispatch(runDirectory, contract, requireOption(options, 'effect_id'), { actor: options.actor, approval_id: options.approval_id });
      break;
    }
    case 'effect-dispatched': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, effect_id: requireOption(options, 'effect_id'), proposed_state: 'unknown_needs_reconciliation', dry_run: true };
      else result = await markEffectDispatched(runDirectory, contract, requireOption(options, 'effect_id'), jsonOption(options.receipt_json), options.actor);
      break;
    }
    case 'effect-readback': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const observation = { verified: bool(options.verified), before: jsonOption(options.before_json, null), after: jsonOption(options.after_json, null), evidence: commaList(options.evidence) };
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, effect_id: requireOption(options, 'effect_id'), proposed_readback: observation, dry_run: true };
      else result = await reconcileEffect(runDirectory, contract, requireOption(options, 'effect_id'), observation, options.actor);
      break;
    }
    case 'effect-fail': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, effect_id: requireOption(options, 'effect_id'), proposed_failure: requireOption(options, 'message'), dry_run: true };
      else result = await failEffect(runDirectory, contract, requireOption(options, 'effect_id'), new Error(requireOption(options, 'message')), options.actor);
      break;
    }
    case 'evaluate': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      if (bool(options.dry_run)) { result = { root, run_id: contract.run_id, proposed_commands: contract.evaluator.deterministic_commands, proposed_finalize: bool(options.finalize), dry_run: true }; break; }
      const measurements = options.measurements_file ? await readJson(path.resolve(options.measurements_file)) : jsonOption(options.measurements_json, {});
      result = await recordEvaluation(runDirectory, contract, { evaluatorIdentity: options.evaluator_identity, evidenceLevel: options.evidence_level, measurements });
      if (bool(options.finalize)) {
        const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
        const trajectory = gradeTrajectory(snapshot, contract);
        const terminal = result.accepted && trajectory.accepted ? 'succeeded' : 'failed_verification';
        await terminate(runDirectory, contract.run_id, terminal, { evaluation_id: result.evaluation_id, trajectory });
        result = { evaluation: result, trajectory, terminal_state: terminal };
      }
      if (!(result.accepted ?? result.evaluation?.accepted)) exitCode = 1;
      break;
    }
    case 'outcome-promote': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const output = path.resolve(requireOption(options, 'output'));
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_output: output, dry_run: true };
      else result = await promoteOutcome(runDirectory, contract, output);
      break;
    }
    case 'continuation-promote': {
      const runDirectory = path.resolve(requireOption(options, 'run_dir'));
      const contract = await contractForRun(runDirectory);
      const output = path.resolve(requireOption(options, 'output'));
      if (bool(options.dry_run)) result = { root, run_id: contract.run_id, proposed_output: output, proposed_packet: 'ContinuationPacketV1', dry_run: true };
      else result = await promoteContinuation(runDirectory, contract, output, { nextBoundedTask: options.next_bounded_task });
      break;
    }
    case 'knowledge-preflight': {
      const adapter = await loadAdapter(options);
      result = await adapter.health();
      if (!result.accepted || result.fallback_status === 'unavailable') exitCode = 1;
      break;
    }
    case 'knowledge-read': {
      const adapter = await loadAdapter(options);
      const scope = gitIdentity(root);
      const requiredSources = commaList(options.required_sources);
      const context = await adapter.read_context(scope, requireOption(options, 'question'), options.authority_policy ?? 'exact-root-cited-sources');
      const failures = [];
      try { validateKnowledgeContext(context); } catch (error) { failures.push(error.message); }
      if (context.freshness?.status !== 'fresh' || context.stale_reasons?.length) failures.push(`context_stale:${(context.stale_reasons ?? []).join(',')}`);
      const sourceIdentities = new Map((context.source_identities ?? []).map((entry) => [entry.source_identity_id, entry]));
      for (const source of context.source_identities ?? []) {
        if (path.resolve(source.root) !== scope.root || source.branch !== scope.branch || source.commit !== scope.commit) failures.push(`source_candidate_mismatch:${source.source_identity_id}`);
      }
      const citationIds = new Set();
      for (const citation of context.citations ?? []) {
        citationIds.add(citation.citation_id);
        const source = sourceIdentities.get(citation.source_identity_id);
        if (!source) failures.push(`citation_source_missing:${citation.citation_id}`);
        else if (path.resolve(citation.path) !== path.resolve(source.path) || citation.sha256 !== source.sha256) failures.push(`citation_source_mismatch:${citation.citation_id}`);
      }
      for (const fact of context.facts ?? []) for (const citationId of fact.citation_ids ?? []) if (!citationIds.has(citationId)) failures.push(`fact_citation_missing:${fact.fact_id}:${citationId}`);
      const citedPaths = new Set((context.citations ?? []).map((entry) => path.resolve(entry.path)));
      for (const requiredSource of requiredSources) {
        const expected = path.resolve(root, requiredSource);
        const relative = path.relative(root, expected);
        if (relative.startsWith('..') || path.isAbsolute(relative)) failures.push(`required_source_cross_root:${requiredSource}`);
        else if (!citedPaths.has(expected)) failures.push(`required_source_not_cited:${requiredSource}`);
        else {
          const citation = (context.citations ?? []).find((entry) => path.resolve(entry.path) === expected);
          try { if (citation.sha256 !== sha256(await readFile(expected))) failures.push(`required_source_hash_mismatch:${requiredSource}`); }
          catch { failures.push(`required_source_missing:${requiredSource}`); }
        }
      }
      result = { ...context, accepted: failures.length === 0, validation_errors: failures, required_sources: requiredSources };
      if (failures.length) exitCode = 1;
      break;
    }
    case 'knowledge-record': {
      const adapter = await loadAdapter(options);
      const packet = await readJson(path.resolve(requireOption(options, 'outcome')));
      if (bool(options.dry_run)) result = { root, proposed_effect: { type: 'knowledge_record', target: options.adapter ?? 'exact-source', outcome_digest: packet.outcome_digest }, dry_run: true };
      else {
        const proofRequested = options.contract || options.runner_provenance || options.run_directory;
        const proof = proofRequested ? {
          contract_path: path.resolve(requireOption(options, 'contract')),
          runner_provenance_path: path.resolve(requireOption(options, 'runner_provenance')),
          run_directory: path.resolve(requireOption(options, 'run_directory')),
        } : undefined;
        result = await adapter.record_outcome(packet, proof);
      }
      if (!result.accepted) exitCode = 1;
      break;
    }
    case 'knowledge-verify': {
      const adapter = await loadAdapter(options);
      const scope = gitIdentity(root);
      const expectedDigest = requireOption(options, 'outcome_digest');
      result = await adapter.verify_recall(scope, expectedDigest);
      try { validateKnowledgeRecall(result, scope, expectedDigest); } catch (error) { result = { ...result, accepted: false, validation_error: error.message }; exitCode = 1; }
      break;
    }
    case 'knowledge-conformance': {
      const adapter = await loadAdapter(options);
      result = await runKnowledgeAdapterConformance(adapter, gitIdentity(root));
      if (!result.accepted) exitCode = 1;
      break;
    }
    case 'eval': {
      result = await runEvaluationSuite(path.resolve(requireOption(options, 'suite')));
      if (!result.accepted) exitCode = 1;
      break;
    }
    case 'knowns-probe': {
      result = await probeKnownsCompatibility(root, { toolExpects: options.tool_expects ?? 'file' });
      if (!result.compatible) exitCode = 1;
      break;
    }
    case 'instruction-validate': {
      result = await validateInstructionSurfaces(root);
      if (!result.valid) exitCode = 1;
      break;
    }
    case 'ci': {
      const [system, instructions, tests] = await Promise.all([validateSystem(root), validateInstructionSurfaces(root), runCoreTests(root)]);
      result = { root, valid: system.valid && instructions.valid && tests.passed, system, instructions, tests };
      if (!result.valid) exitCode = 1;
      break;
    }
    default: throw new Error(`Unknown command: ${command ?? '(missing)'}`);
  }
  emit(result, bool(options.json));
  return exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    const json = process.argv.includes('--json');
    emit({ ok: false, error: { name: error.name, message: error.message }, root: process.cwd() }, json);
    process.exitCode = 1;
  });
}
