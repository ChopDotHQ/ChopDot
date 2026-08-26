#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateOutcomePacket } from '../agent-system/outcome.mjs';
import { digestObject, parseArgs, readJson, sha256File, writeReport } from './lib.mjs';

const REQUIRED_REPORTS = new Map([
  ['CI-AGENT-CONTRACT', 'agent-contract-exact-head.json'],
  ['CI-AGENT-RUNNER', 'agent-runner-exact-head.json'],
  ['CI-KNOWLEDGE-ADAPTERS', 'knowledge-adapters-exact-head.json'],
  ['CI-REPO-GOVERNANCE', 'repo-governance-exact-head.json'],
  ['CI-APPLICATION-ASSURANCE', 'application-exact-head.json'],
]);

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function findNamed(root, name, matches = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) findNamed(candidate, name, matches);
    else if (entry.isFile() && entry.name === name) matches.push(candidate);
  }
  return matches;
}

function normalizedIdentity(value, label) {
  const identity = typeof value === 'string' ? value.trim() : '';
  if (!identity || identity.length > 256 || /[\r\n\0]/.test(identity)) throw new Error(`PR outcome requires a valid ${label} identity`);
  return identity;
}

function identityAliases(name, email) {
  const aliases = new Set([name, email, `${name} <${email}>`].map((value) => value.trim().toLocaleLowerCase('en-US')));
  const noReply = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email);
  if (noReply) aliases.add(noReply[1].toLocaleLowerCase('en-US'));
  return [...aliases].sort();
}

function evaluatorAliases(identity) {
  const aliases = new Set([identity.toLocaleLowerCase('en-US')]);
  const namedEmail = /^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/.exec(identity);
  if (namedEmail) for (const alias of identityAliases(namedEmail[1], namedEmail[2])) aliases.add(alias);
  return aliases;
}

function candidateProvenance(root, baseSha, actualHead) {
  if (!/^[0-9a-f]{40}$/.test(baseSha ?? '')) throw new Error('PR outcome requires a full base SHA for candidate provenance');
  try { git(root, ['cat-file', '-e', `${baseSha}^{commit}`]); } catch { throw new Error(`PR outcome base SHA is not an available commit: ${baseSha}`); }
  try { git(root, ['merge-base', '--is-ancestor', baseSha, actualHead]); } catch { throw new Error(`PR outcome base SHA ${baseSha} is not an ancestor of exact head ${actualHead}`); }
  const commits = git(root, ['rev-list', '--reverse', `${baseSha}..${actualHead}`]).split('\n').filter(Boolean);
  if (!commits.length) throw new Error(`PR outcome candidate provenance is empty for ${baseSha}..${actualHead}`);
  const identities = new Map();
  for (const commit of commits) {
    const fields = git(root, ['show', '-s', '--format=%an%x00%ae%x00%cn%x00%ce', commit]).split('\0');
    if (fields.length !== 4) throw new Error(`PR outcome candidate provenance is malformed at commit ${commit}`);
    const [authorName, authorEmail, committerName, committerEmail] = fields.map((value) => normalizedIdentity(value, 'git provenance'));
    for (const [role, name, email] of [['author', authorName, authorEmail], ['committer', committerName, committerEmail]]) {
      if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error(`PR outcome candidate provenance has an invalid ${role} email at commit ${commit}`);
      const key = `${name.toLocaleLowerCase('en-US')}\0${email.toLocaleLowerCase('en-US')}`;
      const current = identities.get(key) ?? { name, email, roles: new Set(), commits: new Set(), aliases: identityAliases(name, email) };
      current.roles.add(role);
      current.commits.add(commit);
      identities.set(key, current);
    }
  }
  return {
    base_sha: baseSha,
    head_sha: actualHead,
    commit_count: commits.length,
    commits,
    identities: [...identities.values()].map((entry) => ({ ...entry, roles: [...entry.roles].sort(), commits: [...entry.commits].sort() }))
      .sort((left, right) => `${left.name}\0${left.email}`.localeCompare(`${right.name}\0${right.email}`)),
  };
}

