#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const configuredResultsPath = process.env.FRIEND_PILOT_RESULTS_PATH;
const resultsPath = configuredResultsPath
  ? path.resolve(repoRoot, configuredResultsPath)
  : path.join(repoRoot, 'docs/chopdot-dot/friend-pilot-results-ledger-2026-06-20.md');

const requiredSections = [
  '## Current Status',
  '## Evidence Rules',
  '## Scenario Result Ledger',
  '## Promotion Guard',
  '## How To Fill A Row',
];

const requiredScenarios = [
  'Group Expense',
  'Savings Circle',
  'Emergency Pot',
  'Community Fund',
  'Capture / Pay / Confirm',
  'Onboarding / First Entry',
  'Polkadot-Native Boundaries',
];

const validStatuses = new Set(['not_run', 'pass', 'fail', 'blocked']);
const missingEvidencePattern = /\b(pending|tbd|todo|missing|none|not recorded|not_run)\b/i;
const requiredColumns = [
  'Coaching needed',
  'Money-model check',
  'Receipt/return check',
];

function tableRows(content) {
  const section = content.split('## Scenario Result Ledger')[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith('| Scenario'));
}

function parseRow(line) {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/^`|`$/g, ''));

  return {
    scenario: cells[0],
    status: cells[1],
    cells,
  };
}

function main() {
  const failures = [];

  if (!fs.existsSync(resultsPath)) {
    console.error(`Missing friend-pilot results ledger: ${resultsPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resultsPath, 'utf8');

  for (const section of requiredSections) {
    if (!content.includes(section)) failures.push(`Missing section: ${section}`);
  }

  for (const column of requiredColumns) {
    if (!content.includes(column)) failures.push(`Missing scenario ledger column: ${column}`);
  }

  if (!content.includes('No real friend pilot result has been recorded yet')) {
    failures.push('Ledger must explicitly state whether real friend-pilot evidence exists.');
  }

  const parsedRows = tableRows(content).map(parseRow);
  const rowsByScenario = new Map(parsedRows.map((row) => [row.scenario, row]));

  for (const scenario of requiredScenarios) {
    if (!rowsByScenario.has(scenario)) failures.push(`Missing scenario row: ${scenario}`);
  }

  for (const row of parsedRows) {
    if (!validStatuses.has(row.status)) {
      failures.push(`Invalid status for ${row.scenario}: ${row.status}`);
      continue;
    }

    const promotionDecision = row.cells.at(-1) ?? '';
    if (row.status === 'not_run' && !/not promoted/i.test(promotionDecision)) {
      failures.push(`${row.scenario} is not_run but promotion decision is not "not promoted".`);
    }

    if (row.status === 'pass') {
      const evidenceCells = row.cells.slice(2, -1);
      const missingCells = evidenceCells.filter((cell) => missingEvidencePattern.test(cell));
      if (missingCells.length > 0) {
        failures.push(`${row.scenario} is pass but still has missing evidence fields.`);
      }
      const coachingNeeded = row.cells[5] ?? '';
      if (!/\bnone\b/i.test(coachingNeeded) || /\b(minor|blocking)\b/i.test(coachingNeeded)) {
        failures.push(`${row.scenario} is pass but did not record "Coaching needed" as none.`);
      }
      const moneyModelCheck = row.cells[9] ?? '';
      if (!/(claim|claimed|mark paid|payment evidence|confirm|confirmed|approval|release|closeout|closed)/i.test(moneyModelCheck)) {
        failures.push(`${row.scenario} is pass but does not record a plain-language money-model check.`);
      }
      const receiptReturnCheck = row.cells[10] ?? '';
      if (!/(receipt|record|return|history|closeout|trusted)/i.test(receiptReturnCheck)) {
        failures.push(`${row.scenario} is pass but does not record receipt or return-state comprehension.`);
      }
      if (!/promoted|promote/i.test(promotionDecision)) {
        failures.push(`${row.scenario} is pass but promotion decision is not explicit.`);
      }
    }

    if ((row.status === 'fail' || row.status === 'blocked') && !/not promoted|fix|blocked/i.test(promotionDecision)) {
      failures.push(`${row.scenario} is ${row.status} but promotion decision does not preserve the failed gate.`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Friend-pilot results validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: update docs/chopdot-dot/friend-pilot-results-ledger-2026-06-20.md.\n');
    process.exit(1);
  }

  console.log('✅ Friend-pilot results ledger OK — no scenario is promoted without evidence');
}

main();
