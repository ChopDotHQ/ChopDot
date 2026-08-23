#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const REQUIRED_TEMPLATE_MARKERS = [
  '## Supervision traceability',
  '## Claim-to-evidence table',
  '## Side investigations',
  '## Release state',
];

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.env', '.html', '.js', '.json', '.jsx', '.md', '.mjs',
  '.sol', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function walkTextFiles(root, relativePath, output = []) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return output;
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    const basename = path.basename(absolutePath);
    const extension = path.extname(absolutePath);
    if (
      TEXT_EXTENSIONS.has(extension) ||
      basename === 'package.json' ||
      basename === 'package-lock.json' ||
      basename.startsWith('.env')
    ) {
      output.push(relativePath);
    }
    return output;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'dist-dot-host', 'coverage'].includes(entry.name)) continue;
    walkTextFiles(root, path.join(relativePath, entry.name), output);
  }
  return output;
}

function commandScriptName(command) {
  const match = /^npm run ([^\s]+)/.exec(command.trim());
  return match?.[1] ?? null;
}

function currentStateRank(contract, state) {
  return contract.stateOrder.indexOf(state);
}

function normalizeAllowlistEntry(entry) {
  if (typeof entry === 'string') return { path: entry, pattern: null };
  return entry;
}

function isAllowed(relativePath, pattern, allowlist) {
  return allowlist.some((rawEntry) => {
    const entry = normalizeAllowlistEntry(rawEntry);
    if (entry.path !== relativePath) return false;
    return !entry.pattern || entry.pattern === pattern;
  });
}

