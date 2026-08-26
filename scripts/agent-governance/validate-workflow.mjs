#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './lib.mjs';

const REQUIRED_JOBS = new Map([
  ['pr-context', 'PR context'],
  ['agent-contract', 'Agent contract'],
  ['agent-runner', 'Agent runner'],
  ['knowledge-adapters', 'Knowledge adapters'],
  ['repo-governance', 'Repo governance'],
  ['application-fast-assurance', 'Application fast assurance'],
  ['pr-outcome', 'PR outcome'],
  ['release-enforcement', 'Release enforcement'],
]);

const REQUIRED_RUN_TOKENS = new Map([
  ['pr-context', ['gh api --method GET', 'pull_request_number', 'SELECTED_REF_NAME', 'pr-event.json']],
  ['agent-contract', ['scripts/agent-system/cli.mjs validate', 'scripts/agent-system/cli.mjs instruction-validate', 'core-contract.test.mjs']],
  ['agent-runner', ['ledger-runner.test.mjs', 'effects-approvals.test.mjs', 'evaluator-outcome.test.mjs', 'fail-closed.test.mjs']],
  ['knowledge-adapters', ['knowledge-adapters.test.mjs', 'adapters-compat-cli.test.mjs']],
  ['repo-governance', ['validate-repository.mjs', 'validate-pr.mjs', 'scripts/agent-governance/tests/*.test.mjs']],
  ['application-fast-assurance', ['npm run lint', 'npm run build', 'npm run test:node', 'npm run security:baseline']],
  ['pr-outcome', ['generate-pr-outcome.mjs', 'validate-pr.mjs', 'outcome-attestation.jsonl']],
  ['release-enforcement', ['scripts/agent-governance/enforce-release.mjs']],
]);

function stripYamlComment(line) {
  let single = false;
  let double = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" && !double) single = !single;
    else if (char === '"' && !single && line[index - 1] !== '\\') double = !double;
    else if (char === '#' && !single && !double && (index === 0 || /\s/.test(line[index - 1]))) return line.slice(0, index).trimEnd();
  }
  return line;
}

function scalar(value = '') {
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) return trimmed.slice(1, -1);
  return trimmed;
}

function entries(source) {
  return source.split('\n').map((raw, index) => {
    const clean = stripYamlComment(raw.replaceAll('\t', '  '));
    return { line: index + 1, indent: clean.match(/^ */)?.[0].length ?? 0, text: clean.trim(), raw: clean };
  }).filter((entry) => entry.text);
}

function keyValue(text) {
  const normalized = text.startsWith('- ') ? text.slice(2) : text;
  const match = /^([^:]+):(?:\s*(.*))?$/.exec(normalized);
  return match ? { key: match[1].trim(), value: scalar(match[2] ?? '') } : null;
}

function isFalseCondition(value) {
  const compact = scalar(value).toLowerCase().replaceAll(/\s+/g, '');
  return compact === 'false' || compact === '0' || compact === '${{false}}' || compact.includes('&&false}}');
}

function parseStep(block, start, end) {
  const step = { fields: {}, with: {}, run: '', line: block[start].line };
  let inWith = false;
  for (let index = start; index < end; index += 1) {
    const entry = block[index];
    const pair = keyValue(entry.text);
    if (!pair) continue;
    if (entry.indent === 6 && index === start) step.fields[pair.key] = pair.value;
    else if (entry.indent === 8) {
      inWith = pair.key === 'with';
      if (!inWith) step.fields[pair.key] = pair.value;
    } else if (entry.indent === 10 && inWith) step.with[pair.key] = pair.value;
    if (entry.indent === 8 && pair.key === 'run') {
      const commandLines = [];
      let cursor = index + 1;
      while (cursor < end && block[cursor].indent > 8) commandLines.push(block[cursor++].text);
      step.run = pair.value === '|' || pair.value === '>-' ? commandLines.join('\n') : [pair.value, ...commandLines].filter(Boolean).join('\n');
    }
  }
  if (!step.run) step.run = step.fields.run ?? '';
  return step;
}

