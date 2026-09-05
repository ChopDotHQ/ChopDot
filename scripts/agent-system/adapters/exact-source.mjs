import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { digestObject, makeId, nowIso, readJson, sha256, writeJsonAtomic } from '../core.mjs';
import { normalizeKnowledgeScope, receiptBase } from './port.mjs';
import { validateOutcomePacket } from '../outcome.mjs';

function git(root, args, fallback) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return fallback; }
}

export function createExactSourceAdapter(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const recordsRoot = path.resolve(options.recordsRoot ?? path.join(root, 'output', 'agent-runs', 'knowledge-records'));
  const branch = options.branch ?? git(root, ['branch', '--show-current'], 'unknown');
  const commit = options.commit ?? git(root, ['rev-parse', 'HEAD'], '0'.repeat(40));
  const metadata = {
    backend: 'exact-source', backend_version: '1.0.0', runtime: 'node-esm',
    capabilities: ['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report'],
    requested_read_path: root, active_read_path: root, fallback_status: 'none',
  };
  return {
    async health() { return receiptBase('health', metadata); },
    async read_context(scopeInput = {}, question = '', authorityPolicy = 'exact-source-first') {
      const scope = normalizeKnowledgeScope(scopeInput);
      const sourcePaths = scopeInput.source_paths ?? ['PRODUCT_TRUTH.md'];
      const facts = [];
      const citations = [];
      const sourceIdentities = [];
      const staleReasons = [];
      if (path.resolve(scope.root) !== root) staleReasons.push('wrong_root');
      if (scope.branch !== branch) staleReasons.push('wrong_branch');
      if (scope.commit !== commit) staleReasons.push('stale_commit');
      for (const [index, source] of sourcePaths.entries()) {
        const absolute = path.resolve(root, source);
        if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) { staleReasons.push(`cross_root:${source}`); continue; }
        try {
          const bytes = await readFile(absolute);
          const sourceId = `source_exact_${index + 1}`;
          const citationId = `citation_exact_${index + 1}`;
          const hash = sha256(bytes);
          citations.push({ citation_id: citationId, source_identity_id: sourceId, path: source, sha256: hash });
          sourceIdentities.push({ source_identity_id: sourceId, root, branch, commit, path: source, sha256: hash });
          facts.push({ fact_id: `fact_exact_${index + 1}`, statement: `Exact source available for ${source}`, citation_ids: [citationId], confidence: 1 });
        } catch (error) { staleReasons.push(`${error.code ?? 'read_error'}:${source}`); }
      }
      const observedAt = nowIso();
      return {
        context_version: '1.0.0', request_id: makeId('knowledge_request'), scope, question,
        authority_policy: typeof authorityPolicy === 'string' ? authorityPolicy : 'exact-source-first',
        ...metadata, requested_read_path: sourcePaths.join(','), facts, citations, source_identities: sourceIdentities,
        freshness: { observed_at: observedAt, max_age_seconds: 0, age_seconds: 0, status: staleReasons.length ? 'stale' : 'fresh' },
        confidence: staleReasons.length ? 0 : 1, stale_reasons: staleReasons,
        current_outcome_digest: null, observed_at: observedAt,
      };
    },
    async record_outcome(outcomePacket) {
      const validation = validateOutcomePacket(outcomePacket);
      if (!validation.valid) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: validation.issues.map((entry) => `invalid_outcome:${entry}`) });
      const packetDigest = outcomePacket?.packet_digest;
      const computed = digestObject(Object.fromEntries(Object.entries(outcomePacket ?? {}).filter(([key]) => key !== 'packet_digest')));
      if (!packetDigest || computed !== packetDigest) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: ['packet_digest_mismatch'] });
      await mkdir(recordsRoot, { recursive: true });
      const recordId = `knowledge_record_${outcomePacket.run_id}_${packetDigest.slice(0, 12)}`;
      await writeJsonAtomic(path.join(recordsRoot, `${recordId}.json`), outcomePacket);
      return receiptBase('record_outcome', { ...metadata, active_read_path: recordsRoot, durable_record_id: recordId, stored_packet_digest: packetDigest, stored_artifact_digests: (outcomePacket.artifacts ?? []).map((entry) => entry.sha256).filter(Boolean), current_outcome_digest: packetDigest });
    },
    async verify_recall(scopeInput, expectedDigest) {
      const scope = normalizeKnowledgeScope(scopeInput);
      let match = null;
      try {
        for (const name of await readdir(recordsRoot)) {
          const record = await readJson(path.join(recordsRoot, name));
          if (record.packet_digest === expectedDigest) { match = { record, name }; break; }
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const mismatches = [];
      if (!match) mismatches.push('outcome_not_recalled');
      if (path.resolve(scope.root) !== root) mismatches.push('wrong_root');
      if (scope.branch !== branch) mismatches.push('wrong_branch');
      if (scope.commit !== commit) mismatches.push('stale_commit');
      if (match && (path.resolve(match.record.root) !== root || match.record.branch !== scope.branch || match.record.ending_head !== scope.commit)) mismatches.push('record_candidate_mismatch');
      const citation = match ? { citation_id: 'citation_recall_1', source_identity_id: 'source_recall_1', path: path.join(recordsRoot, match.name), sha256: sha256(await readFile(path.join(recordsRoot, match.name))) } : null;
      const sourceIdentity = citation ? { source_identity_id: 'source_recall_1', root, branch, commit, path: citation.path, sha256: citation.sha256 } : null;
      return receiptBase('verify_recall', {
        ...metadata, active_read_path: recordsRoot, accepted: mismatches.length === 0,
        rejected_reasons: mismatches.length ? ['recall_mismatch'] : [],
        durable_record_id: match ? match.name.replace(/\.json$/u, '') : null,
        stored_packet_digest: match?.record.packet_digest ?? null,
        stored_artifact_digests: (match?.record.artifacts ?? []).map((entry) => entry.sha256).filter(Boolean),
        facts: match ? [{ fact_id: 'fact_recall_1', statement: `Outcome ${expectedDigest} recalled`, citation_ids: ['citation_recall_1'] }] : [],
        citations: citation ? [citation] : [], source_identities: sourceIdentity ? [sourceIdentity] : [],
        mismatches, current_outcome_digest: match?.record.packet_digest ?? null,
      });
    },
  };
}
