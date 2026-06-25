#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'docs/chopdot-dot/friend-pilot-script-2026-06-20.md');

const requiredSections = [
  '## Required Setup',
  '## Universal Pass Questions',
  '## Scenario 1: Group Expense',
  '## Scenario 2: Savings Circle',
  '## Scenario 3: Emergency Pot',
  '## Scenario 4: Community Fund',
  '## Scenario 5: Capture / Pay / Confirm',
  '## Scenario 6: Onboarding / First Entry',
  '## Scenario 7: Polkadot-Native Boundaries',
  '## Evidence To Capture',
  '## Promotion Rules',
  '## Pilot Result Template',
];

const requiredPhrases = [
  'Use separate devices or separate browser profiles',
  'claim, confirmation, approval, release, and closeout are separate',
  'This is not escrow',
  'A payment claim is not confirmation',
  'The receipt is private/redacted',
  'approval means it was paid',
  'token complete means confirmed',
  'guaranteed payout',
  'ChopDot is not holding funds',
  'live `.dot`/host proof is blocked or gated',
  'host-required Product Account',
  'Statement Store',
  'Bulletin/archive',
  'Asset Hub evidence',
  'No real friend pilot result has been recorded yet',
];

const requiredRoles = [
  'Leo',
  'Nina',
  'Omar',
  'Mina',
  'Riley',
  'Taylor',
  'Jordan',
  'Alex',
  'Priya',
  'Sam',
];

function main() {
  const failures = [];

  if (!fs.existsSync(scriptPath)) {
    console.error(`Missing friend-pilot script: ${scriptPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(scriptPath, 'utf8');

  for (const section of requiredSections) {
    if (!content.includes(section)) failures.push(`Missing section: ${section}`);
  }

  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) failures.push(`Missing required phrase: ${phrase}`);
  }

  for (const role of requiredRoles) {
    if (!content.includes(role)) failures.push(`Missing required role/persona: ${role}`);
  }

  const passCount = (content.match(/Pass if:/g) ?? []).length;
  const failCount = (content.match(/Fail if:/g) ?? []).length;
  if (passCount < 5) failures.push(`Expected at least 5 "Pass if:" gates; found ${passCount}.`);
  if (failCount < 5) failures.push(`Expected at least 5 "Fail if:" gates; found ${failCount}.`);

  const scenarioCount = (content.match(/^## Scenario /gm) ?? []).length;
  if (scenarioCount !== 7) failures.push(`Expected 7 scenarios; found ${scenarioCount}.`);

  if (failures.length > 0) {
    console.error('\n❌ Friend-pilot script validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: update docs/chopdot-dot/friend-pilot-script-2026-06-20.md.\n');
    process.exit(1);
  }

  console.log('✅ Friend-pilot script OK — modes, safety gates, evidence fields, and blocked-live boundaries are present');
}

main();
