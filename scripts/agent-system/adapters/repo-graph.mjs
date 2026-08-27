import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { digestObject, makeId, nowIso, readJson, sha256, writeJsonAtomic } from '../core.mjs';
import { normalizeKnowledgeScope, receiptBase } from './port.mjs';
import { validateOutcomePacket } from '../outcome.mjs';

export function createRepoGraphAdapter(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const packetPath = options.packetPath ? path.resolve(options.packetPath) : path.join(root, '.local-private', 'agentops', 'repo-graph-packet.json');
  const recordsRoot = path.resolve(options.recordsRoot ?? path.join(root, 'output', 'agent-runs', 'repo-graph-outcomes'));
  async function packet() { return readJson(packetPath); }
  const metadata = {
    backend: 'repo-graph', backend_version: '1.0.0', runtime: 'packet-adapter',
    capabilities: ['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report'],
    requested_read_path: packetPath, active_read_path: packetPath, fallback_status: 'none',
  };
  return {
    async health() {
      try { await packet(); return receiptBase('health', metadata); }
      catch (error) { return receiptBase('health', { ...metadata, accepted: false, rejected_reasons: [`packet_unavailable:${error.code ?? 'error'}`], fallback_status: 'unknown' }); }
    },
    async read_context(scopeInput = {}, question = '', authorityPolicy = 'exact-root-packet') {
      const scope = normalizeKnowledgeScope(scopeInput);
      const value = await packet();
      const packetRoot = value.root ?? value.worktree_root ?? null;
      const packetBranch = value.branch ?? null;
      const packetCommit = value.commit ?? value.head ?? null;
      const staleReasons = [];
      if (packetRoot && path.resolve(packetRoot) !== path.resolve(scope.root)) staleReasons.push('wrong_root');
      if (packetBranch && packetBranch !== scope.branch) staleReasons.push('wrong_branch');
      if (packetCommit && packetCommit !== scope.commit) staleReasons.push('stale_commit');
      for (const reason of value.stale_reasons ?? []) if (!staleReasons.includes(reason)) staleReasons.push(reason);
      const packetRelativePath = path.relative(root, packetPath);
      if (packetRelativePath.startsWith('..') || path.isAbsolute(packetRelativePath)) staleReasons.push('packet_cross_root');
      const packetBytes = await readFile(packetPath);
      const source = { source_identity_id: 'source_repo_graph_1', root: packetRoot ?? root, branch: packetBranch ?? scope.branch, commit: packetCommit ?? scope.commit, path: packetPath, sha256: sha256(packetBytes) };
      const citation = { citation_id: 'citation_repo_graph_1', source_identity_id: source.source_identity_id, path: packetPath, sha256: source.sha256 };
      const sourceIdentities = [source];
      const citations = [citation];
      const sourceCitationIds = new Map();
      for (const [index, declared] of (value.sources ?? []).entries()) {
        const declaredPath = typeof declared === 'string' ? declared : declared?.path;
        const declaredHash = typeof declared === 'object' ? declared?.sha256 : null;
        if (!declaredPath || !/^[0-9a-f]{64}$/.test(declaredHash ?? '')) {
          staleReasons.push(`source_invalid:${declaredPath ?? index}`);
          continue;
        }
        const absolutePath = path.resolve(root, declaredPath);
        const relativePath = path.relative(root, absolutePath);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
          staleReasons.push(`source_cross_root:${declaredPath}`);
          continue;
        }
        let actualHash;
        try { actualHash = sha256(await readFile(absolutePath)); }
        catch (error) {
          staleReasons.push(`source_missing:${declaredPath}`);
          continue;
        }
        if (actualHash !== declaredHash) {
          staleReasons.push(`source_hash_mismatch:${declaredPath}`);
          continue;
        }
        const ordinal = sourceIdentities.length + 1;
        const sourceIdentity = {
          source_identity_id: `source_repo_graph_${ordinal}`,
          root: scope.root, branch: scope.branch, commit: scope.commit,
          path: absolutePath, sha256: actualHash,
        };
        const sourceCitation = {
          citation_id: `citation_repo_graph_${ordinal}`,
          source_identity_id: sourceIdentity.source_identity_id,
          path: absolutePath, sha256: actualHash,
        };
        sourceIdentities.push(sourceIdentity);
        citations.push(sourceCitation);
        sourceCitationIds.set(declaredPath, sourceCitation.citation_id);
        sourceCitationIds.set(absolutePath, sourceCitation.citation_id);
        sourceCitationIds.set(relativePath, sourceCitation.citation_id);
      }
      const rawFacts = value.facts ?? [];
      const facts = rawFacts.map((entry, index) => {
        const declaredSources = typeof entry === 'object' && entry !== null
          ? [entry.source_path, ...(entry.source_paths ?? []), ...(entry.sources ?? []), ...(entry.citation_paths ?? [])].filter(Boolean)
          : [];
        const citationIds = [...new Set(declaredSources.map((item) => sourceCitationIds.get(typeof item === 'string' ? item : item.path)).filter(Boolean))];
        if (declaredSources.length && citationIds.length !== declaredSources.length) staleReasons.push(`fact_source_unverified:${index + 1}`);
        return {
          fact_id: `fact_repo_graph_${index + 1}`,
          statement: typeof entry === 'string' ? entry : entry.statement ?? entry.fact ?? JSON.stringify(entry),
          citation_ids: citationIds.length ? citationIds : ['citation_repo_graph_1'],
          confidence: entry.confidence ?? (staleReasons.length ? 0 : 1),
        };
      });
      const uniqueStaleReasons = [...new Set(staleReasons)];
      const observedAt = nowIso();
      return {
        context_version: '1.0.0', request_id: makeId('knowledge_request'), scope, question,
        authority_policy: typeof authorityPolicy === 'string' ? authorityPolicy : 'exact-root-packet',
        ...metadata, facts, citations, source_identities: sourceIdentities,
        freshness: { observed_at: value.generated_at ?? observedAt, max_age_seconds: value.max_age_seconds ?? 86_400, age_seconds: value.age_seconds ?? 0, status: uniqueStaleReasons.length ? 'stale' : 'fresh' },
        confidence: uniqueStaleReasons.length ? 0 : 1, stale_reasons: uniqueStaleReasons,
        current_outcome_digest: value.current_outcome_digest ?? value.outcome_digest ?? null, observed_at: observedAt,
      };
    },
    async record_outcome(outcomePacket) {
      const validation = validateOutcomePacket(outcomePacket);
      if (!validation.valid) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: validation.issues.map((entry) => `invalid_outcome:${entry}`) });
      const digest = outcomePacket?.packet_digest;
      const computed = digestObject(Object.fromEntries(Object.entries(outcomePacket ?? {}).filter(([key]) => key !== 'packet_digest')));
      if (!digest || computed !== digest) return receiptBase('record_outcome', { ...metadata, accepted: false, rejected_reasons: ['packet_digest_mismatch'] });
      await mkdir(recordsRoot, { recursive: true });
      const id = `repo_graph_record_${outcomePacket.run_id}_${digest.slice(0, 12)}`;
      await writeJsonAtomic(path.join(recordsRoot, `${id}.json`), outcomePacket);
      return receiptBase('record_outcome', { ...metadata, active_read_path: recordsRoot, durable_record_id: id, stored_packet_digest: digest, stored_artifact_digests: (outcomePacket.artifacts ?? []).map((entry) => entry.sha256).filter(Boolean), current_outcome_digest: digest });
    },
    async verify_recall(scopeInput, expectedDigest) {
      const scope = normalizeKnowledgeScope(scopeInput);
      let match = null;
      try {
        for (const name of await readdir(recordsRoot)) {
          const record = await readJson(path.join(recordsRoot, name));
          if (record.packet_digest === expectedDigest) { match = { name, record }; break; }
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const mismatches = [];
      if (!match) mismatches.push('outcome_not_recalled');
      if (path.resolve(scope.root) !== root) mismatches.push('wrong_root');
      if (match && (path.resolve(match.record.root) !== root || match.record.branch !== scope.branch || match.record.ending_head !== scope.commit)) mismatches.push('record_candidate_mismatch');
      const recordPath = match ? path.join(recordsRoot, match.name) : null;
      const hash = recordPath ? sha256(await readFile(recordPath)) : null;
      return receiptBase('verify_recall', {
        ...metadata, active_read_path: recordsRoot, accepted: mismatches.length === 0,
        rejected_reasons: mismatches.length ? ['recall_mismatch'] : [],
        durable_record_id: match ? match.name.replace(/\.json$/u, '') : null,
        stored_packet_digest: match?.record.packet_digest ?? null,
        stored_artifact_digests: (match?.record.artifacts ?? []).map((entry) => entry.sha256).filter(Boolean),
        facts: match ? [{ fact_id: 'fact_repo_recall_1', statement: `Outcome ${expectedDigest} recalled`, citation_ids: ['citation_repo_recall_1'] }] : [],
        citations: match ? [{ citation_id: 'citation_repo_recall_1', source_identity_id: 'source_repo_recall_1', path: recordPath, sha256: hash }] : [],
        source_identities: match ? [{ source_identity_id: 'source_repo_recall_1', root, branch: scope.branch, commit: scope.commit, path: recordPath, sha256: hash }] : [],
        mismatches, current_outcome_digest: match?.record.packet_digest ?? null,
      });
    },
  };
}
