import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/reconciliation/canonical-manifest.json');
const reportDirectory = path.join(root, 'artifacts');
const reportPath = path.join(reportDirectory, 'reconciliation-report.json');
const diffPath = path.join(reportDirectory, 'reconciliation-diff.txt');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const rootPackage = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const backendPackage = JSON.parse(await readFile(path.join(root, 'backend/package.json'), 'utf8'));

const failures = [];
const observations = [];
const shaPattern = /^[0-9a-f]{40}$/u;

if (manifest.schemaVersion !== 1) {
  failures.push(`Unsupported reconciliation manifest schemaVersion: ${manifest.schemaVersion}`);
}

if (!manifest.canonicalBase || !shaPattern.test(manifest.canonicalBase.sha)) {
  failures.push('canonicalBase.sha must be an immutable 40-character Git SHA.');
}

for (const [ref, sha] of Object.entries(manifest.sourceRefs ?? {})) {
  if (!shaPattern.test(String(sha))) {
    failures.push(`Source ref ${ref} is not pinned to a full Git SHA.`);
  }
}

for (const protectedPath of manifest.protectedPaths ?? []) {
  try {
    await access(path.join(root, protectedPath));
  } catch {
    failures.push(`Protected path is missing: ${protectedPath}`);
  }
}

const requiredRootScripts = ['ci:fast', 'ci:backend', 'ci:canonical', 'verify:reconciliation'];
for (const script of requiredRootScripts) {
  if (!rootPackage.scripts?.[script]) {
    failures.push(`Root package is missing required script: ${script}`);
  }
}

const requiredBackendScripts = ['ci:fast', 'db:generate', 'type-check', 'test', 'build'];
for (const script of requiredBackendScripts) {
  if (!backendPackage.scripts?.[script]) {
    failures.push(`Backend package is missing required script: ${script}`);
  }
}

if (!rootPackage.dependencies?.['decimal.js']) {
  failures.push('decimal.js must remain installed for the upcoming DATA-002 integer-money migration boundary.');
}

let diffText = '';
if (process.env.RECONCILIATION_SKIP_GIT_DIFF !== '1') {
  try {
    execFileSync('git', ['cat-file', '-e', `${manifest.canonicalBase.sha}^{commit}`], {
      cwd: root,
      stdio: 'ignore',
    });
    diffText = execFileSync(
      'git',
      ['diff', '--name-status', `${manifest.canonicalBase.sha}...HEAD`],
      { cwd: root, encoding: 'utf8' },
    );

    const protectedPaths = new Set(manifest.protectedPaths ?? []);
    for (const line of diffText.split('\n').filter(Boolean)) {
      const fields = line.split('\t');
      const status = fields[0];
      const oldPath = fields[1];
      if ((status === 'D' || status.startsWith('R')) && protectedPaths.has(oldPath)) {
        failures.push(`Protected path was deleted or renamed relative to the canonical base: ${oldPath}`);
      }
    }
  } catch (error) {
    failures.push(`Could not compare HEAD with canonical base ${manifest.canonicalBase.sha}: ${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  observations.push('Git diff protection was explicitly skipped by RECONCILIATION_SKIP_GIT_DIFF=1.');
}

const report = {
  checkedAt: new Date().toISOString(),
  branch: manifest.branch,
  canonicalBase: manifest.canonicalBase,
  sourceRefs: manifest.sourceRefs,
  protectedPathCount: manifest.protectedPaths?.length ?? 0,
  changedFiles: diffText.split('\n').filter(Boolean),
  authorityRules: manifest.authorityRules,
  portOrder: manifest.portOrder,
  knownBlockers: manifest.knownBlockers,
  observations,
  failures,
  passed: failures.length === 0,
};

await mkdir(reportDirectory, { recursive: true });
await writeFile(diffPath, diffText || 'No changes relative to the canonical base.\n', 'utf8');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failures.length > 0) {
  console.error('Canonical reconciliation verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Canonical reconciliation verification passed for ${report.protectedPathCount} protected paths.`);
  console.log(`Report: ${path.relative(root, reportPath)}`);
}
