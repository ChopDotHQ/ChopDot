#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const generatorPath = path.join(repoRoot, 'scripts/generate-use-case-9-readiness-report.mjs');
const jsonPath = path.join(
  repoRoot,
  'artifacts/use-case-9-readiness/current-use-case-9-readiness-report.json',
);
const mdPath = path.join(
  repoRoot,
  'artifacts/use-case-9-readiness/current-use-case-9-readiness-report.md',
);

function fail(failures) {
  console.error('\n❌ Use-case 9 readiness report validation FAILED\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nFix: rerun/fix scripts/generate-use-case-9-readiness-report.mjs and the source ledgers.\n');
  process.exit(1);
}

function includesGate(report, pattern) {
  return report.openGates.some((gate) => pattern.test(gate));
}

const generated = spawnSync(process.execPath, [generatorPath], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (generated.status !== 0) {
  console.error(generated.stdout);
  console.error(generated.stderr);
  process.exit(generated.status ?? 1);
}

const failures = [];

if (!fs.existsSync(jsonPath)) failures.push('Missing generated readiness JSON report.');
if (!fs.existsSync(mdPath)) failures.push('Missing generated readiness Markdown report.');
if (failures.length > 0) fail(failures);

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const markdown = fs.readFileSync(mdPath, 'utf8');

if (!['complete', 'not_9_10_yet'].includes(report.status)) {
  failures.push(`Invalid report status: ${report.status}`);
}

if (typeof report.completionAllowed !== 'boolean') {
  failures.push('completionAllowed must be boolean.');
}

if (!Array.isArray(report.openGates)) {
  failures.push('openGates must be an array.');
}

if (report.completionAllowed && report.openGates.length > 0) {
  failures.push('completionAllowed is true but openGates is not empty.');
}

if (!report.completionAllowed && report.status !== 'not_9_10_yet') {
  failures.push('completionAllowed is false but status is not not_9_10_yet.');
}

const useCaseSummary = report.summary?.useCases;
const friendSummary = report.summary?.friendPilot;
const authSummary = report.summary?.authProviders;
const dotHostSummary = report.summary?.dotHost;

if (!useCaseSummary || !friendSummary || !authSummary || !dotHostSummary) {
  failures.push('Report summary must include useCases, friendPilot, authProviders, and dotHost.');
}

if ((useCaseSummary?.belowTarget ?? 0) > 0 && !includesGate(report, /below target score/i)) {
  failures.push('Use cases below target but report does not include a score open gate.');
}

const friendNotRun = friendSummary?.statusCounts?.not_run ?? 0;
if (friendNotRun > 0 && !includesGate(report, /friend-pilot/i)) {
  failures.push('Friend pilot has not_run rows but report does not include a friend-pilot open gate.');
}

if ((authSummary?.unpromoted ?? 0) > 0 && !includesGate(report, /provider proof/i)) {
  failures.push('Auth providers remain unpromoted but report does not include a provider-proof open gate.');
}

if (dotHostSummary?.readyForHumanDeploy === false && !includesGate(report, /deploy/i)) {
  failures.push('Dot host is not ready for human deploy but report does not include a deploy open gate.');
}

if ((dotHostSummary?.setupRequired ?? 0) > 0 && !includesGate(report, /setup_required/i)) {
  failures.push('Dot host has setup_required gates but report does not include setup_required open gate.');
}

if (report.completionAllowed) {
  if ((useCaseSummary?.belowTarget ?? 0) !== 0) {
    failures.push('Completion allowed while use cases remain below target.');
  }
  if ((friendSummary?.statusCounts?.pass ?? 0) !== friendSummary?.total) {
    failures.push('Completion allowed while not every friend-pilot scenario is pass.');
  }
  if ((authSummary?.unpromoted ?? 0) !== 0) {
    failures.push('Completion allowed while auth providers remain unpromoted.');
  }
  if (dotHostSummary?.readyForHumanDeploy !== true) {
    failures.push('Completion allowed while dot host is not ready for human deploy.');
  }
}

const requiredMarkdown = [
  '# ChopDot 9/10 Readiness Report',
  '## Open Gates',
  '## Use Cases',
  '## Friend Pilot',
  '## Auth Providers',
  '## Dot Host',
  '## Claim Boundary',
  'A 9/10 completion claim requires all open gates to be resolved',
];

for (const text of requiredMarkdown) {
  if (!markdown.includes(text)) failures.push(`Markdown report missing: ${text}`);
}

if (failures.length > 0) fail(failures);

console.log('✅ Use-case 9 readiness report OK — completion claim matches current ledgers');
