import { normalizeKnowledgeScope, receiptBase } from './port.mjs';
import { validateOutcomePacket } from '../outcome.mjs';

export function createKgv2Adapter(client, options = {}) {
  const metadata = {
    backend: 'kgv2', backend_version: options.backendVersion ?? '2', runtime: options.runtime ?? 'agentops-bridge',
    capabilities: ['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report'],
    requested_read_path: options.requestedReadPath ?? 'agentops://kgv2', active_read_path: options.activeReadPath ?? 'agentops://kgv2', fallback_status: 'none',
  };
  function unavailable(name) { throw new Error(`KGv2 ${name} capability is unavailable`); }
  return {
    async health() {
      if (!client?.health) return receiptBase('health', { ...metadata, accepted: false, rejected_reasons: ['client_unconfigured'], fallback_status: 'unavailable' });
      const result = await client.health();
      if (result?.receipt_version) return result;
      return receiptBase('health', { ...metadata, runtime: result.runtime ?? metadata.runtime, capabilities: result.capabilities ?? metadata.capabilities, active_read_path: result.active_read_path ?? metadata.active_read_path, fallback_status: result.fallback_status ?? 'none', accepted: result.accepted !== false, rejected_reasons: result.rejected_reasons ?? [] });
    },
    async read_context(scope, question, authorityPolicy) {
      if (!client?.read_context) unavailable('read_context');
      const result = await client.read_context(scope, question, authorityPolicy);
      if (result?.context_version) return result;
      return { context_version: '1.0.0', request_id: result.request_id, scope: normalizeKnowledgeScope(scope), question, authority_policy: typeof authorityPolicy === 'string' ? authorityPolicy : 'kgv2-bridge', ...metadata, runtime: result.runtime ?? metadata.runtime, active_read_path: result.active_read_path ?? metadata.active_read_path, fallback_status: result.fallback_status ?? 'none', facts: result.facts ?? [], citations: result.citations ?? [], source_identities: result.source_identities ?? result.cited_source_identities ?? [], freshness: result.freshness, confidence: result.confidence ?? 0, stale_reasons: result.stale_reasons ?? [], current_outcome_digest: result.current_outcome_digest ?? null, observed_at: result.observed_at };
    },
    async record_outcome(packet) {
      const validation = validateOutcomePacket(packet);
      if (!validation.valid) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: validation.issues.map((entry) => `invalid_outcome:${entry}`) });
      if (!client?.record_outcome) unavailable('record_outcome');
      const result = await client.record_outcome(packet);
      if (result?.receipt_version) return result;
      return receiptBase('record_outcome', { ...metadata, accepted: result.accepted === true, rejected_reasons: result.rejected_reasons ?? [], durable_record_id: result.durable_record_id ?? null, stored_packet_digest: result.stored_packet_digest ?? null, stored_artifact_digests: result.stored_artifact_digests ?? [], current_outcome_digest: result.stored_packet_digest ?? null });
    },
    async verify_recall(scope, expectedDigest) {
      if (!client?.verify_recall) unavailable('verify_recall');
      const result = await client.verify_recall(scope, expectedDigest);
      if (result?.receipt_version) return result;
      const mismatches = result.mismatches ?? [];
      const staleReasons = result.stale_reasons ?? [];
      return receiptBase('verify_recall', {
        ...metadata,
        active_read_path: result.active_read_path ?? metadata.active_read_path,
        fallback_status: result.fallback_status ?? 'none',
        accepted: result.accepted ?? (mismatches.length === 0 && staleReasons.length === 0),
        rejected_reasons: result.rejected_reasons ?? [],
        durable_record_id: result.durable_record_id ?? null,
        stored_packet_digest: result.stored_packet_digest ?? result.current_outcome_digest ?? null,
        stored_artifact_digests: result.stored_artifact_digests ?? [],
        facts: result.facts ?? result.recalled_facts ?? [], citations: result.citations ?? [],
        source_identities: result.source_identities ?? [], mismatches, stale_reasons: staleReasons,
        current_outcome_digest: result.current_outcome_digest ?? null,
      });
    },
  };
}
