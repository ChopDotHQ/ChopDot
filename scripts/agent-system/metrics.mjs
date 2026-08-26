import { digestObject } from './core.mjs';

export function aggregateRunMetrics(records, options = {}) {
  const normalized = records.map((record) => record.snapshot ?? record);
  const count = normalized.length;
  const succeeded = normalized.filter((record) => record.terminal_state === 'succeeded').length;
  const passAtOne = normalized.filter((record) => record.evaluations?.[0]?.accepted === true).length;
  const totalEvaluations = normalized.reduce((sum, record) => sum + (record.evaluations?.length ?? 0), 0);
  const totalRepairs = normalized.reduce((sum, record) => sum + (record.repairs?.length ?? 0), 0);
  const unresolvedEffects = normalized.reduce((sum, record) => sum + Object.values(record.effects ?? {}).filter((effect) => !['verified', 'failed'].includes(effect.state)).length, 0);
  const metrics = {
    metrics_version: '1.0.0',
    suite_id: options.suiteId ?? null,
    suite_version: options.suiteVersion ?? null,
    candidate_sha: options.candidateSha ?? null,
    environment: options.environment ?? null,
    sample_count: count,
    success_count: succeeded,
    final_pass_rate: count ? succeeded / count : 0,
    pass_at_1_count: passAtOne,
    pass_at_1: count ? passAtOne / count : 0,
    evaluation_count: totalEvaluations,
    repair_count: totalRepairs,
    unresolved_effect_count: unresolvedEffects,
    human_interventions: options.humanInterventions ?? 0,
    tool_calls: normalized.reduce((sum, record) => sum + (record.tool_calls ?? 0), 0),
    model_cost: normalized.reduce((sum, record) => sum + (record.model_cost ?? 0), 0),
    external_cost: normalized.reduce((sum, record) => sum + (record.external_cost ?? 0), 0),
    context_bytes: options.contextBytes ?? null,
    escaped_defects: options.escapedDefects ?? 0,
  };
  return { ...metrics, metrics_digest: digestObject(metrics) };
}

export function summarizeEvaluations(evaluations) {
  const assertions = evaluations.flatMap((evaluation) => evaluation.assertions ?? []);
  return {
    evaluations: evaluations.length,
    assertions: assertions.length,
    passed: assertions.filter((entry) => entry.passed).length,
    failed: assertions.filter((entry) => !entry.passed).length,
    skipped: assertions.filter((entry) => entry.skipped).length,
  };
}