function independenceRecord({ provenance, prSubmitterIdentity, prSubmitterSource, evaluatorIdentity, evaluatorSource, workflowRunId, workflowRunAttempt }) {
  const submitter = normalizedIdentity(prSubmitterIdentity, 'PR submitter');
  const evaluator = normalizedIdentity(evaluatorIdentity, 'deterministic evaluator');
  const relevantAliases = new Set([submitter.toLocaleLowerCase('en-US')]);
  for (const identity of provenance.identities) for (const alias of identity.aliases) relevantAliases.add(alias);
  const collision = [...evaluatorAliases(evaluator)].find((alias) => relevantAliases.has(alias));
  if (collision) {
    throw new Error(`PR outcome evaluator ${evaluator} aliases relevant candidate identity ${collision} and is not independent`);
  }
  return {
    candidate_provenance: provenance,
    pr_submitter: { id: submitter, kind: 'human_or_service_actor', source: normalizedIdentity(prSubmitterSource, 'PR submitter source') },
    evaluator: {
      id: evaluator,
      kind: 'deterministic_runner',
      source: normalizedIdentity(evaluatorSource, 'deterministic evaluator source'),
      workflow_run_id: String(workflowRunId),
      workflow_run_attempt: String(workflowRunAttempt),
      human_review: false,
      codeowner_review: false,
    },
    basis: 'deterministic_evaluator_identity_does_not_alias_pr_submitter_or_any_base_to_head_commit_author_or_committer',
    satisfied: true,
  };
}