export function validateRepository({ root = process.cwd(), enforceRelease = false } = {}) {
  const errors = [];
  const warnings = [];
  const contractPath = 'governance/supervision-contract.json';

  if (!exists(root, contractPath)) {
    return { ok: false, errors: [`Missing ${contractPath}`], warnings, summary: {} };
  }

  let contract;
  try {
    contract = readJson(root, contractPath);
  } catch (error) {
    return {
      ok: false,
      errors: [`Invalid JSON in ${contractPath}: ${error.message}`],
      warnings,
      summary: {},
    };
  }

  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(contract.stateOrder) || contract.stateOrder.length < 2) {
    errors.push('stateOrder must define the promotion ladder');
  }
  if (!Array.isArray(contract.invariants) || contract.invariants.length === 0) {
    errors.push('At least one invariant is required');
  }

  const authorityPaths = Object.values(contract.authority ?? {});
  for (const authorityPath of authorityPaths) {
    if (typeof authorityPath === 'string' && !exists(root, authorityPath)) {
      errors.push(`Missing authority path: ${authorityPath}`);
    }
  }

  const templatePath = contract.authority?.pullRequestTemplate;
  if (templatePath && exists(root, templatePath)) {
    const template = fs.readFileSync(path.join(root, templatePath), 'utf8');
    for (const marker of REQUIRED_TEMPLATE_MARKERS) {
      if (!template.includes(marker)) errors.push(`PR template is missing marker: ${marker}`);
    }
  }

  let packageJson = {
    scripts: {},
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {},
  };
  if (exists(root, 'package.json')) {
    try {
      packageJson = readJson(root, 'package.json');
    } catch (error) {
      errors.push(`Invalid package.json: ${error.message}`);
    }
  }

  const ids = new Set();
  const stateCounts = {};
  for (const invariant of contract.invariants ?? []) {
    const prefix = invariant.id ? `${invariant.id}: ` : 'Invariant: ';
    if (!/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(invariant.id ?? '')) {
      errors.push(`${prefix}invalid invariant ID`);
    }
    if (ids.has(invariant.id)) errors.push(`${prefix}duplicate invariant ID`);
    ids.add(invariant.id);

    if (!invariant.title) errors.push(`${prefix}missing title`);
    if (!invariant.statement) errors.push(`${prefix}missing statement`);
    if (!['critical', 'high', 'medium', 'low'].includes(invariant.severity)) {
      errors.push(`${prefix}invalid severity`);
    }

    const stateRank = currentStateRank(contract, invariant.state);
    const minimumRank = currentStateRank(contract, invariant.minimumPublicBetaState);
    if (stateRank < 0) errors.push(`${prefix}unknown state ${invariant.state}`);
    if (minimumRank < 0) {
      errors.push(`${prefix}unknown minimumPublicBetaState ${invariant.minimumPublicBetaState}`);
    }
    stateCounts[invariant.state] = (stateCounts[invariant.state] ?? 0) + 1;

    const sourcePath = invariant.source?.path;
    if (!sourcePath || !exists(root, sourcePath)) {
      errors.push(`${prefix}missing source document ${sourcePath ?? '(unset)'}`);
    }

    const checks = invariant.automatedChecks ?? [];
    if (stateRank >= currentStateRank(contract, 'AUTOMATED_PARTIAL') && checks.length === 0) {
      errors.push(`${prefix}${invariant.state} requires at least one automated check`);
    }
    for (const check of checks) {
      if (!check.command) errors.push(`${prefix}automated check missing command`);
      const scriptName = commandScriptName(check.command ?? '');
      if (scriptName && !packageJson.scripts?.[scriptName]) {
        errors.push(`${prefix}missing npm script ${scriptName}`);
      }
      for (const testFile of check.testFiles ?? []) {
        if (!exists(root, testFile)) errors.push(`${prefix}missing test file ${testFile}`);
      }
    }

    const evidence = invariant.evidence ?? [];
    const validEvidenceLevels = new Set();
    for (const item of evidence) {
      if (!item.path || !exists(root, item.path)) {
        errors.push(`${prefix}missing evidence path ${item.path ?? '(unset)'}`);
        continue;
      }
      if (!['exact-candidate', 'real-host-chain', 'release'].includes(item.level)) continue;
      if (!item.path.endsWith('.json')) {
        errors.push(`${prefix}${item.level} evidence must be a JSON packet`);
        continue;
      }

      let packet;
      try {
        packet = readJson(root, item.path);
      } catch (error) {
        errors.push(`${prefix}invalid evidence JSON ${item.path}: ${error.message}`);
        continue;
      }

      const packetErrors = [];
      if (packet.schemaVersion !== 1) packetErrors.push('schemaVersion must be 1');
      if (packet.invariantId !== invariant.id) packetErrors.push(`invariantId must be ${invariant.id}`);
      if (packet.level !== item.level) packetErrors.push(`level must be ${item.level}`);
      if (packet.result !== 'pass') packetErrors.push('result must be pass');
      if (!packet.recordedAt || Number.isNaN(Date.parse(packet.recordedAt))) {
        packetErrors.push('recordedAt must be an ISO timestamp');
      }
      if (!/^[0-9a-f]{40}$/i.test(packet.candidate?.commit ?? '')) {
        packetErrors.push('candidate.commit must be a full Git SHA');
      }
      if (packet.candidate?.clean !== true) packetErrors.push('candidate.clean must be true');
      if (!packet.candidate?.buildProfile) packetErrors.push('candidate.buildProfile is required');
      if (!packet.candidate?.lockfiles || Object.keys(packet.candidate.lockfiles).length === 0) {
        packetErrors.push('candidate.lockfiles is required');
      }
      if (!Array.isArray(packet.checks) || packet.checks.length === 0) {
        packetErrors.push('checks must be non-empty');
      }
      if (item.level === 'real-host-chain') {
        if (!packet.host?.name || !packet.host?.version) {
          packetErrors.push('real-host evidence requires host name and version');
        }
        if (!packet.network?.name || !packet.network?.genesisHash) {
          packetErrors.push('real-host evidence requires network name and genesisHash');
        }
        if (!Array.isArray(packet.participants) || packet.participants.length < 2) {
          packetErrors.push('real-host evidence requires at least two participants');
        }
        if (!packet.finality) packetErrors.push('real-host evidence requires finality');
      }
      if (item.level === 'release') {
        if (!packet.artifact?.identity) packetErrors.push('release evidence requires artifact.identity');
        if (!packet.deployment) packetErrors.push('release evidence requires deployment');
      }

      if (packetErrors.length) {
        for (const packetError of packetErrors) {
          errors.push(`${prefix}${item.path}: ${packetError}`);
        }
      } else {
        validEvidenceLevels.add(item.level);
      }
    }

    if (
      stateRank >= currentStateRank(contract, 'VERIFIED_CANDIDATE') &&
      !validEvidenceLevels.has('exact-candidate')
    ) {
      errors.push(`${prefix}${invariant.state} requires valid exact-candidate evidence`);
    }
    if (
      stateRank >= currentStateRank(contract, 'VERIFIED_REAL_HOST') &&
      !validEvidenceLevels.has('real-host-chain')
    ) {
      errors.push(`${prefix}${invariant.state} requires valid real-host-chain evidence`);
    }
    if (
      stateRank >= currentStateRank(contract, 'RELEASED') &&
      !validEvidenceLevels.has('release')
    ) {
      errors.push(`${prefix}${invariant.state} requires valid release evidence`);
    }

    if (enforceRelease && stateRank < minimumRank) {
      errors.push(
        `${prefix}public beta requires ${invariant.minimumPublicBetaState}, current state is ${invariant.state}`,
      );
    }

    if ((invariant.knownGaps ?? []).length > 0) {
      warnings.push(`${prefix}${invariant.knownGaps.length} known gap(s)`);
    }
  }

  const provider = contract.providerIndependence ?? {};
  const allDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };
  for (const blockedPackage of provider.blockedPackages ?? []) {
    if (Object.hasOwn(allDependencies, blockedPackage)) {
      errors.push(`Provider independence: blocked package ${blockedPackage} is active`);
    }
  }

  const allowlist = provider.allowlist ?? [];
  const filesToScan = new Set();
  for (const scanRoot of provider.scanRoots ?? []) {
    for (const file of walkTextFiles(root, scanRoot)) filesToScan.add(file);
  }
  for (const relativePath of filesToScan) {
    let content;
    try {
      content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    } catch {
      continue;
    }
    const lowerContent = content.toLowerCase();
    for (const blockedText of provider.blockedText ?? []) {
      if (
        lowerContent.includes(blockedText.toLowerCase()) &&
        !isAllowed(relativePath, blockedText, allowlist)
      ) {
        errors.push(
          `Provider independence: ${relativePath} contains blocked active reference ${blockedText}`,
        );
      }
    }
  }

  const summary = {
    schemaVersion: contract.schemaVersion,
    invariantCount: contract.invariants?.length ?? 0,
    stateCounts,
    enforceRelease,
    providerFilesScanned: filesToScan.size,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
  return { ok: errors.length === 0, errors, warnings, summary };
}

