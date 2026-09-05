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
  ['application-browser-assurance', 'Application browser assurance'],
  ['secrets-scan', 'Secrets scan'],
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
  ['application-browser-assurance', [
    'npx --no-install playwright install --with-deps chromium',
    'npm run test:release-browser',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'git status --porcelain --untracked-files=all',
  ]],
  ['secrets-scan', [
    'gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz',
    '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
    'sha256sum --check --strict',
    '$RUNNER_TEMP/gitleaks git . --redact --verbose --exit-code=1',
  ]],
  ['pr-outcome', ['generate-pr-outcome.mjs', 'validate-pr.mjs', 'outcome-attestation.jsonl']],
  ['release-enforcement', ['scripts/agent-governance/enforce-release.mjs']],
]);

const PR_GUARD_CONTEXT_ARGS = Object.freeze([
  '--surface=pr_merge',
  '--profile="$profile"',
  '--json-out="output/agent-runs/ci-pr-outcome/context-receipt.json"',
]);

const PR_RUN_DIRECTORY_ASSIGNMENT = `run_directory="$(jq -r '.run_directory' output/agent-runs/ci-pr-outcome/generation.json)"`;

const PR_GUARD_ACCEPT_ARGS = Object.freeze([
  '--surface=pr_merge',
  '--changed-paths="$changed_paths"',
  '--outcome="output/agent-runs/ci-pr-outcome/outcome.json"',
  '--contract="output/agent-runs/ci-pr-outcome/acceptance-contract.json"',
  '--knowledge-receipt="output/agent-runs/ci-pr-outcome/knowledge-recall.json"',
  '--execution-attestation="output/agent-runs/ci-pr-outcome/execution-attestation.json"',
  '--runner-provenance="output/agent-runs/ci-pr-outcome/runner-provenance.json"',
  '--run-directory="$run_directory"',
  '--context-receipt="output/agent-runs/ci-pr-outcome/context-receipt.json"',
  '--profile="$profile"',
  '--evidence-level=exact-candidate',
  '--expected-sha="$EXPECTED_SHA"',
  '--expected-tree="$(git rev-parse "$EXPECTED_SHA^{tree}")"',
  '--expected-branch="$EXPECTED_BRANCH"',
  '--json-out="output/agent-runs/ci-pr-outcome/acceptance-receipt.json"',
]);

