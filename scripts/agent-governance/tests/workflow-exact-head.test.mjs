import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseWorkflowStructure, validateWorkflow } from '../validate-workflow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/agent-governance.yml'), 'utf8');
const parsed = parseWorkflowStructure(workflow);
const contextScript = parsed.jobs['pr-context'].steps.find((step) => step.fields.name === 'Resolve exact pull-request event').run;

function runContext(overrides = {}) {
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-context-'));
  const bin = path.join(runnerTemp, 'bin');
  fs.mkdirSync(bin);
  const gh = path.join(bin, 'gh');
  fs.writeFileSync(gh, '#!/bin/sh\ncat -- "$FAKE_PR_JSON"\n');
  fs.chmodSync(gh, 0o755);
  const eventPath = path.join(runnerTemp, 'github-event.json');
  const originalEvent = overrides.originalEvent ?? {pull_request: {number: 14, body: 'original'}};
  fs.writeFileSync(eventPath, `${JSON.stringify(originalEvent)}\n`);
  const expectedHead = overrides.expectedHead ?? 'a'.repeat(40);
  const repository = overrides.repository ?? 'Gizmotronn/ChopDot';
  const branch = overrides.branch ?? 'codex/chopdot-v1-launch';
  const live = {
    number: 14,
    state: 'open',
    body: 'live body',
    user: {login: 'fixture-author'},
    base: {sha: 'b'.repeat(40), ref: 'main', repo: {full_name: repository}},
    head: {sha: expectedHead, ref: branch, repo: {full_name: repository}},
    ...(overrides.live ?? {}),
  };
  const livePath = path.join(runnerTemp, 'fake-pr.json');
  fs.writeFileSync(livePath, `${JSON.stringify(live)}\n`);
  const script = contextScript.replaceAll('${{ runner.temp }}', runnerTemp);
  const result = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_PR_JSON: livePath,
      GITHUB_EVENT_PATH: eventPath,
      EVENT_NAME: overrides.eventName ?? 'workflow_dispatch',
      DISPATCH_MODE: overrides.mode ?? 'pr_validation',
      DISPATCH_PR_NUMBER: Object.hasOwn(overrides, 'number') ? String(overrides.number) : '14',
      SELECTED_REF_NAME: branch,
      SELECTED_REF_TYPE: overrides.refType ?? 'branch',
      REPOSITORY: repository,
      EXPECTED_SHA: expectedHead,
    },
  });
  return {result, runnerTemp, eventPath: path.join(runnerTemp, 'pr-context/pr-event.json'), originalEvent};
}

test('all ten jobs checkout exact event candidate with full branch history', () => {
  assert.equal(Object.keys(parsed.jobs).length, 10);
  for (const job of Object.values(parsed.jobs)) {
    assert.equal(job.exact_checkout_refs, 1);
    assert.equal(job.full_history_checkouts, 1);
    assert.equal(job.exact_head_assertions, 1);
  }
  assert.equal(parsed.expected_sha_expression, true);
  assert.equal(parsed.expected_branch_expression, true);
});

test('all third-party actions are pinned to full immutable SHAs', () => {
  const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
  assert(uses.length >= 18);
  for (const value of uses) assert.match(value, /^[^@]+@[0-9a-f]{40}$/);
  assert.doesNotMatch(workflow, /uses:\s*[^\n]+@(v\d+|main|master)\b/);
});

