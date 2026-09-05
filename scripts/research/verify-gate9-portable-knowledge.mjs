#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRepoGraphAdapter} from '../agent-system/adapters/repo-graph.mjs';
import {
  validateKnowledgeContext,
  validateKnowledgeRecall,
  validateKnowledgeReceipt,
} from '../agent-system/adapters/port.mjs';
import {canonicalJson, digestObject, readJson, sha256, writeJsonAtomic} from '../agent-system/core.mjs';
import {validateOutcomePacket} from '../agent-system/outcome.mjs';

export const GATE9_REQUIRED_SOURCE_PATHS = Object.freeze([
  'docs/release/2026-08-27-p034-legacy-assessment-quarantine.md',
  'src/core/legacyMoneyMigration.ts',
  'src/core/authority/browserAuthority.ts',
  'src/state/AppStateContext.tsx',
  'tests/candidate-batch3-money-migration.test.ts',
  'tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts',
]);

function git(root, args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
}

function exactIdentity(root) {
  return {
    root,
    branch: git(root, ['branch', '--show-current']),
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
    git_status: git(root, ['status', '--porcelain=v1']).split('\n').filter(Boolean),
  };
}

function assertDigest(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(String(value ?? ''))) throw new Error(`${label} must be lowercase SHA-256.`);
}

async function validatePacket(packet, packetPath, identity) {
  if (path.resolve(packet.root ?? '') !== identity.root) throw new Error('Repo Graph packet has wrong root.');
  if (packet.branch !== identity.branch) throw new Error('Repo Graph packet has wrong branch.');
  if (packet.commit !== identity.commit) throw new Error('Repo Graph packet has wrong commit.');
  if (packet.tree !== identity.tree) throw new Error('Repo Graph packet has wrong tree.');
  if (packet.dirty !== false || (packet.dirty_paths ?? []).length) throw new Error('Repo Graph packet is dirty.');
  if ((packet.stale_reasons ?? []).length) throw new Error('Repo Graph packet is stale.');
  if ((packet.fallback_status ?? 'none') !== 'none') throw new Error('Repo Graph packet uses fallback.');
  assertDigest(packet.packet_digest, 'Repo Graph packet digest');
  const unsigned = Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest'));
  if (digestObject(unsigned) !== packet.packet_digest) throw new Error('Repo Graph packet digest mismatch.');
  const citations = Array.isArray(packet.citations) ? packet.citations : [];
  for (const requiredPath of GATE9_REQUIRED_SOURCE_PATHS) {
    const citation = citations.find(entry => entry?.path === requiredPath);
    if (!citation) throw new Error(`Repo Graph packet lacks Gate9 citation: ${requiredPath}`);
    assertDigest(citation.sha256, `Citation hash for ${requiredPath}`);
    const actual = sha256(await readFile(path.join(identity.root, requiredPath)));
    if (citation.sha256 !== actual) throw new Error(`Repo Graph citation hash mismatch: ${requiredPath}`);
  }
  if (!Array.isArray(packet.facts) || packet.facts.length === 0) throw new Error('Repo Graph packet lacks facts.');
  return sha256(await readFile(packetPath));
}

async function validateOutcome(outcome, identity) {
  const validation = validateOutcomePacket(outcome);
  if (!validation.valid) throw new Error(`OutcomePacketV1 rejected: ${validation.issues.join('; ')}`);
  if (path.resolve(outcome.root) !== identity.root || outcome.branch !== identity.branch
    || outcome.ending_head !== identity.commit || outcome.ending_tree !== identity.tree
    || outcome.git_status.length !== 0) throw new Error('OutcomePacketV1 is not bound to the exact clean candidate.');
  assertDigest(outcome.packet_digest, 'Outcome packet digest');
  for (const evidence of outcome.evidence_index) {
    const evidencePath = path.resolve(identity.root, evidence.path);
    if (evidencePath !== identity.root && !evidencePath.startsWith(`${identity.root}${path.sep}`)) throw new Error('Outcome evidence path escapes exact root.');
    assertDigest(evidence.sha256, `Outcome evidence hash for ${evidence.path}`);
    if (sha256(await readFile(evidencePath)) !== evidence.sha256) throw new Error(`Outcome evidence hash mismatch: ${evidence.path}`);
  }
}

export async function verifyGate9PortableKnowledge({root, outcomePath, packetPath, outputPath}) {
  const exactRoot = path.resolve(root);
  const exactOutput = path.resolve(outputPath);
  if (path.resolve(packetPath) === exactOutput || path.resolve(outcomePath) === exactOutput) throw new Error('Evidence output must be distinct from inputs.');
  execFileSync('git', ['check-ignore', '-q', '--', exactOutput], {cwd: exactRoot});
  const identity = exactIdentity(exactRoot);
  if (identity.git_status.length) throw new Error('Exact candidate must be clean before portable knowledge verification.');
  const outcome = await readJson(path.resolve(outcomePath));
  const packet = await readJson(path.resolve(packetPath));
  await validateOutcome(outcome, identity);
  const packetFileSha256 = await validatePacket(packet, path.resolve(packetPath), identity);
  const recordsRoot = await mkdtemp(path.join(os.tmpdir(), 'chopdot-gate9-repo-graph-'));
  try {
    const adapter = createRepoGraphAdapter({root: exactRoot, packetPath: path.resolve(packetPath), recordsRoot});
    const health = await adapter.health();
    validateKnowledgeReceipt(health, 'health');
    if (!health.accepted || health.fallback_status !== 'none') throw new Error('Repo Graph health was not exact and accepted.');
    const scope = {root: exactRoot, branch: identity.branch, commit: identity.commit};
    const context = await adapter.read_context(scope, 'What exact evidence proves the accepted Gate9 legacy assessment outcome?', 'exact-source-cited');
    validateKnowledgeContext(context);
    if (context.stale_reasons.length || context.fallback_status !== 'none' || context.freshness.status !== 'fresh') throw new Error('Repo Graph context is stale or degraded.');
    const record = await adapter.record_outcome(outcome);
    validateKnowledgeReceipt(record, 'record_outcome');
    if (!record.accepted || record.stored_packet_digest !== outcome.packet_digest) throw new Error('Repo Graph rejected the exact outcome.');
    const recall = await adapter.verify_recall(scope, outcome.packet_digest);
    validateKnowledgeRecall(recall, scope, outcome.packet_digest);
    const evidence = {
      evidence_version: '1.0.0', kind: 'gate9-portable-knowledge-verification',
      candidate_identity: identity, outcome_packet_digest: outcome.packet_digest,
      repo_graph_packet_digest: packet.packet_digest, repo_graph_packet_file_sha256: packetFileSha256,
      required_source_paths: [...GATE9_REQUIRED_SOURCE_PATHS],
      health_receipt: health, context, record_receipt: record, recall_receipt: recall,
      accepted: true,
    };
    await writeJsonAtomic(exactOutput, evidence);
    return evidence;
  } finally {
    await rm(recordsRoot, {recursive: true, force: true});
  }
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const [key, inline] = argv[index].replace(/^--/u, '').split('=', 2);
    values[key.replace(/-/gu, '_')] = inline ?? argv[++index];
  }
  return values;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  for (const key of ['root', 'outcome', 'packet', 'output']) if (!options[key]) throw new Error(`Missing --${key}`);
  const result = await verifyGate9PortableKnowledge({root: options.root, outcomePath: options.outcome, packetPath: options.packet, outputPath: options.output});
  process.stdout.write(`${canonicalJson(result)}\n`);
}
