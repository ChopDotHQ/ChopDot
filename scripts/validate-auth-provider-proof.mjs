#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const configuredLedgerPath = process.env.AUTH_PROVIDER_PROOF_LEDGER_PATH;
const ledgerPath = configuredLedgerPath
  ? path.resolve(repoRoot, configuredLedgerPath)
  : path.join(
      repoRoot,
      'docs/chopdot-dot/auth-provider-proof-ledger-2026-06-20.md',
    );

const requiredSections = [
  '## Current Status',
  '## Evidence Rules',
  '## Provider Proof Ledger',
  '## Promotion Guard',
  '## How To Fill A Row',
];

const requiredProviders = [
  'Guest mode',
  'Polkadot.js browser extension',
  'SubWallet browser extension',
  'Talisman browser extension',
  'Mobile WalletConnect',
  'Email password',
  'Google OAuth',
];

const validStates = new Set([
  'pass-local',
  'pass-provider',
  'visible-only',
  'blocked-config',
  'fail',
]);

const missingEvidencePattern = /\b(pending|tbd|todo|missing|none|not recorded|blocked-config|visible-only)\b/i;

function tableRows(content) {
  const section = content.split('## Provider Proof Ledger')[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith('| Provider'));
}

function parseRow(line) {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/^`|`$/g, ''));

  return {
    provider: cells[0],
    state: cells[1],
    cells,
  };
}

function main() {
  const failures = [];

  if (!fs.existsSync(ledgerPath)) {
    console.error(`Missing auth provider proof ledger: ${ledgerPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(ledgerPath, 'utf8');

  for (const section of requiredSections) {
    if (!content.includes(section)) failures.push(`Missing section: ${section}`);
  }

  const requiredBoundaryOptions = [
    'No real desktop wallet, mobile WalletConnect, email, or social provider completion has been recorded yet',
    'No real desktop wallet, mobile WalletConnect, or social provider completion has been recorded yet',
  ];
  if (!requiredBoundaryOptions.some((boundary) => content.includes(boundary))) {
    failures.push('Ledger must explicitly state which provider completions remain unproven.');
  }

  const parsedRows = tableRows(content).map(parseRow);
  const rowsByProvider = new Map(parsedRows.map((row) => [row.provider, row]));

  for (const provider of requiredProviders) {
    if (!rowsByProvider.has(provider)) failures.push(`Missing provider row: ${provider}`);
  }

  for (const row of parsedRows) {
    if (!validStates.has(row.state)) {
      failures.push(`Invalid state for ${row.provider}: ${row.state}`);
      continue;
    }

    const promotionDecision = row.cells.at(-1) ?? '';

    if (row.state === 'pass-local') {
      const evidence = row.cells[4] ?? '';
      if (!/login-smoke\.spec\.ts/i.test(evidence)) {
        failures.push(`${row.provider} is pass-local but does not cite login-smoke.spec.ts.`);
      }
      if (!/not promoted as provider proof/i.test(promotionDecision)) {
        failures.push(`${row.provider} is pass-local but provider-proof boundary is not explicit.`);
      }
    }

    if (row.state === 'pass-provider') {
      const evidenceCells = row.cells.slice(2, -1);
      const missingCells = evidenceCells.filter((cell) => missingEvidencePattern.test(cell));
      if (missingCells.length > 0) {
        failures.push(`${row.provider} is pass-provider but still has missing/provider-only evidence fields.`);
      }
      const evidence = row.cells[4] ?? '';
      const signInResult = row.cells[5] ?? '';
      const signOutCleanup = row.cells[6] ?? '';
      const deadEndCheck = row.cells[7] ?? '';
      if (/button|visible|setup copy|setup-needed|mock/i.test(evidence)) {
        failures.push(`${row.provider} is pass-provider but evidence only proves visibility/setup/mock behavior.`);
      }
      if (!/(pass|signs? (in|up)|authenticated|reaches|returns to)/i.test(signInResult)) {
        failures.push(`${row.provider} is pass-provider but sign-in result does not prove a completed provider cycle.`);
      }
      if (!/(cleared|signs? out|returned to|stale .* cleared|cleanup.*pass)/i.test(signOutCleanup)) {
        failures.push(`${row.provider} is pass-provider but sign-out cleanup is not proven.`);
      }
      if (!/(no .*dead|no .*loop|none|returns to)/i.test(deadEndCheck)) {
        failures.push(`${row.provider} is pass-provider but dead-end/loop check is not proven.`);
      }
      if (!/promoted|promote/i.test(promotionDecision)) {
        failures.push(`${row.provider} is pass-provider but promotion decision is not explicit.`);
      }
    }

    if (row.state === 'visible-only' && !/not promoted/i.test(promotionDecision)) {
      failures.push(`${row.provider} is visible-only but promotion decision is not "not promoted".`);
    }

    if (row.state === 'blocked-config' && !/blocked|not promoted/i.test(promotionDecision)) {
      failures.push(`${row.provider} is blocked-config but promotion decision does not preserve the block.`);
    }

    if (row.state === 'fail' && !/fix|not promoted/i.test(promotionDecision)) {
      failures.push(`${row.provider} is fail but promotion decision does not require a fix.`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Auth provider proof validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: update docs/chopdot-dot/auth-provider-proof-ledger-2026-06-20.md.\n');
    process.exit(1);
  }

  console.log('✅ Auth provider proof ledger OK — real provider claims are not promoted without evidence');
}

main();
