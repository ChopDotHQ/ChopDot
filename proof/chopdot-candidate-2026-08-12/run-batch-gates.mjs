import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultProofRoot = dirname(scriptPath);
const defaultConfigPath = join(defaultProofRoot, 'batch-gates.json');

export function loadGateConfig(path = defaultConfigPath) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function evaluateGates({
  config = loadGateConfig(),
  receiptsRoot = join(defaultProofRoot, 'receipts'),
  evidenceRoot = defaultProofRoot,
  requestedThrough = 'B6',
  now = new Date(),
} = {}) {
  assertConfig(config);
  const lastIndex = config.sequence.indexOf(requestedThrough);
  if (lastIndex < 0) throw new Error(`Unknown batch: ${requestedThrough}`);

  const results = [];
  let predecessorLocalPassed = true;
  let predecessorId = null;
  let promotionDeliveryTrainId = null;

  for (const id of config.sequence.slice(0, lastIndex + 1)) {
    const gate = config.gates.find(candidate => candidate.id === id);
    const receiptPath = join(receiptsRoot, `${id}.json`);
    const receipt = existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, 'utf8')) : null;

    if (!predecessorLocalPassed) {
      results.push({
        id,
        title: gate.title,
        localStatus: 'BLOCKED',
        localReason: `${predecessorId} local gate has not passed`,
        liveStatus: 'BLOCKED',
        liveReason: `${predecessorId} local gate has not passed`,
        localControls: `0/${gate.localControls.length}`,
        liveControls: `0/${gate.liveControls.length}`,
      });
      predecessorId = id;
      continue;
    }

    if (!receipt) {
      results.push({
        id,
        title: gate.title,
        localStatus: 'PARTIAL',
        localReason: 'no fresh local gate receipt',
        liveStatus: 'BLOCKED',
        liveReason: 'no fresh real-host receipt',
        localControls: `0/${gate.localControls.length}`,
        liveControls: `0/${gate.liveControls.length}`,
      });
      predecessorLocalPassed = false;
      predecessorId = id;
      continue;
    }

    const commonErrors = validateReceiptHeader({gate, receipt, now});
    const local = validateLane({
      config,
      receipt,
      proofRoot: evidenceRoot,
      expectedControls: gate.localControls,
      expectedCommands: gate.localCommands,
      lane: 'local',
      inheritedErrors: commonErrors,
    });
    const candidateFingerprint = fingerprintCandidate(receipt.candidate);
    if (
      config.evidencePolicy.stableDeliveryTrainRequired
      && promotionDeliveryTrainId
      && receipt.deliveryTrainId !== promotionDeliveryTrainId
    ) {
      local.errors.push('delivery train differs from the earlier passing batch');
    }
    if (gate.id === 'B6') {
      if (receipt.candidate?.clean !== true) local.errors.push('B6 candidate source is not clean');
      if (!validSha(receipt.candidate?.buildAggregateSha256)) local.errors.push('B6 build aggregate is missing or invalid');
      if (config.evidencePolicy.b6FinalFingerprintReproofRequired) {
        local.errors.push(...validateFinalReproofs({
          config,
          receiptsRoot,
          evidenceRoot,
          finalReceipt: receipt,
          now,
        }));
      }
    }
    const localStatus = local.errors.length === 0
      && local.passingControls === gate.localControls.length
      && local.passingCommands === gate.localCommands.length
      ? 'PASS'
      : 'PARTIAL';
    if (localStatus === 'PASS') promotionDeliveryTrainId ??= receipt.deliveryTrainId;

    let liveStatus = 'BLOCKED';
    let liveReason = 'local gate has not passed';
    let live = {passingControls: 0, passingCommands: 0, errors: []};
    if (localStatus === 'PASS') {
      live = validateLane({
        config,
        receipt,
        proofRoot: evidenceRoot,
        expectedControls: gate.liveControls,
        expectedCommands: gate.liveCommands,
        lane: 'live',
        inheritedErrors: commonErrors,
      });
      if (receipt.liveEnvironmentVerified !== true) live.errors.push('real-host environment is not verified');
      if (gate.id === 'B6' && receipt.actionTimeApproval !== true) {
        live.errors.push('action-time release approval is absent');
      }
      liveStatus = live.errors.length === 0
        && live.passingControls === gate.liveControls.length
        && live.passingCommands === gate.liveCommands.length
        ? 'PASS'
        : 'BLOCKED';
      liveReason = liveStatus === 'PASS'
        ? 'all real-host controls and commands have fresh evidence'
        : live.errors.join('; ') || 'real-host evidence is incomplete';
    }

    results.push({
      id,
      title: gate.title,
      localStatus,
      localReason: localStatus === 'PASS'
        ? 'all controlled local authority, UI, and simulator criteria have fresh evidence'
        : local.errors.join('; ') || 'fresh local evidence is incomplete',
      liveStatus,
      liveReason,
      localControls: `${local.passingControls}/${gate.localControls.length}`,
      localCommands: `${local.passingCommands}/${gate.localCommands.length}`,
      liveControls: `${live.passingControls}/${gate.liveControls.length}`,
      liveCommands: `${live.passingCommands}/${gate.liveCommands.length}`,
      receipt: relative(evidenceRoot, receiptPath),
      deliveryTrainId: receipt.deliveryTrainId,
      candidateFingerprint,
    });
    predecessorLocalPassed = localStatus === 'PASS';
    predecessorId = id;
  }

  return {
    schemaVersion: 2,
    through: requestedThrough,
    localPromotionVerdict: results.at(-1)?.localStatus ?? 'BLOCKED',
    liveVerdict: results.at(-1)?.liveStatus ?? 'BLOCKED',
    evaluatedAt: now.toISOString(),
    results,
  };
}

