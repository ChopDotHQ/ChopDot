import { readJson } from './core.mjs';
import { validateAgentContract, validateLoopProfile, validatePolicyCatalog } from './validate.mjs';

export async function runEvaluationCase(testCase, options = {}) {
  let result;
  if (testCase.kind === 'contract_validation') result = validateAgentContract(testCase.input, { expectedRoot: testCase.expected_root });
  else if (testCase.kind === 'profile_validation') result = validateLoopProfile(testCase.input);
  else if (testCase.kind === 'policy_validation') result = validatePolicyCatalog(testCase.input, testCase.policy_kind);
  else if (typeof options.handlers?.[testCase.kind] === 'function') result = await options.handlers[testCase.kind](testCase.input, testCase);
  else return { id: testCase.id, passed: false, reason: `unknown_case_kind:${testCase.kind}` };
  const actual = result.valid ?? result.accepted ?? result.passed;
  const passed = actual === testCase.expected_valid;
  return { id: testCase.id, kind: testCase.kind, passed, expected_valid: testCase.expected_valid, actual, result };
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
