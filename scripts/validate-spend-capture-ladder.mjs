#!/usr/bin/env node
/**
 * Keeps the Spend Card / capture model anchored to the L0-L4 ladder.
 *
 * This intentionally validates the product law, not implementation details:
 * Spend Group persists, Pot records close, Spend Card captures at payment time.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const ladderPath = path.join(
  repoRoot,
  'docs/chopdot-dot/spend-capture-ladder-2026-06-24.md',
);
const masterPlanPath = path.join(
  repoRoot,
  'docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md',
);

const requiredSnippets = [
  'Spend Group lives on.',
  'Pot records close.',
  'Spend Card captures new transactions for that group.',
  '| L0 | Manual fallback |',
  '| L1 | Assisted capture |',
  '| L2 | Bound handoff |',
  '| L3 | Provider/webhook capture |',
  '| L4 | Issued/delegated card |',
  'A Spend Card is not a pot.',
  'A Spend Card is not a form.',
  'A Spend Card is not a bank card in Model A.',
  'A Spend Card is a reusable group payment context.',
  'Receipt capture is an input method, not the Spend Card itself.',
  'screenshot test: real app, no dashboard/lab/protocol feel;',
  'agent test: Mina/Leo/Nina/Omar on separate browser contexts;',
];

const requiredMasterPlanSnippets = [
  'spend-capture-ladder-2026-06-24.md',
  'L0-L4 capture ladder',
  'Spend Group vs Pot vs Spend Card',
];

function main() {
  const failures = [];

  if (!fs.existsSync(ladderPath)) {
    failures.push(`Missing Spend Capture Ladder: ${ladderPath}`);
  }

  if (!fs.existsSync(masterPlanPath)) {
    failures.push(`Missing master plan: ${masterPlanPath}`);
  }

  if (failures.length === 0) {
    const ladder = fs.readFileSync(ladderPath, 'utf8');
    const masterPlan = fs.readFileSync(masterPlanPath, 'utf8');

    for (const snippet of requiredSnippets) {
      if (!ladder.includes(snippet)) {
        failures.push(`Spend Capture Ladder missing required product law: ${snippet}`);
      }
    }

    for (const snippet of requiredMasterPlanSnippets) {
      if (!masterPlan.includes(snippet)) {
        failures.push(`Master plan missing Spend Capture Ladder registration: ${snippet}`);
      }
    }

    const levelOrder = ['| L0 ', '| L1 ', '| L2 ', '| L3 ', '| L4 ']
      .map((needle) => ladder.indexOf(needle));
    if (levelOrder.some((index) => index === -1)) {
      failures.push('Spend Capture Ladder must include all L0-L4 rows.');
    } else {
      for (let i = 1; i < levelOrder.length; i += 1) {
        if (levelOrder[i] <= levelOrder[i - 1]) {
          failures.push('Spend Capture Ladder levels must remain ordered L0 -> L4.');
          break;
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Spend Capture Ladder validation FAILED\n');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error(
      '\nFix: update docs/chopdot-dot/spend-capture-ladder-2026-06-24.md and the master plan coverage registry before implementing capture UI.\n',
    );
    process.exit(1);
  }

  console.log('✅ Spend Capture Ladder OK — L0-L4 product law is registered and ordered');
}

main();