export function formatMarkdown(result) {
  const lines = [
    '# ChopDot supervision report',
    '',
    `- Result: **${result.ok ? 'PASS' : 'FAIL'}**`,
    `- Invariants: ${result.summary.invariantCount ?? 0}`,
    `- Provider-neutral files scanned: ${result.summary.providerFilesScanned ?? 0}`,
    `- Errors: ${result.errors.length}`,
    `- Warnings: ${result.warnings.length}`,
    '',
  ];
  if (result.errors.length) {
    lines.push('## Errors', '', ...result.errors.map((error) => `- ${error}`), '');
  }
  if (result.warnings.length) {
    lines.push('## Warnings', '', ...result.warnings.map((warning) => `- ${warning}`), '');
  }
  lines.push(
    'A passing structural report is not release proof. Use `--release` to enforce the public-beta promotion thresholds.',
  );
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    enforceRelease: false,
    jsonOut: null,
    mdOut: null,
  };
  for (const arg of argv) {
    if (arg === '--release') options.enforceRelease = true;
    else if (arg.startsWith('--root=')) options.root = path.resolve(arg.slice('--root='.length));
    else if (arg.startsWith('--json-out=')) options.jsonOut = arg.slice('--json-out='.length);
    else if (arg.startsWith('--md-out=')) options.mdOut = arg.slice('--md-out='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function writeOutput(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const result = validateRepository(options);
  if (options.jsonOut) {
    writeOutput(options.root, options.jsonOut, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (options.mdOut) writeOutput(options.root, options.mdOut, formatMarkdown(result));
  console.log(formatMarkdown(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
