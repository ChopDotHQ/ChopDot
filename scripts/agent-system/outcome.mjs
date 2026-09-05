import path from 'node:path';
import { digestObject, makeId, nowIso, writeJsonAtomic } from './core.mjs';
import { assertRunBudgetAvailable, budgetStatus, rebuildSnapshot, remainingBudget } from './ledger.mjs';
import { gradeTrajectory } from './evaluator.mjs';
import { assertRedacted, redactValue } from './redact.mjs';
import { contractRoot, digestContract } from './contract.mjs';
import { validateGovernanceInstance } from './schema.mjs';
import { assertCurrentCandidate, validateCandidateIdentity } from './candidate.mjs';
import { generateRunnerProvenance, verifyRunnerProvenance } from './provenance.mjs';

function latestEvaluation(snapshot) { return snapshot.evaluations.at(-1) ?? null; }

function requirementRecords(contract, snapshot) {
  const evaluation = latestEvaluation(snapshot);
  const accepted = evaluation?.verdict === 'accepted';
  return contract.requirement_ids.map((requirementId) => ({
    requirement_id: requirementId,
    status: accepted ? 'accepted' : evaluation?.verdict === 'blocked' ? 'blocked' : evaluation ? 'failed' : 'not_started',
    evaluation_ids: evaluation ? [evaluation.evaluation_id] : [],
  }));
}

function artifactRef(artifact) { return { artifact_id: artifact.artifact_id, path: artifact.path, sha256: artifact.sha256 }; }

function continuationRepairEvidence(snapshot) {
  const recordedArtifactIds = new Set(snapshot.artifacts.map((artifact) => artifact.artifact_id));
  const failedHypotheses = [];
  const unresolvedConflicts = [];
  for (const repair of snapshot.repairs) {
    const references = Array.isArray(repair.falsifying_evidence) ? repair.falsifying_evidence : [];
    const artifactIds = references.filter((reference) => /^artifact_/.test(reference) && recordedArtifactIds.has(reference));
    const unresolved = references.filter((reference) => !artifactIds.includes(reference));
    if (artifactIds.length) failedHypotheses.push({ hypothesis: repair.changed_hypothesis, falsifying_evidence_artifact_ids: [...new Set(artifactIds)] });
    if (!references.length) unresolvedConflicts.push(`Repair hypothesis "${repair.changed_hypothesis}" has no recorded falsifying evidence reference.`);
    for (const reference of unresolved) unresolvedConflicts.push(`Repair hypothesis "${repair.changed_hypothesis}" cites unresolved non-artifact evidence "${reference}".`);
  }
  return { failedHypotheses, unresolvedConflicts };
}

export function buildOutcomePacket(contract, snapshot, options = {}) {
  const budget = budgetStatus(contract, snapshot, options.now);
  if (budget.exhausted.length) throw new Error(`Run budget exhausted: ${budget.exhausted.join(', ')}`);
  const current = options.candidateIdentity ?? assertCurrentCandidate(contract, { requireClean: options.requireClean ?? true });
  const currentValidation = validateCandidateIdentity(current, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: options.requireClean ?? true });
  if (!currentValidation.valid) throw new Error(`Outcome candidate rejected: ${currentValidation.issues.join('; ')}`);
  const evaluation = latestEvaluation(snapshot);
  const artifacts = snapshot.artifacts.map(artifactRef);
  const evaluationIndex = snapshot.artifacts
    .filter((artifact) => artifact.artifact_type === 'EvaluationRecordV1')
    .map(artifactRef);
  const trajectory = gradeTrajectory(snapshot, contract);
  if (snapshot.terminal_state === 'succeeded' && !trajectory.accepted) throw new Error('Succeeded run has an unacceptable trajectory');
  const packet = {
    outcome_version: '1.0.0',
    outcome_id: options.outcomeId ?? makeId('outcome'),
    run_id: contract.run_id,
    contract_digest: digestContract(contract),
    root: contractRoot(contract),
    branch: current.branch,
    starting_head: contract.scope.starting_head,
    starting_tree: contract.scope.starting_tree,
    ending_head: current.commit,
    ending_tree: current.tree,
    git_status: [...current.git_status],
    requirements: requirementRecords(contract, snapshot),
    artifacts,
    evaluation_summary: evaluation ? {
      evaluation_ids: [evaluation.evaluation_id], total_assertions: evaluation.counts.total,
      passed: evaluation.counts.passed, failed: evaluation.counts.failed,
      blocked: evaluation.counts.blocked, hard_failures: evaluation.hard_failures,
      score: evaluation.score, threshold: evaluation.threshold,
      independent_review_satisfied: evaluation.independence !== 'same_actor_rejected',
    } : {
      evaluation_ids: [], total_assertions: 0, passed: 0, failed: 0, blocked: 0,
      hard_failures: [], score: 0, threshold: contract.evaluator.pass_threshold,
      independent_review_satisfied: false,
    },
    evaluation_index: evaluationIndex,
    ...(options.runnerProvenance ? { runner_provenance: {
      provenance_id: options.runnerProvenance.provenance_id,
      provenance_digest: options.runnerProvenance.provenance_digest,
      ledger_head_digest: options.runnerProvenance.ledger.head_digest,
      event_count: options.runnerProvenance.ledger.event_count,
      evaluation_digest: options.runnerProvenance.evaluation.evaluation_digest,
    } } : {}),
    effects: Object.values(snapshot.effects).map((effect) => ({
      effect_id: effect.effect_id,
      state: effect.state === 'verified' || effect.state === 'failed' ? effect.state : 'unknown_needs_reconciliation',
      readback_digest: effect.after_readback?.digest ?? (effect.after_readback ? digestObject(effect.after_readback) : null),
    })),
    approvals: Object.values(snapshot.approvals).filter((approval) => approval.decision === 'approved').map((approval) => approval.approval_id),
    evidence_index: options.evidenceIndex ?? artifacts.map((artifact) => ({ ...artifact })),
    limitations: options.limitations ?? [],
    terminal_state: snapshot.terminal_state,
    knowledge_receipts: (options.knowledgeReceipts ?? []).map((receipt) => typeof receipt === 'string' ? receipt : receipt.receipt_id).filter(Boolean),
    created_at: options.createdAt ?? nowIso(),
  };
  return { ...packet, packet_digest: digestObject(packet) };
}

