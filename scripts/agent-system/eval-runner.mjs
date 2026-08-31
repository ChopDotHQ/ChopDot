import { canonicalJson, digestObject, readJson } from './core.mjs';
import { validateAgentContract, validateLoopProfile, validatePolicyCatalog } from './validate.mjs';
import { validateBenchmarkPacket } from './benchmark-semantics.mjs';
import { createContract, routeEvidenceAssertions } from './contract.mjs';
import { routeExecutionMode, routeTask } from './router.mjs';

function evaluateRouteContractRoundtrip(input, root) {
  const route = routeTask(input, { root });
  const contract = createContract({
    root,
    runId: 'run_eval_route_roundtrip_0001',
    loopProfile: route.selection.profile_id,
    taskRoute: route,
    taskRoutePath: 'output/agent-evals/route.json',
    routeExecutionMode: routeExecutionMode(route),
  });
  const persisted = JSON.parse(canonicalJson(contract));
  const assertions = new Map(persisted.expected_outcome.assertions.map((entry) => [entry.id, entry]));
  const issues = [];
  if (digestObject(persisted.scope.in_paths) !== digestObject(route.scope.in_paths) || digestObject(persisted.scope.out_paths) !== digestObject(route.scope.out_paths)) issues.push({ code: 'scope_binding_mismatch' });
  const expectedWrites = route.approval_boundary.mutation_allowed ? route.scope.in_paths : [];
  if (digestObject(persisted.authority.allowed_writes) !== digestObject(expectedWrites)) issues.push({ code: 'write_authority_mismatch' });
  if (digestObject(persisted.requirement_ids) !== digestObject(route.contract_inputs.requirement_ids) || persisted.context.governing_sources[0]?.path !== route.contract_inputs.source_path || digestObject(persisted.evaluator.deterministic_commands) !== digestObject(route.contract_inputs.deterministic_commands)) issues.push({ code: 'contract_input_binding_mismatch' });
  for (const expected of routeEvidenceAssertions(route)) if (digestObject(assertions.get(expected.id)) !== digestObject(expected)) issues.push({ code: 'canonical_assertion_mismatch', assertion_id: expected.id });
  return { valid: issues.length === 0, issues, route_digest: route.route_digest };
}

export async function runEvaluationCase(testCase, options = {}) {
  let result;
  if (testCase.kind === 'contract_validation') result = validateAgentContract(testCase.input, { expectedRoot: testCase.expected_root });
  else if (testCase.kind === 'profile_validation') result = validateLoopProfile(testCase.input);
  else if (testCase.kind === 'policy_validation') result = validatePolicyCatalog(testCase.input, testCase.policy_kind);
  else if (testCase.kind === 'benchmark_packet_validation') result = await validateBenchmarkPacket(testCase.input, { root: options.root ?? process.cwd(), packetType: testCase.packet_type });
  else if (testCase.kind === 'task_routing') result = routeTask(testCase.input, { root: options.root ?? process.cwd() });
  else if (testCase.kind === 'route_contract_roundtrip') result = evaluateRouteContractRoundtrip(testCase.input, options.root ?? process.cwd());
  else if (typeof options.handlers?.[testCase.kind] === 'function') result = await options.handlers[testCase.kind](testCase.input, testCase);
  else return { id: testCase.id, passed: false, reason: `unknown_case_kind:${testCase.kind}` };
  const actual = testCase.expected_verdict ? result.verdict : result.valid ?? result.accepted ?? result.passed;
  const issueMatched = !testCase.expected_issue_code || result.issues?.some((entry) => entry.code === testCase.expected_issue_code);
  const expected = testCase.expected_verdict ?? testCase.expected_valid;
  const passed = actual === expected && issueMatched;
  return { id: testCase.id, kind: testCase.kind, passed, expected_valid: testCase.expected_valid, expected_verdict: testCase.expected_verdict ?? null, expected_issue_code: testCase.expected_issue_code ?? null, actual, issue_matched: issueMatched, result };
}

export async function runEvaluationSuite(suiteOrFile, options = {}) {
  const suite = typeof suiteOrFile === 'string' ? await readJson(suiteOrFile) : suiteOrFile;
  if (!suite?.id || !Array.isArray(suite.cases)) throw new Error('Evaluation suite requires id and cases');
  const cases = [];
  for (const testCase of suite.cases) cases.push(await runEvaluationCase(testCase, options));
  const counts = { total: cases.length, passed: cases.filter((entry) => entry.passed).length, failed: cases.filter((entry) => !entry.passed).length };
  return { suite_id: suite.id, suite_version: suite.version ?? '1', counts, accepted: counts.failed === 0, cases };
}

export function incidentToRegressionCase(packet, options = {}) {
  if (!packet?.run_id || !packet?.terminal_state || !options.assertion) throw new Error('Incident packet and reviewed assertion are required');
  return {
    id: options.id ?? `REG-${packet.run_id}`,
    status: 'proposed_requires_review',
    source_run_id: packet.run_id,
    source_outcome_digest: packet.outcome_digest ?? null,
    kind: options.kind ?? 'contract_validation',
    input: options.input,
    expected_valid: options.expectedValid ?? false,
    assertion: options.assertion,
    approved_by: null,
  };
}
