import { spawnSync } from 'node:child_process';
import { lstat, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeId, nowIso, readJson, sha256 } from '../core.mjs';
import { digestContract } from '../contract.mjs';
import { validateOutcomePacket } from '../outcome.mjs';
import { verifyRunnerProvenance } from '../provenance.mjs';
import { validateAgentContract } from '../validate.mjs';
import { hashArtifact } from '../artifacts.mjs';
import { normalizeKnowledgeScope, receiptBase } from './port.mjs';

const DEFAULT_AUTOBOTS_SOURCE = '/Users/devinsonpena/Documents/AutoBots';
const DEFAULT_AUTOBOTS_COMMIT = '15577d8e15ec98e14dc7f20ce1525ceb68d8ed75';
const DEFAULT_PYTHON = '/Users/devinsonpena/Documents/AutoBots/proofmap/.venv/bin/python';
const CAPABILITIES = Object.freeze(['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report']);

// This bridge executes only a clean snapshot of the pinned AutoBots commit. It
// deliberately returns provider data rather than product or release authority.
const PYTHON_BRIDGE = String.raw`
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

payload = json.load(sys.stdin)
runtime_root = Path(payload["runtime_root"]).resolve()
sys.path.insert(0, str(runtime_root))

from agentops.context_graph_v2.authority import PostgresAuthority
from agentops.context_graph_v2.contracts import ContextRequest
from agentops.context_graph_v2.journal import EdgeJournal
from agentops.context_graph_v2.retrieval import ContextCompiler
from agentops.context_graph_v2.verification import SourceVerifier

def git(root, *args):
    result = subprocess.run(
        ["/usr/bin/git", "-C", str(root), *args],
        text=True, capture_output=True, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git identity unavailable")
    return result.stdout.strip()

def exact_identity(scope):
    root = Path(scope["root"]).resolve()
    if git(root, "rev-parse", "--show-toplevel") != str(root):
        raise RuntimeError("scope root is not the exact git worktree root")
    if git(root, "branch", "--show-current") != scope["branch"]:
        raise RuntimeError("scope branch differs from the worktree")
    if git(root, "rev-parse", "HEAD") != scope["commit"]:
        raise RuntimeError("scope commit differs from the worktree")
    return root

def fact_record(authority, verifier, scope, row):
    lineage = authority.source_lineage(row["fact_version_id"])
    if not lineage:
        return None
    verification = verifier.verify(
        repo=payload["repo_id"],
        source_ref=row["source_ref"],
        expected_hash=row.get("source_hash"),
        branch=scope["branch"],
        commit=scope["commit"],
    )
    if not verification.verified:
        return None
    if str(Path(row["source_ref"]).resolve()) != verification.source_ref:
        return None
    if lineage.get("commit_sha") != scope["commit"]:
        return None
    return {
        "fact_version_id": row["fact_version_id"],
        "predicate": row["predicate"],
        "object_value": row["object_value"],
        "confidence": float(row.get("confidence", 0)),
        "source_ref": verification.source_ref,
        "source_hash": verification.actual_hash,
        "event_commit": lineage.get("commit_sha"),
        "event_id": lineage.get("event_id"),
    }

operation = payload["operation"]
dsn = os.environ.get("AGENTOPS_CG2_DSN", "postgresql://agentops:agentops-local@localhost:55432/agentops")
authority = PostgresAuthority(dsn)

if operation == "health":
    health = authority.health()
    print(json.dumps({"accepted": health.get("status") == "ok", "health": health}, default=str))
    raise SystemExit(0)

scope = payload["scope"]
root = exact_identity(scope)
repo_id = payload["repo_id"]
verifier = SourceVerifier({repo_id: root})

if operation == "read_context":
    compiler = ContextCompiler(authority=authority, verifier=verifier)
    packet = compiler.compile(ContextRequest(
        intent=payload["question"], repo=repo_id, branch=scope["branch"],
        task_family="portable_knowledge_context", lane="knowledge-context-port",
        risk="high", requested_action="read", consistency_class="authoritative_current",
    ))
    rows = []
    for item in packet.get("facts", []):
        lineage = authority.source_lineage(item["fact_version_id"])
        if not lineage:
            continue
        record = fact_record(authority, verifier, scope, lineage)
        if record:
            rows.append(record)
    print(json.dumps({
        "accepted": packet.get("status") == "ok" and bool(rows),
        "facts": rows,
        "packet_digest": packet.get("packet_digest"),
        "degradation": packet.get("degradation", []),
        "observed_at": packet.get("compiled_at"),
    }, default=str))
    raise SystemExit(0)

if operation == "record_outcome":
    packet = payload["outcome_packet"]
    anchor = payload["anchor"]
    digest = packet["packet_digest"]
    fact_id = "fact:portable-outcome:" + digest
    expected_object = {
        "outcome_digest": digest,
        "root": scope["root"],
        "branch": scope["branch"],
        "commit": scope["commit"],
        "artifact_digests": payload["artifact_digests"],
        "terminal_state": packet["terminal_state"],
    }
    authority.bootstrap()
    existing = authority.source_lineage(fact_id)
    if existing:
        record = fact_record(authority, verifier, scope, existing)
        accepted = bool(record) and existing.get("object_value") == expected_object
        print(json.dumps({
            "accepted": accepted,
            "duplicate": True,
            "record": record,
            "rejected_reasons": [] if accepted else ["durable_fact_collision_or_scope_mismatch"],
        }, default=str))
        raise SystemExit(0)
    event_id = "knowledge-outcome-" + digest
    writer_id = "portable-outcome-" + digest
    with tempfile.TemporaryDirectory(prefix="chopdot-kgv2-journal-") as temporary:
        with EdgeJournal(Path(temporary) / "writer.sqlite3", writer_id) as journal:
            event = journal.create_and_append(
                event_type="fact.observed", event_id=event_id,
                repo=repo_id, worktree=scope["root"], branch=scope["branch"],
                commit=scope["commit"], source_ref=anchor["path"],
                source_hash=anchor["sha256"], trust_zone="repo_local",
                payload={
                    "fact_version_id": fact_id,
                    "subject_urn": "urn:chopdot:portable-outcome:" + digest,
                    "predicate": "accepted_outcome",
                    "object": expected_object,
                    "authority": "accepted_outcome_packet",
                    "confidence": 1.0,
                    "memory_state": "current",
                    "verification_status": "verified",
                },
            )
            sync = journal.sync(authority)
    record = fact_record(authority, verifier, scope, authority.source_lineage(fact_id) or {})
    accepted = bool(record) and (sync.get("accepted", 0) + sync.get("duplicates", 0) == 1)
    print(json.dumps({
        "accepted": accepted,
        "duplicate": False,
        "record": record,
        "rejected_reasons": [] if accepted else ["authority_did_not_accept_exact_outcome"],
    }, default=str))
    raise SystemExit(0)

if operation == "verify_recall":
    expected = payload["expected_digest"]
    matches = []
    for row in authority.query_facts(repo=repo_id, branch=scope["branch"], query="", limit=1000):
        value = row.get("object_value")
        if row.get("predicate") != "accepted_outcome" or not isinstance(value, dict):
            continue
        if value.get("outcome_digest") != expected:
            continue
        record = fact_record(authority, verifier, scope, row)
        if record:
            matches.append(record)
    print(json.dumps({"accepted": len(matches) == 1, "facts": matches}, default=str))
    raise SystemExit(0)

raise RuntimeError("unsupported operation")
`;

