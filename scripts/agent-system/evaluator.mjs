import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { appendEvent, assertRunBudgetAvailable, rebuildSnapshot, remainingBudget } from './ledger.mjs';
import { digestObject, makeId, nowIso, sha256, writeJsonAtomic } from './core.mjs';
import { redactString, redactValue } from './redact.mjs';
import { contractBudgetLimits, contractCreatorId, contractProfileId, contractRoot } from './contract.mjs';
import { assertCurrentCandidate, persistedCandidateIdentity } from './candidate.mjs';
import { validateRuntimePacket } from './validate.mjs';
import { evidenceLevelMeets, resolveMeasurementBindings } from './measurements.mjs';

function splitCommand(command) {
  if (/[;&|<>`$()\n\r]/.test(command)) throw new Error('Command contains unsupported shell metacharacters');
  const tokens = [];
  let token = '';
  let quote = null;
  let escaped = false;
  for (const char of command) {
    if (escaped) { token += char; escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; else token += char; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (/\s/.test(char)) { if (token) { tokens.push(token); token = ''; } continue; }
    token += char;
  }
  if (quote || escaped) throw new Error('Command contains an unterminated quote or escape');
  if (token) tokens.push(token);
  if (!tokens.length) throw new Error('Command is empty');
  return tokens;
}

function commandResult(assertion, root, options = {}) {
  if (!assertion.command || typeof assertion.command !== 'string') {
    return { assertion_id: assertion.id, passed: false, skipped: false, reason: 'missing_command' };
  }
  const cwd = path.resolve(root, assertion.cwd ?? '.');
  if (cwd !== path.resolve(root) && !cwd.startsWith(`${path.resolve(root)}${path.sep}`)) {
    return { assertion_id: assertion.id, passed: false, skipped: false, reason: 'cwd_escapes_root', cwd };
  }
  const maxBuffer = options.maxBuffer ?? 1_000_000;
  let executable;
  let args;
  try { [executable, ...args] = assertion.args ? [assertion.command, ...assertion.args] : splitCommand(assertion.command); }
  catch (error) { return { assertion_id: assertion.id, passed: false, skipped: false, reason: error.message }; }
  const result = spawnSync(executable, args, {
    cwd,
    env: { ...process.env, ...(assertion.env ?? {}) },
    encoding: 'utf8',
    timeout: assertion.timeout_ms ?? (assertion.timeout_seconds ? assertion.timeout_seconds * 1_000 : undefined) ?? options.timeoutMs ?? 60_000,
    maxBuffer,
    shell: false,
  });
  const expected = assertion.expected_exit_code ?? 0;
  const exitCode = result.status ?? (result.error ? null : 0);
  const passed = exitCode === expected && !result.error;
  let verifiedMeasurements = null;
  if (passed) {
    try {
      const parsed = JSON.parse(result.stdout ?? '');
      if (parsed?.measurements && typeof parsed.measurements === 'object' && !Array.isArray(parsed.measurements)) verifiedMeasurements = parsed.measurements;
    } catch { /* A command need not produce structured measurements. */ }
  }
  return {
    assertion_id: assertion.id,
    type: 'command',
    passed,
    skipped: false,
    command: executable,
    args,
    cwd,
    expected_exit_code: expected,
    exit_code: exitCode,
    signal: result.signal ?? null,
    stdout: redactString((result.stdout ?? '').slice(-20_000)),
    stderr: redactString((result.stderr ?? '').slice(-20_000)),
    error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code ?? null } : null,
    verified_measurements: redactValue(verifiedMeasurements),
  };
}

function evidenceResult(assertion, evidence = {}) {
  const entry = evidence[assertion.id];
  if (!entry) return { assertion_id: assertion.id, type: assertion.type, passed: false, skipped: true, reason: 'missing_evidence' };
  return {
    assertion_id: assertion.id,
    type: assertion.type,
    passed: entry.passed === true,
    skipped: entry.skipped === true,
    evidence: redactValue(entry.evidence ?? []),
    reason: entry.reason ?? null,
  };
}

export function verifyReviewerIndependence(contract, evaluatorIdentity, options = {}) {
  const critical = options.critical ?? ['security-authority', 'release-outcome'].includes(contractProfileId(contract));
  const policy = contract.evaluator?.reviewer_independence ?? 'not_required';
  const required = policy !== 'not_required' || critical;
  const independent = evaluatorIdentity !== contractCreatorId(contract);
  return { required, independent, accepted: !required || independent, policy, value: !required ? 'not_required' : independent ? policy : 'same_actor_rejected' };
}

function compare(operator, observed, expected) {
  switch (operator) {
    case 'equals': case 'count_equals': case 'exit_code_equals': case 'sha256_equals': return observed === expected;
    case 'not_equals': return observed !== expected;
    case 'truthy': return Boolean(observed);
    case 'falsy': return !observed;
    case 'count_gte': return Number(observed) >= Number(expected);
    case 'contains': return Array.isArray(observed) ? observed.includes(expected) : String(observed).includes(String(expected));
    case 'matches': return new RegExp(expected).test(String(observed));
    case 'one_of': return Array.isArray(expected) && expected.includes(observed);
    case 'all': return Array.isArray(observed) && observed.every(Boolean);
    case 'none': return Array.isArray(observed) && observed.every((entry) => !entry);
    default: return false;
  }
}

export async function evaluateContractAssertions(contract, options = {}) {
  const evaluatorIdentity = options.evaluatorIdentity ?? 'deterministic-evaluator';
  const independence = verifyReviewerIndependence(contract, evaluatorIdentity, options);
  const commandResults = (contract.evaluator.deterministic_commands ?? []).map((check) => commandResult(check, contractRoot(contract), options));
  const verifiedMeasurements = options.verifiedMeasurements ?? {};
  const commandMeasurements = {};
  const measurementConflicts = [];
  for (const result of commandResults) {
    if (!result.passed || !result.verified_measurements) continue;
    for (const [subject, binding] of Object.entries(result.verified_measurements)) {
      if (!binding || typeof binding !== 'object' || !('value' in binding) || typeof binding.evidence_level !== 'string') continue;
      if (subject in commandMeasurements && JSON.stringify(commandMeasurements[subject]) !== JSON.stringify(binding)) {
        measurementConflicts.push(subject);
        delete commandMeasurements[subject];
      } else if (!measurementConflicts.includes(subject)) commandMeasurements[subject] = { ...binding, evidence_artifact_ids: [] };
    }
  }
  const boundMeasurements = { ...commandMeasurements };
  for (const [subject, binding] of Object.entries(verifiedMeasurements)) {
    if (subject in boundMeasurements && JSON.stringify(boundMeasurements[subject].value) !== JSON.stringify(binding.value)) {
      measurementConflicts.push(subject);
      delete boundMeasurements[subject];
    } else if (!measurementConflicts.includes(subject)) boundMeasurements[subject] = binding;
  }
  const computed = {
    deterministic_command_failures: commandResults.filter((entry) => !entry.passed).length,
    deterministic_command_passes: commandResults.filter((entry) => entry.passed).length,
    deterministic_command_count: commandResults.length,
    ...Object.fromEntries(Object.entries(boundMeasurements).map(([subject, binding]) => [subject, binding.value])),
  };
  const results = contract.expected_outcome.assertions.map((assertion) => {
    const binding = boundMeasurements[assertion.subject];
    const observed = computed[assertion.subject];
    const expected = assertion.operator === 'sha256_equals' && typeof assertion.expected === 'string' && assertion.expected in computed ? computed[assertion.expected] : assertion.expected;
    const evidenceAccepted = binding && evidenceLevelMeets(binding.evidence_level, assertion.minimum_evidence_level);
    const blocked = observed === undefined || !evidenceAccepted;
    const passed = !blocked && compare(assertion.operator, observed, expected);
    return {
      assertion_id: assertion.id,
      result: blocked ? 'blocked' : passed ? 'pass' : 'fail',
      evidence_level: binding?.evidence_level ?? assertion.minimum_evidence_level,
      observed: observed ?? null,
      expected,
      evidence_artifact_ids: binding?.evidence_artifact_ids ?? [],
      ...(blocked ? { blocked_reason: observed === undefined ? 'missing_verified_measurement' : 'insufficient_evidence_level' } : {}),
    };
  });
  const passed = results.filter((entry) => entry.result === 'pass').length;
  const failed = results.filter((entry) => entry.result === 'fail').length;
  const blocked = results.filter((entry) => entry.result === 'blocked').length;
  const total = results.length;
  const passRate = total === 0 ? 0 : passed / total;
  const threshold = contract.evaluator.pass_threshold;
  const hardFailures = results.filter((entry) => entry.result !== 'pass' && contract.evaluator.hard_fail_assertion_ids.includes(entry.assertion_id)).map((entry) => entry.assertion_id);
  const deterministicCommandsPassed = commandResults.every((entry) => entry.passed) && measurementConflicts.length === 0;
  const accepted = deterministicCommandsPassed && independence.accepted && failed === 0 && blocked === 0 && hardFailures.length === 0 && passRate >= threshold;
  const timestamp = options.evaluatedAt ?? nowIso();
  const evaluation = {
    evaluation_version: '1.0.0',
    evaluation_id: makeId('evaluation'),
    run_id: contract.run_id,
    candidate_digest: options.candidateDigest ?? options.candidateIdentity?.candidate_digest ?? digestObject({ contract: contract.run_id, commands: commandResults }),
    ...(options.candidateIdentity ? { candidate_identity: persistedCandidateIdentity(options.candidateIdentity) } : {}),
    started_at: timestamp,
    finished_at: timestamp,
    evaluator: { id: evaluatorIdentity, kind: options.evaluatorKind ?? 'deterministic', version: options.evaluatorVersion ?? 'agent-system-v1' },
    independence: independence.value,
    assertions: results,
    counts: { total, passed, failed, blocked },
    score: passRate,
    threshold,
    hard_failures: hardFailures,
    verdict: accepted ? 'accepted' : blocked ? 'blocked' : 'rejected',
    evidence_artifact_ids: options.evidenceArtifactIds ?? ['artifact_runtime_evaluation'],
  };
  return { ...evaluation, command_results: commandResults, command_measurement_conflicts: [...new Set(measurementConflicts)], accepted };
}

export async function recordEvaluation(runDirectory, contract, options = {}) {
  await assertRunBudgetAvailable(runDirectory, contract, { now: options.now });
  const candidateBefore = assertCurrentCandidate(contract, { expected: options.candidateIdentity });
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'evaluation_started',
    actor: options.evaluatorIdentity ?? 'deterministic-evaluator',
    payload: { candidate_digest: options.candidateDigest ?? null },
  });
  const measurementResolution = await resolveMeasurementBindings(runDirectory, contract, options.measurements, candidateBefore);
  const evaluation = await evaluateContractAssertions(contract, { ...options, measurements: undefined, verifiedMeasurements: measurementResolution.verified, candidateIdentity: candidateBefore, candidateDigest: candidateBefore.candidate_digest });
  const candidateAfter = assertCurrentCandidate(contract, { expected: options.candidateIdentity });
  if (candidateBefore.candidate_digest !== candidateAfter.candidate_digest) throw new Error('Candidate identity changed during evaluation');
  const { command_results: _commandResults, command_measurement_conflicts: _commandMeasurementConflicts, accepted: _accepted, ...persistedEvaluation } = evaluation;
  const evidenceId = makeId('artifact');
  const evidenceFile = path.join(runDirectory, 'evidence', `${evaluation.evaluation_id}.commands.json`);
  await writeJsonAtomic(evidenceFile, redactValue({ command_results: evaluation.command_results, command_measurement_conflicts: evaluation.command_measurement_conflicts, measurement_binding_results: measurementResolution.results, candidate_identity: persistedCandidateIdentity(candidateAfter), candidate_digest: candidateAfter.candidate_digest }));
  const evidenceBytes = await readFile(evidenceFile);
  const evidencePath = path.relative(contractRoot(contract), evidenceFile).split(path.sep).join('/');
  const evidenceArtifact = {
    artifact_version: '1.0.0', artifact_id: evidenceId, run_id: contract.run_id,
    artifact_type: 'TestEvidencePacketV1', path: evidencePath,
    media_type: 'application/json', byte_length: evidenceBytes.length, sha256: sha256(evidenceBytes),
    created_at: evaluation.finished_at, created_by: evaluation.evaluator.id,
    candidate_identity: persistedCandidateIdentity(candidateAfter),
    redaction_status: 'passed', source_artifact_ids: [],
  };
  const artifactValidation = validateRuntimePacket(evidenceArtifact, 'artifact.v1.schema.json');
  if (!artifactValidation.valid) throw new Error(`Evaluation evidence artifact schema invalid: ${artifactValidation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'artifact_recorded', actor: evaluation.evaluator.id, payload: evidenceArtifact });
  const boundEvidenceIds = [...new Set(Object.values(measurementResolution.verified).flatMap((binding) => binding.evidence_artifact_ids))];
  persistedEvaluation.evidence_artifact_ids = [...new Set([evidenceId, ...boundEvidenceIds])];
  persistedEvaluation.assertions = persistedEvaluation.assertions.map((assertion) => {
    const { blocked_reason: _blockedReason, ...persisted } = assertion;
    return { ...persisted, evidence_artifact_ids: assertion.evidence_artifact_ids.length ? assertion.evidence_artifact_ids : [evidenceId] };
  });
  persistedEvaluation.candidate_identity = persistedCandidateIdentity(candidateAfter);
  persistedEvaluation.candidate_digest = candidateAfter.candidate_digest;
  const evaluationValidation = validateRuntimePacket(persistedEvaluation, 'evaluation.v1.schema.json');
  if (!evaluationValidation.valid) throw new Error(`Evaluation schema invalid: ${evaluationValidation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  const evaluationRecordId = makeId('artifact');
  const evaluationRecordFile = path.join(runDirectory, 'evidence', `${evaluation.evaluation_id}.evaluation.json`);
  await writeJsonAtomic(evaluationRecordFile, redactValue(persistedEvaluation));
  const evaluationRecordBytes = await readFile(evaluationRecordFile);
  const evaluationRecordPath = path.relative(contractRoot(contract), evaluationRecordFile).split(path.sep).join('/');
  const evaluationRecordArtifact = {
    artifact_version: '1.0.0', artifact_id: evaluationRecordId, run_id: contract.run_id,
    artifact_type: 'EvaluationRecordV1', path: evaluationRecordPath,
    media_type: 'application/json', byte_length: evaluationRecordBytes.length, sha256: sha256(evaluationRecordBytes),
    created_at: evaluation.finished_at, created_by: evaluation.evaluator.id,
    candidate_identity: persistedCandidateIdentity(candidateAfter),
    redaction_status: 'passed', source_artifact_ids: [...persistedEvaluation.evidence_artifact_ids],
  };
  const evaluationRecordValidation = validateRuntimePacket(evaluationRecordArtifact, 'artifact.v1.schema.json');
  if (!evaluationRecordValidation.valid) throw new Error(`Evaluation record artifact schema invalid: ${evaluationRecordValidation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'artifact_recorded', actor: evaluation.evaluator.id, payload: evaluationRecordArtifact });
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'evaluation_finished',
    actor: evaluation.evaluator.id,
    payload: persistedEvaluation,
  });
  return {
    ...evaluation,
    assertions: persistedEvaluation.assertions,
    evidence_artifact_ids: [...persistedEvaluation.evidence_artifact_ids],
    evidence_artifact: evidenceArtifact,
    evaluation_record_artifact: evaluationRecordArtifact,
  };
}

