import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const PACKET_SHAPES = Object.freeze({
  ProductDefinitionPacketV1: Object.freeze({
    requirementIds: 'category_baseline_requirement_ids',
    dispositions: 'category_baseline_dispositions',
    evidence: 'benchmark_evidence_grades',
    differentiators: 'chopdot_differentiators',
    experiments: 'experiment_hypotheses',
  }),
  UxJourneyPacketV1: Object.freeze({
    requirementIds: 'benchmark_requirement_ids',
    dispositions: 'baseline_dispositions',
    evidence: 'benchmark_evidence_states',
    differentiators: 'chopdot_differentiated_outcome',
    experiments: 'bounded_experiments',
  }),
});

const EXPECTED_LAYER_ORDER = Object.freeze([
  'category-baseline',
  'chopdot-differentiation',
  'bounded-experiments',
]);

const TREATMENTS = new Set(['must-match', 'must-exceed', 'mode-baseline']);
const APPLICABILITY = new Set(['applicable', 'not-applicable']);
const DISPOSITIONS = new Set(['covered', 'intentionally-exclude', 'not-applicable', 'unresolved']);
const EVIDENCE_GRADES = Object.freeze({
  'E0-discovery': 0,
  'E1-anecdotal': 1,
  'E1-public-source': 1,
  'E2-hands-on': 2,
  'E3-chopdot-proof': 3,
});
const UNIVERSAL_SCOPE = /\b(?:everyone|everybody)\b|\b(?:all|any|every|universal)\b.*\b(?:user|participant|person|state|route)|\b(?:all|every|universal)\s+states?\b/iu;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function issue(code, pathValue, message) {
  return { code, path: pathValue, message };
}

function stableIssues(issues) {
  return issues.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
}

function normalizePacketType(value) {
  if (value === 'ProductDefinitionPacketV1' || value === 'product-definition') return 'ProductDefinitionPacketV1';
  if (value === 'UxJourneyPacketV1' || value === 'ux-journey') return 'UxJourneyPacketV1';
  return null;
}

function recordIndex(records, field, issues) {
  const index = new Map();
  if (!Array.isArray(records)) return index;
  records.forEach((record, position) => {
    const recordPath = `${field}/${position}`;
    if (!isObject(record) || !nonEmpty(record.requirement_id)) {
      issues.push(issue('baseline_requirement_id_missing', `${recordPath}/requirement_id`, 'Requirement-level records need a non-empty requirement_id.'));
      return;
    }
    if (index.has(record.requirement_id)) {
      issues.push(issue('baseline_requirement_duplicate', `${recordPath}/requirement_id`, `Duplicate requirement-level record for ${record.requirement_id}.`));
      return;
    }
    index.set(record.requirement_id, { record, position });
  });
  return index;
}

function referencedIds(value) {
  return Array.isArray(value) ? value.filter(nonEmpty) : [];
}

export async function loadBenchmarkBaseline(benchmarkPath) {
  const source = await readFile(benchmarkPath, 'utf8');
  const requirements = new Map();
  const issues = [];
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!/^\| (?:BASE|MODE)-[A-Z]+-\d{2} \|/u.test(line)) continue;
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
    const [id, expectedOutcome, evidence, evidenceState, e2Status, treatmentCell] = cells;
    if (cells.length !== 6) {
      issues.push(issue('benchmark_row_invalid', `line/${index + 1}`, `Requirement row ${id ?? 'unknown'} must have exactly six cells.`));
      continue;
    }
    if (requirements.has(id)) {
      issues.push(issue('benchmark_requirement_duplicate', `line/${index + 1}`, `Benchmark requirement ${id} appears more than once.`));
      continue;
    }
    const treatment = treatmentCell.match(/`(must-match|must-exceed|mode-baseline)`/u)?.[1] ?? null;
    const evidenceGrades = new Set(evidenceState.match(/E[0-3]-(?:discovery|anecdotal|public-source|hands-on|chopdot-proof)/gu) ?? []);
    if (!treatment || !TREATMENTS.has(treatment)) issues.push(issue('benchmark_treatment_missing', `line/${index + 1}`, `Benchmark requirement ${id} has no recognized treatment.`));
    if (evidenceGrades.size === 0) issues.push(issue('benchmark_evidence_grade_missing', `line/${index + 1}`, `Benchmark requirement ${id} has no recognized evidence grade.`));
    requirements.set(id, {
      id,
      expected_outcome: expectedOutcome,
      conventional_or_null_evidence: evidence,
      evidence_state: evidenceState,
      evidence_grades: evidenceGrades,
      e2_status: e2Status,
      treatment,
      line: index + 1,
    });
  }
  if (requirements.size === 0) issues.push(issue('benchmark_registry_empty', 'benchmark', 'No BASE-* or MODE-* requirement rows were found.'));
  return {
    valid: issues.length === 0,
    path: benchmarkPath,
    sha256: sha256(source),
    requirements,
    issues: stableIssues(issues),
  };
}

