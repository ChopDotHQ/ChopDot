#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const scorecardPath = path.join(
  repoRoot,
  'docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md',
);
const friendLedgerPath = path.join(
  repoRoot,
  'docs/chopdot-dot/friend-pilot-results-ledger-2026-06-20.md',
);
const authLedgerPath = path.join(
  repoRoot,
  'docs/chopdot-dot/auth-provider-proof-ledger-2026-06-20.md',
);

const requiredSections = [
  '## 9/10 Standard',
  '## Current Scores',
  '## Remaining 9/10 Work',
  '## Claim Boundary',
];

const requiredUseCases = [
  'Group expenses',
  'Savings circles',
  'Emergency pots',
  'Community funds',
  'Capture spend/pay/confirm',
  'Closeout receipts/history',
  'Auth/onboarding',
  'Polkadot-native adapters',
  'Escrow/atomicity',
];

const friendGateByUseCase = new Map([
  ['Group expenses', 'Group Expense'],
  ['Savings circles', 'Savings Circle'],
  ['Emergency pots', 'Emergency Pot'],
  ['Community funds', 'Community Fund'],
  ['Capture spend/pay/confirm', 'Capture / Pay / Confirm'],
]);

function parseMarkdownRows(content, sectionHeading, firstColumnName) {
  const section = content.split(sectionHeading)[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith(`| ${firstColumnName}`))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replace(/^`|`$/g, '')),
    );
}

function parseScores(content) {
  return parseMarkdownRows(content, '## Current Scores', 'Use case').map((cells) => ({
    useCase: cells[0],
    score: Number.parseFloat(cells[1]),
    target: Number.parseFloat(cells[2]),
    status: cells[3],
    evidence: cells[4] ?? '',
    gap: cells[5] ?? '',
  }));
}

function parseFriendStatuses(content) {
  return new Map(
    parseMarkdownRows(content, '## Scenario Result Ledger', 'Scenario').map((cells) => [
      cells[0],
      cells[1],
    ]),
  );
}

function parseAuthStates(content) {
  return new Map(
    parseMarkdownRows(content, '## Provider Proof Ledger', 'Provider').map((cells) => [
      cells[0],
      cells[1],
    ]),
  );
}

function main() {
  const failures = [];

  for (const filePath of [scorecardPath, friendLedgerPath, authLedgerPath]) {
    if (!fs.existsSync(filePath)) failures.push(`Missing required file: ${filePath}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }

  const scorecard = fs.readFileSync(scorecardPath, 'utf8');
  const friendLedger = fs.readFileSync(friendLedgerPath, 'utf8');
  const authLedger = fs.readFileSync(authLedgerPath, 'utf8');

  for (const section of requiredSections) {
    if (!scorecard.includes(section)) failures.push(`Scorecard missing section: ${section}`);
  }

  for (const requiredText of [
    'friend-pilot-results-ledger-2026-06-20.md',
    'auth-provider-proof-ledger-2026-06-20.md',
    'blocked live Polkadot host gates',
    'Guest-first onboarding and local email provider auth are proven locally; real desktop wallet/mobile WalletConnect/Google provider completion is not yet proven.',
  ]) {
    if (!scorecard.includes(requiredText)) {
      failures.push(`Scorecard missing required boundary text: ${requiredText}`);
    }
  }

  const scores = parseScores(scorecard);
  const scoreByUseCase = new Map(scores.map((row) => [row.useCase, row]));

  for (const useCase of requiredUseCases) {
    if (!scoreByUseCase.has(useCase)) failures.push(`Missing use-case score row: ${useCase}`);
  }

  const friendStatuses = parseFriendStatuses(friendLedger);
  const authStates = parseAuthStates(authLedger);

  for (const row of scores) {
    if (!Number.isFinite(row.score) || !Number.isFinite(row.target)) {
      failures.push(`${row.useCase} has a non-numeric score or target.`);
      continue;
    }

    if (row.target < 9) {
      failures.push(`${row.useCase} target must stay at least 9.`);
    }

    const friendGate = friendGateByUseCase.get(row.useCase);
    if (row.score >= 9 && friendGate && friendStatuses.get(friendGate) !== 'pass') {
      failures.push(`${row.useCase} is >=9 but friend-pilot scenario "${friendGate}" is not pass.`);
    }

    if (row.useCase === 'Auth/onboarding' && row.score >= 9) {
      const providers = [
        'Polkadot.js browser extension',
        'SubWallet browser extension',
        'Talisman browser extension',
        'Mobile WalletConnect',
        'Email password',
        'Google OAuth',
      ];
      for (const provider of providers) {
        if (authStates.get(provider) !== 'pass-provider') {
          failures.push(`Auth/onboarding is >=9 but ${provider} is not pass-provider.`);
        }
      }
    }

    if (row.useCase === 'Polkadot-native adapters' && row.score >= 9 && row.status === 'blocked-live') {
      failures.push('Polkadot-native adapters cannot be >=9 while status is blocked-live.');
    }

    if (row.useCase === 'Escrow/atomicity' && row.score >= 9 && /lab-only/i.test(row.status)) {
      failures.push('Escrow/atomicity cannot be >=9 product while status is lab-only.');
    }
  }

  if (friendLedger.includes('No real friend pilot result has been recorded yet')) {
    for (const [useCase, scenario] of friendGateByUseCase) {
      const row = scoreByUseCase.get(useCase);
      if (row?.score >= 9) {
        failures.push(`${useCase} is >=9 but the friend ledger says no real pilot result exists for ${scenario}.`);
      }
    }
  }

  if (
    authLedger.includes('No real desktop wallet, mobile WalletConnect, email, or social provider completion has been recorded yet') ||
    authLedger.includes('No real desktop wallet, mobile WalletConnect, or social provider completion has been recorded yet')
  ) {
    const authRow = scoreByUseCase.get('Auth/onboarding');
    if (authRow?.score >= 9) {
      failures.push('Auth/onboarding is >=9 but the auth ledger says no real provider completion exists.');
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Use-case 9/10 scorecard validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: update docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md or the relevant proof ledger.\n');
    process.exit(1);
  }

  console.log('✅ Use-case 9/10 scorecard OK — scores are gated by current proof ledgers');
}

main();
