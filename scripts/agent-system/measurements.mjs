import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hashArtifact } from './artifacts.mjs';
import { canonicalJson } from './core.mjs';
import { contractRoot } from './contract.mjs';
import { validateCandidateIdentity } from './candidate.mjs';
import { rebuildSnapshot } from './ledger.mjs';
import { loadGovernanceJson } from './schema.mjs';

const POLICY = loadGovernanceJson('policies', 'evidence-levels.json');
const LEVELS = new Map(POLICY.ordered_levels.map((entry) => [entry.id, entry]));

function failure(subject, code, message) {
  return { subject, accepted: false, code, message, evidence_artifact_ids: [] };
}

function sameValue(left, right) {
  try { return canonicalJson(left) === canonicalJson(right); } catch { return false; }
}

function inside(root, candidate) {
  const absolute = path.resolve(root, candidate);
  return absolute === root || absolute.startsWith(`${root}${path.sep}`);
}

function candidateFieldsMatch(fields, current) {
  if (fields.candidate_digest !== undefined && fields.candidate_digest !== current.candidate_digest) return false;
  for (const key of ['root', 'branch', 'commit', 'tree']) if (fields[key] !== undefined && fields[key] !== current[key]) return false;
  if (fields.clean !== undefined && fields.clean !== (current.git_status.length === 0)) return false;
  return true;
}

async function loadEvidenceDocument(root, artifact, current) {
  const candidate = validateCandidateIdentity(artifact.candidate_identity, { expectedRoot: root, expectedBranch: current.branch });
  if (!candidate.valid || candidate.candidate_digest !== current.candidate_digest) throw new Error('artifact candidate identity does not match the evaluation candidate');
  if (!inside(root, artifact.path)) throw new Error('artifact path escapes the contract root');
  const hashed = await hashArtifact(root, artifact.path);
  if (hashed.manifest.length !== 1) throw new Error('measurement evidence must be one JSON file');
  if (hashed.aggregate_sha256 !== artifact.sha256) throw new Error('artifact content hash does not match its recorded digest');
  let document;
  try { document = JSON.parse(await readFile(path.resolve(root, artifact.path), 'utf8')); }
  catch (error) { throw new Error(`measurement evidence is not valid JSON: ${error.message}`); }
  if (document.measurement_evidence_version !== '1.0.0') throw new Error('measurement evidence version is unsupported');
  const documentCandidate = validateCandidateIdentity(document.candidate_identity, { expectedRoot: root, expectedBranch: current.branch });
  if (!documentCandidate.valid || documentCandidate.candidate_digest !== current.candidate_digest || document.candidate_digest !== current.candidate_digest) {
    throw new Error('measurement evidence document is bound to another candidate');
  }
  if (!document.measurements || typeof document.measurements !== 'object' || Array.isArray(document.measurements)) throw new Error('measurement evidence has no measurements object');
  return document;
}

export async function resolveMeasurementBindings(runDirectory, contract, bindings, current) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const artifacts = new Map(snapshot.artifacts.map((artifact) => [artifact.artifact_id, artifact]));
  const verified = {};
  const results = [];
  const input = bindings && typeof bindings === 'object' && !Array.isArray(bindings) ? bindings : {};
  const subjects = new Set(contract.expected_outcome.assertions.map((assertion) => assertion.subject));
  for (const assertion of contract.expected_outcome.assertions) if (typeof assertion.expected === 'string' && assertion.operator === 'sha256_equals') subjects.add(assertion.expected);

  for (const subject of subjects) {
    const binding = input[subject];
    if (!binding || typeof binding !== 'object' || Array.isArray(binding) || !Object.hasOwn(binding, 'value')) {
      results.push(failure(subject, binding === undefined ? 'missing_binding' : 'untyped_binding', 'Measurement must be a typed evidence binding, not a raw scalar.'));
      continue;
    }
    const level = LEVELS.get(binding.evidence_level);
    if (!level || !level.promotable || level.rank === null) {
      results.push(failure(subject, 'invalid_evidence_level', `Evidence level ${binding.evidence_level ?? '<missing>'} cannot promote.`));
      continue;
    }
    const ids = binding.evidence_artifact_ids;
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) {
      results.push(failure(subject, 'missing_evidence_id', 'Measurement needs at least one unique recorded evidence artifact ID.'));
      continue;
    }
    let accepted = true;
    let reason = null;
    for (const artifactId of ids) {
      const artifact = artifacts.get(artifactId);
      if (!artifact) { accepted = false; reason = `Evidence artifact ${artifactId} is not recorded in this run.`; break; }
      try {
        const document = await loadEvidenceDocument(contractRoot(contract), artifact, current);
        const entry = document.measurements[subject];
        if (!entry || !sameValue(entry.value, binding.value) || entry.evidence_level !== binding.evidence_level) throw new Error(`artifact does not contain the exact ${subject} value and evidence level`);
        const fields = entry.evidence_fields;
        if (!fields || typeof fields !== 'object' || level.required_fields.some((field) => !Object.hasOwn(fields, field))) throw new Error(`artifact lacks required ${binding.evidence_level} evidence fields`);
        if (!candidateFieldsMatch(fields, current)) throw new Error('artifact evidence fields are bound to another candidate');
      } catch (error) { accepted = false; reason = error.message; break; }
    }
    if (!accepted) { results.push(failure(subject, 'invalid_evidence_artifact', reason)); continue; }
    verified[subject] = { value: binding.value, evidence_level: binding.evidence_level, evidence_artifact_ids: [...ids] };
    results.push({ subject, accepted: true, code: 'verified', message: 'Bound measurement verified.', evidence_artifact_ids: [...ids] });
  }
  return { verified, results };
}

export function evidenceLevelMeets(actual, minimum) {
  const actualLevel = LEVELS.get(actual);
  const minimumLevel = LEVELS.get(minimum);
  return Boolean(actualLevel?.promotable && minimumLevel?.promotable && actualLevel.rank >= minimumLevel.rank);
}