function validateSourceIdentity(packet, packetType, baseline, issues) {
  if (packetType !== 'ProductDefinitionPacketV1') return;
  const identity = packet.benchmark_source_identity;
  if (!isObject(identity)) {
    issues.push(issue('benchmark_source_identity_missing', 'benchmark_source_identity', 'ProductDefinitionPacketV1 requires benchmark_source_identity.'));
    return;
  }
  if (identity.path !== 'product/benchmark-baseline.md') issues.push(issue('benchmark_source_path_mismatch', 'benchmark_source_identity/path', 'Benchmark source path must be product/benchmark-baseline.md.'));
  if (identity.sha256 !== baseline.sha256) issues.push(issue('benchmark_source_digest_mismatch', 'benchmark_source_identity/sha256', 'Benchmark source digest does not match the exact worktree source.'));
}

function validateRequirements(packet, shape, baseline, issues) {
  const raw = packet[shape.requirementIds];
  if (!Array.isArray(raw) || raw.length === 0) {
    issues.push(issue('baseline_requirements_missing', shape.requirementIds, 'At least one assessed category-baseline requirement ID is required.'));
    return [];
  }
  const ids = [];
  const seen = new Set();
  raw.forEach((id, position) => {
    if (!nonEmpty(id)) {
      issues.push(issue('baseline_requirement_id_missing', `${shape.requirementIds}/${position}`, 'Baseline requirement IDs must be non-empty strings.'));
      return;
    }
    if (seen.has(id)) {
      issues.push(issue('baseline_requirement_duplicate', `${shape.requirementIds}/${position}`, `Baseline requirement ${id} is duplicated.`));
      return;
    }
    seen.add(id);
    ids.push(id);
    if (!baseline.requirements.has(id)) issues.push(issue('unknown_baseline_requirement', `${shape.requirementIds}/${position}`, `Unknown benchmark requirement ${id}.`));
  });
  return ids;
}

function validateDispositions(packet, shape, requirementIds, baseline, issues) {
  const records = packet[shape.dispositions];
  const index = recordIndex(records, shape.dispositions, issues);
  const covered = new Set();
  for (const id of requirementIds) {
    const indexed = index.get(id);
    if (!indexed) {
      issues.push(issue('baseline_disposition_missing', shape.dispositions, `Requirement ${id} has no disposition record.`));
      continue;
    }
    const { record, position } = indexed;
    const recordPath = `${shape.dispositions}/${position}`;
    const source = baseline.requirements.get(id);
    if (!source) continue;
    if (record.treatment !== source.treatment) issues.push(issue('baseline_treatment_mismatch', `${recordPath}/treatment`, `Requirement ${id} must preserve treatment ${source.treatment}.`));
    if (!APPLICABILITY.has(record.applicability)) issues.push(issue('baseline_applicability_unresolved', `${recordPath}/applicability`, `Requirement ${id} applicability must be explicitly applicable or not-applicable.`));
    if (!DISPOSITIONS.has(record.disposition) || record.disposition === 'unresolved') issues.push(issue('baseline_disposition_unresolved', `${recordPath}/disposition`, `Requirement ${id} needs a resolved package disposition.`));
    if (record.applicability === 'not-applicable' && record.disposition !== 'not-applicable') issues.push(issue('baseline_disposition_conflict', `${recordPath}/disposition`, `Requirement ${id} marked not-applicable must use the not-applicable disposition.`));
    if (record.applicability === 'applicable' && record.disposition === 'not-applicable') issues.push(issue('baseline_disposition_conflict', `${recordPath}/disposition`, `Requirement ${id} marked applicable cannot use the not-applicable disposition.`));
    if (record.disposition === 'covered') {
      if (!nonEmpty(record.proof_plan)) issues.push(issue('baseline_proof_plan_missing', `${recordPath}/proof_plan`, `Covered requirement ${id} needs an exact proof plan.`));
      covered.add(id);
    }
    if (record.disposition === 'intentionally-exclude') {
      for (const field of ['reason', 'user_consequence', 'approval_ref']) if (!nonEmpty(record[field])) issues.push(issue('baseline_exclusion_incomplete', `${recordPath}/${field}`, `Intentional exclusion of ${id} requires ${field}.`));
    }
    if (record.disposition === 'not-applicable' && !nonEmpty(record.rationale)) issues.push(issue('baseline_not_applicable_rationale_missing', `${recordPath}/rationale`, `Not-applicable requirement ${id} needs a state-specific rationale.`));
  }
  for (const [id, { position }] of index) if (!requirementIds.includes(id)) issues.push(issue('baseline_disposition_out_of_scope', `${shape.dispositions}/${position}/requirement_id`, `Disposition references ${id}, which is not in the assessed requirement list.`));
  return covered;
}

