import { digestObject, makeId, nowIso } from '../core.mjs';
import { validateGovernanceInstance } from '../schema.mjs';

export const KNOWLEDGE_CAPABILITIES = Object.freeze(['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report']);
export const FALLBACK_STATUSES = Object.freeze(['none', 'allowed', 'disallowed', 'active', 'unavailable', 'unknown']);
const METHODS = ['health', 'read_context', 'record_outcome', 'verify_recall'];

export function assertKnowledgePort(adapter) {
  for (const method of METHODS) if (typeof adapter?.[method] !== 'function') throw new Error(`Knowledge adapter is missing ${method}()`);
  return adapter;
}

export function normalizeKnowledgeScope(scope = {}) {
  const normalized = { root: scope.root ?? scope.exact_root, branch: scope.branch, commit: scope.commit };
  if (!normalized.root?.startsWith('/')) throw new Error('Knowledge scope requires absolute root');
  if (!normalized.branch) throw new Error('Knowledge scope requires branch');
  if (!/^[0-9a-f]{40}$/.test(normalized.commit ?? '')) throw new Error('Knowledge scope requires exact 40-character commit');
  return normalized;
}

export function receiptBase(operation, metadata = {}) {
  return {
    receipt_version: '1.0.0', receipt_id: makeId('knowledge_receipt'), operation,
    backend: metadata.backend, backend_version: metadata.backend_version,
    runtime: metadata.runtime, capabilities: metadata.capabilities,
    requested_read_path: metadata.requested_read_path, active_read_path: metadata.active_read_path,
    fallback_status: metadata.fallback_status ?? 'none', accepted: metadata.accepted ?? true,
    rejected_reasons: metadata.rejected_reasons ?? [], durable_record_id: metadata.durable_record_id ?? null,
    stored_packet_digest: metadata.stored_packet_digest ?? null, stored_artifact_digests: metadata.stored_artifact_digests ?? [],
    facts: metadata.facts ?? [], citations: metadata.citations ?? [], source_identities: metadata.source_identities ?? [],
    mismatches: metadata.mismatches ?? [], stale_reasons: metadata.stale_reasons ?? [],
    current_outcome_digest: metadata.current_outcome_digest ?? null, observed_at: metadata.observed_at ?? nowIso(),
  };
}

function validateMetadata(value) {
  if (!value.backend || !value.backend_version || !value.runtime) throw new Error('Knowledge result has incomplete backend identity');
  if (!Array.isArray(value.capabilities) || value.capabilities.some((entry) => !KNOWLEDGE_CAPABILITIES.includes(entry))) throw new Error('Knowledge result has unsupported capabilities');
  if (!value.requested_read_path || !value.active_read_path) throw new Error('Knowledge result has incomplete read paths');
  if (!FALLBACK_STATUSES.includes(value.fallback_status)) throw new Error('Knowledge result has invalid fallback status');
}

