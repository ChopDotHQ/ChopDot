#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateOutcomePacket } from '../agent-system/outcome.mjs';
import { validateGovernanceInstance } from '../agent-system/schema.mjs';
import { digestObject, parseArgs, readJson, sha256File, writeMarkdownReport, writeReport } from './lib.mjs';

function safeRepositoryFile(root, relative, label, errors) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
    errors.push(`${label} must be a safe repository-relative path`);
    return null;
  }
  const exactRoot = fs.realpathSync(root);
  const unresolved = path.resolve(exactRoot, relative);
  if (!unresolved.startsWith(`${exactRoot}${path.sep}`)) {
    errors.push(`${label} escapes the repository root`);
    return null;
  }
  if (!fs.existsSync(unresolved) || !fs.statSync(unresolved).isFile()) {
    errors.push(`${label} does not exist: ${relative}`);
    return null;
  }
  const absolute = fs.realpathSync(unresolved);
  if (!absolute.startsWith(`${exactRoot}${path.sep}`)) {
    errors.push(`${label} resolves through a symlink outside the repository`);
    return null;
  }
  return absolute;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function nonEmptyRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function validateReleaseEvidence(evidence, identity, binding, label) {
  const errors = [];
  if (!nonEmptyRecord(evidence)) return [`${label} must be a nonempty JSON object`];
  if (evidence.evidence_version !== '1.0.0' || evidence.evidence_level !== 'release') errors.push(`${label} must be release Evidence V1`);
  if (!nonEmptyRecord(evidence.candidate)) errors.push(`${label} lacks a candidate identity object`);
  else for (const [key, expected] of Object.entries(identity)) if (evidence.candidate[key] !== expected) errors.push(`${label} candidate ${key} is not bound to ${expected}`);
  if (!/^[0-9a-f]{64}$/.test(evidence.artifact_digest ?? '')) errors.push(`${label} lacks a SHA-256 artifact_digest`);
  for (const [key, expected] of Object.entries(binding)) if (evidence[key] !== expected) errors.push(`${label} ${key} is not bound to ${expected}`);
  const readback = evidence.live_readback;
  if (!nonEmptyRecord(readback)) errors.push(`${label} lacks a nonempty live_readback`);
  else {
    if (readback.reachable !== true || !String(readback.content_identity ?? '').trim()) errors.push(`${label} live_readback must prove reachable content identity`);
    if (Number.isNaN(Date.parse(readback.observed_at ?? ''))) errors.push(`${label} live_readback lacks a valid observed_at`);
    for (const [key, expected] of Object.entries({
      run_id: binding.run_id,
      contract_digest: binding.contract_digest,
      effect_id: binding.effect_id,
      candidate_commit: identity.commit,
      candidate_tree: identity.tree,
      artifact_digest: evidence.artifact_digest,
    })) if (readback[key] !== expected) errors.push(`${label} live_readback ${key} is not bound to ${expected}`);
  }
  return errors;
}