test('workflow has least permissions and all stable merge-boundary job names', () => {
  assert.equal(parsed.permissions_contents_read, true);
  for (const name of ['Agent contract', 'Agent runner', 'Knowledge adapters', 'Repo governance', 'Application fast assurance', 'Application browser assurance', 'Secrets scan', 'PR outcome']) {
    assert.match(workflow, new RegExp(`name: ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('PR outcome attaches the authenticated branch before generating candidate-bound evidence', () => {
  const steps = parsed.jobs['pr-outcome'].steps;
  const attachIndex = steps.findIndex((step) => step.fields.name === 'Attach authenticated candidate branch identity');
  const generateIndex = steps.findIndex((step) => step.fields.name === 'Generate external exact-candidate OutcomePacketV1');
  assert(attachIndex >= 0);
  assert(attachIndex < generateIndex);
  assert.match(steps[attachIndex].run, /git checkout -B "\$EXPECTED_BRANCH" "\$EXPECTED_SHA"/);
  assert.match(steps[attachIndex].run, /git branch --show-current/);
  assert.match(steps[attachIndex].run, /git rev-parse HEAD/);
});

test('structural validator rejects missing, late, or weakened PR candidate branch attachment', () => {
  const block = `      - name: Attach authenticated candidate branch identity
        run: |
          git checkout -B "$EXPECTED_BRANCH" "$EXPECTED_SHA"
          test "$(git branch --show-current)" = "$EXPECTED_BRANCH"
          test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"
`;
  const cases = [
    workflow.replace(block, ''),
    workflow.replace(block, '').replace('      - name: Generate external exact-candidate OutcomePacketV1\n', `      - name: Generate external exact-candidate OutcomePacketV1\n${block}`),
    workflow.replace('git checkout -B "$EXPECTED_BRANCH" "$EXPECTED_SHA"', 'git checkout -B "$EXPECTED_BRANCH" HEAD'),
    workflow.replace('test "$(git branch --show-current)" = "$EXPECTED_BRANCH"', 'echo "$EXPECTED_BRANCH"'),
    workflow.replace('test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"', 'true'),
  ];
  for (const broken of cases) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
    assert(result.errors.some((error) => error.includes('PR outcome branch attachment')));
  }
});

test('workflow dispatch exposes one fail-closed PR mode separate from release mode', () => {
  assert.deepEqual(parsed.workflow_dispatch_inputs.dispatch_mode, {
    fields: {
      description: 'Select exact-PR validation or separately gated release enforcement',
      required: 'true', default: 'pr_validation', type: 'choice', options: '',
    },
    options: ['pr_validation', 'release_enforcement'],
  });
  assert.equal(parsed.workflow_dispatch_inputs.pull_request_number.fields.type, 'string');
  assert.equal(parsed.workflow_dispatch_inputs.pull_request_number.fields.required, 'false');
  assert.deepEqual(parsed.workflow_dispatch_inputs.runner_provenance.fields, {
    description: 'Repository-relative RunnerProvenanceV1 path inside the downloaded immutable evidence bundle',
    required: 'false',
    type: 'string',
  });
  assert.deepEqual(parsed.workflow_dispatch_inputs.run_directory.fields, {
    description: 'Repository-relative digest-chained runner directory inside the downloaded immutable evidence bundle',
    required: 'false',
    type: 'string',
  });
  assert.equal(parsed.workflow_dispatch_inputs.enforce_release, undefined);
  assert.deepEqual(parsed.jobs['pr-context'].permissions, {contents: 'read', 'pull-requests': 'read'});
  assert.deepEqual(parsed.jobs['repo-governance'].needs, ['pr-context']);
  assert.equal(parsed.jobs['pr-outcome'].fields.if, "github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'pr_validation')");
  assert.equal(parsed.jobs['release-enforcement'].fields.if, "github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'release_enforcement' && inputs.pull_request_number == ''");
});

test('dispatch runtime builds one exact live PR event bound to dispatched head and branch', () => {
  const value = runContext();
  assert.equal(value.result.status, 0, value.result.stderr);
  const event = JSON.parse(fs.readFileSync(value.eventPath));
  assert.equal(event.pull_request.number, 14);
  assert.equal(event.pull_request.body, 'live body');
  assert.equal(event.pull_request.user.login, 'fixture-author');
  assert.equal(event.pull_request.base.sha, 'b'.repeat(40));
  assert.equal(event.pull_request.head.sha, 'a'.repeat(40));
  assert.equal(event.pull_request.head.ref, 'codex/chopdot-v1-launch');
  assert.equal(event.pull_request.head.repo.full_name, 'Gizmotronn/ChopDot');
});

test('dispatch runtime rejects missing PR number, tags, stale head, wrong branch/repo, and closed PR', () => {
  const cases = [
    {number: '', label: 'missing number'},
    {number: '0', label: 'zero number'},
    {number: '-1', label: 'negative number'},
    {number: '14x', label: 'mixed number'},
    {refType: 'tag', label: 'tag'},
    {live: {number: 15}, label: 'different PR number'},
    {live: {head: {sha: 'f'.repeat(40), ref: 'codex/chopdot-v1-launch', repo: {full_name: 'Gizmotronn/ChopDot'}}}, label: 'stale head'},
    {live: {head: {sha: 'a'.repeat(40), ref: 'wrong-branch', repo: {full_name: 'Gizmotronn/ChopDot'}}}, label: 'wrong branch'},
    {live: {head: {sha: 'a'.repeat(40), ref: 'codex/chopdot-v1-launch', repo: {full_name: 'fork/ChopDot'}}}, label: 'wrong head repo'},
    {live: {base: {sha: 'b'.repeat(40), ref: 'main', repo: {full_name: 'other/ChopDot'}}}, label: 'wrong base repo'},
    {live: {state: 'closed'}, label: 'closed PR'},
  ];
  for (const item of cases) {
    const value = runContext(item);
    assert.notEqual(value.result.status, 0, item.label);
    assert.equal(fs.existsSync(value.eventPath), false, item.label);
  }
});

test('dispatch release mode rejects a PR number and cannot create a PR event', () => {
  const rejected = runContext({mode: 'release_enforcement', number: 14});
  assert.notEqual(rejected.result.status, 0);
  assert.equal(fs.existsSync(rejected.eventPath), false);

  const explicitRelease = runContext({mode: 'release_enforcement', number: ''});
  assert.equal(explicitRelease.result.status, 0, explicitRelease.result.stderr);
  assert.equal(fs.existsSync(explicitRelease.eventPath), false);
});

test('pull_request runtime preserves the original event path behavior', () => {
  const originalEvent = {pull_request: {number: 14, body: 'event-time body', base: {sha: 'b'.repeat(40)}, head: {sha: 'a'.repeat(40), ref: 'codex/chopdot-v1-launch'}}};
  const value = runContext({eventName: 'pull_request', originalEvent, number: ''});
  assert.equal(value.result.status, 0, value.result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(value.eventPath)), originalEvent);
});

test('runner and adapter jobs cover evaluator, redaction, compatibility, and conformance suites', () => {
  assert.match(parsed.jobs['agent-runner'].block, /evaluator-outcome\.test\.mjs/);
  assert.match(parsed.jobs['knowledge-adapters'].block, /knowledge-adapters\.test\.mjs/);
  assert.match(parsed.jobs['knowledge-adapters'].block, /adapters-compat-cli\.test\.mjs/);
});

test('PR outcome depends on all exact-head jobs and uses same-run external artifact ingress', () => {
  assert.deepEqual(parsed.jobs['pr-outcome'].needs, [
    'pr-context', 'agent-contract', 'agent-runner', 'knowledge-adapters',
    'repo-governance', 'application-fast-assurance',
    'application-browser-assurance', 'secrets-scan',
  ]);
  assert.deepEqual(parsed.jobs['pr-outcome'].permissions, {contents: 'read', 'id-token': 'write', attestations: 'write'});
  assert.match(parsed.jobs['pr-outcome'].block, /actions\/download-artifact@[0-9a-f]{40}/);
  assert.match(parsed.jobs['pr-outcome'].block, /generate-pr-outcome\.mjs/);
  assert.match(parsed.jobs['pr-outcome'].block, /acceptance-contract\.json/);
  assert.match(parsed.jobs['pr-outcome'].block, /--execution-attestation="output\/agent-runs\/ci-pr-outcome\/execution-attestation\.json"/);
  assert.match(parsed.jobs['pr-outcome'].block, /run_directory="\$\(jq -r '\.run_directory' output\/agent-runs\/ci-pr-outcome\/generation\.json\)"/);
  assert.match(parsed.jobs['pr-outcome'].block, /--runner-provenance="output\/agent-runs\/ci-pr-outcome\/runner-provenance\.json"/);
  assert.match(parsed.jobs['pr-outcome'].block, /--run-directory="\$run_directory"/);
  assert.equal(parsed.jobs['pr-outcome'].steps.find((step) => step.fields.name === 'Enforce governed PR acceptance').env.GH_TOKEN, '${{ github.token }}');
  assert.match(parsed.jobs['pr-outcome'].block, /--evidence-level=exact-candidate/);
  assert.match(parsed.jobs['pr-outcome'].block, /--evaluator-identity="github-actions:pr-outcome:\$\{\{ github\.run_id \}\}:\$\{\{ github\.run_attempt \}\}"/);
  assert.match(parsed.jobs['pr-outcome'].block, /--ci-outcome/);
  assert.match(parsed.jobs['pr-outcome'].block, /actions\/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8/);
  assert.match(parsed.jobs['pr-outcome'].block, /outcome-attestation\.jsonl/);
});

test('structural validator rejects an absent, repointed, or broadened PR outcome attestation', () => {
  const absent = workflow.replace(/      - name: Attest the exact external outcome packet[\s\S]*?      - name: Retain the offline attestation bundle\n[\s\S]*?outcome-attestation\.jsonl"\n/u, '');
  const absentResult = validateWorkflow(absent);
  assert.equal(absentResult.ok, false);
  assert(absentResult.errors.some((error) => error.includes('exactly one GitHub build-provenance attestation')));

  const repointed = workflow.replace(
    '          subject-path: output/agent-runs/ci-pr-outcome/outcome.json',
    '          subject-path: output/agent-runs/ci-pr-outcome/validation.json',
  );
  const repointedResult = validateWorkflow(repointed);
  assert.equal(repointedResult.ok, false);
  assert(repointedResult.errors.some((error) => error.includes('exact generated external outcome packet')));

  const broadened = workflow.replace('      attestations: write', '      attestations: write\n      actions: write');
  const broadenedResult = validateWorkflow(broadened);
  assert.equal(broadenedResult.ok, false);
  assert(broadenedResult.errors.some((error) => error.includes('broadens permission actions')));
});

test('structural validator rejects a job that checks out a moving ref', () => {
  const broken = workflow.replace('ref: ${{ env.EXPECTED_SHA }}', 'ref: main');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('must checkout EXPECTED_SHA')));
});

test('structural validator rejects a weakened PR adoption contract or evidence level', () => {
  const weakLevel = validateWorkflow(workflow.replace('--evidence-level=exact-candidate', '--evidence-level=unit'));
  assert.equal(weakLevel.ok, false);
  assert(weakLevel.errors.some((error) => error.includes('lacks required proof argument: --evidence-level=exact-candidate')));
  const wrongContract = validateWorkflow(workflow.replace('acceptance-contract.json', 'unbound-contract.json'));
  assert.equal(wrongContract.ok, false);
  assert(wrongContract.errors.some((error) => error.includes('lacks required proof argument: --contract=')));
});

test('PR acceptance requires the generated execution attestation and GitHub readback token directly', () => {
  const argument = '--execution-attestation="output/agent-runs/ci-pr-outcome/execution-attestation.json"';
  for (const broken of [
    workflow.replace(argument, `--execution-attestation="$EXECUTION_ATTESTATION"\n          echo '${argument}'`),
    workflow.replace(argument, `echo '${argument}'`),
    workflow.replace('          GH_TOKEN: ${{ github.token }}\n        run: |\n          base_sha=', '        run: |\n          base_sha='),
  ]) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false);
    assert(result.errors.some((error) => error.includes('execution-attestation') || error.includes('requires GH_TOKEN') || error.includes('exact canonical invocation')));
  }
});

test('PR acceptance requires the generator runner provenance and emitted run directory directly', () => {
  const provenanceArgument = '--runner-provenance="output/agent-runs/ci-pr-outcome/runner-provenance.json"';
  const runDirectoryAssignment = `run_directory="$(jq -r '.run_directory' output/agent-runs/ci-pr-outcome/generation.json)"`;
  const runDirectoryArgument = '--run-directory="$run_directory"';
  for (const broken of [
    workflow.replace(` ${provenanceArgument}`, ''),
    workflow.replace(provenanceArgument, '--runner-provenance="output/agent-runs/ci-pr-outcome/other-provenance.json"'),
    workflow.replace(`          ${runDirectoryAssignment}\n`, ''),
    workflow.replace(runDirectoryAssignment, `run_directory="$(jq -r '.run_directory' output/agent-runs/ci-pr-outcome/other-generation.json)"`),
    workflow.replace(` ${runDirectoryArgument}`, ''),
    workflow.replace(runDirectoryArgument, '--run-directory="$OTHER_RUN_DIRECTORY"'),
  ]) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false);
    assert(result.errors.some((error) => /runner-provenance|run-directory|runner directory|canonical invocation/u.test(error)));
  }
});

test('knowledge record and verify require their exact adapter, digest, and output bindings', () => {
  const cases = [
    workflow.replace(
      '--adapter=exact-source --outcome="output/agent-runs/ci-pr-outcome/outcome.json"',
      '--adapter="$KNOWLEDGE_ADAPTER" --outcome="output/agent-runs/ci-pr-outcome/outcome.json"',
    ),
    workflow.replace(
      '--adapter=exact-source --outcome-digest="$outcome_digest"',
      '--adapter=exact-source --outcome-digest="$OTHER_DIGEST"',
    ),
    workflow.replace(
      '> "output/agent-runs/ci-pr-outcome/knowledge-recall.json"',
      '> "$KNOWLEDGE_RECALL"',
    ),
  ];
  for (const broken of cases) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false);
    assert(result.errors.some((error) => /knowledge-(?:record|verify)/u.test(error)));
  }
});

test('structural validator rejects inert PR guard command decoys', () => {
  for (const subcommand of ['context', 'accept']) {
    const broken = workflow.replace(
      `node scripts/agent-governance/adoption-guard.mjs ${subcommand}`,
      `echo node scripts/agent-governance/adoption-guard.mjs ${subcommand}`,
    );
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, subcommand);
    assert(result.errors.some((error) => error.includes(`directly execute exactly one ${subcommand} invocation`)), subcommand);
  }
});

test('structural validator binds every proof argument to the executed accept command', () => {
  const requiredArgument = '--knowledge-receipt="output/agent-runs/ci-pr-outcome/knowledge-recall.json"';
  const broken = workflow.replace(
    requiredArgument,
    `--knowledge-receipt="output/agent-runs/ci-pr-outcome/unbound-recall.json"\n          echo '${requiredArgument}'`,
  );
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes(`accept invocation lacks required proof argument: ${requiredArgument}`)));
});

test('structural validator rejects a guard invocation whose failure is masked', () => {
  const broken = workflow.replace(
    '--json-out="output/agent-runs/ci-pr-outcome/acceptance-receipt.json"',
    '--json-out="output/agent-runs/ci-pr-outcome/acceptance-receipt.json" || true',
  );
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('accept invocation cannot mask failure')));
});

test('structural validator rejects a direct-looking guard hidden behind false control flow', () => {
  const broken = workflow
    .replace(
      '          node scripts/agent-governance/adoption-guard.mjs context',
      '          if false; then\n          node scripts/agent-governance/adoption-guard.mjs context',
    )
    .replace(
      '--json-out="output/agent-runs/ci-pr-outcome/acceptance-receipt.json"',
      '--json-out="output/agent-runs/ci-pr-outcome/acceptance-receipt.json"\n          fi',
    );
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('behind shell control flow')));
  assert(result.errors.some((error) => error.includes('final executable command')));
});

test('release enforcement is manual, environment-gated, and fails through explicit evidence validation', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch' && inputs\.dispatch_mode == 'release_enforcement' && inputs\.pull_request_number == ''/);
  assert.match(workflow, /environment: public-testnet-release/);
  assert.match(workflow, /enforce-release\.mjs/);
  assert.match(workflow, /inputs\.outcome_packet/);
  assert.match(workflow, /inputs\.approval_record/);
  assert.match(parsed.jobs['release-enforcement'].block, /runner\.temp.*release-enforcement.*release-exact-head\.json/);
  assert.deepEqual(parsed.jobs['release-enforcement'].permissions, {actions: 'read', contents: 'read', 'id-token': 'write'});
  assert.match(parsed.jobs['release-enforcement'].block, /execution-attestation\.mjs create/);
  assert.match(parsed.jobs['release-enforcement'].block, /--execution-attestation="\$\{\{ runner\.temp \}\}\/release-enforcement\/execution-attestation\.json"/);
  for (const stepName of ['Generate current protected-environment execution attestation', 'Enforce approved immutable release evidence']) {
    assert.equal(parsed.jobs['release-enforcement'].steps.find((step) => step.fields.name === stepName).env.GH_TOKEN, '${{ github.token }}');
  }
  assert.doesNotMatch(parsed.jobs['release-enforcement'].block, /if: inputs\.release_evidence_run_id != ''/);
  assert.doesNotMatch(parsed.jobs['release-enforcement'].block, /CI_GENERATED/);
});

test('structural validator rejects dispatch paths that can overlap release or omit exact live bindings', () => {
  const overlap = workflow.replace(
    "if: github.event_name == 'workflow_dispatch' && inputs.dispatch_mode == 'release_enforcement' && inputs.pull_request_number == ''",
    "if: github.event_name == 'workflow_dispatch'",
  );
  const overlapResult = validateWorkflow(overlap);
  assert.equal(overlapResult.ok, false);
  assert(overlapResult.errors.some((error) => error.includes('mutually exclusive')));

  for (const token of ['=~ ^[1-9][0-9]*$', '[[ "$SELECTED_REF_TYPE" == "branch" ]]', '.number == $number', '.state == "open"', '.head.sha == $head', '.head.ref == $branch', '.base.repo.full_name == $repo']) {
    const weakened = workflow.replace(token, 'true');
    const result = validateWorkflow(weakened);
    assert.equal(result.ok, false, token);
    assert(result.errors.some((error) => error.includes('fail-closed live binding')), token);
  }

  const legacy = workflow.replace('      dispatch_mode:', '      enforce_release:\n        required: false\n        type: boolean\n      dispatch_mode:');
  const legacyResult = validateWorkflow(legacy);
  assert.equal(legacyResult.ok, false);
  assert(legacyResult.errors.some((error) => error.includes('Legacy enforce_release')));
});

test('commented job and assertion decoys do not satisfy structural validation', () => {
  const broken = workflow
    .replace(/^  agent-contract:\n/m, '  # agent-contract:\n')
    .replace(/^    name: Agent contract\n/m, '    # name: Agent contract\n');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Missing workflow job agent-contract')));
});

test('commented executable commands cannot satisfy required job behavior', () => {
  const broken = workflow.replace(
    '          scripts/agent-system/tests/fail-closed.test.mjs',
    '          # scripts/agent-system/tests/fail-closed.test.mjs',
  );
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('lacks required executable command: fail-closed.test.mjs')));
});

test('browser and secrets assurance jobs cannot be removed, skipped, or moved off the exact candidate', () => {
  const browserBlock = /\n  application-browser-assurance:\n[\s\S]*?(?=\n  secrets-scan:\n)/u;
  const secretsBlock = /\n  secrets-scan:\n[\s\S]*?(?=\n  pr-outcome:\n)/u;
  const cases = [
    workflow.replace(browserBlock, ''),
    workflow.replace(secretsBlock, ''),
    workflow.replace('  application-browser-assurance:\n    name: Application browser assurance', '  application-browser-assurance:\n    name: Application browser assurance\n    if: false'),
    workflow.replace('  secrets-scan:\n    name: Secrets scan', '  secrets-scan:\n    name: Secrets scan\n    if: false'),
    workflow.replace(
      /(  application-browser-assurance:[\s\S]*?ref: )\$\{\{ env\.EXPECTED_SHA \}\}/u,
      '$1main',
    ),
    workflow.replace(
      /(  secrets-scan:[\s\S]*?ref: )\$\{\{ env\.EXPECTED_SHA \}\}/u,
      '$1main',
    ),
  ];
  for (const broken of cases) {
    assert.notEqual(broken, workflow);
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
  }
});

test('browser and secrets commands cannot be masked or replaced by inert decoys', () => {
  for (const command of [
    'npx --no-install playwright install --with-deps chromium',
    'npm run test:release-browser',
    '$RUNNER_TEMP/gitleaks git . --redact --verbose --exit-code=1 --report-format=json --report-path="$GOVERNANCE_REPORT_ROOT/gitleaks.json"',
  ]) {
    for (const replacement of [`${command} || true`, `echo '${command}'`]) {
      const broken = workflow.replace(command, replacement);
      assert.notEqual(broken, workflow);
      const result = validateWorkflow(broken);
      assert.equal(result.ok, false, `${replacement}: ${result.errors.join('; ')}`);
    }
  }
});

test('browser evidence root, upload, and complete post-suite cleanliness cannot be weakened', () => {
  const cases = [
    workflow.replace('CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence', 'CHOPDOT_RELEASE_EVIDENCE_ROOT: artifacts/release'),
    workflow.replace('            ${{ env.CHOPDOT_RELEASE_EVIDENCE_ROOT }}/\n', ''),
    workflow.replace('          git diff --exit-code\n', ''),
    workflow.replace('          git diff --cached --exit-code\n', ''),
    workflow.replace('          test -z "$(git status --porcelain --untracked-files=all)"\n', ''),
    workflow.replace('git status --porcelain --untracked-files=all', 'git status --porcelain --untracked-files=no'),
  ];
  for (const broken of cases) {
    assert.notEqual(broken, workflow);
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
  }
});

test('secrets scan rejects moving releases, altered or absent checksums, and absent evidence', () => {
  const archiveUrl = 'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz';
  const checksum = '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb';
  const secretsStart = workflow.indexOf('\n  secrets-scan:\n');
  const secretsEnd = workflow.indexOf('\n  pr-outcome:\n');
  assert(secretsStart >= 0 && secretsEnd > secretsStart);
  const replaceSecrets = (needle, replacement) => {
    const block = workflow.slice(secretsStart, secretsEnd).replace(needle, replacement);
    return `${workflow.slice(0, secretsStart)}${block}${workflow.slice(secretsEnd)}`;
  };
  const cases = [
    replaceSecrets(archiveUrl, 'https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz'),
    replaceSecrets(checksum, '0'.repeat(64)),
    replaceSecrets(`          sha256sum --check --strict <<< "${checksum}  $RUNNER_TEMP/gitleaks_8.30.1_linux_x64.tar.gz"\n`, ''),
    replaceSecrets('          if-no-files-found: error', '          if-no-files-found: warn'),
  ];
  for (const broken of cases) {
    assert.notEqual(broken, workflow);
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
  }
});

test('PR outcome cannot omit browser or secrets dependencies and result bindings', () => {
  const cases = [
    workflow.replace('      - application-browser-assurance\n', ''),
    workflow.replace('      - secrets-scan\n', ''),
    workflow.replace(',"application-browser-assurance":"${{ needs.application-browser-assurance.result }}"', ''),
    workflow.replace(',"secrets-scan":"${{ needs.secrets-scan.result }}"', ''),
  ];
  for (const broken of cases) {
    assert.notEqual(broken, workflow);
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
  }
});

test('audited workflow commands reject echo, printf, string, comment, dead, and masked decoys', () => {
  const commands = [
    'node scripts/agent-system/cli.mjs knowledge-record',
    'node scripts/agent-system/cli.mjs knowledge-verify',
    'node scripts/agent-governance/validate-repository.mjs',
    'npm run lint',
    'npm run build',
    'npm run test:node',
    'npm run security:baseline',
    'node scripts/agent-governance/generate-pr-outcome.mjs',
    'node scripts/agent-governance/execution-attestation.mjs create',
    'node scripts/agent-governance/enforce-release.mjs',
  ];
  const mutations = [
    (command) => `echo '${command}'`,
    (command) => `printf '%s\\n' '${command}'`,
    (command) => `decoy='${command}'`,
    (command) => `# ${command}`,
    (command) => `false && ${command}`,
    (command) => `${command} || true`,
  ];
  for (const command of commands) {
    for (const mutate of mutations) {
      const replacement = mutate(command);
      const broken = workflow.replace(command, replacement);
      assert.notEqual(broken, workflow, `${command}: ${replacement}`);
      const result = validateWorkflow(broken);
      assert.equal(result.ok, false, `${command}: ${replacement}`);
      assert(
        result.errors.some((error) => error.includes(`directly execute exactly one ${command}`)
          || error.includes(`required command ${command} is weakened`)),
        `${command}: ${replacement}: ${result.errors.join('; ')}`,
      );
    }
  }
});

test('release attestation rejects permission, token, argument, and indirect-command weakening', () => {
  const attestationArgument = '--execution-attestation="${{ runner.temp }}/release-enforcement/execution-attestation.json"';
  const cases = [
    workflow.replace('      id-token: write\n    steps:\n      - name: Checkout exact candidate', '    steps:\n      - name: Checkout exact candidate'),
    workflow.replace('          node scripts/agent-governance/execution-attestation.mjs create', '          attestor="node scripts/agent-governance/execution-attestation.mjs create"\n          $attestor'),
    workflow.replace('          --expected-branch="$EXPECTED_BRANCH"', '          --expected-branch="$OTHER_BRANCH"\n          echo \'--expected-branch="$EXPECTED_BRANCH"\''),
    workflow.replace(attestationArgument, `--execution-attestation="$EXECUTION_ATTESTATION"\n          echo '${attestationArgument}'`),
    workflow.replace(/        env:\n          GH_TOKEN: \$\{\{ github\.token \}\}\n        run: >-\n          node scripts\/agent-governance\/execution-attestation\.mjs create/u, '        run: >-\n          node scripts/agent-governance/execution-attestation.mjs create'),
  ];
  for (const broken of cases) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
  }
});

test('release dispatch requires explicit runner provenance and run-directory inputs and bindings', () => {
  const cases = [
    workflow.replace(/      runner_provenance:\n[\s\S]*?        type: string\n/u, ''),
    workflow.replace('Repository-relative RunnerProvenanceV1 path inside the downloaded immutable evidence bundle', 'Some runner file'),
    workflow.replace(/      run_directory:\n[\s\S]*?        type: string\n/u, ''),
    workflow.replace('Repository-relative digest-chained runner directory inside the downloaded immutable evidence bundle', 'Some directory'),
    workflow.replace('--runner-provenance="${{ inputs.runner_provenance }}"', '--runner-provenance="$RUNNER_PROVENANCE"'),
    workflow.replace('--run-directory="${{ inputs.run_directory }}"', '--run-directory="$RUN_DIRECTORY"'),
  ];
  for (const broken of cases) {
    const result = validateWorkflow(broken);
    assert.equal(result.ok, false, result.errors.join('; '));
    assert(result.errors.some((error) => /runner_provenance|run_directory|runner-provenance|run-directory|directly execute exactly one node scripts\/agent-governance\/enforce-release/u.test(error)));
  }
});

test('continue-on-error and false job or step conditions are rejected', () => {
  const broken = workflow
    .replace('    runs-on: ubuntu-latest', '    runs-on: ubuntu-latest\n    continue-on-error: ${{ true }}\n    if: false')
    .replace('      - name: Assert exact candidate checkout', '      - name: Assert exact candidate checkout\n        continue-on-error: 1\n        if: ${{ false }}');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('cannot declare continue-on-error')));
  assert(result.errors.some((error) => error.includes('structurally disabled')));
});