function validateEvidence(packet, shape, requirementIds, baseline, issues) {
  const records = packet[shape.evidence];
  const grouped = new Map();
  if (Array.isArray(records)) records.forEach((record, position) => {
    const recordPath = `${shape.evidence}/${position}`;
    if (!isObject(record) || !nonEmpty(record.requirement_id)) {
      issues.push(issue('baseline_requirement_id_missing', `${recordPath}/requirement_id`, 'Evidence records need a non-empty requirement_id.'));
      return;
    }
    if (!grouped.has(record.requirement_id)) grouped.set(record.requirement_id, []);
    grouped.get(record.requirement_id).push({ record, position });
  });
  for (const id of requirementIds) {
    const indexedRecords = grouped.get(id) ?? [];
    if (indexedRecords.length === 0) {
      issues.push(issue('benchmark_evidence_missing', shape.evidence, `Requirement ${id} has no evidence-grade record.`));
      continue;
    }
    const source = baseline.requirements.get(id);
    if (!source) continue;
    for (const { record, position } of indexedRecords) {
      const recordPath = `${shape.evidence}/${position}`;
      const sourceRank = EVIDENCE_GRADES[record.source_grade];
      const claimedRank = EVIDENCE_GRADES[record.claimed_grade];
      if (sourceRank === undefined) issues.push(issue('benchmark_evidence_grade_unknown', `${recordPath}/source_grade`, `Unknown source evidence grade ${String(record.source_grade)}.`));
      else if (!source.evidence_grades.has(record.source_grade)) issues.push(issue('benchmark_source_grade_mismatch', `${recordPath}/source_grade`, `Requirement ${id} source row does not contain ${record.source_grade}.`));
      if (claimedRank === undefined) issues.push(issue('benchmark_evidence_grade_unknown', `${recordPath}/claimed_grade`, `Unknown claimed evidence grade ${String(record.claimed_grade)}.`));
      if (sourceRank !== undefined && claimedRank !== undefined && claimedRank > sourceRank) issues.push(issue('benchmark_evidence_overclaim', `${recordPath}/claimed_grade`, `Requirement ${id} cannot upgrade ${record.source_grade} to ${record.claimed_grade}.`));
      if (!nonEmpty(record.observed_at)) issues.push(issue('benchmark_evidence_observation_missing', `${recordPath}/observed_at`, `Requirement ${id} needs an evidence observation date or timestamp.`));
      if (!Array.isArray(record.evidence_refs) || record.evidence_refs.length === 0 || record.evidence_refs.some((entry) => !nonEmpty(entry))) issues.push(issue('benchmark_evidence_reference_missing', `${recordPath}/evidence_refs`, `Requirement ${id} needs at least one non-empty evidence reference.`));
    }
  }
  for (const [id, entries] of grouped) if (!requirementIds.includes(id)) for (const { position } of entries) issues.push(issue('benchmark_evidence_out_of_scope', `${shape.evidence}/${position}/requirement_id`, `Evidence references ${id}, which is not in the assessed requirement list.`));
  return Array.isArray(records) ? records.length : 0;
}

