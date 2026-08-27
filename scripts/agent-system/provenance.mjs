import path from 'node:path';
import { lstat, readFile } from 'node:fs/promises';
import { digestContract } from './contract.mjs';
import { digestObject, makeId, nowIso, sha256, writeJsonAtomic } from './core.mjs';
import { persistedCandidateIdentity } from './candidate.mjs';
import { rebuildSnapshot } from './ledger.mjs';
import { validateRuntimePacket } from './validate.mjs';
import { hashArtifact } from './artifacts.mjs';

const withoutDigest = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));

async function checkedJsonArtifact(artifact, root = null) {
  const artifactPath = path.isAbsolute(artifact.path) ? artifact.path : path.resolve(root, artifact.path);
  const bytes = await readFile(artifactPath);
  if (sha256(bytes) !== artifact.sha256) throw new Error(`Artifact ${artifact.artifact_id} content hash mismatch`);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

export async function generateRunnerProvenance(runDirectory, contract, options = {}) {
  const snapshot = options.snapshot ?? await rebuildSnapshot(runDirectory, contract.run_id);
  if (snapshot.terminal_state !== 'succeeded') throw new Error('Runner provenance requires a succeeded ledger');
  const evaluation = snapshot.evaluations.at(-1);
  if (!evaluation || evaluation.verdict !== 'accepted') throw new Error('Runner provenance requires an accepted evaluation');
  const evaluationArtifact = snapshot.artifacts.find((item) => item.artifact_type === 'EvaluationRecordV1' && item.path.endsWith(`${evaluation.evaluation_id}.evaluation.json`));
  const commandArtifact = snapshot.artifacts.find((item) => item.artifact_type === 'TestEvidencePacketV1' && item.path.endsWith(`${evaluation.evaluation_id}.commands.json`));
  if (!evaluationArtifact || !commandArtifact) throw new Error('Runner provenance requires recorded evaluation and command evidence artifacts');
  const evaluationFile = await checkedJsonArtifact(evaluationArtifact, contract.scope.root);
  const commandFile = await checkedJsonArtifact(commandArtifact, contract.scope.root);
  if (digestObject(evaluationFile.value) !== digestObject(evaluation)) throw new Error('Evaluation record differs from ledger evaluation');
  const commandResults = commandFile.value.command_results;
  if (!Array.isArray(commandResults)) throw new Error('Command evidence lacks command_results');
  const expectedChecks = contract.evaluator.deterministic_commands ?? [];
  if (commandResults.length !== expectedChecks.length || commandResults.some((result, index) => result.assertion_id !== expectedChecks[index].id)) throw new Error('Command evidence does not match the contract deterministic commands');
  if (commandResults.some((result) => result.passed !== true || result.exit_code !== result.expected_exit_code)) throw new Error('Command evidence contains an unpassed deterministic command');
  await Promise.all(snapshot.artifacts.map(async (artifact) => {
    if (artifact.artifact_id === evaluationArtifact.artifact_id || artifact.artifact_id === commandArtifact.artifact_id) return;
    const artifactPath = path.isAbsolute(artifact.path) ? artifact.path : path.resolve(contract.scope.root, artifact.path);
    const info = await lstat(artifactPath);
    if (!info.isFile() && !info.isDirectory()) throw new Error(`Artifact ${artifact.artifact_id} has unsupported content`);
    const hashed = await hashArtifact(contract.scope.root, artifact.path);
    if (hashed.aggregate_sha256 !== artifact.sha256) throw new Error(`Artifact ${artifact.artifact_id} content hash mismatch`);
  }));
  const candidate = persistedCandidateIdentity(evaluation.candidate_identity);
  const packet = {
    runner_provenance_version: '1.0.0', provenance_id: options.provenanceId ?? makeId('runner_provenance'), run_id: contract.run_id,
    contract_digest: digestContract(contract), candidate_identity: candidate, candidate_digest: evaluation.candidate_digest,
    ledger: { event_count: snapshot.sequence + 1, head_digest: snapshot.head_digest, snapshot_digest: digestObject(snapshot) },
    evaluation: { evaluation_id: evaluation.evaluation_id, evaluation_digest: digestObject(evaluation), record_artifact_id: evaluationArtifact.artifact_id, record_sha256: evaluationArtifact.sha256 },
    command_evidence: { artifact_id: commandArtifact.artifact_id, sha256: commandArtifact.sha256, command_count: commandResults.length, command_results_digest: digestObject(commandResults) },
    artifacts: snapshot.artifacts.map((artifact) => ({ artifact_id: artifact.artifact_id, sha256: artifact.sha256 })),
    created_at: options.createdAt ?? nowIso(),
  };
  packet.provenance_digest = digestObject(packet);
  const validation = validateRuntimePacket(packet, 'runner-provenance.v1.schema.json');
  if (!validation.valid) throw new Error(`Runner provenance schema invalid: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`);
  return packet;
}

export async function writeRunnerProvenance(runDirectory, contract, outputFile, options = {}) {
  const packet = await generateRunnerProvenance(runDirectory, contract, options);
  await writeJsonAtomic(path.resolve(outputFile), packet);
  return packet;
}

export async function verifyRunnerProvenance(runDirectory, contract, provenance, outcome = null) {
  const validation = validateRuntimePacket(provenance, 'runner-provenance.v1.schema.json');
  const issues = validation.issues.map((issue) => `${issue.path} ${issue.message}`);
  if (provenance.provenance_digest !== digestObject(withoutDigest(provenance, 'provenance_digest'))) issues.push('provenance digest mismatch');
  let derived;
  try { derived = await generateRunnerProvenance(runDirectory, contract, { provenanceId: provenance.provenance_id, createdAt: provenance.created_at }); }
  catch (error) { issues.push(error.message); }
  if (derived && digestObject(derived) !== digestObject(provenance)) issues.push('provenance does not match replayed ledger');
  if (outcome) {
    const ref = outcome.runner_provenance;
    if (!ref || ref.provenance_id !== provenance.provenance_id || ref.provenance_digest !== provenance.provenance_digest || ref.ledger_head_digest !== provenance.ledger.head_digest || ref.event_count !== provenance.ledger.event_count || ref.evaluation_digest !== provenance.evaluation.evaluation_digest) issues.push('outcome runner provenance binding mismatch');
    const snapshot = derived ? await rebuildSnapshot(runDirectory, contract.run_id) : null;
    const evaluation = snapshot?.evaluations.at(-1);
    const expectedArtifacts = snapshot?.artifacts.map((artifact) => ({ artifact_id: artifact.artifact_id, path: artifact.path, sha256: artifact.sha256 }));
    if (outcome.run_id !== contract.run_id || outcome.contract_digest !== digestContract(contract) || outcome.root !== contract.scope.root || outcome.branch !== contract.scope.branch || outcome.ending_head !== provenance.candidate_identity.commit || outcome.ending_tree !== provenance.candidate_identity.tree || digestObject(outcome.git_status) !== digestObject(provenance.candidate_identity.git_status)) issues.push('outcome contract or candidate binding mismatch');
    if (outcome.terminal_state !== 'succeeded' || !evaluation || outcome.evaluation_summary?.evaluation_ids?.length !== 1 || outcome.evaluation_summary.evaluation_ids[0] !== evaluation.evaluation_id || digestObject(outcome.artifacts) !== digestObject(expectedArtifacts)) issues.push('outcome replayed snapshot binding mismatch');
  }
  return { valid: issues.length === 0, issues, derived };
}
