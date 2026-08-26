import { digestObject, makeId, nowIso } from '../core.mjs';
import { normalizeKnowledgeScope, receiptBase } from './port.mjs';
import { validateOutcomePacket } from '../outcome.mjs';

export function createMockKgv3Adapter() {
  const records = new Map();
  const metadata = {
    backend: 'mock-portable-graph', backend_version: '3.fixture', runtime: 'memory',
    capabilities: ['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report'],
    requested_read_path: 'memory://kgv3', active_read_path: 'memory://kgv3', fallback_status: 'none',
  };
  return {
    async health() { return receiptBase('health', metadata); },
    async read_context(scopeInput, question, authorityPolicy = 'portable-fixture') {
      const scope = normalizeKnowledgeScope(scopeInput);
      const observedAt = nowIso();
      return {
        context_version: '1.0.0', request_id: makeId('knowledge_request'), scope, question,
        authority_policy: authorityPolicy, ...metadata,
        facts: [{ fact_id: 'fact_mock_1', statement: 'Portable fixture context is available.', citation_ids: ['citation_mock_1'], confidence: 1 }],
        citations: [{ citation_id: 'citation_mock_1', source_identity_id: 'source_mock_1', path: 'memory://kgv3/source/1', sha256: 'a'.repeat(64) }],
        source_identities: [{ source_identity_id: 'source_mock_1', root: scope.root, branch: scope.branch, commit: scope.commit, path: 'memory://kgv3/source/1', sha256: 'a'.repeat(64) }],
        freshness: { observed_at: observedAt, max_age_seconds: 0, age_seconds: 0, status: 'fresh' },
        confidence: 1, stale_reasons: [], current_outcome_digest: null, observed_at: observedAt,
      };
    },
    async record_outcome(packet) {
      const validation = validateOutcomePacket(packet);
      if (!validation.valid) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: validation.issues.map((entry) => `invalid_outcome:${entry}`) });
      const computed = digestObject(Object.fromEntries(Object.entries(packet ?? {}).filter(([key]) => key !== 'packet_digest')));
      if (!packet?.packet_digest || computed !== packet.packet_digest) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: ['packet_digest_mismatch'] });
      records.set(packet.packet_digest, structuredClone(packet));
      return receiptBase('record_outcome', { ...metadata, durable_record_id: `memory:${packet.packet_digest}`, stored_packet_digest: packet.packet_digest, stored_artifact_digests: (packet.artifacts ?? []).map((entry) => entry.sha256).filter(Boolean), current_outcome_digest: packet.packet_digest });
    },
    async verify_recall(scopeInput, expectedDigest) {
      normalizeKnowledgeScope(scopeInput);
      const match = records.get(expectedDigest);
      const candidateMatches = Boolean(match) && match.root === scopeInput.root && match.branch === scopeInput.branch && match.ending_head === scopeInput.commit;
      return receiptBase('verify_recall', {
        ...metadata, accepted: candidateMatches, rejected_reasons: candidateMatches ? [] : ['recall_mismatch'],
        facts: candidateMatches ? [{ fact_id: 'fact_mock_recall_1', statement: `Outcome ${expectedDigest} recalled`, citation_ids: ['citation_mock_recall_1'] }] : [],
        citations: candidateMatches ? [{ citation_id: 'citation_mock_recall_1', source_identity_id: 'source_mock_recall_1', path: `memory://kgv3/outcome/${expectedDigest}`, sha256: expectedDigest }] : [],
        source_identities: candidateMatches ? [{ source_identity_id: 'source_mock_recall_1', root: scopeInput.root, branch: scopeInput.branch, commit: scopeInput.commit, path: `memory://kgv3/outcome/${expectedDigest}`, sha256: expectedDigest }] : [],
        mismatches: candidateMatches ? [] : [match ? 'record_candidate_mismatch' : 'outcome_not_recalled'], current_outcome_digest: candidateMatches ? expectedDigest : null,
      });
    },
  };
}