function validateDifferentiators(packet, packetType, shape, requirementIds, coveredIds, baseline, issues) {
  const value = packet[shape.differentiators];
  const records = packetType === 'ProductDefinitionPacketV1' ? value : [value];
  if (!Array.isArray(records) || records.length === 0 || records.some((entry) => !isObject(entry))) {
    issues.push(issue('differentiator_missing', shape.differentiators, 'A named ChopDot differentiator with an observable outcome is required.'));
    return 0;
  }
  records.forEach((record, position) => {
    const recordPath = packetType === 'ProductDefinitionPacketV1' ? `${shape.differentiators}/${position}` : shape.differentiators;
    if (!nonEmpty(record.id) || !nonEmpty(record.outcome)) issues.push(issue('differentiator_missing', recordPath, 'Each differentiator needs a stable id and observable outcome.'));
    const references = referencedIds(record.baseline_requirement_ids);
    if (references.length === 0) issues.push(issue('differentiator_baseline_reference_missing', `${recordPath}/baseline_requirement_ids`, 'Each differentiator must name the baseline requirements it improves.'));
    for (const id of references) {
      if (!baseline.requirements.has(id) || !requirementIds.includes(id)) issues.push(issue('differentiator_baseline_reference_unknown', `${recordPath}/baseline_requirement_ids`, `Differentiator references unassessed requirement ${id}.`));
      else if (!coveredIds.has(id)) issues.push(issue('differentiator_precedes_baseline', `${recordPath}/baseline_requirement_ids`, `Differentiator cannot precede unresolved or excluded baseline ${id}.`));
    }
  });
  return records.length;
}

function validateFallback(fallback, fallbackPath, requirementIds, coveredIds, baseline, issues) {
  if (!isObject(fallback)) {
    issues.push(issue('experiment_baseline_fallback_missing', fallbackPath, 'Experiment needs a working accepted baseline fallback.'));
    return;
  }
  const references = referencedIds(fallback.requirement_ids);
  if (references.length === 0 || !nonEmpty(fallback.description)) issues.push(issue('experiment_baseline_fallback_missing', fallbackPath, 'Baseline fallback needs a description and requirement IDs.'));
  for (const id of references) {
    if (!baseline.requirements.has(id) || !requirementIds.includes(id)) issues.push(issue('experiment_baseline_fallback_unknown', `${fallbackPath}/requirement_ids`, `Fallback references unassessed requirement ${id}.`));
    else if (!coveredIds.has(id)) issues.push(issue('experiment_baseline_fallback_unresolved', `${fallbackPath}/requirement_ids`, `Fallback requirement ${id} is not covered.`));
  }
}

function validateExperiments(packet, packetType, shape, requirementIds, coveredIds, baseline, issues) {
  const records = packet[shape.experiments];
  if (records === undefined) return 0;
  if (!Array.isArray(records)) {
    issues.push(issue('experiments_invalid', shape.experiments, 'Bounded experiments must be an array.'));
    return 0;
  }
  const uxFallbacks = packetType === 'UxJourneyPacketV1' && Array.isArray(packet.baseline_fallbacks) ? new Map(packet.baseline_fallbacks.filter(isObject).map((entry) => [entry.id, entry])) : new Map();
  records.forEach((record, position) => {
    const recordPath = `${shape.experiments}/${position}`;
    if (!isObject(record) || !nonEmpty(record.id)) issues.push(issue('experiment_id_missing', `${recordPath}/id`, 'Each bounded experiment needs a stable id.'));
    if (!isObject(record) || !nonEmpty(record.hypothesis)) issues.push(issue('experiment_hypothesis_missing', `${recordPath}/hypothesis`, 'Each bounded experiment needs a testable hypothesis.'));
    if (!isObject(record) || !nonEmpty(record.falsifier)) issues.push(issue('experiment_falsifier_missing', `${recordPath}/falsifier`, 'Each bounded experiment needs a falsifier.'));
    if (!isObject(record)) return;
    if (packetType === 'ProductDefinitionPacketV1') validateFallback(record.baseline_fallback, `${recordPath}/baseline_fallback`, requirementIds, coveredIds, baseline, issues);
    else {
      const fallback = nonEmpty(record.baseline_fallback_id) ? uxFallbacks.get(record.baseline_fallback_id) : null;
      validateFallback(fallback, `${recordPath}/baseline_fallback_id`, requirementIds, coveredIds, baseline, issues);
    }
  });
  return records.length;
}