function git(args, cwd) {
  const result = spawnSync('/usr/bin/git', args, { cwd, encoding: 'utf8', shell: false });
  if (result.error) throw new Error(`git_spawn_failed:${result.error.code ?? result.error.message}`);
  if (result.status !== 0) throw new Error((result.stderr ?? result.stdout ?? '').trim() || `git ${args.join(' ')} failed`);
  return (result.stdout ?? '').trim();
}

function committedBlob(root, commit, relativePath) {
  if (!/^[0-9a-f]{40}$/u.test(commit ?? '')) throw new Error('anchor_commit_invalid');
  const result = spawnSync('/usr/bin/git', ['ls-tree', '-z', '--full-tree', commit, '--', relativePath], {
    cwd: root, encoding: null, shell: false,
  });
  if (result.error) throw new Error(`git_spawn_failed:${result.error.code ?? result.error.message}`);
  if (result.status !== 0) throw new Error((result.stderr ?? result.stdout ?? Buffer.alloc(0)).toString('utf8').trim() || 'anchor_tree_lookup_failed');
  const records = result.stdout.toString('utf8').split('\0').filter(Boolean);
  if (records.length !== 1) throw new Error('anchor_not_tracked_at_commit');
  const match = /^(\d{6}) (\S+) ([0-9a-f]{40})\t(.+)$/u.exec(records[0]);
  if (!match || match[2] !== 'blob' || match[1] === '120000' || match[4] !== relativePath) throw new Error('anchor_not_regular_committed_blob');
  const blob = spawnSync('/usr/bin/git', ['cat-file', 'blob', match[3]], { cwd: root, encoding: null, shell: false });
  if (blob.error) throw new Error(`git_spawn_failed:${blob.error.code ?? blob.error.message}`);
  if (blob.status !== 0) throw new Error((blob.stderr ?? blob.stdout ?? Buffer.alloc(0)).toString('utf8').trim() || 'anchor_blob_read_failed');
  return blob.stdout;
}

