#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const paths = {
  scorecard: 'docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md',
  friendLedger: 'docs/chopdot-dot/friend-pilot-results-ledger-2026-06-20.md',
  authLedger: 'docs/chopdot-dot/auth-provider-proof-ledger-2026-06-20.md',
  dotPreflight: 'artifacts/polkadot-native/dot-deploy-preflight-2026-06-22.json',
  outputDir: 'artifacts/use-case-9-readiness',
};

function readText(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required readiness input: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function tableRowsAfter(content, heading) {
  const section = content.split(heading)[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .slice(1);
}

function parseCells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/`/g, ''));
}

function parseScorecard(content) {
  return tableRowsAfter(content, '## Current Scores').map((line) => {
    const cells = parseCells(line);
    return {
      useCase: cells[0],
      currentScore: Number.parseFloat(cells[1]),
      target: Number.parseFloat(cells[2]),
      status: cells[3],
      evidence: cells[4],
      gapToNine: cells[5],
      promoted: Number.parseFloat(cells[1]) >= 9,
    };
  });
}

function parseFriendLedger(content) {
  return tableRowsAfter(content, '## Scenario Result Ledger').map((line) => {
    const cells = parseCells(line);
    return {
      scenario: cells[0],
      status: cells[1],
      participants: cells[2],
      devices: cells[3],
      coachingNeeded: cells[5],
      promotionDecision: cells.at(-1),
    };
  });
}

function parseAuthLedger(content) {
  return tableRowsAfter(content, '## Provider Proof Ledger').map((line) => {
    const cells = parseCells(line);
    return {
      provider: cells[0],
      state: cells[1],
      route: cells[2],
      evidence: cells[4],
      promotionDecision: cells.at(-1),
    };
  });
}

function statusCounts(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function formatTable(headers, rows) {
  const cleanCell = (value) =>
    String(value ?? '')
      .replace(/\|/g, '/')
      .replace(/\s+/g, ' ')
      .trim();
  const header = `| ${headers.join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(cleanCell).join(' | ')} |`);
  return [header, rule, ...body].join('\n');
}

function main() {
  const scorecardText = readText(paths.scorecard);
  const friendText = readText(paths.friendLedger);
  const authText = readText(paths.authLedger);
  const dotPreflight = readJson(paths.dotPreflight);

  const useCases = parseScorecard(scorecardText);
  const friendScenarios = parseFriendLedger(friendText);
  const authProviders = parseAuthLedger(authText);

  const realFriendPassCount = friendScenarios.filter((row) => row.status === 'pass').length;
  const requiredFriendScenarios = friendScenarios.length;
  const unpromotedProviderCount = authProviders.filter((row) =>
    ['blocked-config', 'visible-only', 'fail'].includes(row.state),
  ).length;
  const providerPassCount = authProviders.filter((row) => row.state === 'pass-provider').length;
  const localBundleReady = dotPreflight?.summary?.localBundleReady === true;
  const signerSetupRequired = dotPreflight?.summary?.setupRequired > 0;
  const readyForHumanDeploy = dotPreflight?.summary?.readyForHumanDeploy === true;

  const openGates = [];
  if (realFriendPassCount < requiredFriendScenarios) {
    openGates.push('real friend-pilot rows are not complete');
  }
  if (unpromotedProviderCount > 0) {
    openGates.push('desktop wallet, mobile WalletConnect, or social provider proof remains unpromoted');
  }
  if (!readyForHumanDeploy) {
    openGates.push('static .dot deploy is not ready for human deploy');
  }
  if (signerSetupRequired) {
    openGates.push('polkadot-app-deploy signer session is setup_required');
  }
  if (useCases.some((row) => row.currentScore < row.target)) {
    openGates.push('one or more use cases remains below target score');
  }

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    status: openGates.length === 0 ? 'complete' : 'not_9_10_yet',
    completionAllowed: openGates.length === 0,
    openGates,
    inputs: paths,
    summary: {
      useCases: {
        total: useCases.length,
        promoted: useCases.filter((row) => row.promoted).length,
        belowTarget: useCases.filter((row) => row.currentScore < row.target).length,
      },
      friendPilot: {
        total: requiredFriendScenarios,
        statusCounts: statusCounts(friendScenarios, 'status'),
      },
      authProviders: {
        total: authProviders.length,
        statusCounts: statusCounts(authProviders, 'state'),
        passProvider: providerPassCount,
        unpromoted: unpromotedProviderCount,
      },
      dotHost: {
        localBundleReady,
        readyForHumanDeploy,
        setupRequired: dotPreflight?.summary?.setupRequired ?? null,
        failed: dotPreflight?.summary?.failed ?? null,
      },
    },
    useCases,
    friendScenarios,
    authProviders,
  };

  const outputDir = path.join(repoRoot, paths.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'current-use-case-9-readiness-report.json');
  const mdPath = path.join(outputDir, 'current-use-case-9-readiness-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const markdown = [
    '# ChopDot 9/10 Readiness Report',
    '',
    `Generated: ${generatedAt}`,
    '',
    `Status: \`${report.status}\``,
    `Completion allowed: \`${report.completionAllowed ? 'yes' : 'no'}\``,
    '',
    '## Open Gates',
    '',
    ...openGates.map((gate) => `- ${gate}`),
    '',
    '## Use Cases',
    '',
    formatTable(
      ['Use case', 'Score', 'Target', 'Status', 'Gap'],
      useCases.map((row) => [
        row.useCase,
        String(row.currentScore),
        String(row.target),
        row.status,
        row.gapToNine,
      ]),
    ),
    '',
    '## Friend Pilot',
    '',
    formatTable(
      ['Scenario', 'Status', 'Coaching needed', 'Promotion'],
      friendScenarios.map((row) => [
        row.scenario,
        row.status,
        row.coachingNeeded,
        row.promotionDecision,
      ]),
    ),
    '',
    '## Auth Providers',
    '',
    formatTable(
      ['Provider', 'State', 'Evidence', 'Promotion'],
      authProviders.map((row) => [
        row.provider,
        row.state,
        row.evidence,
        row.promotionDecision,
      ]),
    ),
    '',
    '## Dot Host',
    '',
    `- Local bundle ready: \`${localBundleReady ? 'yes' : 'no'}\``,
    `- Ready for human deploy: \`${readyForHumanDeploy ? 'yes' : 'no'}\``,
    `- Setup required count: \`${dotPreflight?.summary?.setupRequired ?? 'unknown'}\``,
    `- Failed count: \`${dotPreflight?.summary?.failed ?? 'unknown'}\``,
    '',
    '## Claim Boundary',
    '',
    'This report does not promote any use case by itself. It only summarizes the current proof ledgers.',
    'A 9/10 completion claim requires all open gates to be resolved in the authoritative ledgers first.',
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, markdown);

  console.log(`Readiness report JSON: ${jsonPath}`);
  console.log(`Readiness report MD:   ${mdPath}`);
  console.log(`Status: ${report.status}`);
  if (openGates.length > 0) {
    console.log(`Open gates: ${openGates.length}`);
  }
}

main();