export function validateKnowledgeReceipt(value, expectedOperation) {
  const schema = validateGovernanceInstance(value, 'knowledge-receipt.v1.schema.json');
  if (!schema.valid) throw new Error(`Knowledge receipt schema invalid: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  validateMetadata(value);
  if (value.receipt_version !== '1.0.0' || value.operation !== expectedOperation) throw new Error(`Invalid ${expectedOperation} receipt identity`);
  if (!value.receipt_id?.startsWith('knowledge_receipt_') || typeof value.accepted !== 'boolean') throw new Error('Invalid receipt state');
  for (const field of ['rejected_reasons', 'stored_artifact_digests', 'facts', 'citations', 'source_identities', 'mismatches', 'stale_reasons']) if (!Array.isArray(value[field])) throw new Error(`Receipt missing array ${field}`);
  if (expectedOperation === 'record_outcome' && value.accepted && (!value.durable_record_id || !/^[0-9a-f]{64}$/.test(value.stored_packet_digest ?? ''))) throw new Error('Accepted record receipt lacks durable identity');
  if (expectedOperation === 'verify_recall' && value.accepted && (value.mismatches.length || value.stale_reasons.length)) throw new Error('Recall cannot be accepted with mismatches or stale reasons');
  return true;
}

export function validateKnowledgeRecall(value, scopeInput, expectedDigest) {
  validateKnowledgeReceipt(value, 'verify_recall');
  const scope = normalizeKnowledgeScope(scopeInput);
  if (!value.accepted) throw new Error(`Recall rejected: ${value.rejected_reasons.join(',')}`);
  if (value.current_outcome_digest !== expectedDigest) throw new Error('Recall returned a different outcome digest');
  if (value.mismatches.length || value.stale_reasons.length) throw new Error('Recall contains mismatches or stale reasons');
  if (!value.facts.length || !value.citations.length || !value.source_identities.length) throw new Error('Recall lacks cited durable evidence');
  const sources = new Map(value.source_identities.map((entry) => [entry.source_identity_id, entry]));
  for (const source of value.source_identities) if (source.root !== scope.root || source.branch !== scope.branch || source.commit !== scope.commit) throw new Error(`Recall source ${source.source_identity_id} is bound to another candidate`);
  const citations = new Set();
  for (const citation of value.citations) { if (!sources.has(citation.source_identity_id)) throw new Error(`Recall citation ${citation.citation_id} has no source identity`); citations.add(citation.citation_id); }
  for (const fact of value.facts) for (const citationId of fact.citation_ids ?? []) if (!citations.has(citationId)) throw new Error(`Recall fact ${fact.fact_id} has an unknown citation`);
  return true;
}

export function validateKnowledgeContext(value) {
  const schema = validateGovernanceInstance(value, 'knowledge-context.v1.schema.json');
  if (!schema.valid) throw new Error(`Knowledge context schema invalid: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  validateMetadata(value);
  if (value.context_version !== '1.0.0' || !value.request_id?.startsWith('knowledge_request_')) throw new Error('Invalid knowledge context identity');
  normalizeKnowledgeScope(value.scope);
  if (!value.question || !value.authority_policy || !Array.isArray(value.facts) || !Array.isArray(value.citations) || !Array.isArray(value.source_identities)) throw new Error('Incomplete knowledge context');
  if (!value.freshness || !['fresh', 'stale', 'unknown'].includes(value.freshness.status)) throw new Error('Invalid freshness');
  if (!(value.confidence >= 0 && value.confidence <= 1)) throw new Error('Invalid confidence');
  return true;
}

export async function runKnowledgeAdapterConformance(adapter, fixture = {}) {
  assertKnowledgePort(adapter);
  const scope = normalizeKnowledgeScope(fixture.scope ?? { root: fixture.root, branch: fixture.branch ?? 'fixture', commit: fixture.commit ?? 'a'.repeat(40) });
  const digest = 'b'.repeat(64);
  const basePacket = fixture.outcome_packet ?? {
    outcome_version: '1.0.0', outcome_id: 'outcome_fixture001', run_id: 'run_fixture_00000001',
    contract_digest: 'c'.repeat(64), root: scope.root, branch: scope.branch,
    starting_head: scope.commit, starting_tree: 'd'.repeat(40), ending_head: scope.commit, ending_tree: 'd'.repeat(40), git_status: [],
    requirements: [{ requirement_id: 'FIXTURE-REQ', status: 'accepted', evaluation_ids: ['evaluation_fixture001'] }],
    artifacts: [{ artifact_id: 'artifact_fixture001', path: 'fixture/outcome.json', sha256: digest }],
    evaluation_summary: { evaluation_ids: ['evaluation_fixture001'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true },
    effects: [], approvals: [], evidence_index: [{ artifact_id: 'artifact_fixture001', path: 'fixture/outcome.json', sha256: digest }],
    limitations: [], terminal_state: 'succeeded', knowledge_receipts: ['knowledge_receipt_fixture001'], created_at: '2026-08-26T12:00:00Z', packet_digest: null,
  };
  if (!basePacket.packet_digest) basePacket.packet_digest = digestObject(Object.fromEntries(Object.entries(basePacket).filter(([key]) => key !== 'packet_digest')));
  const cases = [];
  async function run(name, execute, validate) {
    try { const result = await execute(); validate(result); cases.push({ id: name, passed: true, result }); }
    catch (error) { cases.push({ id: name, passed: false, error: error.message }); }
  }
  await run('health', () => adapter.health(), (value) => { validateKnowledgeReceipt(value, 'health'); if (!value.accepted) throw new Error(`health rejected: ${value.rejected_reasons.join(',')}`); });
  await run('read_context', () => adapter.read_context(scope, fixture.question ?? 'What outcome is accepted?', fixture.authority_policy ?? 'exact-source-first'), (value) => { validateKnowledgeContext(value); if (value.stale_reasons.length || value.freshness.status !== 'fresh') throw new Error(`context stale: ${value.stale_reasons.join(',')}`); });
  await run('record_outcome', () => adapter.record_outcome(basePacket), (value) => { validateKnowledgeReceipt(value, 'record_outcome'); if (!value.accepted) throw new Error(`record rejected: ${value.rejected_reasons.join(',')}`); });
  await run('verify_recall', () => adapter.verify_recall(scope, basePacket.packet_digest), (value) => { validateKnowledgeRecall(value, scope, basePacket.packet_digest); });
  return { accepted: cases.every((entry) => entry.passed), counts: { total: cases.length, passed: cases.filter((entry) => entry.passed).length, failed: cases.filter((entry) => !entry.passed).length }, cases };
}