function defaultCandidateInspector(scopeInput, { requireClean = false } = {}) {
  const scope = normalizeKnowledgeScope(scopeInput);
  const exactRoot = path.resolve(scope.root);
  if (path.resolve(git(['rev-parse', '--show-toplevel'], exactRoot)) !== exactRoot) throw new Error('scope_root_mismatch');
  if (git(['branch', '--show-current'], exactRoot) !== scope.branch) throw new Error('scope_branch_mismatch');
  if (git(['rev-parse', 'HEAD'], exactRoot) !== scope.commit) throw new Error('scope_commit_mismatch');
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'], exactRoot);
  if (requireClean && status) throw new Error('scope_worktree_dirty');
  return { ...scope, status: status ? status.split('\n') : [] };
}

function safeReason(error) {
  const value = String(error?.message ?? error)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s]+@/giu, '$1[redacted]@')
    .replace(/\b(password|token|secret)=([^\s&;]+)/giu, '$1=[redacted]')
    .replace(/[\r\n]+/gu, ' ').trim();
  return value.slice(0, 300) || 'unknown_runtime_failure';
}

function sourceKey(value) { return sha256(value).slice(0, 24); }

function mapFacts(rawFacts, scope) {
  const facts = [];
  const citations = [];
  const sourceIdentities = [];
  const seenSources = new Set();
  for (const item of rawFacts ?? []) {
    const sourcePath = path.resolve(String(item.source_ref ?? ''));
    const sourceHash = String(item.source_hash ?? '');
    if (!sourcePath.startsWith(`${scope.root}${path.sep}`) || !/^[0-9a-f]{64}$/u.test(sourceHash) || item.event_commit !== scope.commit) continue;
    const key = sourceKey(`${sourcePath}:${sourceHash}:${scope.commit}`);
    const sourceIdentityId = `source_${key}`;
    const citationId = `citation_${sourceKey(`${item.fact_version_id}:${key}`)}`;
    const factId = `fact_${sourceKey(String(item.fact_version_id))}`;
    if (!seenSources.has(sourceIdentityId)) {
      sourceIdentities.push({ source_identity_id: sourceIdentityId, root: scope.root, branch: scope.branch, commit: scope.commit, path: sourcePath, sha256: sourceHash });
      seenSources.add(sourceIdentityId);
    }
    citations.push({ citation_id: citationId, source_identity_id: sourceIdentityId, path: sourcePath, sha256: sourceHash });
    facts.push({ fact_id: factId, statement: `${item.predicate}: ${JSON.stringify(item.object_value)}`, citation_ids: [citationId], confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0))) });
  }
  return { facts, citations, sourceIdentities };
}

function receiptFacts(facts) {
  return facts.map(({ fact_id, statement, citation_ids }) => ({ fact_id, statement, citation_ids }));
}