function validateReceiptHeader({gate, receipt, now}) {
  const errors = [];
  if (receipt.schemaVersion !== 2 || receipt.batch !== gate.id) errors.push('receipt schema/batch mismatch');
  if (!validToken(receipt.deliveryTrainId)) errors.push('deliveryTrainId is missing or invalid');
  const snapshotAt = parseDate(receipt.candidate?.snapshotAt, 'candidate.snapshotAt', errors);
  const runStartedAt = parseDate(receipt.runStartedAt, 'runStartedAt', errors);
  const runCompletedAt = parseDate(receipt.runCompletedAt, 'runCompletedAt', errors);
  if (snapshotAt && runStartedAt && runStartedAt < snapshotAt) errors.push('run started before source snapshot');
  if (runStartedAt && runCompletedAt && runCompletedAt < runStartedAt) errors.push('run completed before it started');
  if (runCompletedAt && runCompletedAt > now.getTime()) errors.push('run completion is in the future');
  for (const field of ['id', 'head', 'tree', 'packageLockSha256']) {
    const value = receipt.candidate?.[field];
    const valid = field === 'packageLockSha256' ? validSha(value) : validToken(value);
    if (!valid) errors.push(`candidate.${field} is missing or invalid`);
  }
  return errors;
}

function validateFinalReproofs({config, receiptsRoot, evidenceRoot, finalReceipt, now}) {
  const errors = [];
  const finalFingerprint = fingerprintCandidate(finalReceipt.candidate);
  const finalRoot = join(receiptsRoot, 'final', finalReceipt.candidate.id);

  for (const batch of config.sequence) {
    const gate = config.gates.find(candidate => candidate.id === batch);
    const path = join(finalRoot, `${batch}.json`);
    if (!existsSync(path)) {
      errors.push(`final candidate rerun receipt is missing for ${batch}`);
      continue;
    }

    let rerun;
    try {
      rerun = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      errors.push(`final candidate rerun receipt is invalid for ${batch}`);
      continue;
    }
    const lane = validateLane({
      config,
      receipt: rerun,
      proofRoot: evidenceRoot,
      expectedControls: gate.localControls,
      expectedCommands: gate.localCommands,
      lane: 'local',
      inheritedErrors: validateReceiptHeader({gate, receipt: rerun, now}),
    });
    if (rerun.proofPurpose !== 'final-candidate-rerun') {
      lane.errors.push(`${batch} rerun has the wrong proof purpose`);
    }
    if (rerun.deliveryTrainId !== finalReceipt.deliveryTrainId) {
      lane.errors.push(`${batch} rerun belongs to another delivery train`);
    }
    if (fingerprintCandidate(rerun.candidate) !== finalFingerprint) {
      lane.errors.push(`${batch} rerun does not use the final candidate fingerprint`);
    }
    if (rerun.candidate?.clean !== true) {
      lane.errors.push(`${batch} rerun does not identify a clean final candidate`);
    }
    if (
      lane.passingControls !== gate.localControls.length
      || lane.passingCommands !== gate.localCommands.length
    ) {
      lane.errors.push(`${batch} final candidate controls or commands are incomplete`);
    }
    errors.push(...lane.errors.map(error => `final ${batch}: ${error}`));
  }
  return errors;
}

function validateLane({
  config,
  receipt,
  proofRoot,
  expectedControls,
  expectedCommands,
  lane,
  inheritedErrors,
}) {
  const errors = [...inheritedErrors];
  const controlRows = Array.isArray(receipt.controls) ? receipt.controls : [];
  const controls = new Map(controlRows
    .filter(control => control.lane === lane)
    .map(control => [control.id, control]));
  if (controls.size !== controlRows.filter(control => control.lane === lane).length) {
    errors.push(`duplicate ${lane} control identifiers`);
  }
  let passingControls = 0;
  for (const id of expectedControls) {
    const control = controls.get(id);
    if (control?.status !== 'PASS') continue;
    if (validateEvidenceList(control.evidence, config, receipt, proofRoot, errors, `${id} evidence`)) {
      passingControls += 1;
    }
  }
  const unknownControls = [...controls.keys()].filter(id => !expectedControls.includes(id));
  if (unknownControls.length) errors.push(`unknown ${lane} controls: ${unknownControls.join(', ')}`);

  const commandRows = Array.isArray(receipt.commands) ? receipt.commands : [];
  const commands = new Map(commandRows
    .filter(command => command.lane === lane)
    .map(command => [command.id, command]));
  if (commands.size !== commandRows.filter(command => command.lane === lane).length) {
    errors.push(`duplicate ${lane} command identifiers`);
  }
  let passingCommands = 0;
  for (const expected of expectedCommands) {
    const command = commands.get(expected.id);
    if (command?.command !== expected.command || command?.exitCode !== 0) continue;
    if (validateEvidenceList(command.evidence, config, receipt, proofRoot, errors, `${expected.id} evidence`)) {
      passingCommands += 1;
    }
  }
  return {errors, passingControls, passingCommands};
}

