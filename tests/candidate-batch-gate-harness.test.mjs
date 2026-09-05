import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  evaluateGates,
  loadGateConfig,
} from '../proof/chopdot-candidate-2026-08-12/run-batch-gates.mjs';

const config = loadGateConfig();
const now = new Date('2026-08-12T13:00:00.000Z');

test('schema v2 preserves the operator-authorized Batch 1 through Batch 6 order', () => {
  assert.equal(config.schemaVersion, 2);
  assert.deepEqual(config.sequence, ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);
  assert.deepEqual(config.gates.map(gate => gate.title), [
    'Existing-contact invitation',
    'Link, QR, and limited no-app entry',
    'Beyond-window recovery',
    'Full loop and capability inheritance',
    'UX and spending-group cards',
    'Freeze, prove, and separately approve release',
  ]);
  for (const gate of config.gates) {
    assert.ok(gate.localControls.length > 0);
    assert.ok(gate.liveControls.length > 0);
    assert.ok(gate.localCommands.length > 0);
    assert.ok(gate.liveCommands.length > 0);
  }

  const b2 = config.gates.find(gate => gate.id === 'B2');
  assert.ok(b2);
  assert.deepEqual(b2.localControls, [
    'B2-ONE-MEMBERSHIP-MODEL',
    'B2-LINK',
    'B2-QR-PARITY',
    'B2-LIMITED-NO-APP',
    'B2-TRANSPORT-NOT-AUTHORITY',
    'B2-LEGACY-SNAPSHOT-RETIRED',
    'B2-EXPLICIT-CONSENT',
    'B2-FORWARD-WRONG-PERSON',
    'B2-EXPIRY-REVOKE-REPLAY',
    'B2-NO-SECRET-OR-HISTORY',
    'B2-MONEY-STATE-NON-AUTHORITY',
    'B2-DUPLICATE-IDENTITY',
    'B2-ISOLATED-MIXED-UI',
    'B2-PLAIN-USER-LANGUAGE',
  ]);
  assert.deepEqual(b2.localCommands.map(command => command.id), [
    'b2-membership-regression',
    'b2-entry-domain',
    'b2-limited-no-app-domain',
    'b2-request-link-regression',
    'b2-preview-ui',
    'b2-router-retirement',
    'b2-mixed-ui',
    'b2-limited-actual-ui',
  ]);
  assert.equal(
    b2.localCommands.find(command => command.id === 'b2-entry-domain')?.command,
    'node --import tsx --test src/membership/recipientBoundBootstrap.test.ts src/membership/recipientBoundBootstrapCoordinator.test.ts',
  );
  assert.equal(
    b2.localCommands.find(command => command.id === 'b2-router-retirement')?.command,
    'npx playwright test tests/candidate-batch2-router-retirement.spec.ts --config=playwright.host-sim.config.ts --workers=1',
  );
  assert.equal(
    b2.localCommands.find(command => command.id === 'b2-mixed-ui')?.command,
    'npx playwright test tests/candidate-batch2-actual-participation.spec.ts --config=playwright.host-sim.config.ts --workers=1',
  );
  assert.equal(
    b2.localCommands.find(command => command.id === 'b2-limited-no-app-domain')?.command,
    'node --import tsx --test src/membership/limitedNoAppAction.test.ts src/membership/limitedNoAppActionLink.test.ts src/membership/limitedNoAppActionService.test.ts',
  );
  assert.equal(
    b2.localCommands.find(command => command.id === 'b2-limited-actual-ui')?.command,
    'npx playwright test tests/candidate-batch2-limited-actual-route.spec.ts --config=playwright.host-sim.config.ts --workers=1',
  );
});

test('without a fresh Batch 1 receipt, Batch 1 is partial and Batch 2 is blocked', () => {
  const fixture = makeFixture();
  const report = evaluate(fixture, 'B2');

  assert.equal(report.localPromotionVerdict, 'BLOCKED');
  assert.deepEqual(report.results.map(({id, localStatus, liveStatus}) => ({id, localStatus, liveStatus})), [
    {id: 'B1', localStatus: 'PARTIAL', liveStatus: 'BLOCKED'},
    {id: 'B2', localStatus: 'BLOCKED', liveStatus: 'BLOCKED'},
  ]);
});