async function findAnchor(packet) {
  const root = await realpath(path.resolve(packet.root));
  const candidates = [...(packet.evidence_index ?? []), ...(packet.evaluation_index ?? []), ...(packet.artifacts ?? [])];
  for (const entry of candidates) {
    if (!entry?.path || !/^[0-9a-f]{64}$/u.test(entry.sha256 ?? '')) continue;
    const candidate = path.resolve(root, entry.path);
    if (!candidate.startsWith(`${root}${path.sep}`)) continue;
    try {
      const info = await lstat(candidate);
      if (info.isSymbolicLink() || !info.isFile()) continue;
      const resolved = await realpath(candidate);
      if (!resolved.startsWith(`${root}${path.sep}`)) continue;
      const hashed = await hashArtifact(root, resolved);
      if (hashed.aggregate_sha256 !== entry.sha256 || hashed.manifest.length !== 1) continue;
      const relative = path.relative(root, resolved).split(path.sep).join('/');
      const blob = committedBlob(root, packet.ending_head, relative);
      if (sha256(blob) !== hashed.manifest[0].sha256) continue;
      return { path: resolved, sha256: hashed.manifest[0].sha256, artifact_sha256: entry.sha256, commit: packet.ending_head };
    } catch { /* try the next declared evidence artifact */ }
  }
  throw new Error('no_exact_root_hash_verified_outcome_anchor');
}

async function exactProofPath(root, value, label, kind) {
  if (!value) throw new Error(`${label}_required`);
  const exactRoot = await realpath(path.resolve(root));
  const candidate = path.resolve(root, value);
  const info = await lstat(candidate);
  if (info.isSymbolicLink()) throw new Error(`${label}_symlink_rejected`);
  const resolved = await realpath(candidate);
  if (resolved !== exactRoot && !resolved.startsWith(`${exactRoot}${path.sep}`)) throw new Error(`${label}_realpath_cross_root`);
  if (kind === 'file' ? !info.isFile() : !info.isDirectory()) throw new Error(`${label}_wrong_kind`);
  return resolved;
}

async function verifyOutcomeProof(packet, proof = {}) {
  const contractPath = await exactProofPath(packet.root, proof.contract_path, 'outcome_contract', 'file');
  const provenancePath = await exactProofPath(packet.root, proof.runner_provenance_path, 'runner_provenance', 'file');
  const runDirectory = await exactProofPath(packet.root, proof.run_directory, 'runner_run_directory', 'directory');
  const contract = await readJson(contractPath);
  const contractValidation = validateAgentContract(contract, { expectedRoot: packet.root });
  if (!contractValidation.valid) throw new Error(`outcome_contract_invalid:${contractValidation.issues.map((entry) => `${entry.path}:${entry.message}`).join('|')}`);
  if (digestContract(contract) !== packet.contract_digest) throw new Error('outcome_contract_digest_mismatch');
  const provenance = await readJson(provenancePath);
  let verification;
  try { verification = await verifyRunnerProvenance(runDirectory, contract, provenance, packet); }
  catch (error) { throw new Error(`runner_provenance_unverified:${safeReason(error)}`); }
  if (!verification.valid) throw new Error(`runner_provenance_unverified:${verification.issues.join('|')}`);
  return { contract_path: contractPath, runner_provenance_path: provenancePath, run_directory: runDirectory };
}

