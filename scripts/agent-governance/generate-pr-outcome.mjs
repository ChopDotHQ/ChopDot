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
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function findNamed(root, name, matches = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) findNamed(candidate, name, matches);
    else if (entry.isFile() && entry.name === name) matches.push(candidate);
  }
  return matches;
}

export function generatePrOutcome({ root, evidenceRoot, outputDirectory, runId, branch, expectedSha, workflowRunId, workflowRunAttempt = '1', jobResults = {} }) {
  const actualHead = git(root, ['rev-parse', 'HEAD']);
  const actualTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const actualRoot = git(root, ['rev-parse', '--show-toplevel']);
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '') || actualHead !== expectedSha) throw new Error(`PR outcome requires exact head ${expectedSha}; observed ${actualHead}`);
  if (status) throw new Error(`PR outcome candidate is dirty: ${status.replaceAll('\n', '; ')}`);
  if (!/^run_[a-z0-9][a-z0-9_-]{7,95}$/.test(runId ?? '')) throw new Error('PR outcome requires a schema-compatible run_id');
  if (!branch) throw new Error('PR outcome requires the pull-request head branch');
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
    checks,
    job_results: Object.fromEntries(expectedJobs.map((job) => [job, jobResults[job]])),
    exact_counts: { total: checks.length, passed: checks.length, failed: 0, skipped: 0 },
    created_at: new Date().toISOString(),
  };
  const evidencePath = path.join(outputDirectory, 'pr-outcome-evidence.json');
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const evidenceDigest = sha256File(evidencePath);
  const contractDigest = digestObject({ run_id: runId, candidate: evidence.candidate, required_reports: [...REQUIRED_REPORTS.values()] });
  const evaluationId = `evaluation_ci_${String(workflowRunId).replaceAll(/[^a-z0-9_-]/gi, '_').toLowerCase()}`;
  const packet = {
    outcome_version: '1.0.0', outcome_id: `outcome_ci_${String(workflowRunId).replaceAll(/[^a-z0-9_-]/gi, '_').toLowerCase()}`,
    run_id: runId, contract_digest: contractDigest, root: actualRoot, branch,
    starting_head: actualHead, starting_tree: actualTree, ending_head: actualHead, ending_tree: actualTree, git_status: [],
    requirements: checks.map((check) => ({ requirement_id: check.requirement_id, status: 'accepted', evaluation_ids: [evaluationId] })),
    artifacts: [{ artifact_id: 'artifact_ci_pr_outcome_evidence', path: 'pr-outcome-evidence.json', sha256: evidenceDigest }],
    evaluation_summary: { evaluation_ids: [evaluationId], total_assertions: checks.length, passed: checks.length, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true },
    effects: [], approvals: [], evidence_index: [{ artifact_id: 'artifact_ci_pr_outcome_evidence', path: 'pr-outcome-evidence.json', sha256: evidenceDigest }],
    limitations: ['CI-generated PR outcome proves the five same-run required checks; it is not release, deployment, reachability, ownership, or user proof.'],
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
  const result = generatePrOutcome({
    root,
    evidenceRoot: path.resolve(options.evidence_root),
    outputDirectory: path.resolve(options.output_directory),
    runId: options.run_id ?? bodyRunId,
    branch: options.branch ?? event?.pull_request?.head?.ref,
    expectedSha: options.expected_sha ?? event?.pull_request?.head?.sha ?? process.env.EXPECTED_SHA,
    workflowRunId: options.workflow_run_id,
    workflowRunAttempt: options.workflow_run_attempt,
    jobResults: options.job_results_json ? JSON.parse(options.job_results_json) : {},
  });
  if (options.json_out) writeReport(path.resolve(options.json_out), { ...result, packet: undefined });
  process.stdout.write(`${JSON.stringify({ ...result, packet: undefined }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