export function validateOutcomePacket(packet) {
  const schema = validateGovernanceInstance(packet, 'outcome-packet.v1.schema.json');
  const issues = schema.issues.map((entry) => `${entry.path}: ${entry.message}`);
  if (packet.outcome_version !== '1.0.0') issues.push('unsupported outcome version');
  if (packet.terminal_state !== 'succeeded') issues.push('terminal state is not succeeded');
  if (!packet.evaluation_summary || packet.evaluation_summary.failed || packet.evaluation_summary.blocked || packet.evaluation_summary.hard_failures?.length) issues.push('evaluation is not accepted');
  if (!packet.evaluation_summary?.independent_review_satisfied) issues.push('independent review is not satisfied');
  if (packet.requirements?.some((entry) => entry.status !== 'accepted')) issues.push('requirements remain open');
  if (!packet.artifacts?.length) issues.push('artifacts are missing');
  if (!packet.evidence_index?.length) issues.push('evidence index is missing');
  if (!packet.evaluation_index?.length) issues.push('evaluation index is missing');
  if (!packet.runner_provenance) issues.push('runner provenance is missing');
  if (packet.effects?.some((effect) => effect.state !== 'verified')) issues.push('effects remain unreconciled');
  const summary = packet.evaluation_summary;
  if (summary && summary.passed + summary.failed + summary.blocked !== summary.total_assertions) issues.push('evaluation counts do not sum to total assertions');
  if (summary && summary.score < summary.threshold) issues.push('evaluation score is below threshold');
  const expected = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  if (packet.packet_digest !== expected) issues.push('outcome digest mismatch');
  return { valid: issues.length === 0, issues };
}