async function invokePinnedPython(operation, payload, options) {
  const source = path.resolve(options.autobotsSource);
  git(['cat-file', '-e', `${options.autobotsCommit}^{commit}`], source);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'chopdot-kgv2-runtime-'));
  const snapshot = path.join(temporary, 'AutoBots');
  try {
    let result = spawnSync('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', 'clone', '--quiet', '--no-hardlinks', '--no-checkout', source, snapshot], { encoding: 'utf8', shell: false, timeout: options.timeoutMs });
    if (result.error) throw new Error(`pinned_runtime_clone_failed:${result.error.code ?? result.error.message}`);
    if (result.status !== 0) throw new Error((result.stderr ?? result.stdout ?? '').trim() || 'pinned_runtime_clone_failed');
    result = spawnSync('/usr/bin/git', ['-C', snapshot, '-c', 'core.hooksPath=/dev/null', 'checkout', '--quiet', '--detach', options.autobotsCommit], { encoding: 'utf8', shell: false, timeout: options.timeoutMs });
    if (result.error) throw new Error(`pinned_runtime_checkout_failed:${result.error.code ?? result.error.message}`);
    if (result.status !== 0) throw new Error((result.stderr ?? result.stdout ?? '').trim() || 'pinned_runtime_checkout_failed');
    if (git(['status', '--porcelain=v1', '--untracked-files=all'], snapshot)) throw new Error('pinned_runtime_snapshot_dirty');
    const environment = {
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LANG: process.env.LANG ?? 'C.UTF-8',
      PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1', PYTHONSAFEPATH: '1',
      ...(process.env.AGENTOPS_CG2_DSN ? { AGENTOPS_CG2_DSN: process.env.AGENTOPS_CG2_DSN } : {}),
    };
    result = spawnSync(options.python, ['-B', '-I', '-c', PYTHON_BRIDGE], {
      cwd: payload.scope?.root ?? process.cwd(), input: JSON.stringify({ ...payload, operation, runtime_root: snapshot, repo_id: options.repoId }),
      encoding: 'utf8', shell: false, timeout: options.timeoutMs, maxBuffer: 4_000_000, env: environment,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error((result.stderr ?? result.stdout ?? '').trim() || `kgv2_python_exit_${result.status}`);
    return JSON.parse(result.stdout);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export function createAgentOpsKgv2Client(options = {}) {
  const settings = {
    autobotsSource: options.autobotsSource ?? process.env.CHOPDOT_KGV2_AUTOBOTS_SOURCE ?? DEFAULT_AUTOBOTS_SOURCE,
    autobotsCommit: options.autobotsCommit ?? process.env.CHOPDOT_KGV2_AUTOBOTS_COMMIT ?? DEFAULT_AUTOBOTS_COMMIT,
    python: options.python ?? process.env.CHOPDOT_KGV2_PYTHON ?? DEFAULT_PYTHON,
    repoId: options.repoId ?? process.env.CHOPDOT_KGV2_REPO_ID ?? 'chopdot-v1-launch',
    timeoutMs: options.timeoutMs ?? 30_000,
  };
  const requestedReadPath = `agentops://context-graph-v2/${settings.repoId}`;
  const metadata = {
    backend: 'kgv2', backend_version: `2@${settings.autobotsCommit.slice(0, 12)}`,
    runtime: `python-isolated:${settings.python}@git:${settings.autobotsCommit}`,
    capabilities: [...CAPABILITIES], requested_read_path: requestedReadPath,
    active_read_path: requestedReadPath, fallback_status: 'none',
  };
  const inspectCandidate = options.candidateInspector ?? defaultCandidateInspector;
  const proveOutcome = options.outcomeProofVerifier ?? verifyOutcomeProof;
  const invoke = options.invoke ?? ((operation, payload) => invokePinnedPython(operation, payload, settings));

  function rejected(operation, reason, extra = {}) {
    return receiptBase(operation, { ...metadata, ...extra, accepted: false, rejected_reasons: [reason], fallback_status: extra.fallback_status ?? 'unavailable' });
  }

  return {
    async health() {
      try {
        const result = await invoke('health', {});
        return receiptBase('health', { ...metadata, accepted: result.accepted === true, rejected_reasons: result.accepted === true ? [] : ['kgv2_authority_unhealthy'] });
      } catch (error) { return rejected('health', safeReason(error)); }
    },

    async read_context(scopeInput, question, authorityPolicy = 'exact-root-cited-sources') {
      let scope;
      const observedAt = typeof options.now === 'function' ? options.now() : nowIso();
      try {
        scope = normalizeKnowledgeScope(inspectCandidate(scopeInput, { requireClean: false }));
        if (typeof question !== 'string' || question.trim().length < 3) throw new Error('question_required');
        const result = await invoke('read_context', { scope, question });
        const mapped = mapFacts(result.facts, scope);
        const accepted = result.accepted === true && mapped.facts.length > 0;
        const staleReasons = accepted ? [] : [...new Set(['kgv2_no_exact_scope_cited_facts', ...(result.degradation ?? [])])];
        const outcomeDigests = (result.facts ?? []).map((entry) => entry.object_value?.outcome_digest).filter((entry) => /^[0-9a-f]{64}$/u.test(entry ?? ''));
        return {
          context_version: '1.0.0', request_id: makeId('knowledge_request'), scope,
          question, authority_policy: String(authorityPolicy), ...metadata,
          facts: mapped.facts, citations: mapped.citations, source_identities: mapped.sourceIdentities,
          freshness: { observed_at: result.observed_at ?? observedAt, max_age_seconds: 0, age_seconds: 0, status: accepted ? 'fresh' : 'stale' },
          confidence: accepted ? Math.min(...mapped.facts.map((entry) => entry.confidence)) : 0,
          stale_reasons: staleReasons, current_outcome_digest: outcomeDigests.length === 1 ? outcomeDigests[0] : null,
          observed_at: result.observed_at ?? observedAt,
        };
      } catch (error) {
        const fallbackScope = scope ?? normalizeKnowledgeScope(scopeInput);
        return {
          context_version: '1.0.0', request_id: makeId('knowledge_request'), scope: fallbackScope,
          question: typeof question === 'string' && question.length >= 3 ? question : 'Invalid knowledge question', authority_policy: String(authorityPolicy),
          ...metadata, fallback_status: 'unavailable', facts: [], citations: [], source_identities: [],
          freshness: { observed_at: observedAt, max_age_seconds: 0, age_seconds: 0, status: 'stale' }, confidence: 0,
          stale_reasons: [safeReason(error)], current_outcome_digest: null, observed_at: observedAt,
        };
      }
    },

    async record_outcome(packet, proof) {
      const validation = validateOutcomePacket(packet);
      if (!validation.valid) return rejected('record_outcome', `invalid_outcome:${validation.issues.join('|')}`, { fallback_status: 'none' });
      try {
        if (packet.git_status?.length) throw new Error('outcome_candidate_not_clean');
        const scope = normalizeKnowledgeScope(inspectCandidate({ root: packet.root, branch: packet.branch, commit: packet.ending_head }, { requireClean: true }));
        await proveOutcome(packet, proof);
        const anchor = await findAnchor(packet);
        const artifactDigests = [...new Set((packet.artifacts ?? []).map((entry) => entry.sha256).filter((entry) => /^[0-9a-f]{64}$/u.test(entry ?? '')))];
        const result = await invoke('record_outcome', { scope, outcome_packet: packet, anchor, artifact_digests: artifactDigests });
        if (result.accepted !== true || !result.record) return rejected('record_outcome', result.rejected_reasons?.[0] ?? 'kgv2_record_rejected', { fallback_status: 'none' });
        const mapped = mapFacts([result.record], scope);
        if (mapped.facts.length !== 1) return rejected('record_outcome', 'record_citation_scope_mismatch', { fallback_status: 'none' });
        return receiptBase('record_outcome', {
          ...metadata, accepted: true, durable_record_id: result.record.event_id,
          stored_packet_digest: packet.packet_digest, stored_artifact_digests: artifactDigests,
          facts: receiptFacts(mapped.facts), citations: mapped.citations, source_identities: mapped.sourceIdentities,
          current_outcome_digest: packet.packet_digest,
        });
      } catch (error) { return rejected('record_outcome', safeReason(error), { fallback_status: 'none' }); }
    },

    async verify_recall(scopeInput, expectedDigest) {
      if (!/^[0-9a-f]{64}$/u.test(expectedDigest ?? '')) return rejected('verify_recall', 'invalid_expected_outcome_digest', { fallback_status: 'none', mismatches: ['expected_digest_invalid'] });
      try {
        const scope = normalizeKnowledgeScope(inspectCandidate(scopeInput, { requireClean: false }));
        const result = await invoke('verify_recall', { scope, expected_digest: expectedDigest });
        const mapped = mapFacts(result.facts, scope);
        const raw = (result.facts ?? [])[0];
        const exact = result.accepted === true && mapped.facts.length === 1 && raw?.object_value?.outcome_digest === expectedDigest
          && raw.object_value?.root === scope.root && raw.object_value?.branch === scope.branch && raw.object_value?.commit === scope.commit;
        return receiptBase('verify_recall', {
          ...metadata, accepted: exact, rejected_reasons: exact ? [] : ['recall_mismatch'],
          durable_record_id: exact ? raw.event_id : null, stored_packet_digest: exact ? expectedDigest : null,
          stored_artifact_digests: exact ? (raw.object_value.artifact_digests ?? []) : [],
          facts: exact ? receiptFacts(mapped.facts) : [], citations: exact ? mapped.citations : [], source_identities: exact ? mapped.sourceIdentities : [],
          mismatches: exact ? [] : ['outcome_or_candidate_identity_mismatch'], stale_reasons: [],
          current_outcome_digest: exact ? expectedDigest : null,
        });
      } catch (error) { return rejected('verify_recall', safeReason(error), { fallback_status: 'none', mismatches: ['runtime_or_scope_unavailable'] }); }
    },
  };
}

export const client = createAgentOpsKgv2Client();
export default client;
