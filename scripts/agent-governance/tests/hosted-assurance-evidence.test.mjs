import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workflowPath = path.join(root, '.github/workflows/agent-governance.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const ignorePath = path.join(root, '.gitleaksignore');
const baseline = fs.readFileSync(ignorePath, 'utf8').trim().split('\n');
const classification = fs.readFileSync(path.join(root, 'docs/agent-system/GITLEAKS_HISTORY_BASELINE.md'), 'utf8');

const expectedFingerprints = [
  '6cd0e092e662e5b421c28914cb4bfef5f7ea6390:scripts/release-evidence.test.mjs:generic-api-key:113',
  '1a44c4ceced4ed75168d86d28a5b924925a0c5e6:tests/support/truapiCompatibleTestHost.ts:generic-api-key:19',
  'e0cb95f32f962864f0bcce3ff3439a71b2d93c34:docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md:generic-api-key:783',
  'a5676d95ec40696a34d5d083d5856437b8145a67:proof/polkadot-host-sim/report.json:generic-api-key:21',
  'a5676d95ec40696a34d5d083d5856437b8145a67:proof/polkadot-host-stress/report.json:generic-api-key:65',
  '7d688ea48aa253922324d98fd656f009ab8eb790:scripts/run-agent-wallet-token-scenarios.mjs:generic-api-key:19',
  '079c5a025b4a22da2143e1b4482724dcdcd71fd8:scripts/run-agent-wallet-token-scenarios.mjs:generic-api-key:19',
  'fe9e6ae88e339ca928c11911f78ce66480be52ca:docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md:generic-api-key:768',
  '37539a7f9945067965449e8e3a1562a8c4bed8e5:SIGNUP_DEBUG.md:generic-api-key:13',
  '37539a7f9945067965449e8e3a1562a8c4bed8e5:test-signup.html:jwt:18',
  '37539a7f9945067965449e8e3a1562a8c4bed8e5:test-supabase-auth.ts:jwt:5',
  'ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/AUTH_SYSTEM.md:generic-api-key:295',
  'ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/BACKEND_API.md:generic-api-key:85',
  'ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/BACKEND_API.md:generic-api-key:112',
];

const releaseSpecs = [
  'candidate-batch2-link-qr-no-app.spec.ts',
  'candidate-batch3-fresh-device-recovery.spec.ts',
  'candidate-batch4-full-loop.spec.ts',
  'candidate-batch5-lifecycle-card.spec.ts',
  'membership-invitation-ui.spec.ts',
  'named-mode-multi-account-production-entrypoint.spec.ts',
  'named-mode-production-entrypoint.spec.ts',
  'product-surface-visual-evidence.spec.ts',
  'showcase-entrance.spec.ts',
  'ui-assurance-release.spec.ts',
];

function browserEvidenceFailures(source) {
  const start = source.indexOf('\n  application-browser-assurance:\n');
  const end = source.indexOf('\n  secrets-scan:\n');
  if (start < 0 || end <= start) return ['application-browser-assurance block missing'];
  const block = source.slice(start, end);
  const required = [
    'CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'git status --porcelain --untracked-files=all',
    '${{ env.CHOPDOT_RELEASE_EVIDENCE_ROOT }}/',
    'if-no-files-found: error',
  ];
  return required.filter(value => !block.includes(value)).map(value => `browser evidence contract missing ${value}`);
}

test('Gitleaks baseline is exactly the 14 reviewed fingerprints', () => {
  assert.deepEqual(baseline, expectedFingerprints);
  assert.equal(new Set(baseline).size, 14);
  assert(baseline.every(value => /^[0-9a-f]{40}:.+:(?:generic-api-key|jwt):[1-9][0-9]*$/u.test(value)));
  for (const fingerprint of expectedFingerprints) assert.match(classification, new RegExp(fingerprint.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(classification, /no human rotation blocker/u);
});

test('broad, missing, duplicate, or reordered baseline entries fail exact comparison', () => {
  for (const changed of [
    baseline.slice(1),
    [...baseline, baseline[0]],
    [...baseline].reverse(),
    [...baseline, 'allow = .*'],
  ]) assert.notDeepEqual(changed, expectedFingerprints);
});

test('all ten active release evidence writers use the containment helper', () => {
  for (const relative of releaseSpecs) {
    const source = fs.readFileSync(path.join(root, 'tests', relative), 'utf8');
    assert.match(source, /releaseEvidencePath/u, relative);
    assert.doesNotMatch(source, /(?:artifacts\/release|proof\/chopdot-candidate-2026-08-12)/u, relative);
  }
});

test('browser workflow uploads runtime evidence and proves tracked-source cleanliness', () => {
  assert.deepEqual(browserEvidenceFailures(workflow), []);
  for (const needle of [
    'CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'git status --porcelain --untracked-files=all',
    '${{ env.CHOPDOT_RELEASE_EVIDENCE_ROOT }}/',
  ]) {
    const broken = workflow.replace(needle, 'removed-hostile-fixture');
    assert.notEqual(broken, workflow);
    assert.notDeepEqual(browserEvidenceFailures(broken), []);
  }
});

test('UI assurance waits for a ready main before each hosted screenshot', () => {
  const source = fs.readFileSync(path.join(root, 'tests/ui-assurance-release.spec.ts'), 'utf8');
  assert.match(source, /activeFrame = await readyProductFrame\(page\);\s*await activeFrame\.locator\('#root'\)\.screenshot/um);
  assert.match(source, /candidate\.locator\('main'\)\.isVisible\(\)\.catch/u);
});