test('a complete Batch 1 local receipt passes locally while its live lane remains blocked', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT'});
  const report = evaluate(fixture, 'B1');

  assert.equal(report.localPromotionVerdict, 'PASS');
  assert.equal(report.liveVerdict, 'BLOCKED');
  assert.equal(report.results[0].localStatus, 'PASS');
  assert.equal(report.results[0].liveStatus, 'BLOCKED');
  assert.equal(report.results[0].localControls, '12/12');
  assert.equal(report.results[0].liveControls, '0/3');
});

test('a local Batch 1 pass unlocks Batch 2 local execution despite Batch 1 live block', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT'});
  const report = evaluate(fixture, 'B2');

  assert.equal(report.results[0].localStatus, 'PASS');
  assert.equal(report.results[0].liveStatus, 'BLOCKED');
  assert.equal(report.results[1].localStatus, 'PARTIAL');
  assert.equal(report.results[1].localReason, 'no fresh local gate receipt');
});

test('a partial Batch 1 local receipt blocks Batch 2 promotion', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PARTIAL', live: 'ABSENT'});
  const report = evaluate(fixture, 'B2');

  assert.equal(report.results[0].localStatus, 'PARTIAL');
  assert.equal(report.results[1].localStatus, 'BLOCKED');
  assert.match(report.results[1].localReason, /B1 local gate has not passed/u);
});

test('the legacy nine-control Batch 2 shape cannot certify the product-law gate', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT'});
  const receipt = writeReceipt(fixture, 'B2', {
    local: 'PASS', live: 'ABSENT', candidateId: 'candidate-two',
  });
  const legacyControls = new Set([
    'B2-ONE-MEMBERSHIP-MODEL', 'B2-LINK', 'B2-LIMITED-NO-APP',
    'B2-FORWARD-WRONG-PERSON', 'B2-NO-SECRET-OR-HISTORY',
    'B2-DUPLICATE-IDENTITY', 'B2-ISOLATED-MIXED-UI',
  ]);
  receipt.controls = receipt.controls.filter(control =>
    control.lane === 'live' || legacyControls.has(control.id));
  writeReceiptFile(fixture, 'B2', receipt);

  const report = evaluate(fixture, 'B2');
  assert.equal(report.results[1].localStatus, 'PARTIAL');
  assert.equal(report.results[1].localControls, '7/14');
});

test('old, unhashed, or out-of-pack evidence cannot satisfy a local control', () => {
  const fixture = makeFixture();
  const receipt = writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT'});
  receipt.controls.find(control => control.lane === 'local').evidence[0].path = '../old-proof/REPORT.md';
  writeReceiptFile(fixture, 'B1', receipt);

  const report = evaluate(fixture, 'B1');
  assert.equal(report.localPromotionVerdict, 'PARTIAL');
  assert.match(report.results[0].localReason, /outside the fresh source-snapshot evidence roots/u);
});

test('changed source snapshots can advance within one stable delivery train', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT', candidateId: 'candidate-one'});
  writeReceipt(fixture, 'B2', {local: 'PASS', live: 'ABSENT', candidateId: 'candidate-two'});
  const report = evaluate(fixture, 'B2');

  assert.equal(report.results[0].localStatus, 'PASS');
  assert.equal(report.results[1].localStatus, 'PASS');
  assert.notEqual(report.results[0].candidateFingerprint, report.results[1].candidateFingerprint);
  assert.equal(report.results[0].deliveryTrainId, report.results[1].deliveryTrainId);
});