function validateEvidenceList(evidence, config, receipt, proofRoot, errors, label) {
  if (!Array.isArray(evidence) || evidence.length === 0) return false;
  let valid = true;
  const started = Date.parse(receipt.runStartedAt);
  for (const item of evidence) {
    if (!item || typeof item.path !== 'string' || isAbsolute(item.path)) {
      errors.push(`${label} has an invalid path`);
      valid = false;
      continue;
    }
    const normalized = item.path.replaceAll('\\', '/');
    if (!config.evidencePolicy.freshRoots.some(root => normalized.startsWith(`${root}/${receipt.candidate.id}/`))) {
      errors.push(`${label} is outside the fresh source-snapshot evidence roots`);
      valid = false;
      continue;
    }
    const absolute = resolve(proofRoot, item.path);
    const rel = relative(proofRoot, absolute);
    if (
      rel.startsWith(`..${sep}`)
      || rel === '..'
      || !existsSync(absolute)
      || !lstatSync(absolute).isFile()
      || lstatSync(absolute).isSymbolicLink()
    ) {
      errors.push(`${label} does not resolve to a regular in-pack file`);
      valid = false;
      continue;
    }
    if (!realpathSync(absolute).startsWith(`${realpathSync(proofRoot)}${sep}`)) {
      errors.push(`${label} escapes the proof root`);
      valid = false;
      continue;
    }
    if (!validSha(item.sha256) || sha256File(absolute) !== item.sha256.toLowerCase()) {
      errors.push(`${label} hash mismatch`);
      valid = false;
    }
    if (!Number.isFinite(Date.parse(item.capturedAt)) || Date.parse(item.capturedAt) < started) {
      errors.push(`${label} predates the fresh run`);
      valid = false;
    }
  }
  return valid;
}

function parseDate(value, label, errors) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    errors.push(`${label} is invalid`);
    return null;
  }
  return time;
}

function validToken(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{6,256}$/u.test(value);
}

function validSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/iu.test(value);
}

function fingerprintCandidate(candidate) {
  return [candidate?.id, candidate?.head, candidate?.tree, candidate?.packageLockSha256].join(':');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function assertConfig(config) {
  if (config.schemaVersion !== 2 || !Array.isArray(config.sequence) || !Array.isArray(config.gates)) {
    throw new Error('Invalid batch-gates config');
  }
  if (config.sequence.join(',') !== 'B1,B2,B3,B4,B5,B6') {
    throw new Error('Batch order must remain B1 -> B2 -> B3 -> B4 -> B5 -> B6');
  }
  for (const [index, id] of config.sequence.entries()) {
    const gate = config.gates.find(candidate => candidate.id === id);
    if (!gate || gate.predecessor !== (index === 0 ? null : config.sequence[index - 1])) {
      throw new Error(`Invalid predecessor for ${id}`);
    }
    if (!Array.isArray(gate.localControls) || !Array.isArray(gate.liveControls)) {
      throw new Error(`Missing lane controls for ${id}`);
    }
  }
}

function formatHuman(report) {
  const lines = [
    `ChopDot local promotion verdict through ${report.through}: ${report.localPromotionVerdict}`,
    `ChopDot live-host verdict at ${report.through}: ${report.liveVerdict}`,
    '',
    'Batch Local     Live      Local controls  Live controls  Reason',
  ];
  for (const result of report.results) {
    lines.push([
      result.id.padEnd(5),
      result.localStatus.padEnd(9),
      result.liveStatus.padEnd(9),
      result.localControls.padEnd(15),
      result.liveControls.padEnd(14),
      result.localReason,
    ].join(' '));
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = {requestedThrough: 'B6', mode: 'enforce', json: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--through') options.requestedThrough = argv[++index];
    else if (arg === '--receipts') options.receiptsRoot = resolve(argv[++index]);
    else if (arg === '--mode') options.mode = argv[++index];
    else if (arg === '--json') options.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['audit', 'enforce'].includes(options.mode)) throw new Error(`Unknown mode: ${options.mode}`);
  return options;
}

if (process.argv[1] === scriptPath) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = evaluateGates(options);
    process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : formatHuman(report)}\n`);
    if (options.mode === 'enforce' && report.localPromotionVerdict !== 'PASS') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
