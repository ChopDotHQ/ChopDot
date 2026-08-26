import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { appendEvent, assertRunBudgetAvailable } from './ledger.mjs';
import { assertSafeChild, canonicalJson, digestObject, makeId, nowIso, sha256 } from './core.mjs';
import { scanForSensitiveContent } from './redact.mjs';
import { contractRoot } from './contract.mjs';
import { contractCreatorId } from './contract.mjs';
import { assertCurrentCandidate, persistedCandidateIdentity } from './candidate.mjs';
import { validateRuntimePacket } from './validate.mjs';

async function manifestEntry(root, absolute) {
  const info = await lstat(absolute);
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (info.isSymbolicLink()) throw new Error(`Artifact symlinks are not accepted: ${relative}`);
  if (info.isDirectory()) return null;
  if (!info.isFile()) throw new Error(`Unsupported artifact type: ${relative}`);
  const bytes = await readFile(absolute);
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}

async function walk(root, absolute, entries) {
  const info = await lstat(absolute);
  if (info.isDirectory()) {
    const names = await readdir(absolute);
    names.sort();
    for (const name of names) await walk(root, path.join(absolute, name), entries);
    return;
  }
  entries.push(await manifestEntry(root, absolute));
}

export async function hashArtifact(root, candidate) {
  const exactRoot = path.resolve(root);
  const absolute = assertSafeChild(exactRoot, path.resolve(exactRoot, candidate), 'artifact path');
  const entries = [];
  await walk(exactRoot, absolute, entries);
  const manifest = entries.filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));
  return {
    root: exactRoot,
    artifact_path: path.relative(exactRoot, absolute).split(path.sep).join('/'),
    manifest,
    aggregate_sha256: sha256(manifest.map((entry) => `${entry.path}\0${entry.sha256}`).join('\n')),
    manifest_digest: digestObject(manifest),
  };
}

export async function scanArtifact(root, candidate, options = {}) {
  const result = await hashArtifact(root, candidate);
  const findings = [];
  const maxBytes = options.maxTextBytes ?? 1_000_000;
  for (const entry of result.manifest) {
    if (entry.bytes > maxBytes) continue;
    const bytes = await readFile(path.join(result.root, entry.path));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    for (const finding of scanForSensitiveContent(text)) findings.push({ file: entry.path, ...finding });
  }
  return { ...result, sensitive_findings: findings, redaction_passed: findings.length === 0 };
}

export async function recordArtifact(runDirectory, contract, candidate, options = {}) {
  await assertRunBudgetAvailable(runDirectory, contract, { now: options.now });
  const identityBefore = assertCurrentCandidate(contract, { expected: options.candidateIdentity });
  const scan = await scanArtifact(contractRoot(contract), candidate, options);
  const identityAfter = assertCurrentCandidate(contract, { expected: options.candidateIdentity });
  if (identityBefore.candidate_digest !== identityAfter.candidate_digest) throw new Error('Candidate identity changed while artifact was hashed');
  if (options.requireRedacted !== false && !scan.redaction_passed) throw new Error(`Artifact redaction failed for ${candidate}`);
  const artifact = {
    artifact_version: '1.0.0',
    artifact_id: options.artifactId ?? makeId('artifact'),
    run_id: contract.run_id,
    artifact_type: options.artifactType ?? contract.artifact_contract.artifact_types[0],
    path: scan.artifact_path,
    media_type: scan.manifest.length === 1 ? options.mediaType ?? 'application/octet-stream' : 'application/vnd.chopdot.manifest+json',
    byte_length: scan.manifest.reduce((sum, entry) => sum + entry.bytes, 0),
    sha256: scan.aggregate_sha256,
    created_at: options.createdAt ?? nowIso(),
    created_by: options.actor ?? contractCreatorId(contract),
    candidate_identity: persistedCandidateIdentity(identityAfter),
    redaction_status: scan.redaction_passed ? 'passed' : 'rejected',
    source_artifact_ids: options.sourceArtifactIds ?? [],
  };
  const validation = validateRuntimePacket(artifact, 'artifact.v1.schema.json');
  if (!validation.valid) throw new Error(`Artifact schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'artifact_recorded',
    actor: options.actor ?? 'runner',
    payload: artifact,
  });
  return { artifact, manifest: scan.manifest, manifest_digest: scan.manifest_digest };
}