test('a receipt from another delivery train cannot continue promotion', () => {
  const fixture = makeFixture();
  writeReceipt(fixture, 'B1', {local: 'PASS', live: 'ABSENT', deliveryTrainId: 'train-one'});
  writeReceipt(fixture, 'B2', {
    local: 'PASS', live: 'ABSENT', candidateId: 'candidate-two', deliveryTrainId: 'train-two',
  });
  const report = evaluate(fixture, 'B2');

  assert.equal(report.results[0].localStatus, 'PASS');
  assert.equal(report.results[1].localStatus, 'PARTIAL');
  assert.match(report.results[1].localReason, /delivery train differs/u);
});

test('Batch 6 cannot pass without B1 through B6 rerun receipts on its final fingerprint', () => {
  const fixture = makeFixture();
  writeSequentialLocalPasses(fixture);
  const report = evaluate(fixture, 'B6');

  assert.equal(report.results.slice(0, -1).every(result => result.localStatus === 'PASS'), true);
  assert.equal(report.results.at(-1).localStatus, 'PARTIAL');
  assert.match(report.results.at(-1).localReason, /final candidate rerun receipt is missing for B1/u);
});

test('Batch 6 rejects a complete rerun set when one batch uses another final fingerprint', () => {
  const fixture = makeFixture();
  writeSequentialLocalPasses(fixture);
  writeFinalReproofs(fixture);
  const path = join(fixture.receiptsRoot, 'final', 'candidate-final', 'B3.json');
  const receipt = JSON.parse(readFileSync(path, 'utf8'));
  receipt.candidate.head = 'wrong99';
  writeFileSync(path, JSON.stringify(receipt));

  const report = evaluate(fixture, 'B6');
  assert.equal(report.results.at(-1).localStatus, 'PARTIAL');
  assert.match(report.results.at(-1).localReason, /final B3: B3 rerun does not use the final candidate fingerprint/u);
});

test('Batch 6 may pass locally while its live lane remains action-time gated', () => {
  const fixture = makeFixture();
  writeSequentialLocalPasses(fixture, {b6Live: 'PASS', actionTimeApproval: false});
  writeFinalReproofs(fixture);
  const report = evaluate(fixture, 'B6');

  assert.equal(report.results.every(result => result.localStatus === 'PASS'), true);
  assert.equal(report.localPromotionVerdict, 'PASS');
  assert.equal(report.results.at(-1).liveStatus, 'BLOCKED');
  assert.match(report.results.at(-1).liveReason, /action-time release approval is absent/u);
});

test('Batch 6 live passes only with real-host evidence and explicit action-time approval', () => {
  const fixture = makeFixture();
  writeSequentialLocalPasses(fixture, {b6Live: 'PASS', actionTimeApproval: true});
  writeFinalReproofs(fixture);
  const report = evaluate(fixture, 'B6');

  assert.equal(report.localPromotionVerdict, 'PASS');
  assert.equal(report.liveVerdict, 'PASS');
  assert.equal(report.results.at(-1).liveStatus, 'PASS');
});

function evaluate(fixture, requestedThrough) {
  return evaluateGates({
    config,
    receiptsRoot: fixture.receiptsRoot,
    evidenceRoot: fixture.root,
    requestedThrough,
    now,
  });
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'chopdot-batch-gates-'));
  const receiptsRoot = join(root, 'receipts');
  mkdirSync(receiptsRoot);
  return {root, receiptsRoot};
}

