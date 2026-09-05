import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync} from 'node:fs';
import {basename, dirname, join, relative, resolve, sep} from 'node:path';

const cwd = process.cwd();
const localProofRoot = resolve(cwd, 'proof/chopdot-candidate-2026-08-12');
const proofRoot = resolve(process.env.CHOPDOT_B6_PROOF_ROOT ?? localProofRoot);
const config = JSON.parse(readFileSync(join(localProofRoot, 'batch-gates.json'), 'utf8'));
const deliveryTrainId = 'chopdot-functional-candidate-2026-08-12';
const head = git(['rev-parse', 'HEAD']);
const tree = git(['rev-parse', 'HEAD^{tree}']);
const candidateId = `chopdot-b6-${head.slice(0, 12)}`;
const packageLockSha256 = sha256(readFileSync(join(cwd, 'package-lock.json')));
const evidenceRoot = join(proofRoot, 'test-results', candidateId);
const screenshotRoot = join(proofRoot, 'screenshots', candidateId);
const artifactRoot = join(proofRoot, 'artifact', candidateId);
const finalReceiptsRoot = join(proofRoot, 'receipts', 'final', candidateId);
const topLevelB6Receipt = join(proofRoot, 'receipts', 'B6.json');

for (const path of [evidenceRoot, screenshotRoot, artifactRoot, finalReceiptsRoot]) {
  if (existsSync(path)) throw new Error(`Refusing to overwrite existing final evidence: ${path}`);
}
mkdirSync(evidenceRoot, {recursive: true});
mkdirSync(screenshotRoot, {recursive: true});
mkdirSync(finalReceiptsRoot, {recursive: true});

const runStartedAt = new Date().toISOString();
const runStartedMs = Date.parse(runStartedAt);
const results = new Map();

// Prove clean source before any screenshot-producing command touches tracked
// historical evidence in this disposable verification worktree.
const b6 = config.gates.find(gate => gate.id === 'B6');
runDeclared('B6', b6.localCommands[0]);
runDeclared('B6', b6.localCommands[1]);
runSupplemental('B6', 'b6-audit-production', 'npm audit --omit=dev --audit-level=high');
runSupplemental('B6', 'b6-audit-full-informational', 'npm audit --audit-level=high || true');
runSupplemental('B6', 'b6-artifact-prepare', 'node proof/chopdot-candidate-2026-08-12/prepare-artifact-manifest.mjs');

for (const gate of config.gates.filter(gate => gate.id !== 'B6')) {
  for (const command of gate.localCommands) runDeclared(gate.id, command);
}
runDeclared('B6', b6.localCommands[2]);
runDeclared('B6', b6.localCommands[3]);

copyFreshScreenshots(resolve(cwd, 'proof'));
copyFreshScreenshots(resolve(cwd, 'test-results'));

const runCompletedAt = new Date().toISOString();
const manifest = JSON.parse(readFileSync(join(artifactRoot, 'manifest.json'), 'utf8'));
const candidate = {
  id: candidateId,
  head,
  tree,
  packageLockSha256,
  snapshotAt: runStartedAt,
  clean: results.get('B6:b6-clean-source')?.exitCode === 0,
  buildAggregateSha256: manifest.artifact.aggregateSha256,
};

const allDeclaredPassed = config.gates.every(gate => gate.localCommands.every(command => (
  results.get(`${gate.id}:${command.id}`)?.exitCode === 0
)));
const payloadLog = resultText('B6:b6-host-regression');
const payloadPassed = payloadLog.includes('within per-user total') && /verdict\s+FITS/u.test(payloadLog);
const productionAuditPassed = results.get('B6:b6-audit-production')?.exitCode === 0;

const screenshotFiles = collectFiles(screenshotRoot)
  .map(path => relative(proofRoot, path).replaceAll(sep, '/'))
  .sort();

const requirementsIndex = renderRequirementsIndex({
  allDeclaredPassed,
  payloadPassed,
  productionAuditPassed,
  screenshotFiles,
  manifest,
});
const requirementsPath = join(evidenceRoot, 'requirements-index.md');
writeFileSync(requirementsPath, requirementsIndex);

