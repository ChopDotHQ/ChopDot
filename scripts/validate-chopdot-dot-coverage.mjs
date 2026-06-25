#!/usr/bin/env node
/**
 * Ensures every docs/chopdot-dot artefact is registered in the master plan
 * COVERAGE REGISTRY — prevents orphan specs and narrow-outcome drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const masterPlanPath = path.join(
  repoRoot,
  'docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md',
);
const docsRoot = path.join(repoRoot, 'docs/chopdot-dot');

/** JSON artefacts validated by validate-chopdot-dot-native-map.mjs */
const NATIVE_MAP_ARTEFACTS = new Set([
  'polkadot-native-replacement-matrix.json',
  'polkadot-native-evidence-ledger.json',
  'polkadot-native-audit-scope.json',
]);

function listMarkdownFiles(dir, base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(full, base));
    } else if (entry.name.endsWith('.md')) {
      files.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

function main() {
  const failures = [];

  if (!fs.existsSync(masterPlanPath)) {
    console.error(`Missing master plan: ${masterPlanPath}`);
    process.exit(1);
  }

  const masterPlan = fs.readFileSync(masterPlanPath, 'utf8');

  if (!masterPlan.includes('## COVERAGE REGISTRY')) {
    failures.push('Master plan missing "## COVERAGE REGISTRY" section.');
  }

  if (!masterPlan.includes('## COMPLETENESS RITUALS')) {
    failures.push('Master plan missing "## COMPLETENESS RITUALS" section.');
  }

  const mdFiles = listMarkdownFiles(docsRoot);
  const unregistered = [];

  for (const rel of mdFiles) {
    const basename = path.basename(rel);
    if (!masterPlan.includes(basename)) {
      unregistered.push(rel);
    }
  }

  if (unregistered.length > 0) {
    failures.push(
      `${unregistered.length} markdown file(s) not referenced in master plan (by filename):`,
      ...unregistered.map((f) => `  - ${f}`),
    );
  }

  for (const json of NATIVE_MAP_ARTEFACTS) {
    if (!masterPlan.includes(json)) {
      failures.push(`Native map artefact not in COVERAGE REGISTRY: ${json}`);
    }
  }

  const requiredCodeAnchors = [
    'src/chapter/chapterEngine.ts',
    'src/chopdot-dot/polkadotSession.ts',
    'src/bot/telegramBot.ts',
    'src/lab/group-money-loop/',
  ];

  for (const anchor of requiredCodeAnchors) {
    if (!masterPlan.includes(anchor)) {
      failures.push(`Code anchor missing from COVERAGE REGISTRY: ${anchor}`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ ChopDot.dot coverage validation FAILED\n');
    for (const line of failures) {
      console.error(line);
    }
    console.error(
      '\nFix: add each artefact to master plan § COVERAGE REGISTRY with track + status-board mapping.\n',
    );
    process.exit(1);
  }

  console.log(`✅ ChopDot.dot coverage OK — ${mdFiles.length} markdown files registered in master plan`);
}

main();