function writeReceipt(fixture, batch, {
  local,
  live,
  candidateId = 'candidate-one',
  deliveryTrainId = 'train-one',
  actionTimeApproval = false,
  finalRerun = false,
}) {
  const gate = config.gates.find(candidate => candidate.id === batch);
  const suffix = finalRerun ? 'final-rerun' : 'promotion';
  const localEvidence = makeEvidence(fixture, candidateId, `${batch.toLowerCase()}-${suffix}-local.txt`);
  const liveEvidence = makeEvidence(fixture, candidateId, `${batch.toLowerCase()}-${suffix}-live.txt`);
  const receipt = {
    schemaVersion: 2,
    batch,
    deliveryTrainId,
    ...(finalRerun ? {proofPurpose: 'final-candidate-rerun'} : {}),
    runStartedAt: '2026-08-12T12:00:00.000Z',
    runCompletedAt: '2026-08-12T12:01:00.000Z',
    candidate: {
      id: candidateId,
      head: candidateId === 'candidate-one' ? 'aaaaaa1' : 'bbbbbb2',
      tree: candidateId === 'candidate-one' ? 'cccccc3' : 'dddddd4',
      packageLockSha256: candidateId === 'candidate-one' ? 'e'.repeat(64) : 'f'.repeat(64),
      buildAggregateSha256: 'a'.repeat(64),
      snapshotAt: '2026-08-12T11:59:00.000Z',
      clean: batch === 'B6' || finalRerun,
    },
    controls: [
      ...gate.localControls.map((id, index) => ({
        id,
        lane: 'local',
        status: local === 'PASS' || (local === 'PARTIAL' && index === 0) ? 'PASS' : 'PARTIAL',
        evidence: local === 'PASS' || (local === 'PARTIAL' && index === 0) ? [localEvidence] : [],
      })),
      ...gate.liveControls.map(id => ({
        id,
        lane: 'live',
        status: live === 'PASS' ? 'PASS' : 'BLOCKED',
        evidence: live === 'PASS' ? [liveEvidence] : [],
      })),
    ],
    commands: [
      ...gate.localCommands.map((expected, index) => ({
        id: expected.id,
        lane: 'local',
        command: expected.command,
        exitCode: local === 'PASS' || (local === 'PARTIAL' && index === 0) ? 0 : 1,
        evidence: local === 'PASS' || (local === 'PARTIAL' && index === 0) ? [localEvidence] : [],
      })),
      ...gate.liveCommands.map(expected => ({
        id: expected.id,
        lane: 'live',
        command: expected.command,
        exitCode: live === 'PASS' ? 0 : 1,
        evidence: live === 'PASS' ? [liveEvidence] : [],
      })),
    ],
    liveEnvironmentVerified: live === 'PASS',
    actionTimeApproval,
  };
  writeReceiptFile(fixture, batch, receipt, {candidateId, finalRerun});
  return receipt;
}

function writeReceiptFile(fixture, batch, receipt, {
  candidateId = receipt.candidate.id,
  finalRerun = false,
} = {}) {
  const root = finalRerun
    ? join(fixture.receiptsRoot, 'final', candidateId)
    : fixture.receiptsRoot;
  mkdirSync(root, {recursive: true});
  writeFileSync(join(root, `${batch}.json`), JSON.stringify(receipt));
}

function writeSequentialLocalPasses(fixture, {
  b6Live = 'ABSENT',
  actionTimeApproval = false,
  deliveryTrainId = 'train-one',
} = {}) {
  for (const [index, batch] of config.sequence.entries()) {
    writeReceipt(fixture, batch, {
      local: 'PASS',
      live: batch === 'B6' ? b6Live : 'ABSENT',
      candidateId: batch === 'B6' ? 'candidate-final' : `candidate-batch-${index + 1}`,
      deliveryTrainId,
      actionTimeApproval: batch === 'B6' && actionTimeApproval,
    });
  }
}

function writeFinalReproofs(fixture, {
  candidateId = 'candidate-final',
  deliveryTrainId = 'train-one',
} = {}) {
  for (const batch of config.sequence) {
    writeReceipt(fixture, batch, {
      local: 'PASS',
      live: 'ABSENT',
      candidateId,
      deliveryTrainId,
      finalRerun: true,
    });
  }
}

function makeEvidence(fixture, candidateId, name) {
  const relativePath = `test-results/${candidateId}/${name}`;
  const path = join(fixture.root, relativePath);
  mkdirSync(join(fixture.root, `test-results/${candidateId}`), {recursive: true});
  writeFileSync(path, `fresh synthetic evidence: ${name}`);
  return {
    path: relativePath,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    capturedAt: '2026-08-12T12:00:30.000Z',
  };
}