for (const gate of config.gates) {
  const batchPassed = gate.localCommands.every(command => results.get(`${gate.id}:${command.id}`)?.exitCode === 0);
  const controlsPass = gate.id !== 'B6'
    ? batchPassed
    : batchPassed && allDeclaredPassed && payloadPassed && productionAuditPassed && screenshotFiles.length > 0;
  const summaryPath = join(evidenceRoot, `${gate.id}-EVIDENCE.md`);
  writeFileSync(summaryPath, renderBatchSummary(gate, controlsPass, requirementsPath));
  const summaryEvidence = evidence(summaryPath, runCompletedAt);
  const controls = [
    ...gate.localControls.map(id => ({
      id,
      lane: 'local',
      status: controlsPass ? 'PASS' : 'PARTIAL',
      evidence: [summaryEvidence],
    })),
    ...gate.liveControls.map(id => ({id, lane: 'live', status: 'BLOCKED', evidence: []})),
  ];
  const commands = [
    ...gate.localCommands.map(command => {
      const result = results.get(`${gate.id}:${command.id}`);
      return {
        id: command.id,
        lane: 'local',
        command: command.command,
        exitCode: result?.exitCode ?? 1,
        evidence: result ? [evidence(result.logPath, runCompletedAt)] : [],
      };
    }),
    ...gate.liveCommands.map(command => ({
      id: command.id,
      lane: 'live',
      command: command.command,
      exitCode: 1,
      evidence: [],
    })),
  ];
  const receipt = {
    schemaVersion: 2,
    batch: gate.id,
    deliveryTrainId,
    proofPurpose: 'final-candidate-rerun',
    runStartedAt,
    runCompletedAt,
    candidate,
    controls,
    commands,
    liveEnvironmentVerified: false,
    actionTimeApproval: false,
  };
  const receiptPath = join(finalReceiptsRoot, `${gate.id}.json`);
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  if (gate.id === 'B6') writeFileSync(topLevelB6Receipt, `${JSON.stringify(receipt, null, 2)}\n`);
}