export function validateReleaseCandidate({ root, outcomePath, approvalPath, expectedSha, now = new Date() }) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const outcomeFile = safeRepositoryFile(root, outcomePath, 'Outcome packet', errors);
  const approvalFile = safeRepositoryFile(root, approvalPath, 'Approval record', errors);
  if (!outcomeFile || !approvalFile) return { ok: false, checks, errors, warnings, summary: {} };

  let outcome;
  let approval;
  try {
    outcome = readJson(outcomeFile);
    approval = readJson(approvalFile);
  } catch (error) {
    return { ok: false, checks, errors: [...errors, `Invalid release evidence JSON: ${error.message}`], warnings, summary: {} };
  }

  checks += 1;
  const outcomeValidation = validateOutcomePacket(outcome);
  errors.push(...outcomeValidation.issues.map((issue) => `Outcome packet: ${issue}`));
  const actualHead = git(root, ['rev-parse', 'HEAD']);
  const actualTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const actualRoot = path.resolve(git(root, ['rev-parse', '--show-toplevel']));
  const actualBranch = git(root, ['branch', '--show-current']);
  checks += 8;
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '')) errors.push('Release enforcement requires a full expected candidate SHA');
  if (actualHead !== expectedSha) errors.push(`Checked-out candidate ${actualHead} does not match expected ${expectedSha}`);
  if (outcome.ending_head !== actualHead) errors.push(`Outcome ending_head ${outcome.ending_head ?? '(missing)'} does not match candidate ${actualHead}`);
  if (outcome.ending_tree !== actualTree) errors.push(`Outcome ending_tree ${outcome.ending_tree ?? '(missing)'} does not match tree ${actualTree}`);
  if (typeof outcome.root !== 'string' || path.resolve(outcome.root) !== actualRoot) errors.push(`Outcome root ${outcome.root ?? '(missing)'} does not match worktree ${actualRoot}`);
  if (outcome.branch !== actualBranch) errors.push(`Outcome branch ${outcome.branch ?? '(missing)'} does not match worktree branch ${actualBranch}`);
  if ((outcome.git_status ?? []).length) errors.push('Outcome packet records a dirty candidate');
  const worktreeStatus = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (worktreeStatus) errors.push(`Candidate worktree is dirty: ${worktreeStatus.replaceAll('\n', '; ')}`);

  for (const reference of outcome.artifacts ?? []) {
    const file = safeRepositoryFile(root, reference.path, `Artifact ${reference.artifact_id}`, errors);
    if (file && sha256File(file) !== reference.sha256) errors.push(`Artifact ${reference.path} does not match its cited SHA-256`);
  }

  checks += 1;
  const requiredCondition = `release-enforcement:${actualHead}:${outcome.packet_digest}`;
  const approvalSchema = validateGovernanceInstance(approval, 'approval-record.v1.schema.json');
  errors.push(...approvalSchema.issues.map((issue) => `Approval record schema: ${issue.path} ${issue.message}`));
  if (approval.approval_version !== '1.0.0') errors.push('Approval record must be V1');
  if (approval.decision !== 'approved') errors.push('Release approval is not approved');
  if (!approval.decided_by || !approval.decided_at) errors.push('Release approval lacks decision identity or timestamp');
  if (approval.target !== 'github-release-enforcement') errors.push('Release approval target is not github-release-enforcement');
  if (!(approval.conditions ?? []).includes(requiredCondition)) errors.push(`Release approval is not scoped to exact candidate/outcome condition ${requiredCondition}`);
  if (approval.expires_at && new Date(approval.expires_at) <= now) errors.push('Release approval has expired');
  if (approval.single_use !== true) errors.push('Release approval must be single-use');
  if (!approval.consumed_at) errors.push('Release approval consumption cannot be proven');
  else if (new Date(approval.consumed_at) < new Date(approval.decided_at) || new Date(approval.consumed_at) > now) errors.push('Release approval consumption time is invalid');
  if (approval.run_id !== outcome.run_id) errors.push('Release approval run_id does not match outcome run_id');
  if (approval.scope_digest !== outcome.packet_digest) errors.push('Release approval scope_digest does not match outcome digest');
  if (!(outcome.approvals ?? []).includes(approval.approval_id)) errors.push('Outcome packet does not cite the release approval');
  const approvedEffect = (outcome.effects ?? []).find((effect) => effect.effect_id === approval.effect_id);
  if (!approvedEffect || approvedEffect.state !== 'verified') errors.push('Release approval effect_id is not a verified outcome effect');

  let releaseEvidenceCount = 0;
  for (const reference of outcome.evidence_index ?? []) {
    const file = safeRepositoryFile(root, reference.path, `Evidence ${reference.artifact_id}`, errors);
    if (!file) continue;
    const actualDigest = sha256File(file);
    if (actualDigest !== reference.sha256) errors.push(`Evidence ${reference.path} digest ${actualDigest} does not match cited ${reference.sha256}`);
    let evidence;
    try { evidence = readJson(file); } catch (error) { errors.push(`Evidence ${reference.path} is not JSON: ${error.message}`); continue; }
    if ((evidence.evidence_level ?? evidence.level) !== 'release') continue;
    releaseEvidenceCount += 1;
    errors.push(...validateReleaseEvidence(evidence, {
      root: actualRoot, branch: actualBranch, commit: actualHead, tree: actualTree,
    }, {
      run_id: outcome.run_id, contract_digest: outcome.contract_digest,
      effect_id: approval.effect_id, approval_id: approval.approval_id,
    }, `Release evidence ${reference.path}`));
    if (approvedEffect?.readback_digest !== digestObject(evidence.live_readback ?? {})) errors.push(`Release evidence ${reference.path} live_readback digest does not match the verified outcome effect`);
  }
  checks += 1;
  if (releaseEvidenceCount === 0) errors.push('No release-level evidence document is cited by the outcome packet');

  return {
    ok: errors.length === 0,
    checks,
    errors,
    warnings,
    summary: { actual_root: actualRoot, actual_branch: actualBranch, actual_head: actualHead, actual_tree: actualTree, outcome_digest: outcome.packet_digest, approval_id: approval.approval_id, release_evidence_count: releaseEvidenceCount },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  if (!options.outcome || !options.approval) {
    process.stderr.write('Release enforcement requires --outcome and --approval. Missing evidence is a failure, not a skipped green job.\n');
    process.exitCode = 2;
    return;
  }
  const result = validateReleaseCandidate({
    root,
    outcomePath: options.outcome,
    approvalPath: options.approval,
    expectedSha: options.expected_sha ?? process.env.EXPECTED_SHA,
  });
  writeReport(options.json_out ? path.resolve(options.json_out) : null, result);
  writeMarkdownReport(options.md_out ? path.resolve(options.md_out) : null, 'ChopDot release-enforcement report', result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