export function generatePrOutcome({
  root, evidenceRoot, outputDirectory, runId, branch, expectedSha, workflowRunId,
  workflowRunAttempt = '1', jobResults = {}, baseSha, prSubmitterIdentity,
  prSubmitterSource = 'explicit-input', evaluatorIdentity,
  evaluatorSource = 'explicit-input',
}) {
  const actualHead = git(root, ['rev-parse', 'HEAD']);
  const actualTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const actualRoot = git(root, ['rev-parse', '--show-toplevel']);
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '') || actualHead !== expectedSha) throw new Error(`PR outcome requires exact head ${expectedSha}; observed ${actualHead}`);
  if (status) throw new Error(`PR outcome candidate is dirty: ${status.replaceAll('\n', '; ')}`);
  if (!/^run_[a-z0-9][a-z0-9_-]{7,95}$/.test(runId ?? '')) throw new Error('PR outcome requires a schema-compatible run_id');
  if (!branch) throw new Error('PR outcome requires the pull-request head branch');
  if (!String(workflowRunId ?? '').trim()) throw new Error('PR outcome requires a workflow run ID');
  const provenance = candidateProvenance(root, baseSha, actualHead);
  const independence = independenceRecord({
    provenance, prSubmitterIdentity, prSubmitterSource, evaluatorIdentity,
    evaluatorSource, workflowRunId, workflowRunAttempt,
  });
  const expectedJobs = ['agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance', 'application-fast-assurance'];
  for (const job of expectedJobs) if (jobResults[job] !== 'success') throw new Error(`PR outcome requires same-run ${job}=success; observed ${jobResults[job] ?? '(missing)'}`);

  const checks = [];
  for (const [requirementId, filename] of REQUIRED_REPORTS) {
    const matches = findNamed(evidenceRoot, filename);
    if (matches.length !== 1) throw new Error(`Expected exactly one same-run ${filename}; found ${matches.length}`);
    const report = readJson(matches[0]);
    if (report.ok !== true || report.actual_sha !== actualHead || report.actual_tree !== actualTree) throw new Error(`${filename} does not prove exact candidate ${actualHead}/${actualTree}`);
    checks.push({ requirement_id: requirementId, filename, report_sha256: sha256File(matches[0]), actual_sha: report.actual_sha, actual_tree: report.actual_tree });
  }

  fs.mkdirSync(outputDirectory, { recursive: true });
  const evidence = {
    pr_outcome_evidence_version: '1.0.0',
    source: 'same-workflow-run-artifacts',
    workflow_run_id: String(workflowRunId),
    workflow_run_attempt: String(workflowRunAttempt),
    run_id: runId,
    candidate: { root: actualRoot, branch, commit: actualHead, tree: actualTree, git_status: [] },
    independence,
    checks,
    job_results: Object.fromEntries(expectedJobs.map((job) => [job, jobResults[job]])),
    exact_counts: { total: checks.length, passed: checks.length, failed: 0, skipped: 0 },
    created_at: new Date().toISOString(),
  };
  const evidencePath = path.join(outputDirectory, 'pr-outcome-evidence.json');
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const evidenceDigest = sha256File(evidencePath);
  const contractDigest = digestObject({ run_id: runId, candidate: evidence.candidate, independence, required_reports: [...REQUIRED_REPORTS.values()] });
  const evaluationId = `evaluation_ci_${String(workflowRunId).replaceAll(/[^a-z0-9_-]/gi, '_').toLowerCase()}`;
  const packet = {
    outcome_version: '1.0.0', outcome_id: `outcome_ci_${String(workflowRunId).replaceAll(/[^a-z0-9_-]/gi, '_').toLowerCase()}`,
    run_id: runId, contract_digest: contractDigest, root: actualRoot, branch,
    starting_head: actualHead, starting_tree: actualTree, ending_head: actualHead, ending_tree: actualTree, git_status: [],
    requirements: checks.map((check) => ({ requirement_id: check.requirement_id, status: 'accepted', evaluation_ids: [evaluationId] })),
    artifacts: [{ artifact_id: 'artifact_ci_pr_outcome_evidence', path: 'pr-outcome-evidence.json', sha256: evidenceDigest }],
    evaluation_summary: { evaluation_ids: [evaluationId], total_assertions: checks.length, passed: checks.length, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: evidence.independence.satisfied },
    effects: [], approvals: [], evidence_index: [{ artifact_id: 'artifact_ci_pr_outcome_evidence', path: 'pr-outcome-evidence.json', sha256: evidenceDigest }],
    limitations: ['CI-generated PR outcome proves five same-run required checks and deterministic evaluator separation from recorded PR/candidate identities; it does not prove human or CODEOWNER review, release, deployment, reachability, ownership, or user proof.'],
    terminal_state: 'succeeded', knowledge_receipts: [], created_at: new Date().toISOString(),
  };
  packet.packet_digest = digestObject(packet);
  const validation = validateOutcomePacket(packet);
  if (!validation.valid) throw new Error(`Generated PR OutcomePacketV1 is invalid: ${validation.issues.join('; ')}`);
  const outputPath = path.join(outputDirectory, 'outcome.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  return { ok: true, output_path: outputPath, file_sha256: sha256File(outputPath), packet_digest: packet.packet_digest, candidate: evidence.candidate, exact_counts: evidence.exact_counts, packet };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const event = options.event_path ? readJson(path.resolve(options.event_path)) : null;
  const body = event?.pull_request?.body ?? '';
  const bodyRunId = /^- \*\*Run ID:\*\*\s*`?([^`\s]+)`?\s*$/mi.exec(body)?.[1] ?? null;
  const eventSubmitterIdentity = event?.pull_request?.user?.login ?? null;
  const explicitSubmitterIdentity = options.pr_submitter_identity ?? null;
  if (eventSubmitterIdentity && explicitSubmitterIdentity && eventSubmitterIdentity.toLocaleLowerCase('en-US') !== explicitSubmitterIdentity.toLocaleLowerCase('en-US')) {
    throw new Error(`Explicit PR submitter ${explicitSubmitterIdentity} conflicts with pull-request event submitter ${eventSubmitterIdentity}`);
  }
  const eventBaseSha = event?.pull_request?.base?.sha ?? null;
  const explicitBaseSha = options.base_sha ?? null;
  if (eventBaseSha && explicitBaseSha && eventBaseSha !== explicitBaseSha) throw new Error(`Explicit base SHA ${explicitBaseSha} conflicts with pull-request event base ${eventBaseSha}`);
  const workflowRunId = options.workflow_run_id ?? process.env.GITHUB_RUN_ID;
  const workflowRunAttempt = options.workflow_run_attempt ?? process.env.GITHUB_RUN_ATTEMPT ?? '1';
  const derivedEvaluatorIdentity = workflowRunId ? `github-actions:pr-outcome:${workflowRunId}:${workflowRunAttempt}` : null;
  if (options.evaluator_identity && options.evaluator_identity !== derivedEvaluatorIdentity) {
    throw new Error(`Explicit evaluator identity ${options.evaluator_identity} conflicts with runtime identity ${derivedEvaluatorIdentity}`);
  }
  const evaluatorIdentity = derivedEvaluatorIdentity;
  const result = generatePrOutcome({
    root,
    evidenceRoot: path.resolve(options.evidence_root),
    outputDirectory: path.resolve(options.output_directory),
    runId: options.run_id ?? bodyRunId,
    branch: options.branch ?? event?.pull_request?.head?.ref,
    expectedSha: options.expected_sha ?? event?.pull_request?.head?.sha ?? process.env.EXPECTED_SHA,
    workflowRunId,
    workflowRunAttempt,
    jobResults: options.job_results_json ? JSON.parse(options.job_results_json) : {},
    baseSha: eventBaseSha ?? explicitBaseSha,
    prSubmitterIdentity: eventSubmitterIdentity ?? explicitSubmitterIdentity,
    prSubmitterSource: eventSubmitterIdentity ? 'pull_request.user.login' : 'explicit-input',
    evaluatorIdentity,
    evaluatorSource: 'github-actions-run-and-job',
  });
  if (options.json_out) writeReport(path.resolve(options.json_out), { ...result, packet: undefined });
  process.stdout.write(`${JSON.stringify({ ...result, packet: undefined }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