function parseJob(block) {
  const fields = {};
  const permissions = {};
  const steps = [];
  const needs = [];
  let inPermissions = false;
  let inSteps = false;
  let inNeeds = false;
  for (let index = 0; index < block.length; index += 1) {
    const entry = block[index];
    const pair = keyValue(entry.text);
    if (entry.indent === 4 && pair) {
      fields[pair.key] = pair.value;
      inPermissions = pair.key === 'permissions';
      inSteps = pair.key === 'steps';
      inNeeds = pair.key === 'needs';
    } else if (entry.indent === 6 && pair && inPermissions && !entry.text.startsWith('- ')) permissions[pair.key] = pair.value;
    if (entry.indent === 6 && entry.text.startsWith('- ') && inNeeds) needs.push(entry.text.slice(2).trim());
    if (entry.indent === 6 && entry.text.startsWith('- ') && inSteps) {
      let end = index + 1;
      while (end < block.length && !(block[end].indent === 6 && block[end].text.startsWith('- '))) end += 1;
      steps.push(parseStep(block, index, end));
      index = end - 1;
    }
  }
  const checkoutSteps = steps.filter((step) => step.fields.uses?.startsWith('actions/checkout@'));
  const assertionSteps = steps.filter((step) => step.run.includes('scripts/agent-governance/assert-exact-head.mjs'));
  return {
    name: fields.name ?? null, fields, permissions, needs, steps,
    uses: steps.map((step) => step.fields.uses).filter(Boolean),
    exact_checkout_refs: checkoutSteps.filter((step) => step.with.ref === '${{ env.EXPECTED_SHA }}').length,
    full_history_checkouts: checkoutSteps.filter((step) => step.with['fetch-depth'] === '0').length,
    checkout_count: checkoutSteps.length,
    exact_head_assertions: assertionSteps.length,
    block: block.map((entry) => entry.raw).join('\n'),
  };
}

export function parseWorkflowStructure(source) {
  const parsedEntries = entries(source);
  const jobs = {};
  const permissions = {};
  const triggers = new Set();
  let sectionName = null;
  for (let index = 0; index < parsedEntries.length; index += 1) {
    const entry = parsedEntries[index];
    const pair = keyValue(entry.text);
    if (entry.indent === 0 && pair) sectionName = pair.key;
    else if (sectionName === 'permissions' && entry.indent === 2 && pair) permissions[pair.key] = pair.value;
    else if (sectionName === 'on' && entry.indent === 2 && pair) triggers.add(pair.key);
    if (sectionName === 'jobs' && entry.indent === 2 && pair && !pair.value) {
      let end = index + 1;
      while (end < parsedEntries.length && parsedEntries[end].indent !== 0 && !(parsedEntries[end].indent === 2 && keyValue(parsedEntries[end].text) && !keyValue(parsedEntries[end].text).value)) end += 1;
      jobs[pair.key] = parseJob(parsedEntries.slice(index + 1, end));
      index = end - 1;
    }
  }
  const envStart = parsedEntries.findIndex((entry) => entry.indent === 0 && keyValue(entry.text)?.key === 'env');
  const envExpected = envStart >= 0 && parsedEntries.slice(envStart + 1).some((entry) => entry.indent === 2 && keyValue(entry.text)?.key === 'EXPECTED_SHA'
    && keyValue(entry.text)?.value === '${{ github.event.pull_request.head.sha || github.sha }}');
  const envBranch = envStart >= 0 && parsedEntries.slice(envStart + 1).some((entry) => entry.indent === 2 && keyValue(entry.text)?.key === 'EXPECTED_BRANCH'
    && keyValue(entry.text)?.value === '${{ github.event.pull_request.head.ref || github.ref_name }}');
  const dispatchInputs = {};
  const dispatchStart = parsedEntries.findIndex((entry) => entry.indent === 2 && keyValue(entry.text)?.key === 'workflow_dispatch');
  if (dispatchStart >= 0) {
    let currentInput = null;
    let inOptions = false;
    for (let index = dispatchStart + 1; index < parsedEntries.length; index += 1) {
      const entry = parsedEntries[index];
      if (entry.indent <= 2) break;
      const pair = keyValue(entry.text);
      if (entry.indent === 6 && pair && !pair.value) {
        currentInput = pair.key;
        dispatchInputs[currentInput] = { fields: {}, options: [] };
        inOptions = false;
      } else if (entry.indent === 8 && pair && currentInput) {
        dispatchInputs[currentInput].fields[pair.key] = pair.value;
        inOptions = pair.key === 'options';
      } else if (entry.indent === 10 && entry.text.startsWith('- ') && currentInput && inOptions) {
        dispatchInputs[currentInput].options.push(scalar(entry.text.slice(2)));
      }
    }
  }
  return {
    jobs, permissions, workflow_dispatch_inputs: dispatchInputs,
    permissions_contents_read: permissions.contents === 'read' && Object.keys(permissions).length === 1,
    expected_sha_expression: envExpected,
    expected_branch_expression: envBranch,
    pull_request_trigger: triggers.has('pull_request'),
    workflow_dispatch_trigger: triggers.has('workflow_dispatch'),
  };
}

