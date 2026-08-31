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
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseConfig = fs.readFileSync(path.join(root, 'playwright.release.config.ts'), 'utf8');

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
  'candidate-batch2-actual-participation.spec.ts',
  'candidate-batch2-limited-actual-route.spec.ts',
  'candidate-batch2-link-qr-no-app.spec.ts',
  'candidate-batch3-fresh-device-recovery.spec.ts',
  'candidate-batch4-full-loop.spec.ts',
  'candidate-batch5-lifecycle-card.spec.ts',
  'capture-truth.spec.ts',
  'first-use-group-ui.spec.ts',
  'membership-invitation-ui.spec.ts',
  'named-mode-multi-account-production-entrypoint.spec.ts',
  'named-mode-production-entrypoint.spec.ts',
  'polkadot-host-five-person-stress.spec.ts',
  'polkadot-host-sim.spec.ts',
  'product-surface-visual-evidence.spec.ts',
  'showcase-entrance.spec.ts',
  'statement-store-notification-budget.spec.ts',
  'ui-assurance-release.spec.ts',
];

const expectedIgnoredSpecs = [
  'membership-bootstrap-ui.spec.ts',
  'deferred-shared-action-restart.spec.ts',
  'general-shared-action-delivery.spec.ts',
  'polkadot-host-real-ui.spec.ts',
  'polkadot-host-wallet-settlement.spec.ts',
  'guest-payment-return.spec.ts',
  'late-expense-after-request.spec.ts',
  'live-payer-sync.spec.ts',
  'guest-payment-return-live-dot.spec.ts',
  'dot-host-preview.spec.ts',
];

function ignoredReleaseSpecs() {
  const block = releaseConfig.match(/testIgnore:\s*\[([\s\S]*?)\n\s*\],/u)?.[1] ?? '';
  return [...block.matchAll(/'([^']+\.spec\.ts)'/gu)].map(match => match[1]);
}