const REQUIRED_DIRECT_INVOCATIONS = Object.freeze([
  {
    job: 'pr-outcome',
    step: 'Record and recall the exact PR outcome',
    command: 'node scripts/agent-system/cli.mjs knowledge-record',
    exactInvocation: 'node scripts/agent-system/cli.mjs knowledge-record --adapter=exact-source --outcome="output/agent-runs/ci-pr-outcome/outcome.json" --json > "output/agent-runs/ci-pr-outcome/knowledge-record.json"',
  },
  {
    job: 'pr-outcome',
    step: 'Record and recall the exact PR outcome',
    command: 'node scripts/agent-system/cli.mjs knowledge-verify',
    exactInvocation: 'node scripts/agent-system/cli.mjs knowledge-verify --adapter=exact-source --outcome-digest="$outcome_digest" --json > "output/agent-runs/ci-pr-outcome/knowledge-recall.json"',
  },
  {
    job: 'repo-governance',
    step: 'Validate repository invariants and provider independence',
    command: 'node scripts/agent-governance/validate-repository.mjs',
    args: [
      '--expected-sha="$EXPECTED_SHA"',
      '--json-out="$GOVERNANCE_REPORT_ROOT/repository.json"',
      '--md-out="$GOVERNANCE_REPORT_ROOT/repository.md"',
    ],
    exactWithArgs: true,
  },
  ...['lint', 'build', 'test:node', 'security:baseline'].map((script) => ({
    job: 'application-fast-assurance',
    step: 'Typecheck, build, focused Node suite, and security baseline',
    command: `npm run ${script}`,
    exact: true,
  })),
  {
    job: 'application-browser-assurance',
    step: 'Install exact Playwright Chromium',
    command: 'npx --no-install playwright install --with-deps chromium',
    exact: true,
  },
  {
    job: 'application-browser-assurance',
    step: 'Run production-entrypoint browser assurance',
    command: 'npm run test:release-browser',
    exact: true,
  },
  ...[
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'test -z "$(git status --porcelain --untracked-files=all)"',
  ].map((exactInvocation) => ({
    job: 'application-browser-assurance',
    step: 'Assert browser suite left repository clean',
    command: exactInvocation.split(' ')[0],
    exactInvocation,
  })),
  {
    job: 'secrets-scan',
    step: 'Download and verify pinned Gitleaks CLI',
    command: 'curl',
    exactInvocation: 'curl --fail --show-error --silent --location --proto \'=https\' --tlsv1.2 "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz" --output "$RUNNER_TEMP/gitleaks_8.30.1_linux_x64.tar.gz"',
  },
  {
    job: 'secrets-scan',
    step: 'Download and verify pinned Gitleaks CLI',
    command: 'sha256sum --check --strict',
    exactInvocation: 'sha256sum --check --strict <<< "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  $RUNNER_TEMP/gitleaks_8.30.1_linux_x64.tar.gz"',
  },
  {
    job: 'secrets-scan',
    step: 'Download and verify pinned Gitleaks CLI',
    command: 'tar',
    exactInvocation: 'tar -xzf "$RUNNER_TEMP/gitleaks_8.30.1_linux_x64.tar.gz" -C "$RUNNER_TEMP" gitleaks',
  },
  {
    job: 'secrets-scan',
    step: 'Scan exact repository history with redaction',
    command: '$RUNNER_TEMP/gitleaks',
    exactInvocation: '$RUNNER_TEMP/gitleaks git . --redact --verbose --exit-code=1 --report-format=json --report-path="$GOVERNANCE_REPORT_ROOT/gitleaks.json"',
  },
  {
    job: 'pr-outcome',
    step: 'Generate external exact-candidate OutcomePacketV1',
    command: 'node scripts/agent-governance/generate-pr-outcome.mjs',
    args: [
      '--event-path="${{ runner.temp }}/agent-governance-input/pr-context-${{ github.run_id }}/pr-event.json"',
      '--evidence-root="${{ runner.temp }}/agent-governance-input"',
      '--output-directory="output/agent-runs/ci-pr-outcome"',
      '--workflow-run-id="${{ github.run_id }}"',
      '--workflow-run-attempt="${{ github.run_attempt }}"',
      '--evaluator-identity="github-actions:pr-outcome:${{ github.run_id }}:${{ github.run_attempt }}"',
      "--job-results-json='{\"agent-contract\":\"${{ needs.agent-contract.result }}\",\"agent-runner\":\"${{ needs.agent-runner.result }}\",\"knowledge-adapters\":\"${{ needs.knowledge-adapters.result }}\",\"repo-governance\":\"${{ needs.repo-governance.result }}\",\"application-fast-assurance\":\"${{ needs.application-fast-assurance.result }}\",\"application-browser-assurance\":\"${{ needs.application-browser-assurance.result }}\",\"secrets-scan\":\"${{ needs.secrets-scan.result }}\"}'",
      '--json-out="output/agent-runs/ci-pr-outcome/generation.json"',
    ],
    exactWithArgs: true,
  },
  {
    job: 'release-enforcement',
    step: 'Generate current protected-environment execution attestation',
    command: 'node scripts/agent-governance/execution-attestation.mjs create',
    args: [
      '--expected-sha="$EXPECTED_SHA"',
      '--expected-branch="$EXPECTED_BRANCH"',
      '--json-out="${{ runner.temp }}/release-enforcement/execution-attestation.json"',
    ],
    exactWithArgs: true,
    env: {GH_TOKEN: '${{ github.token }}'},
  },
  {
    job: 'release-enforcement',
    step: 'Enforce approved immutable release evidence',
    command: 'node scripts/agent-governance/enforce-release.mjs',
    args: [
      '--outcome="${{ inputs.outcome_packet }}"',
      '--approval="${{ inputs.approval_record }}"',
      '--contract="${{ inputs.loop_contract }}"',
      '--knowledge-receipt="${{ inputs.knowledge_receipt }}"',
      '--runner-provenance="${{ inputs.runner_provenance }}"',
      '--run-directory="${{ inputs.run_directory }}"',
      '--execution-attestation="${{ runner.temp }}/release-enforcement/execution-attestation.json"',
      '--expected-sha="$EXPECTED_SHA"',
      '--json-out="${{ runner.temp }}/release-enforcement/release.json"',
      '--md-out="${{ runner.temp }}/release-enforcement/release.md"',
    ],
    exactWithArgs: true,
    env: {GH_TOKEN: '${{ github.token }}'},
  },
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

function directAdoptionGuardInvocations(run) {
  const logicalLines = [];
  let pending = '';
  for (const raw of String(run ?? '').split('\n')) {
    const line = stripYamlComment(raw).trim();
    if (!line) continue;
    pending = `${pending}${pending ? ' ' : ''}${line}`;
    if (pending.endsWith('\\')) {
      pending = pending.slice(0, -1).trimEnd();
      continue;
    }
    logicalLines.push(pending);
    pending = '';
  }
  if (pending) logicalLines.push(pending);
  return logicalLines.filter((line) => /^node\s+scripts\/agent-governance\/adoption-guard\.mjs\s+(?:context|accept)(?:\s|$)/u.test(line));
}

function executableStepCommands(step) {
  const lines = String(step?.run ?? '').split('\n').map((line) => stripYamlComment(line).trim()).filter(Boolean);
  if (step?.fields.run === '>-' || step?.fields.run === '>') return lines.length ? [lines.join(' ')] : [];
  const commands = [];
  let pending = '';
  for (const line of lines) {
    pending = `${pending}${pending ? ' ' : ''}${line}`;
    if (pending.endsWith('\\')) {
      pending = pending.slice(0, -1).trimEnd();
      continue;
    }
    commands.push(pending);
    pending = '';
  }
  if (pending) commands.push(pending);
  return commands;
}

// Only these packet consumers may skip, and only after the canonical producer and
// classifier below. Pinning a condition without its producer lets a workflow forge
// the flag and skip implementation acceptance.
const PR_OUTCOME_EXEMPTION_CONDITION = "steps.outcome-mode.outputs.deterministic_exemption != 'true'";
const PR_OUTCOME_PACKET_STEPS = new Set([
  'Record and recall the exact PR outcome',
  'Enforce governed PR acceptance',
  'Validate PR claims against generated outcome',
  'Attest the exact external outcome packet',
  'Retain the offline attestation bundle',
]);
const PR_OUTCOME_CLASSIFIER_COMMAND = 'echo "deterministic_exemption=$(jq -r \'.deterministic_exemption // false\' output/agent-runs/ci-pr-outcome/generation.json)" >> "$GITHUB_OUTPUT"';
const PR_OUTCOME_BOOTSTRAP = [
  {
    name: 'Checkout exact candidate',
    uses: 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    with: {ref: '${{ env.EXPECTED_SHA }}', 'fetch-depth': '0', 'persist-credentials': 'false'},
  },
  {
    name: 'Assert exact candidate checkout',
    commands: ['node scripts/agent-governance/assert-exact-head.mjs --json-out="${{ runner.temp }}/pr-outcome/pr-outcome-exact-head.json"'],
  },
  {
    name: 'Attach authenticated candidate branch identity',
    commands: [
      'git checkout -B "$EXPECTED_BRANCH" "$EXPECTED_SHA"',
      'test "$(git branch --show-current)" = "$EXPECTED_BRANCH"',
      'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
    ],
  },
  {
    name: 'Setup Node',
    uses: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    with: {'node-version': '22', cache: 'npm'},
  },
  {
    name: 'Download same-run exact-head evidence',
    uses: 'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
    with: {pattern: '*-${{ github.run_id }}', path: '${{ runner.temp }}/agent-governance-input', 'merge-multiple': 'false'},
  },
];

function isCanonicalPrOutcomeBootstrap(step, specification) {
  if (!step || step.fields.name !== specification.name) return false;
  const allowedKeys = specification.uses ? ['name', 'uses', 'with'] : ['name', 'run'];
  if (step.declaredKeys.some(key => !allowedKeys.includes(key)) || Object.keys(step.env).length) return false;
  if (specification.commands) {
    return !Object.keys(step.with).length
      && JSON.stringify(executableStepCommands(step)) === JSON.stringify(specification.commands);
  }
  return step.fields.uses === specification.uses && !step.run
    && Object.keys(step.with).length === Object.keys(specification.with).length
    && Object.entries(specification.with).every(([key, value]) => step.with[key] === value);
}

function isPrOutcomeExemptionCondition(job, step) {
  return job === 'pr-outcome'
    && PR_OUTCOME_PACKET_STEPS.has(step.fields.name)
    && step.fields.if === PR_OUTCOME_EXEMPTION_CONDITION;
}

function validatePrOutcomeExemptionWiring(job, errors) {
  const steps = job?.steps ?? [];
  const producers = steps.filter(step => step.fields.name === 'Generate external exact-candidate OutcomePacketV1');
  const classifiers = steps.filter(step => step.fields.name === 'Classify PR outcome mode');
  const classifierIds = steps.filter(step => step.fields.id === 'outcome-mode');
  const producer = producers[0];
  const classifier = classifiers[0];
  if (producers.length !== 1 || classifiers.length !== 1 || classifierIds.length !== 1 || classifierIds[0] !== classifier) {
    errors.push('PR outcome exemption requires one producer and one canonical outcome-mode classifier');
    return;
  }
  const producerSpec = REQUIRED_DIRECT_INVOCATIONS.find(specification => specification.step === producer.fields.name);
  const producerCommand = [producerSpec.command, ...producerSpec.args].join(' ');
  for (const [step, command, allowedFields] of [
    [producer, producerCommand, ['name', 'run']],
    [classifier, PR_OUTCOME_CLASSIFIER_COMMAND, ['name', 'id', 'run']],
  ]) {
    // Whole-command equality also rejects extra writes after the legitimate command.
    // Execution overrides must not replace the shell, working directory, or environment.
    if (JSON.stringify(executableStepCommands(step)) !== JSON.stringify([command])
      || step.declaredKeys.some(key => !allowedFields.includes(key))
      || Object.keys(step.env).length || Object.keys(step.with).length) {
      errors.push(`PR outcome exemption ${step.fields.name} must execute only its canonical command without execution overrides`);
    }
  }
  const producerIndex = steps.indexOf(producer);
  const classifierIndex = steps.indexOf(classifier);
  // Earlier commands can seed BASH_ENV (or other interpreter state) through
  // GITHUB_ENV without declaring env/defaults. Bind the entire reviewed prefix,
  // not a blacklist of one environment-write spelling.
  if (producerIndex !== PR_OUTCOME_BOOTSTRAP.length
    || PR_OUTCOME_BOOTSTRAP.some((specification, index) => !isCanonicalPrOutcomeBootstrap(steps[index], specification))) {
    errors.push('PR outcome exemption producer requires only the canonical bootstrap steps without execution overrides');
  }
  if (classifierIndex !== producerIndex + 1) errors.push('PR outcome exemption classifier must immediately follow its producer');
  for (const name of PR_OUTCOME_PACKET_STEPS) {
    const consumers = steps.filter(step => step.fields.name === name);
    if (consumers.length !== 1 || steps.indexOf(consumers[0]) <= classifierIndex
      || consumers[0].fields.if !== PR_OUTCOME_EXEMPTION_CONDITION) {
      errors.push(`PR outcome exemption requires exactly one conditioned ${name} after classification`);
    }
  }
}

function validatePrOutcomeExecutionContext(source, job, errors) {
  // This structural parser intentionally supports the reviewed workflow shape,
  // not arbitrary YAML. Unknown/quoted/escaped keys and mapping aliases must not
  // hide inherited execution settings from the producer/classifier checks.
  const sourceEntries = entries(source);
  const rootEntries = sourceEntries.filter(entry => entry.indent === 0);
  const rootKeys = new Set(['name', 'run-name', 'on', 'permissions', 'concurrency', 'env', 'jobs']);
  if (rootEntries.some(entry => !rootKeys.has(keyValue(entry.text)?.key))) {
    errors.push('PR outcome exemption requires reviewed plain workflow keys without hidden execution settings');
  }
  const jobKeys = new Set(['name', 'if', 'needs', 'runs-on', 'timeout-minutes', 'permissions', 'steps']);
  if (entries(job?.block ?? '').some(entry => entry.indent === 4 && !jobKeys.has(keyValue(entry.text)?.key))) {
    errors.push('PR outcome exemption cannot inherit unreviewed job execution settings or environment');
  }
  const environmentDeclarations = rootEntries.filter(entry => keyValue(entry.text)?.key === 'env');
  const expectedEnvironment = new Map([
    ['EXPECTED_SHA', '${{ github.event.pull_request.head.sha || github.sha }}'],
    ['EXPECTED_BRANCH', '${{ github.event.pull_request.head.ref || github.ref_name }}'],
    ['EXPECTED_BASE_BRANCH', "${{ github.event.pull_request.base.ref || '' }}"],
    ['GOVERNANCE_REPORT_ROOT', 'artifacts/agent-governance'],
  ]);
  const envStart = sourceEntries.indexOf(environmentDeclarations[0]);
  const envEnd = sourceEntries.findIndex((entry, index) => index > envStart && entry.indent === 0);
  const environmentEntries = envStart < 0 ? [] : sourceEntries.slice(envStart + 1, envEnd < 0 ? undefined : envEnd);
  const seen = new Set();
  const validEnvironment = environmentDeclarations.length === 1
    && keyValue(environmentDeclarations[0].text)?.value === ''
    && environmentEntries.length === expectedEnvironment.size
    && environmentEntries.every(entry => {
      const pair = keyValue(entry.text);
      if (entry.indent !== 2 || !pair || seen.has(pair.key) || !expectedEnvironment.has(pair.key)
        || expectedEnvironment.get(pair.key) !== pair.value) return false;
      seen.add(pair.key);
      return true;
    });
  if (!validEnvironment) errors.push('PR outcome exemption requires only the four canonical inherited workflow environment values');
}

function shellWeakeningReason(step, invocation) {
  const source = String(step?.run ?? '');
  if (/^\s*(?:if|elif|else|fi|case|esac|while|until|for|select|function)\b/gmu.test(source)
    || /^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\)\s*\{/gmu.test(source)) return 'shell control flow';
  if (/^\s*(?:set\s+\+e|trap\b)/gmu.test(source)) return 'shell error suppression';
  if (/\|\||&&|[;&]|(?<!\|)\|(?!\|)/u.test(invocation)) return 'shell chaining, backgrounding, or failure masking';
  return null;
}

function requireDirectInvocation(job, specification, errors) {
  const steps = job?.steps.filter((step) => step.fields.name === specification.step) ?? [];
  if (steps.length !== 1) {
    errors.push(`${specification.job} must contain exactly one ${specification.step} step`);
    return;
  }
  const step = steps[0];
  if (step.fields.if && !isPrOutcomeExemptionCondition(specification.job, step)) errors.push(`${specification.job} required command ${specification.command} cannot be conditionally skipped`);
  for (const [key, value] of Object.entries(specification.env ?? {})) {
    if (step.env?.[key] !== value) errors.push(`${specification.job} required command ${specification.command} requires ${key}: ${value}`);
  }
  const exactInvocation = specification.exactInvocation
    ?? (specification.exactWithArgs ? [specification.command, ...(specification.args ?? [])].join(' ') : null);
  const candidates = executableStepCommands(step).filter((line) => exactInvocation
    ? line === exactInvocation
    : specification.exact ? line === specification.command
    : line === specification.command || line.startsWith(`${specification.command} `));
  if (candidates.length !== 1) {
    errors.push(`${specification.job} must directly execute exactly one ${specification.command}`);
    return;
  }
  const invocation = candidates[0];
  const weakening = shellWeakeningReason(step, invocation);
  if (weakening) errors.push(`${specification.job} required command ${specification.command} is weakened by ${weakening}`);
  for (const argument of specification.args ?? []) {
    if (!invocation.includes(argument)) errors.push(`${specification.job} required command ${specification.command} lacks proof argument: ${argument}`);
  }
}

function requireDirectGuardInvocation(job, subcommand, requiredArgs, errors) {
  const steps = job?.steps.filter((step) => step.fields.name === 'Enforce governed PR acceptance') ?? [];
  if (steps.length !== 1) {
    errors.push('PR outcome must contain exactly one Enforce governed PR acceptance step');
    return;
  }
  if (/^\s*(?:if|elif|else|fi|case|esac|while|until|for|select|function)\b/gmu.test(steps[0].run)) {
    errors.push('PR adoption guard step cannot place proof execution behind shell control flow');
  }
  const invocations = directAdoptionGuardInvocations(steps[0].run)
    .filter((line) => line.startsWith(`node scripts/agent-governance/adoption-guard.mjs ${subcommand}`));
  if (invocations.length !== 1) {
    errors.push(`PR adoption guard must directly execute exactly one ${subcommand} invocation`);
    return;
  }
  const invocation = invocations[0];
  const executableLines = String(steps[0].run).split('\n').map((line) => stripYamlComment(line).trim()).filter(Boolean);
  if (subcommand === 'accept') {
    const runDirectoryAssignments = executableLines.filter((line) => /^(?:(?:export|readonly|declare|typeset)\s+)?run_directory=/u.test(line));
    if (runDirectoryAssignments.length !== 1 || runDirectoryAssignments[0] !== PR_RUN_DIRECTORY_ASSIGNMENT) {
      errors.push(`PR adoption guard accept must bind its runner directory with exactly: ${PR_RUN_DIRECTORY_ASSIGNMENT}`);
    }
  }
  if (subcommand === 'accept' && executableLines.at(-1) !== invocation) errors.push('PR adoption guard accept invocation must be the final executable command');
  if (/\|\||;\s*(?:true|:)\b/u.test(invocation)) errors.push(`PR adoption guard ${subcommand} invocation cannot mask failure`);
  for (const argument of requiredArgs) {
    if (!invocation.includes(argument)) errors.push(`PR adoption guard ${subcommand} invocation lacks required proof argument: ${argument}`);
  }
  const expectedInvocation = `node scripts/agent-governance/adoption-guard.mjs ${subcommand} ${requiredArgs.join(' ')}`;
  if (invocation !== expectedInvocation) errors.push(`PR adoption guard ${subcommand} must match the exact canonical invocation`);
}

function parseStep(block, start, end) {
  const step = { fields: {}, declaredKeys: [], with: {}, env: {}, run: '', line: block[start].line };
  let inWith = false;
  let inEnv = false;
  for (let index = start; index < end; index += 1) {
    const entry = block[index];
    const pair = keyValue(entry.text);
    if (!pair) continue;
    if (entry.indent === 6 && index === start) {
      step.declaredKeys.push(pair.key);
      step.fields[pair.key] = pair.value;
    }
    else if (entry.indent === 8) {
      // Retain declarations even when an inline/aliased mapping is not parsed.
      step.declaredKeys.push(pair.key);
      inWith = pair.key === 'with';
      inEnv = pair.key === 'env';
      if (!inWith && !inEnv) step.fields[pair.key] = pair.value;
    } else if (entry.indent === 10 && inWith) step.with[pair.key] = pair.value;
    else if (entry.indent === 10 && inEnv) step.env[pair.key] = pair.value;
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
  const env = {};
  const steps = [];
  const needs = [];
  let inPermissions = false;
  let inEnv = false;
  let inSteps = false;
  let inNeeds = false;
  for (let index = 0; index < block.length; index += 1) {
    const entry = block[index];
    const pair = keyValue(entry.text);
    if (entry.indent === 4 && pair) {
      fields[pair.key] = pair.value;
      inPermissions = pair.key === 'permissions';
      inEnv = pair.key === 'env';
      inSteps = pair.key === 'steps';
      inNeeds = pair.key === 'needs';
    } else if (entry.indent === 6 && pair && inPermissions && !entry.text.startsWith('- ')) permissions[pair.key] = pair.value;
    else if (entry.indent === 6 && pair && inEnv && !entry.text.startsWith('- ')) env[pair.key] = pair.value;
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
    name: fields.name ?? null, fields, permissions, env, needs, steps,
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
  if (!parsed.workflow_dispatch_inputs.outcome_packet || !parsed.workflow_dispatch_inputs.approval_record
    || !parsed.workflow_dispatch_inputs.loop_contract || !parsed.workflow_dispatch_inputs.knowledge_receipt
    || !parsed.workflow_dispatch_inputs.runner_provenance || !parsed.workflow_dispatch_inputs.run_directory
    || !parsed.workflow_dispatch_inputs.release_evidence_run_id) errors.push('Release evidence inputs must remain explicit for release_enforcement mode');
  for (const [input, description] of Object.entries({
    runner_provenance: 'Repository-relative RunnerProvenanceV1 path inside the downloaded immutable evidence bundle',
    run_directory: 'Repository-relative digest-chained runner directory inside the downloaded immutable evidence bundle',
  })) {
    const value = parsed.workflow_dispatch_inputs[input];
    if (value?.fields.type !== 'string' || value.fields.required !== 'false' || value.fields.description !== description) {
      errors.push(`workflow_dispatch ${input} must be an optional string described as: ${description}`);
    }
  }
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
        : id === 'release-enforcement'
          ? {actions: 'read', contents: 'read', 'id-token': 'write'}
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
        const allowedExemption = isPrOutcomeExemptionCondition(id, step);
        if (!allowedAlways && !allowedPullRequest && !allowedExemption) errors.push(`${id} step ${index + 1} cannot be conditionally skipped`);
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
  for (const specification of REQUIRED_DIRECT_INVOCATIONS) {
    checks += 1;
    requireDirectInvocation(parsed.jobs[specification.job], specification, errors);
  }
  const release = parsed.jobs['release-enforcement'];
  const prOutcome = parsed.jobs['pr-outcome'];
  checks += 1;
  validatePrOutcomeExemptionWiring(prOutcome, errors);
  validatePrOutcomeExecutionContext(source, prOutcome, errors);
  if (entries(source).some(entry => entry.indent === 0 && keyValue(entry.text)?.key === 'defaults')
    || Object.hasOwn(prOutcome?.fields ?? {}, 'defaults')) {
    errors.push('PR outcome exemption producer and classifier cannot inherit workflow or job execution defaults');
  }
  const prContext = parsed.jobs['pr-context'];
  const repoGovernance = parsed.jobs['repo-governance'];
  const browserAssurance = parsed.jobs['application-browser-assurance'];
  const coreNeeds = [
    'agent-contract',
    'agent-runner',
    'knowledge-adapters',
    'repo-governance',
    'application-fast-assurance',
    'application-browser-assurance',
    'secrets-scan',
  ];
  const requiredNeeds = ['pr-context', ...coreNeeds];
  const prValidationCondition = "github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'pr_validation')";
  checks += 12;
  if (prOutcome?.fields.if !== prValidationCondition) errors.push('PR outcome must run only for pull_request or exact pr_validation dispatch mode');
  if (JSON.stringify(prOutcome?.needs ?? []) !== JSON.stringify(requiredNeeds)) errors.push('PR outcome must need all seven exact-head evidence jobs in canonical order');
  if (JSON.stringify(repoGovernance?.needs ?? []) !== JSON.stringify(['pr-context'])) errors.push('Repo governance must need the exact PR context job');
  const browserEvidenceSteps = browserAssurance?.steps.filter((step) => step.env.CHOPDOT_RELEASE_EVIDENCE_ROOT === '${{ runner.temp }}/chopdot-release-evidence') ?? [];
  const browserExactHead = browserAssurance?.steps.find((step) => step.fields.name === 'Assert exact candidate checkout');
  const browserSummary = browserAssurance?.steps.find((step) => step.fields.name === 'Publish browser assurance summary');
  const browserClean = browserAssurance?.steps.find((step) => step.fields.name === 'Assert browser suite left repository clean');
  const browserUpload = browserAssurance?.steps.find((step) => step.fields.name === 'Upload browser assurance evidence');
  const browserTail = browserAssurance?.steps.slice(-3).map((step) => step.fields.name) ?? [];
  const expectedBrowserSummary = [
    'echo "## Application browser assurance" >> "$GITHUB_STEP_SUMMARY"',
    'echo "Production-entrypoint Playwright results apply only to the exact checked-out candidate." >> "$GITHUB_STEP_SUMMARY"',
    'echo "This is application evidence, not deployment, reachability, ownership, or live-user proof." >> "$GITHUB_STEP_SUMMARY"',
  ].join('\n');
  const expectedBrowserClean = [
    'git status --short --untracked-files=all',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'test -z "$(git status --porcelain --untracked-files=all)"',
  ].join('\n');
  checks += 6;
  if (browserAssurance?.env.CHOPDOT_RELEASE_EVIDENCE_ROOT !== undefined) errors.push('Application browser assurance cannot bind CHOPDOT_RELEASE_EVIDENCE_ROOT at job scope');
  if (Object.values(browserAssurance?.env ?? {}).some((value) => value.includes('${{ runner.'))) errors.push('Application browser assurance job-level env cannot use runner context');
  if (JSON.stringify(browserEvidenceSteps.map((step) => step.fields.name)) !== JSON.stringify([
    'Run production-entrypoint browser assurance',
    'Assert machine-readable browser result',
  ])) errors.push('Browser assurance must bind the external release evidence root on exactly the two runtime steps where runner context is available');
  if (browserExactHead?.run !== 'node scripts/agent-governance/assert-exact-head.mjs --json-out="${{ runner.temp }}/chopdot-release-evidence/application-browser-exact-head.json"') errors.push('Browser assurance exact-head evidence must be written outside the repository beneath the uploaded release evidence root');
  if (JSON.stringify(browserTail) !== JSON.stringify(['Publish browser assurance summary', 'Assert browser suite left repository clean', 'Upload browser assurance evidence'])) errors.push('Browser assurance must end with summary, then the penultimate clean-checkout assertion, then the final evidence upload');
  if (browserSummary?.fields.if !== 'always()') errors.push('Browser assurance summary must remain an always-run pre-clean diagnostic step');
  if (browserSummary?.run !== expectedBrowserSummary) errors.push('Browser assurance summary must contain only the three reviewed GitHub summary writes before the clean-checkout assertion');
  if (browserClean?.run !== expectedBrowserClean) errors.push('Browser assurance clean-checkout step must contain only the four reviewed terminal cleanliness commands');
  if (browserUpload?.with.path !== '${{ runner.temp }}/chopdot-release-evidence/') errors.push('Browser assurance must upload only the external release evidence root');
  if (!browserAssurance?.block.includes('${{ runner.temp }}/chopdot-release-evidence/')) errors.push('Browser assurance must upload the external release evidence root directly');
  if (!browserAssurance?.steps.some((step) => step.fields.name === 'Upload browser assurance evidence' && step.with['if-no-files-found'] === 'error')) errors.push('Browser assurance evidence upload must fail when evidence is absent');
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
  const prSteps = prOutcome?.steps ?? [];
  const branchAttachmentIndex = prSteps.findIndex((step) => step.fields.name === 'Attach authenticated candidate branch identity');
  const outcomeGenerationIndex = prSteps.findIndex((step) => step.fields.name === 'Generate external exact-candidate OutcomePacketV1');
  const branchAttachment = branchAttachmentIndex >= 0 ? prSteps[branchAttachmentIndex].run : '';
  checks += 4;
  if (branchAttachmentIndex < 0 || outcomeGenerationIndex < 0 || branchAttachmentIndex >= outcomeGenerationIndex) {
    errors.push('PR outcome must attach the authenticated candidate branch before outcome generation');
  }
  for (const command of [
    'git checkout -B "$EXPECTED_BRANCH" "$EXPECTED_SHA"',
    'test "$(git branch --show-current)" = "$EXPECTED_BRANCH"',
    'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
  ]) {
    if (!branchAttachment.split('\n').map((line) => line.trim()).includes(command)) {
      errors.push(`PR outcome branch attachment lacks exact fail-closed command: ${command}`);
    }
  }
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
    if (attestation.with['subject-path'] !== 'output/agent-runs/ci-pr-outcome/outcome.json') errors.push('PR outcome attestation must sign the exact generated external outcome packet');
  }
  if (!prExecutable.includes('steps.attest-outcome.outputs.bundle-path')) errors.push('PR outcome must retain the exact attestation bundle emitted by the signing step');
  if (prOutcome?.block.includes('$GOVERNANCE_REPORT_ROOT/pr-outcome')) errors.push('PR outcome evidence must not dirty the candidate checkout');
  if (!prExecutable.includes('pr-context-${{ github.run_id }}/pr-event.json')) errors.push('PR outcome must consume the exact same-run PR event artifact');
  requireDirectGuardInvocation(prOutcome, 'context', PR_GUARD_CONTEXT_ARGS, errors);
  requireDirectGuardInvocation(prOutcome, 'accept', PR_GUARD_ACCEPT_ARGS, errors);
  const prAcceptanceStep = prOutcome?.steps.find((step) => step.fields.name === 'Enforce governed PR acceptance');
  if (prAcceptanceStep?.env.GH_TOKEN !== '${{ github.token }}') errors.push('PR adoption guard requires GH_TOKEN: ${{ github.token }} for external execution readback');
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