function validateActionScope(packet, issues) {
  if (!nonEmpty(packet.user_state)) issues.push(issue('user_state_missing', 'user_state', 'A bounded observed user state is required.'));
  if (!nonEmpty(packet.one_next_action)) issues.push(issue('one_next_action_missing', 'one_next_action', 'One next action is required for the bounded state.'));
  const scope = packet.action_scope;
  if (!isObject(scope)) {
    issues.push(issue('action_scope_missing', 'action_scope', 'Action scope must be an object with actor, state, route, and universal false.'));
    return;
  }
  if (!nonEmpty(scope.actor)) issues.push(issue('action_scope_actor_missing', 'action_scope/actor', 'Action scope requires one bounded actor.'));
  if (!nonEmpty(scope.state)) issues.push(issue('action_scope_state_missing', 'action_scope/state', 'Action scope requires one bounded state.'));
  const universalText = `${scope.actor ?? ''} ${scope.state ?? ''} ${scope.route ?? ''}`;
  if (scope.universal !== false || UNIVERSAL_SCOPE.test(universalText)) issues.push(issue('action_scope_universal', 'action_scope/universal', 'Action scope must explicitly be non-universal and may not name all users or states.'));
}

function validateLayerOrder(packet, issues) {
  if (!Array.isArray(packet.layer_order) || packet.layer_order.length !== EXPECTED_LAYER_ORDER.length || packet.layer_order.some((entry, index) => entry !== EXPECTED_LAYER_ORDER[index])) {
    issues.push(issue('layer_order_invalid', 'layer_order', `Layer order must be ${EXPECTED_LAYER_ORDER.join(' -> ')}.`));
  }
}

function semanticMeasurements(packetType, packet, issues) {
  const countCodes = (codes) => issues.filter((entry) => codes.has(entry.code)).length;
  const unresolved = countCodes(new Set([
    'baseline_requirements_missing', 'baseline_requirement_id_missing', 'baseline_requirement_duplicate',
    'unknown_baseline_requirement', 'baseline_disposition_missing', 'baseline_applicability_unresolved',
    'baseline_disposition_unresolved', 'baseline_disposition_conflict', 'baseline_treatment_mismatch',
    'baseline_disposition_out_of_scope',
  ]));
  const layerViolations = countCodes(new Set([
    'layer_order_invalid', 'differentiator_missing', 'differentiator_baseline_reference_missing',
    'differentiator_baseline_reference_unknown', 'differentiator_precedes_baseline',
    'experiments_invalid', 'experiment_id_missing', 'experiment_hypothesis_missing',
    'experiment_falsifier_missing', 'experiment_baseline_fallback_missing',
    'experiment_baseline_fallback_unknown', 'experiment_baseline_fallback_unresolved',
  ]));
  const contextualActionValid = !issues.some((entry) => entry.code.startsWith('action_scope_') || entry.code === 'user_state_missing' || entry.code === 'one_next_action_missing');
  if (packetType === 'ProductDefinitionPacketV1') return {
    unresolved_required_baseline_count: { value: unresolved, evidence_level: 'unit' },
    benchmark_evidence_overclaim_count: { value: countCodes(new Set(['benchmark_evidence_overclaim'])), evidence_level: 'unit' },
    product_layer_violation_count: { value: layerViolations, evidence_level: 'unit' },
    contextual_action_scope_valid: { value: contextualActionValid, evidence_level: 'unit' },
  };
  return {
    unresolved_applicable_baseline_count: { value: unresolved, evidence_level: 'unit' },
    ux_layer_violation_count: { value: layerViolations, evidence_level: 'unit' },
    primary_next_action_count: { value: nonEmpty(packet?.one_next_action) && contextualActionValid ? 1 : 0, evidence_level: 'unit' },
  };
}