export function validateWorkflow(source) {
  const parsed = parseWorkflowStructure(source);
  const errors = [];
  const warnings = [];
  let checks = 0;
  checks += 8;
  if (!parsed.permissions_contents_read) errors.push('Workflow permissions must be exactly contents: read with no broadened permissions');
  if (!parsed.expected_sha_expression) errors.push('Workflow must derive EXPECTED_SHA from the PR event head or github.sha');
  if (!parsed.expected_branch_expression) errors.push('Workflow must derive EXPECTED_BRANCH from the PR head branch or dispatched branch');
  if (!parsed.pull_request_trigger || !parsed.workflow_dispatch_trigger) errors.push('Workflow must support pull_request and workflow_dispatch');
  const dispatchMode = parsed.workflow_dispatch_inputs.dispatch_mode;
  const prNumber = parsed.workflow_dispatch_inputs.pull_request_number;
  if (dispatchMode?.fields.required !== 'true' || dispatchMode.fields.type !== 'choice' || dispatchMode.fields.default !== 'pr_validation'
    || JSON.stringify(dispatchMode.options) !== JSON.stringify(['pr_validation', 'release_enforcement'])) {
    errors.push('workflow_dispatch must require the exact pr_validation/release_enforcement mode choice with pr_validation default');
  }
  if (prNumber?.fields.type !== 'string' || prNumber.fields.required !== 'false') errors.push('workflow_dispatch pull_request_number must be an optional string with fail-closed runtime enforcement');
  if (parsed.workflow_dispatch_inputs.enforce_release) errors.push('Legacy enforce_release input can bypass the mutually exclusive dispatch mode');
  if (!parsed.workflow_dispatch_inputs.outcome_packet || !parsed.workflow_dispatch_inputs.approval_record) errors.push('Release evidence inputs must remain explicit for release_enforcement mode');
  for (const [id, expectedName] of REQUIRED_JOBS) {
    const job = parsed.jobs[id];
    checks += 1;
    if (!job) { errors.push(`Missing workflow job ${id}`); continue; }
    checks += 7;
    if (job.name !== expectedName) errors.push(`${id} must use stable job name ${expectedName}`);
    if (job.checkout_count !== 1 || job.exact_checkout_refs !== 1) errors.push(`${id} must checkout EXPECTED_SHA exactly once`);
    if (job.full_history_checkouts !== 1) errors.push(`${id} must fetch full candidate history exactly once`);
    if (job.exact_head_assertions !== 1) errors.push(`${id} must assert the checked-out head exactly once`);
    if (Object.hasOwn(job.fields, 'continue-on-error')) errors.push(`${id} cannot declare continue-on-error`);
    if (!['release-enforcement', 'pr-outcome'].includes(id) && job.fields.if) errors.push(`${id} cannot be conditionally skipped`);
    if (isFalseCondition(job.fields.if)) errors.push(`${id} is structurally disabled`);
    const allowedJobPermissions = id === 'pr-outcome'
      ? {contents: 'read', 'id-token': 'write', attestations: 'write'}
      : id === 'pr-context'
        ? {contents: 'read', 'pull-requests': 'read'}
        : {};
    for (const [permission, level] of Object.entries(job.permissions)) {
      checks += 1;
      if (allowedJobPermissions[permission] !== level) errors.push(`${id} broadens permission ${permission}: ${level}`);
    }
    for (const [permission, level] of Object.entries(allowedJobPermissions)) {
      checks += 1;
      if (job.permissions[permission] !== level) errors.push(`${id} requires job permission ${permission}: ${level}`);
    }
    for (const [index, step] of job.steps.entries()) {
      checks += 3;
      if (Object.hasOwn(step.fields, 'continue-on-error')) errors.push(`${id} step ${index + 1} cannot declare continue-on-error`);
      if (isFalseCondition(step.fields.if)) errors.push(`${id} step ${index + 1} is structurally disabled`);
      if (step.fields.if) {
        const allowedAlways = step.fields.if === 'always()' && /^(Publish|Upload)/.test(step.fields.name ?? '');
        const allowedPullRequest = [
          "github.event_name == 'pull_request'",
          "github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'pr_validation')",
        ].includes(step.fields.if) && /pull-request/i.test(step.fields.name ?? '');
        if (!allowedAlways && !allowedPullRequest) errors.push(`${id} step ${index + 1} cannot be conditionally skipped`);
      }
    }
    for (const [index, step] of job.steps.entries()) {
      if (step.fields.uses?.startsWith('actions/upload-artifact@')) {
        checks += 1;
        if (step.with['if-no-files-found'] !== 'error') errors.push(`${id} upload step ${index + 1} must fail when its evidence is absent`);
      }
    }
    for (const action of job.uses) {
      checks += 1;
      if (!/^[^@]+@[0-9a-f]{40}$/.test(action)) errors.push(`${id} uses an unpinned action: ${action}`);
    }
    const executable = job.steps.map((step) => step.run).filter(Boolean).join('\n');
    for (const token of REQUIRED_RUN_TOKENS.get(id) ?? []) {
      checks += 1;
      if (!executable.includes(token)) errors.push(`${id} lacks required executable command: ${token}`);
    }
  }
  const release = parsed.jobs['release-enforcement'];
  const prOutcome = parsed.jobs['pr-outcome'];
  const prContext = parsed.jobs['pr-context'];
  const repoGovernance = parsed.jobs['repo-governance'];
  const coreNeeds = ['agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance', 'application-fast-assurance'];
  const requiredNeeds = ['pr-context', ...coreNeeds];
  const prValidationCondition = "github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'pr_validation')";
  checks += 9;
  if (prOutcome?.fields.if !== prValidationCondition) errors.push('PR outcome must run only for pull_request or exact pr_validation dispatch mode');
  if (JSON.stringify(prOutcome?.needs ?? []) !== JSON.stringify(requiredNeeds)) errors.push('PR outcome must need all five exact-head jobs in canonical order');
  if (JSON.stringify(repoGovernance?.needs ?? []) !== JSON.stringify(['pr-context'])) errors.push('Repo governance must need the exact PR context job');
  const contextCommand = prContext?.steps.map((step) => step.run).filter(Boolean).join('\n') ?? '';
  for (const token of [
    '=~ ^[1-9][0-9]*$', '[[ "$SELECTED_REF_TYPE" == "branch" ]]', 'repos/$REPOSITORY/pulls/$DISPATCH_PR_NUMBER',
    '.number == $number', '.state == "open"', '.base.repo.full_name == $repo',
    '.head.repo.full_name == $repo', '.head.sha == $head', '.head.ref == $branch',
    '.base.sha | test("^[0-9a-f]{40}$")', '.head.sha | test("^[0-9a-f]{40}$")',
    'release_enforcement cannot carry a pull_request_number',
  ]) {
    if (!contextCommand.includes(token)) errors.push(`PR context lacks fail-closed live binding: ${token}`);
  }
  if (!prContext?.steps.some((step) => step.fields.uses?.startsWith('actions/upload-artifact@') && step.with.name === 'pr-context-${{ github.run_id }}')) errors.push('PR context must upload one same-run exact event artifact');
  const repoContextDownloads = repoGovernance?.steps.filter((step) => step.fields.uses?.startsWith('actions/download-artifact@') && step.with.name === 'pr-context-${{ github.run_id }}') ?? [];
  if (repoContextDownloads.length !== 1) errors.push('Repo governance must download exactly one same-run PR context');
  else {
    const download = repoContextDownloads[0];
    if (download.with.path !== '${{ runner.temp }}/pr-context-input') errors.push('Repo governance PR context must download outside the Git checkout');
    for (const override of ['run-id', 'github-token', 'repository']) if (Object.hasOwn(download.with, override)) errors.push(`Repo governance cannot override PR-context ${override}`);
  }
  const repoExecutable = repoGovernance?.steps.map((step) => step.run).filter(Boolean).join('\n') ?? '';
  if (!repoExecutable.includes('--event-path="${{ runner.temp }}/pr-context-input/pr-event.json"')) errors.push('Repo governance must validate the exact same-run PR event');
  const downloads = prOutcome?.steps.filter((step) => step.fields.uses?.startsWith('actions/download-artifact@')) ?? [];
  if (downloads.length !== 1) errors.push('PR outcome must have exactly one same-run evidence download');
  else {
    const download = downloads[0];
    checks += 6;
    if (download.with.pattern !== '*-${{ github.run_id }}') errors.push('PR outcome artifact pattern must bind the current workflow run ID');
    if (download.with.path !== '${{ runner.temp }}/agent-governance-input') errors.push('PR outcome evidence must download outside the Git checkout');
    if (download.with['merge-multiple'] !== 'false') errors.push('PR outcome evidence downloads must preserve per-job artifact boundaries');
    for (const override of ['run-id', 'github-token', 'repository']) if (Object.hasOwn(download.with, override)) errors.push(`PR outcome cannot override download-artifact ${override}`);
  }
  const prExecutable = prOutcome?.steps.map((step) => step.run).filter(Boolean).join('\n') ?? '';
  for (const job of coreNeeds) {
    checks += 1;
    if (!prExecutable.includes(`needs.${job}.result`)) errors.push(`PR outcome must bind the same-run result for ${job}`);
  }
  checks += 13;
  if (!prExecutable.includes('github.run_id')) errors.push('PR outcome generation must bind the current workflow run ID');
  const attestations = prOutcome?.steps.filter((step) => step.fields.uses?.startsWith('actions/attest-build-provenance@')) ?? [];
  if (attestations.length !== 1) errors.push('PR outcome must create exactly one GitHub build-provenance attestation');
  else {
    const attestation = attestations[0];
    if (attestation.fields.uses !== 'actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8') errors.push('PR outcome attestation action must remain pinned to the reviewed v4.2.2 commit');
    if (attestation.fields.id !== 'attest-outcome') errors.push('PR outcome attestation step must expose the canonical attest-outcome ID');
    if (attestation.with['subject-path'] !== '${{ runner.temp }}/pr-outcome/outcome.json') errors.push('PR outcome attestation must sign the exact generated external outcome packet');
  }
  if (!prExecutable.includes('steps.attest-outcome.outputs.bundle-path')) errors.push('PR outcome must retain the exact attestation bundle emitted by the signing step');
  if (prOutcome?.block.includes('$GOVERNANCE_REPORT_ROOT/pr-outcome')) errors.push('PR outcome evidence must not dirty the candidate checkout');
  if (!prExecutable.includes('pr-context-${{ github.run_id }}/pr-event.json')) errors.push('PR outcome must consume the exact same-run PR event artifact');
  if (release?.fields.if !== "github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'release_enforcement' && inputs.pull_request_number == ''") errors.push('Release enforcement must be mutually exclusive from PR dispatch validation');
  if (JSON.stringify(release?.needs ?? []) !== JSON.stringify(['pr-context'])) errors.push('Release enforcement must need the mode and PR-number context gate');
  if (release?.fields.environment !== 'public-testnet-release') errors.push('Release enforcement must use the protected release environment');
  if (!release?.steps.some((step) => step.run.includes('scripts/agent-governance/enforce-release.mjs'))) errors.push('Release enforcement must run the fail-closed evidence validator');
  if (release?.block.includes('CI_GENERATED')) errors.push('Release enforcement cannot use CI_GENERATED evidence');
  if (!release?.block.includes('${{ runner.temp }}/release-enforcement/')) errors.push('Release enforcement reports must not dirty the candidate checkout');
  return { ok: errors.length === 0, checks, errors, warnings, parsed };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const file = path.resolve(root, options.workflow ?? '.github/workflows/agent-governance.yml');
  if (!fs.existsSync(file)) throw new Error(`Workflow not found: ${file}`);
  const result = validateWorkflow(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