export async function recordRepairDirective(runDirectory, contract, directive, actor = 'evaluator', options = {}) {
  for (const field of ['falsifying_evidence', 'changed_hypothesis', 'required_regression_scope']) {
    if (directive[field] === undefined || directive[field] === null || directive[field] === '') throw new Error(`Repair directive missing ${field}`);
  }
  const { snapshot } = await assertRunBudgetAvailable(runDirectory, contract, { now: options.now });
  const recordedArtifactIds = new Set(snapshot.artifacts.map((artifact) => artifact.artifact_id));
  const invalidEvidence = Array.isArray(directive.falsifying_evidence)
    ? directive.falsifying_evidence.filter((artifactId) => !/^artifact_/.test(artifactId) || !recordedArtifactIds.has(artifactId))
    : [String(directive.falsifying_evidence)];
  if (invalidEvidence.length) throw new Error(`Repair falsifying_evidence must reference recorded artifact IDs: ${invalidEvidence.join(', ')}`);
  if (snapshot.repairs.some((repair) => repair.changed_hypothesis === directive.changed_hypothesis)) {
    throw new Error('Repair must change the hypothesis; repeated operation is not progress');
  }
  if (snapshot.iterations >= contractBudgetLimits(contract).iterations) throw new Error('Repair iteration budget exhausted');
  const payload = {
    repair_id: directive.repair_id ?? makeId('repair'),
    repair_version: '1.0.0',
    run_id: contract.run_id,
    iteration: snapshot.iterations + 1,
    failed_assertion_ids: directive.failed_assertion_ids ?? [directive.failed_assertion],
    falsifying_evidence: directive.falsifying_evidence,
    prior_hypothesis: directive.prior_hypothesis ?? 'The prior implementation was expected to pass.',
    changed_hypothesis: directive.changed_hypothesis,
    implementation_target: directive.implementation_target ?? 'bounded repair',
    allowed_paths: directive.allowed_paths ?? contract.scope.in_paths,
    allowed_effects: directive.allowed_effects ?? [],
    remaining_budget: directive.remaining_budget ?? (() => {
      const remaining = remainingBudget(contract, snapshot, options.now);
      return { ...remaining, iterations: Math.max(0, remaining.iterations - 1), retries: Math.max(0, remaining.retries - 1) };
    })(),
    required_regression_scope: directive.required_regression_scope,
    issued_at: directive.directed_at ?? nowIso(),
    issued_by: actor,
  };
  const validation = validateRuntimePacket(payload, 'repair-directive.v1.schema.json');
  if (!validation.valid) throw new Error(`Repair directive schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'repair_directed', actor, payload });
  return payload;
}

export function gradeTrajectory(snapshot, contract) {
  const repairHypotheses = snapshot.repairs.map((entry) => entry.changed_hypothesis);
  const uniqueHypotheses = new Set(repairHypotheses);
  const unresolvedEffects = Object.values(snapshot.effects).filter((effect) => !['verified', 'failed'].includes(effect.state));
  const observationsRequired = (contract.environment_observations ?? []).length > 0;
  const dimensions = {
    bounded_retries: snapshot.iterations <= contractBudgetLimits(contract).iterations && snapshot.retries <= contractBudgetLimits(contract).retries,
    changed_hypotheses: uniqueHypotheses.size === repairHypotheses.length,
    effect_discipline: unresolvedEffects.length === 0,
    environment_observed: !observationsRequired || snapshot.observations.length > 0,
    evaluation_recorded: snapshot.evaluations.length > 0,
    exact_root_preserved: path.resolve(contractRoot(contract)) === contractRoot(contract),
  };
  const passed = Object.values(dimensions).filter(Boolean).length;
  return {
    dimensions,
    counts: { total: Object.keys(dimensions).length, passed, failed: Object.keys(dimensions).length - passed },
    score: passed / Object.keys(dimensions).length,
    accepted: passed === Object.keys(dimensions).length,
    unresolved_effect_ids: unresolvedEffects.map((entry) => entry.effect_id),
  };
}

export function evaluateRubric(rubric, observations, options = {}) {
  if (!Array.isArray(rubric.dimensions) || rubric.dimensions.length === 0) throw new Error('Rubric has no dimensions');
  const dimensions = rubric.dimensions.map((dimension) => {
    const observation = observations[dimension.id];
    const score = Number(observation?.score);
    const valid = Number.isFinite(score) && score >= 0 && score <= dimension.weight;
    return { id: dimension.id, score: valid ? score : 0, weight: dimension.weight, valid, evidence: redactValue(observation?.evidence ?? []) };
  });
  const score = dimensions.reduce((sum, entry) => sum + entry.score, 0);
  const maximum = dimensions.reduce((sum, entry) => sum + entry.weight, 0);
  const ratio = maximum ? score / maximum : 0;
  const hardFailures = (rubric.hard_fail_rules ?? []).filter((id) => {
    const entry = dimensions.find((dimension) => dimension.id === id);
    return !entry?.valid || entry.score === 0;
  });
  const accepted = dimensions.every((entry) => entry.valid) && hardFailures.length === 0 && score >= rubric.pass_threshold;
  return { rubric_id: rubric.rubric_id, evaluator_identity: options.evaluatorIdentity, dimensions, score, maximum, ratio, threshold: rubric.pass_threshold, hard_failures: hardFailures, accepted };
}