export function buildContinuationPacket(contract, snapshot, options = {}) {
  const current = options.candidateIdentity ?? assertCurrentCandidate(contract, { requireClean: false });
  const currentValidation = validateCandidateIdentity(current, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: false });
  if (!currentValidation.valid) throw new Error(`Continuation candidate rejected: ${currentValidation.issues.join('; ')}`);
  const remaining = remainingBudget(contract, snapshot, options.now);
  const requirements = requirementRecords(contract, snapshot);
  const checkpoint = snapshot.checkpoints.at(-1);
  const repairEvidence = continuationRepairEvidence(snapshot);
  const terminalState = ['failed_verification', 'blocked', 'approval_required', 'budget_exhausted', 'cancelled'].includes(snapshot.terminal_state) ? snapshot.terminal_state : 'blocked';
  const packet = {
    continuation_version: '1.0.0', run_id: contract.run_id,
    contract_digest: digestContract(contract), root: contractRoot(contract), branch: contract.scope.branch,
    starting_head: contract.scope.starting_head, starting_tree: contract.scope.starting_tree,
    current_head: current.commit,
    current_tree: current.tree,
    git_status: [...current.git_status],
    open_requirement_ids: requirements.filter((entry) => entry.status !== 'accepted').map((entry) => entry.requirement_id),
    completed_requirement_ids: requirements.filter((entry) => entry.status === 'accepted').map((entry) => entry.requirement_id),
    last_safe_checkpoint: checkpoint ? { sequence: checkpoint.sequence, event_digest: checkpoint.head_digest, recorded_at: checkpoint.recorded_at ?? nowIso() } : { sequence: Math.max(0, snapshot.sequence), event_digest: snapshot.head_digest, recorded_at: snapshot.updated_at ?? nowIso() },
    unresolved_conflicts: [...new Set([...(options.unresolvedConflicts ?? []), ...repairEvidence.unresolvedConflicts])],
    failed_hypotheses: repairEvidence.failedHypotheses,
    remaining_budget: remaining,
    pending_approvals: Object.values(snapshot.approvals).filter((approval) => approval.state === 'pending').map((approval) => approval.approval_id),
    pending_effects: Object.values(snapshot.effects).filter((effect) => !['verified', 'failed'].includes(effect.state)).map((effect) => effect.effect_id),
    next_bounded_task: options.nextBoundedTask ?? 'Resolve the first open assertion with changed evidence.',
    terminal_state: terminalState, created_at: options.createdAt ?? nowIso(),
  };
  const validation = validateGovernanceInstance(packet, 'continuation-packet.v1.schema.json');
  if (!validation.valid) throw new Error(`Continuation packet schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  return packet;
}

export async function promoteContinuation(runDirectory, contract, outputFile, options = {}) {
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  if (!['failed_verification', 'blocked', 'approval_required', 'budget_exhausted', 'cancelled'].includes(snapshot.terminal_state)) throw new Error('Continuation promotion requires a non-success terminal run');
  const packet = buildContinuationPacket(contract, snapshot, options);
  const redacted = redactValue(packet);
  assertRedacted(redacted);
  const validation = validateGovernanceInstance(redacted, 'continuation-packet.v1.schema.json');
  if (!validation.valid) throw new Error(`Redacted continuation packet schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  await writeJsonAtomic(path.resolve(outputFile), redacted);
  return redacted;
}

export async function promoteOutcome(runDirectory, contract, outputFile, options = {}) {
  const { snapshot } = await assertRunBudgetAvailable(runDirectory, contract, { now: options.now });
  const candidate = assertCurrentCandidate(contract, { requireClean: true, expected: options.candidateIdentity });
  const currentDigest = candidate.candidate_digest;
  for (const artifact of snapshot.artifacts) {
    const validation = validateCandidateIdentity(artifact.candidate_identity, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: true });
    if (!validation.valid || validation.candidate_digest !== currentDigest) throw new Error(`Artifact ${artifact.artifact_id} does not prove the clean current candidate`);
  }
  for (const evaluation of snapshot.evaluations) {
    const validation = validateCandidateIdentity(evaluation.candidate_identity, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: true });
    if (!validation.valid || validation.candidate_digest !== currentDigest || evaluation.candidate_digest !== currentDigest) throw new Error(`Evaluation ${evaluation.evaluation_id} does not prove the clean current candidate`);
  }
  const runnerProvenance = options.runnerProvenance ?? await generateRunnerProvenance(runDirectory, contract, { snapshot });
  const packet = buildOutcomePacket(contract, snapshot, { ...options, candidateIdentity: candidate, requireClean: true, runnerProvenance });
  const provenanceVerification = await verifyRunnerProvenance(runDirectory, contract, runnerProvenance, packet);
  if (!provenanceVerification.valid) throw new Error(`Runner provenance cannot be verified: ${provenanceVerification.issues.join('; ')}`);
  const validation = validateOutcomePacket(packet);
  if (!validation.valid) throw new Error(`Outcome cannot be promoted: ${validation.issues.join('; ')}`);
  const redacted = redactValue(packet);
  redacted.packet_digest = digestObject(Object.fromEntries(Object.entries(redacted).filter(([key]) => key !== 'packet_digest')));
  assertRedacted(redacted);
  const redactedValidation = validateOutcomePacket(redacted);
  if (!redactedValidation.valid) throw new Error(`Redacted outcome cannot be promoted: ${redactedValidation.issues.join('; ')}`);
  await writeJsonAtomic(path.resolve(outputFile), redacted);
  return redacted;
}
