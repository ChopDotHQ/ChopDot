import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseWorkflowStructure, validateWorkflow } from '../validate-workflow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/agent-governance.yml'), 'utf8');
const parsed = parseWorkflowStructure(workflow);

test('all seven jobs checkout and assert the exact event candidate', () => {
  assert.equal(Object.keys(parsed.jobs).length, 7);
  for (const job of Object.values(parsed.jobs)) {
    assert.equal(job.exact_checkout_refs, 1);
    assert.equal(job.exact_head_assertions, 1);
  }
  assert.equal(parsed.expected_sha_expression, true);
});

test('all third-party actions are pinned to full immutable SHAs', () => {
  const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
  assert(uses.length >= 18);
  for (const value of uses) assert.match(value, /^[^@]+@[0-9a-f]{40}$/);
  assert.doesNotMatch(workflow, /uses:\s*[^\n]+@(v\d+|main|master)\b/);
});

test('workflow has least permissions and all stable merge-boundary job names', () => {
  assert.equal(parsed.permissions_contents_read, true);
  for (const name of ['Agent contract', 'Agent runner', 'Knowledge adapters', 'Repo governance', 'Application fast assurance', 'PR outcome']) {
    assert.match(workflow, new RegExp(`name: ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('runner and adapter jobs cover evaluator, redaction, compatibility, and conformance suites', () => {
  assert.match(parsed.jobs['agent-runner'].block, /evaluator-outcome\.test\.mjs/);
  assert.match(parsed.jobs['knowledge-adapters'].block, /knowledge-adapters\.test\.mjs/);
  assert.match(parsed.jobs['knowledge-adapters'].block, /adapters-compat-cli\.test\.mjs/);
});

test('PR outcome depends on all exact-head jobs and uses same-run external artifact ingress', () => {
  assert.deepEqual(parsed.jobs['pr-outcome'].needs, ['agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance', 'application-fast-assurance']);
  assert.deepEqual(parsed.jobs['pr-outcome'].permissions, {contents: 'read', 'id-token': 'write', attestations: 'write'});
  assert.match(parsed.jobs['pr-outcome'].block, /actions\/download-artifact@[0-9a-f]{40}/);
  assert.match(parsed.jobs['pr-outcome'].block, /generate-pr-outcome\.mjs/);
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
    '          subject-path: ${{ runner.temp }}/pr-outcome/outcome.json',
    '          subject-path: ${{ runner.temp }}/pr-outcome/validation.json',
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

test('release enforcement is manual, environment-gated, and fails through explicit evidence validation', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch' && inputs\.enforce_release/);
  assert.match(workflow, /environment: public-testnet-release/);
  assert.match(workflow, /enforce-release\.mjs/);
  assert.match(workflow, /inputs\.outcome_packet/);
  assert.match(workflow, /inputs\.approval_record/);
  assert.match(parsed.jobs['release-enforcement'].block, /runner\.temp.*release-enforcement.*release-exact-head\.json/);
  assert.doesNotMatch(parsed.jobs['release-enforcement'].block, /CI_GENERATED/);
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
    .replace('    runs-on: ubuntu-latest', '    runs-on: ubuntu-latest\n    permissions:\n      pull-requests: write');
  const result = validateWorkflow(broken);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('exactly contents: read')));
  assert(result.errors.some((error) => error.includes('broadens permission')));
});