test('cross-run artifact ingress and missing-evidence uploads are rejected', () => {
  const broken = workflow
    .replace("          pattern: '*-${{ github.run_id }}'", "          pattern: '*'\n          run-id: 12345")
    .replace('          if-no-files-found: error', '          if-no-files-found: warn');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('pattern must bind the current workflow run ID')));
  assert(result.errors.some((error) => error.includes('cannot override download-artifact run-id')));
  assert(result.errors.some((error) => error.includes('must fail when its evidence is absent')));
});

test('arbitrary step conditions cannot silently skip required execution', () => {
  const broken = workflow.replace(
    '      - name: Test durable runner and effect controls',
    "      - name: Test durable runner and effect controls\n        if: github.actor == 'nobody'",
  );
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('cannot be conditionally skipped')));
});

test('broadened workflow or job permissions are rejected', () => {
  const broken = workflow
    .replace('permissions:\n  contents: read', 'permissions:\n  contents: write\n  actions: write')
    .replace('  agent-contract:\n    name: Agent contract\n    runs-on: ubuntu-latest', '  agent-contract:\n    name: Agent contract\n    runs-on: ubuntu-latest\n    permissions:\n      pull-requests: write');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('exactly contents: read')));
  assert(result.errors.some((error) => error.includes('broadens permission')));
});
