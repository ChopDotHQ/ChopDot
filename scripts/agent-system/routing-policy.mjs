import { validateGovernanceInstance } from './schema.mjs';

const EXPECTED_RISK_RULES = {
  low: { minimum_evidence_level: 'unit', default_run_type: 'turn', default_execution_mode: 'deterministic', independent_evaluator: false },
  moderate: { minimum_evidence_level: 'simulated-integration', default_run_type: 'bounded_goal', default_execution_mode: 'single-agent', independent_evaluator: false },
  critical: { minimum_evidence_level: 'exact-candidate', default_run_type: 'bounded_goal', default_execution_mode: 'single-agent', independent_evaluator: true },
};
const EXPECTED_TOPICS = ['money', 'membership', 'privacy', 'recovery', 'security', 'release', 'credentials', 'external-write'];

export function validateTaskRoutingPolicy(policy) {
  const issues = [...validateGovernanceInstance(policy, 'task-routing-policy.v1.schema.json').issues];
  if (JSON.stringify(policy?.risk_rules) !== JSON.stringify(EXPECTED_RISK_RULES)) issues.push({ path: '/risk_rules', code: 'routing_floor_changed', message: 'Risk evidence, run-type, execution-mode, and evaluator floors are locked in V1' });
  if (JSON.stringify(policy?.critical_topics) !== JSON.stringify(EXPECTED_TOPICS)) issues.push({ path: '/critical_topics', code: 'critical_topics_changed', message: 'The V1 critical-topic set and order are locked' });
  if (policy?.time_and_proactive_default !== 'read_only') issues.push({ path: '/time_and_proactive_default', code: 'scheduled_write_enabled', message: 'Time-based and proactive work must default to read-only' });
  return { valid: issues.length === 0, issues };
}