const report = {
  candidateId,
  runStartedAt,
  runCompletedAt,
  allDeclaredPassed,
  payloadPassed,
  productionAuditPassed,
  screenshots: screenshotFiles.length,
  buildAggregateSha256: manifest.artifact.aggregateSha256,
  failed: [...results.entries()].filter(([, result]) => result.exitCode !== 0).map(([id]) => id),
};
writeFileSync(join(evidenceRoot, 'run-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(evidenceRoot, 'REPORT.md'), renderFinalReport(report, manifest));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!allDeclaredPassed || !payloadPassed || !productionAuditPassed || screenshotFiles.length === 0) process.exitCode = 1;

function runDeclared(batch, command) {
  run(batch, command.id, command.command);
}

function runSupplemental(batch, id, command) {
  run(batch, id, command);
}

function run(batch, id, command) {
  const directory = join(evidenceRoot, 'commands', batch);
  mkdirSync(directory, {recursive: true});
  const logPath = join(directory, `${id}.txt`);
  const startedAt = new Date().toISOString();
  const result = spawnSync('/bin/zsh', ['-lc', command], {
    cwd,
    env: {
      ...process.env,
      CHOPDOT_B6_PROOF_ROOT: proofRoot,
      CHOPDOT_STATEMENT_BUDGET_REPORT: join(evidenceRoot, 'reports', 'statement-notification-budget.json'),
      FORCE_COLOR: '0',
    },
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
  const exitCode = result.status ?? 1;
  const output = [
    `command: ${command}`,
    `startedAt: ${startedAt}`,
    `completedAt: ${new Date().toISOString()}`,
    `exitCode: ${exitCode}`,
    '',
    result.stdout ?? '',
    result.stderr ?? '',
  ].join('\n');
  writeFileSync(logPath, output);
  results.set(`${batch}:${id}`, {exitCode, logPath, output});
  process.stdout.write(`[${batch}] ${id}: ${exitCode === 0 ? 'PASS' : 'FAIL'}\n`);
}

function copyFreshScreenshots(root) {
  if (!existsSync(root)) return;
  for (const path of collectFiles(root)) {
    if (!path.endsWith('.png') || statSync(path).mtimeMs < runStartedMs) continue;
    const rel = relative(cwd, path).replaceAll(sep, '/');
    const destination = join(screenshotRoot, rel);
    mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(path, destination);
  }
}

function renderBatchSummary(gate, controlsPass, requirementsPath) {
  const rows = gate.localCommands.map(command => {
    const result = results.get(`${gate.id}:${command.id}`);
    return `| \`${command.id}\` | ${result?.exitCode === 0 ? 'PASS' : 'FAIL'} | \`${relative(proofRoot, result?.logPath ?? '').replaceAll(sep, '/')}\` |`;
  });
  return `# ${gate.id} final-candidate rerun\n\nCandidate: \`${candidateId}\`  \nCommit: \`${head}\`  \nTree: \`${tree}\`  \nWindow: \`${runStartedAt}\` to \`${runCompletedAt}\`  \nLocal verdict: **${controlsPass ? 'PASS' : 'PARTIAL'}**  \nLive verdict: **BLOCKED — no live command was run**\n\n| Command | Result | Evidence |\n| --- | --- | --- |\n${rows.join('\n')}\n\nEvery local control is mapped in [the final requirements index](./${basename(requirementsPath)}). Live controls remain blocked and cannot inherit simulator evidence.\n`;
}

function renderRequirementsIndex({allDeclaredPassed, payloadPassed, productionAuditPassed, screenshotFiles, manifest}) {
  const rows = config.gates.flatMap(gate => gate.localControls.map(control => {
    const pass = gate.id === 'B6'
      ? allDeclaredPassed && payloadPassed && productionAuditPassed && screenshotFiles.length > 0
      : gate.localCommands.every(command => results.get(`${gate.id}:${command.id}`)?.exitCode === 0);
    return `| ${control} | ${pass ? 'PASS' : 'PARTIAL'} | ${gate.id} exact command logs and fresh source-snapshot proof |`;
  }));
  return `# Batch 6 final requirements and evidence index\n\nCandidate: \`${candidateId}\`  \nSource: \`${head}\` / tree \`${tree}\`  \nBuild aggregate: \`${manifest.artifact.aggregateSha256}\`  \nGenerated: \`${runCompletedAt}\`\n\n## Boundary\n\n- Local candidate: ${allDeclaredPassed && payloadPassed && productionAuditPassed && screenshotFiles.length > 0 ? '**PASS**' : '**PARTIAL**'}\n- Live Desktop/public/deployment: **BLOCKED**\n- Deployment, publication, CAR/CID, allowance, signing, and outreach performed: **no**\n- Production dependency audit at high severity: ${productionAuditPassed ? 'PASS' : 'FAIL'}\n- Statement/session payload budgets: ${payloadPassed ? 'PASS' : 'FAIL'}\n- Fresh screenshots copied from exact reruns: ${screenshotFiles.length}\n\n## Local controls\n\n| Control | Result | Evidence rule |\n| --- | --- | --- |\n${rows.join('\n')}\n\n## Fresh screenshots\n\n${screenshotFiles.map(path => `- \`${path}\``).join('\n')}\n\n## Live controls\n\nEvery B1–B6 live control remains BLOCKED. Local simulator evidence does not satisfy real Product Account, allowance, beyond-window Desktop, public URL, or action-time approval gates.\n`;
}

function renderFinalReport(report, manifest) {
  const localPass = report.allDeclaredPassed
    && report.payloadPassed
    && report.productionAuditPassed
    && report.screenshots > 0;
  return `# ChopDot Batch 6 exact-candidate proof\n\n`+
    `Candidate: \`${report.candidateId}\`  \n`+
    `Commit: \`${head}\`  \n`+
    `Tree: \`${tree}\`  \n`+
    `Build aggregate: \`${report.buildAggregateSha256}\`  \n`+
    `Run: \`${report.runStartedAt}\` to \`${report.runCompletedAt}\`\n\n`+
    `## Verdict\n\n`+
    `- Local candidate: **${localPass ? 'PASS — candidate-ready-local' : 'PARTIAL'}**\n`+
    `- Live Desktop/public/deployment: **BLOCKED**\n`+
    `- Deployment, publication, signing, allowance changes, CAR/CID generation, or outreach: **none**\n\n`+
    `## Exact evidence\n\n`+
    `- All declared B1–B6 local commands: ${report.allDeclaredPassed ? 'PASS' : 'FAIL'}\n`+
    `- Statement/session payload budgets: ${report.payloadPassed ? 'PASS' : 'FAIL'}\n`+
    `- Production dependency audit at high severity: ${report.productionAuditPassed ? 'PASS' : 'FAIL'}\n`+
    `- Fresh exact-candidate screenshots: ${report.screenshots}\n`+
    `- Artifact files: ${manifest.artifact.fileCount}\n`+
    `- Requirements: \`requirements-index.md\`\n`+
    `- Artifact manifest: \`../../artifact/${candidateId}/manifest.json\`\n`+
    `- Final rerun receipts: \`../../receipts/final/${candidateId}/\`\n\n`+
    `## Boundary\n\n`+
    `This proves the controlled local candidate only. The real Polkadot Desktop allowance, three distinct live Product Accounts, beyond-300-second real-host recovery, exact public wrapper URL, and deployment remain separate action-time gates. The full dependency audit is informational; production dependencies are the release gate, while remaining development-only findings are preserved in \`commands/B6/b6-audit-full-informational.txt\`.\n`;
}

function evidence(path, capturedAt) {
  return {
    path: relative(proofRoot, path).replaceAll(sep, '/'),
    sha256: sha256(readFileSync(path)),
    capturedAt,
  };
}

function resultText(key) {
  return results.get(key)?.output ?? '';
}

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const entry of readdirSync(root, {withFileTypes: true})) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function git(args) {
  return execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