function discoveredActiveEvidenceWriters() {
  const ignored = new Set(ignoredReleaseSpecs());
  return fs.readdirSync(path.join(root, 'tests'))
    .filter(relative => relative.endsWith('.spec.ts') && !ignored.has(relative))
    .filter(relative => /\.screenshot\(|writeFile\(/u.test(fs.readFileSync(path.join(root, 'tests', relative), 'utf8')))
    .sort();
}

function browserEvidenceFailures(source) {
  const start = source.indexOf('\n  application-browser-assurance:\n');
  const end = source.indexOf('\n  secrets-scan:\n');
  if (start < 0 || end <= start) return ['application-browser-assurance block missing'];
  const block = source.slice(start, end);
  const stepsStart = block.indexOf('\n    steps:\n');
  if (stepsStart < 0) return ['application-browser-assurance steps missing'];
  const jobHeader = block.slice(0, stepsStart);
  const required = [
    'assert-exact-head.mjs --json-out="${{ runner.temp }}/chopdot-release-evidence/application-browser-exact-head.json"',
    'CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence',
    'test -s "$CHOPDOT_RELEASE_EVIDENCE_ROOT/playwright/results.json"',
    'report.stats?.unexpected !== 0 || report.stats?.expected < 1',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'git status --porcelain --untracked-files=all',
    '${{ runner.temp }}/chopdot-release-evidence/',
    'if-no-files-found: error',
  ];
  const failures = required.filter(value => !block.includes(value)).map(value => `browser evidence contract missing ${value}`);
  const evidenceBindingCount = (block.match(/CHOPDOT_RELEASE_EVIDENCE_ROOT: \$\{\{ runner\.temp \}\}\/chopdot-release-evidence/gu) ?? []).length;
  const stepNames = [...block.matchAll(/^      - name: (.+)$/gmu)].map(match => match[1]);
  const expectedTail = ['Publish browser assurance summary', 'Assert browser suite left repository clean', 'Upload browser assurance evidence'];
  const summaryStart = block.indexOf('      - name: Publish browser assurance summary\n');
  const cleanStart = block.indexOf('      - name: Assert browser suite left repository clean\n');
  const uploadStart = block.indexOf('      - name: Upload browser assurance evidence\n');
  const expectedSummary = [
    '      - name: Publish browser assurance summary',
    '        if: always()',
    '        run: |',
    '          echo "## Application browser assurance" >> "$GITHUB_STEP_SUMMARY"',
    '          echo "Production-entrypoint Playwright results apply only to the exact checked-out candidate." >> "$GITHUB_STEP_SUMMARY"',
    '          echo "This is application evidence, not deployment, reachability, ownership, or live-user proof." >> "$GITHUB_STEP_SUMMARY"',
    '',
  ].join('\n');
  const expectedClean = [
    '      - name: Assert browser suite left repository clean',
    '        run: |',
    '          git status --short --untracked-files=all',
    '          git diff --exit-code',
    '          git diff --cached --exit-code',
    '          test -z "$(git status --porcelain --untracked-files=all)"',
    '',
  ].join('\n');
  if (evidenceBindingCount !== 2) failures.push(`browser evidence root must bind exactly two runtime steps, found ${evidenceBindingCount}`);
  if (/CHOPDOT_RELEASE_EVIDENCE_ROOT|\$\{\{ runner\./u.test(jobHeader)) failures.push('browser evidence root cannot use runner context at job scope');
  if (JSON.stringify(stepNames.slice(-3)) !== JSON.stringify(expectedTail)) failures.push('browser job must end summary, penultimate cleanliness, then final upload');
  if (summaryStart < 0 || cleanStart <= summaryStart || block.slice(summaryStart, cleanStart) !== expectedSummary) failures.push('browser summary must contain only reviewed pre-clean diagnostic writes');
  if (cleanStart < 0 || uploadStart <= cleanStart || block.slice(cleanStart, uploadStart) !== expectedClean) failures.push('browser cleanliness step must contain only reviewed terminal commands');
  return failures;
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

test('all seventeen active release evidence writers use the containment helper', () => {
  assert.deepEqual([...releaseSpecs].sort(), discoveredActiveEvidenceWriters());
  for (const relative of releaseSpecs) {
    const source = fs.readFileSync(path.join(root, 'tests', relative), 'utf8');
    assert.match(source, /releaseEvidencePath/u, relative);
    assert.doesNotMatch(source, /(?:artifacts\/release|proof\/|path\.resolve\(['"]test-results)/u, relative);
  }
});

test('the release browser command, exclusion set, and machine-readable output are bound', () => {
  assert.equal(packageJson.scripts['test:release-browser'], 'playwright test --config=playwright.release.config.ts --workers=1');
  assert.deepEqual(ignoredReleaseSpecs(), expectedIgnoredSpecs);
  assert.match(releaseConfig, /outputDir:\s*releaseEvidencePath\('playwright', 'artifacts'\)/u);
  assert.match(releaseConfig, /\['json', \{outputFile: releaseEvidencePath\('playwright', 'results\.json'\)\}\]/u);
  assert.doesNotMatch(releaseConfig, /reporter:\s*'line'/u);
});

test('browser workflow uploads runtime evidence and proves tracked-source cleanliness', () => {
  assert.deepEqual(browserEvidenceFailures(workflow), []);
  for (const needle of [
    'CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence',
    'test -s "$CHOPDOT_RELEASE_EVIDENCE_ROOT/playwright/results.json"',
    'git diff --exit-code',
    'git diff --cached --exit-code',
    'git status --porcelain --untracked-files=all',
    '${{ runner.temp }}/chopdot-release-evidence/',
  ]) {
    const broken = workflow.replace(needle, 'removed-hostile-fixture');
    assert.notEqual(broken, workflow);
    assert.notDeepEqual(browserEvidenceFailures(broken), []);
  }
  for (const broken of [
    workflow.replace('      - name: Upload browser assurance evidence\n', '      - name: Reintroduce checkout dirtiness after the clean gate\n        run: touch post-clean-dirty.txt\n      - name: Upload browser assurance evidence\n'),
    workflow.replace('          echo "This is application evidence, not deployment, reachability, ownership, or live-user proof." >> "$GITHUB_STEP_SUMMARY"\n', '          echo "This is application evidence, not deployment, reachability, ownership, or live-user proof." >> "$GITHUB_STEP_SUMMARY"\n          touch post-clean-dirty.txt\n'),
    workflow.replace('          test -z "$(git status --porcelain --untracked-files=all)"\n', '          test -z "$(git status --porcelain --untracked-files=all)"\n          touch post-clean-dirty.txt\n'),
  ]) {
    assert.notEqual(broken, workflow);
    assert.notDeepEqual(browserEvidenceFailures(broken), []);
  }
});

test('runner context is used only where GitHub exposes it', () => {
  const broken = workflow.replace(
    '  application-browser-assurance:\n    name: Application browser assurance',
    '  application-browser-assurance:\n    name: Application browser assurance\n    env:\n      CHOPDOT_RELEASE_EVIDENCE_ROOT: ${{ runner.temp }}/chopdot-release-evidence',
  );
  assert.notDeepEqual(browserEvidenceFailures(broken), []);
  assert.equal((workflow.match(/CHOPDOT_RELEASE_EVIDENCE_ROOT: \$\{\{ runner\.temp \}\}\/chopdot-release-evidence/gu) ?? []).length, 2);
  assert.match(workflow, /--json-out="\$\{\{ runner\.temp \}\}\/chopdot-release-evidence\/application-browser-exact-head\.json"/u);
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/chopdot-release-evidence\//u);
  assert.doesNotMatch(workflow.slice(workflow.indexOf('\n  application-browser-assurance:\n'), workflow.indexOf('\n  secrets-scan:\n')), /GOVERNANCE_REPORT_ROOT/u);
});

test('UI assurance waits for a visible product heading before each hosted screenshot', () => {
  const source = fs.readFileSync(path.join(root, 'tests/ui-assurance-release.spec.ts'), 'utf8');
  assert.match(source, /activeFrame = await readyProductFrame\(page\);\s*await activeFrame\.locator\('#root'\)\.screenshot/um);
  assert.match(source, /candidate\.locator\('#root h1'\)\.first\(\)\.isVisible\(\)\.catch/u);
});
