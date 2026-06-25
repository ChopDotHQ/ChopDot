#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const packetPath = path.join(
  repoRoot,
  'docs/chopdot-dot/auth-provider-proof-run-packet-2026-06-21.md',
);

const requiredSections = [
  '## Purpose',
  '## Required Evidence',
  '## Provider Runs',
  '## Fail Conditions',
  '## Recording Results',
  '## Fast Verification Before Promotion',
];

const requiredProviders = [
  'Polkadot.js browser extension',
  'SubWallet browser extension',
  'Talisman browser extension',
  'Mobile WalletConnect',
  'Email password',
  'Google OAuth',
];

const requiredPhrases = [
  'Guest mode is already pass-local',
  'Do not mark pass-provider',
  'sign-in result',
  'sign-out result',
  'session cleanup result',
  'no dead-end or loop',
  'auth-provider-proof-ledger-2026-06-20.md',
  'npm run validate:auth-provider-proof',
  'npm run validate:use-case-9',
];

function providerRows(content) {
  const section = content.split('## Provider Runs')[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith('| Provider'));
}

function main() {
  const failures = [];

  if (!fs.existsSync(packetPath)) {
    console.error(`Missing auth provider proof run packet: ${packetPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(packetPath, 'utf8');

  for (const section of requiredSections) {
    if (!content.includes(section)) failures.push(`Missing section: ${section}`);
  }

  for (const provider of requiredProviders) {
    if (!content.includes(provider)) failures.push(`Missing provider: ${provider}`);
  }

  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) failures.push(`Missing required phrase: ${phrase}`);
  }

  const rows = providerRows(content);
  if (rows.length < requiredProviders.length) {
    failures.push(`Expected at least ${requiredProviders.length} provider rows; found ${rows.length}.`);
  }

  for (const row of rows) {
    if (!/sign-in result/i.test(row)) {
      failures.push(`Provider row is missing sign-in result requirement: ${row}`);
    }
    if (!/sign-out result/i.test(row)) {
      failures.push(`Provider row is missing sign-out result requirement: ${row}`);
    }
    if (!/session cleanup result/i.test(row)) {
      failures.push(`Provider row is missing session cleanup result requirement: ${row}`);
    }
    if (!/no dead-end or loop/i.test(row)) {
      failures.push(`Provider row is missing dead-end/loop requirement: ${row}`);
    }
    if (!/Do not mark pass-provider|pass-provider/i.test(row)) {
      failures.push(`Provider row is missing promotion boundary: ${row}`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Auth provider proof run packet validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: update docs/chopdot-dot/auth-provider-proof-run-packet-2026-06-21.md.\n');
    process.exit(1);
  }

  console.log('✅ Auth provider proof run packet OK — provider proof cannot be promoted without real evidence');
}

main();