export async function validateBenchmarkPacket(packet, options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const benchmarkPath = path.resolve(options.benchmarkPath ?? path.join(root, 'product', 'benchmark-baseline.md'));
  const baseline = await loadBenchmarkBaseline(benchmarkPath);
  const issues = baseline.issues.map((entry) => issue('benchmark_source_invalid', entry.path, entry.message));
  const packetType = normalizePacketType(options.packetType ?? packet?.packet_type);
  if (!packetType) {
    issues.push(issue('packet_type_unknown', 'packet_type', 'Packet type must be ProductDefinitionPacketV1 or UxJourneyPacketV1.'));
    return {
      valid: false,
      packet_type: packet?.packet_type ?? null,
      root,
      benchmark: { path: path.relative(root, benchmarkPath), sha256: baseline.sha256, requirement_count: baseline.requirements.size },
      counts: { requirement_count: 0, disposition_count: 0, evidence_record_count: 0, differentiator_count: 0, experiment_count: 0, issue_count: issues.length },
      issues: stableIssues(issues),
    };
  }
  if (!isObject(packet)) {
    issues.push(issue('packet_invalid', '', 'Packet must be a JSON object.'));
    const sortedInvalidPacketIssues = stableIssues(issues);
    return {
      valid: false,
      packet_type: packetType,
      root,
      benchmark: { path: path.relative(root, benchmarkPath), sha256: baseline.sha256, requirement_count: baseline.requirements.size },
      counts: { requirement_count: 0, disposition_count: 0, evidence_record_count: 0, differentiator_count: 0, experiment_count: 0, issue_count: sortedInvalidPacketIssues.length },
      issues: sortedInvalidPacketIssues,
    };
  }
  const shape = PACKET_SHAPES[packetType];
  validateSourceIdentity(packet, packetType, baseline, issues);
  validateLayerOrder(packet, issues);
  const requirementIds = validateRequirements(packet, shape, baseline, issues);
  const coveredIds = validateDispositions(packet, shape, requirementIds, baseline, issues);
  const evidenceRecordCount = validateEvidence(packet, shape, requirementIds, baseline, issues);
  const differentiatorCount = validateDifferentiators(packet, packetType, shape, requirementIds, coveredIds, baseline, issues);
  const experimentCount = validateExperiments(packet, packetType, shape, requirementIds, coveredIds, baseline, issues);
  validateActionScope(packet, issues);
  const sorted = stableIssues(issues);
  return {
    valid: sorted.length === 0,
    packet_type: packetType,
    root,
    benchmark: { path: path.relative(root, benchmarkPath), sha256: baseline.sha256, requirement_count: baseline.requirements.size },
    counts: {
      requirement_count: requirementIds.length,
      disposition_count: Array.isArray(packet[shape.dispositions]) ? packet[shape.dispositions].length : 0,
      evidence_record_count: evidenceRecordCount,
      differentiator_count: differentiatorCount,
      experiment_count: experimentCount,
      issue_count: sorted.length,
    },
    measurements: semanticMeasurements(packetType, packet, sorted),
    issues: sorted,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (!['--packet', '--benchmark', '--root', '--type'].includes(arg)) throw new Error(`Unknown argument ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
    options[arg.slice(2)] = value;
    index += 1;
  }
  return options;
}

export async function runBenchmarkSemanticsCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    return { exitCode: 2, output: { valid: false, error: error instanceof Error ? error.message : String(error) } };
  }
  if (options.help) return {
    exitCode: 0,
    output: { usage: 'node scripts/agent-system/benchmark-semantics.mjs --packet <packet.json> [--type product-definition|ux-journey] [--benchmark product/benchmark-baseline.md] [--root <repo-root>]' },
  };
  if (!options.packet) return { exitCode: 2, output: { valid: false, error: '--packet is required' } };
  const root = path.resolve(options.root ?? process.cwd());
  const packetPath = path.resolve(root, options.packet);
  const benchmarkPath = path.resolve(root, options.benchmark ?? 'product/benchmark-baseline.md');
  try {
    const packet = JSON.parse(await readFile(packetPath, 'utf8'));
    const result = await validateBenchmarkPacket(packet, { root, benchmarkPath, packetType: options.type });
    return { exitCode: result.valid ? 0 : 1, output: result };
  } catch (error) {
    return { exitCode: 1, output: { valid: false, error: error instanceof Error ? error.message : String(error), packet_path: packetPath } };
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = await runBenchmarkSemanticsCli();
  process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`);
  process.exitCode = result.exitCode;
}
