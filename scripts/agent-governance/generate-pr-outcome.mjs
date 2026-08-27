#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createContract, digestContract, loadLoopProfile } from '../agent-system/contract.mjs';
import { promoteOutcome } from '../agent-system/outcome.mjs';
import { startRun } from '../agent-system/runner.mjs';
import { appendEvent, terminate } from '../agent-system/ledger.mjs';
import { recordArtifact } from '../agent-system/artifacts.mjs';
import { recordEvaluation } from '../agent-system/evaluator.mjs';
import { writeRunnerProvenance } from '../agent-system/provenance.mjs';
import { validateAgentContract, validateContractProfileAlignment } from '../agent-system/validate.mjs';
import { digestObject, parseArgs, readJson, sha256File, writeReport } from './lib.mjs';
import { buildGithubExecutionAttestation, requestGithubOidcToken } from './execution-attestation.mjs';

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

export async function generatePrOutcome({
  root, evidenceRoot, outputDirectory, runId, branch, expectedSha, workflowRunId,
  workflowRunAttempt = '1', jobResults = {}, baseSha, prSubmitterIdentity,
  prSubmitterSource = 'explicit-input', evaluatorIdentity,
  evaluatorSource = 'explicit-input', loopProfile, executionToken = null,
}) {
  const actualHead = git(root, ['rev-parse', 'HEAD']);
  const actualTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const actualRoot = git(root, ['rev-parse', '--show-toplevel']);
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '') || actualHead !== expectedSha) throw new Error(`PR outcome requires exact head ${expectedSha}; observed ${actualHead}`);
  if (status) throw new Error(`PR outcome candidate is dirty: ${status.replaceAll('\n', '; ')}`);
  if (!/^run_[a-z0-9][a-z0-9_-]{7,95}$/.test(runId ?? '')) throw new Error('PR outcome requires a schema-compatible run_id');
  if (!branch) throw new Error('PR outcome requires the pull-request head branch');
  if (!loopProfile) throw new Error('PR outcome requires an explicit agent loop profile');
  if (loopProfile !== 'implementation') throw new Error(`PR CI acceptance currently supports only the implementation profile; ${loopProfile} requires a separately evaluated aligned outcome`);
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
  const changedPaths = git(root, ['diff', '--name-only', `${baseSha}..${actualHead}`, '--']).split('\n').filter(Boolean);
  const createdAt = new Date().toISOString();
  const acceptanceContract = createContract({
    root: actualRoot,
    runId,
    loopProfile,
    branch,
    startingHead: actualHead,
    startingTree: actualTree,
    createdAt,
    createdBy: prSubmitterIdentity,
    createdByKind: 'human',
    task: {
      title: 'Exact-candidate PR acceptance',
      objective: 'Accept this exact pull-request candidate only after every required same-run assertion passes.',
      deliverable: 'Attested exact-candidate OutcomePacketV1',
    },
    inPaths: changedPaths,
    allowedWrites: [],
    knowledgePolicy: { port_version: '1.0.0', preflight_required: false, record_outcome: true, verify_recall: true, degraded_context_allowed: true, disallowed_fallbacks: ['cross_root'] },
  });
  const contractValidation = validateAgentContract(acceptanceContract, { expectedRoot: actualRoot });
  if (!contractValidation.valid) throw new Error(`Generated PR acceptance contract is invalid: ${contractValidation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  const profileAlignment = validateContractProfileAlignment(acceptanceContract, loadLoopProfile(loopProfile));
  if (!profileAlignment.valid) throw new Error(`Generated PR acceptance contract is not aligned: ${profileAlignment.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  const contractPath = path.join(outputDirectory, 'acceptance-contract.json');
  fs.writeFileSync(contractPath, `${JSON.stringify(acceptanceContract, null, 2)}\n`);
  const contractDigest = digestContract(acceptanceContract);
  const evidence = {
    pr_outcome_evidence_version: '1.0.0',
    source: 'same-workflow-run-artifacts',
    workflow_run_id: String(workflowRunId),
    workflow_run_attempt: String(workflowRunAttempt),
    run_id: runId,
    candidate: { root: actualRoot, branch, commit: actualHead, tree: actualTree, git_status: [] },
    pull_request_range: { base_sha: baseSha, head_sha: actualHead, changed_paths: changedPaths },
    evidence_level: 'exact-candidate',
    independence,
    acceptance_contract: { path: 'acceptance-contract.json', sha256: sha256File(contractPath), contract_digest: contractDigest, loop_profile: loopProfile, purpose: 'post-hoc exact-candidate acceptance verifier; not original task-creation proof' },
    checks,
    measurements: {
      unaccepted_requirement_count: { value: 0, source_jobs: ['agent-contract', 'repo-governance'] },
      focused_test_failure_count: { value: 0, source_jobs: ['agent-runner', 'repo-governance', 'application-fast-assurance'] },
      production_entrypoint_status: { value: 'passed', source_jobs: ['application-fast-assurance'] },
      unattributed_out_of_scope_path_count: { value: 0, source_jobs: ['repo-governance'] },
      critical_regression_count: { value: 0, source_jobs: ['agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance', 'application-fast-assurance'] },
    },
    job_results: Object.fromEntries(expectedJobs.map((job) => [job, jobResults[job]])),
    exact_counts: { total: checks.length, passed: checks.length, failed: 0, skipped: 0 },
    created_at: createdAt,
  };
  const evidencePath = path.join(outputDirectory, 'pr-outcome-evidence.json');
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const attestation = buildGithubExecutionAttestation({
    token: executionToken ?? requestGithubOidcToken(),
    candidate: evidence.candidate,
    evaluatedAt: createdAt,
  });
  const attestationPath = path.join(outputDirectory, 'execution-attestation.json');
  fs.writeFileSync(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`);
  const { run_directory: runDirectory } = await startRun(acceptanceContract, {
    runsRoot: outputDirectory,
    observedIdentity: { root: actualRoot, branch, head: actualHead, tree: actualTree },
    actor: evaluatorIdentity,
  });
  await appendEvent(runDirectory, {
    run_id: runId, event_type: 'observation_recorded', actor: evaluatorIdentity,
    payload: { surface: 'github-actions-same-run-exact-head-reports', evidence_level: 'exact-candidate', readback: { root: actualRoot, branch, commit: actualHead, tree: actualTree, git_status: [], workflow_run_id: String(workflowRunId), report_count: checks.length } },
  });
  const evidenceArtifact = (await recordArtifact(runDirectory, acceptanceContract, path.relative(actualRoot, evidencePath), { artifactType: 'PrOutcomeEvidenceV1', actor: evaluatorIdentity })).artifact;
  const attestationArtifact = (await recordArtifact(runDirectory, acceptanceContract, path.relative(actualRoot, attestationPath), { artifactType: 'ExecutionAttestationV1', actor: evaluatorIdentity })).artifact;
  const lockfile = path.join(actualRoot, 'package-lock.json');
  const evidenceFields = {
    root: actualRoot, branch, commit: actualHead, tree: actualTree, clean: true,
    lockfile_digests: fs.existsSync(lockfile) ? [sha256File(lockfile)] : [],
    commands: acceptanceContract.evaluator.deterministic_commands.map((command) => `${command.command}${command.args?.length ? ` ${command.args.join(' ')}` : ''}`),
    exact_counts: evidence.exact_counts,
  };
  const measurementDocument = {
    measurement_evidence_version: '1.0.0', candidate_digest: digestObject(evidence.candidate), candidate_identity: evidence.candidate,
    measurements: Object.fromEntries(Object.entries(evidence.measurements).map(([subject, measurement]) => [subject, { value: measurement.value, evidence_level: 'exact-candidate', evidence_fields: evidenceFields }])),
  };
  const measurementPath = path.join(outputDirectory, 'measurement-evidence.json');
  fs.writeFileSync(measurementPath, `${JSON.stringify(measurementDocument, null, 2)}\n`);
  const measurementArtifact = (await recordArtifact(runDirectory, acceptanceContract, path.relative(actualRoot, measurementPath), { artifactType: 'MeasurementEvidenceV1', actor: evaluatorIdentity })).artifact;
  const bindings = Object.fromEntries(Object.entries(measurementDocument.measurements).map(([subject, measurement]) => [subject, { value: measurement.value, evidence_level: measurement.evidence_level, evidence_artifact_ids: [measurementArtifact.artifact_id] }]));
  const evaluation = await recordEvaluation(runDirectory, acceptanceContract, { evaluatorIdentity, evaluatorKind: 'deterministic', evaluatorVersion: 'github-actions-pr-outcome-v1', measurements: bindings });
  if (!evaluation.accepted) throw new Error(`Fresh deterministic PR evaluation failed: ${evaluation.counts.failed} failed, ${evaluation.counts.blocked} blocked`);
  await terminate(runDirectory, runId, 'succeeded', { evaluation_id: evaluation.evaluation_id }, evaluatorIdentity);
  const runnerProvenancePath = path.join(outputDirectory, 'runner-provenance.json');
  const runnerProvenance = await writeRunnerProvenance(runDirectory, acceptanceContract, runnerProvenancePath);
  const outputPath = path.join(outputDirectory, 'outcome.json');
  const packet = await promoteOutcome(runDirectory, acceptanceContract, outputPath, { runnerProvenance, limitations: ['CI-generated PR outcome proves five same-run required checks and deterministic evaluator separation from recorded PR/candidate identities; it does not prove human or CODEOWNER review, release, deployment, reachability, ownership, or user proof.'] });
  return { ok: true, output_path: outputPath, contract_path: contractPath, execution_attestation_path: attestationPath, runner_provenance_path: runnerProvenancePath, run_directory: runDirectory, contract_digest: contractDigest, file_sha256: sha256File(outputPath), packet_digest: packet.packet_digest, candidate: evidence.candidate, exact_counts: evidence.exact_counts, packet };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const event = options.event_path ? readJson(path.resolve(options.event_path)) : null;
  const body = event?.pull_request?.body ?? '';
  const bodyRunId = /^- \*\*Run ID:\*\*\s*`?([^`\s]+)`?\s*$/mi.exec(body)?.[1] ?? null;
  const bodyLoopProfile = /^- \*\*Agent loop profile:\*\*\s*`?([^`\s]+)`?\s*$/mi.exec(body)?.[1] ?? null;
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
  const result = await generatePrOutcome({
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
    loopProfile: options.loop_profile ?? bodyLoopProfile,
  });
  if (options.json_out) writeReport(path.resolve(options.json_out), { ...result, packet: undefined });
  process.stdout.write(`${JSON.stringify({ ...result, packet: undefined }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
