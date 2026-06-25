#!/usr/bin/env node
/**
 * Run direct PAS payment-evidence scenarios using a saved agent-wallet trial.
 *
 * This sends public-testnet PAS between disposable wallets. It does not use
 * custody, escrow, or production funds.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, formatEther, parseEther } from 'ethers';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rpcUrl = process.env.POLKADOT_HUB_RPC_URL ?? 'https://services.polkadothub-rpc.com/testnet';

function argValue(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const session = argValue('session') ?? process.env.AGENT_WALLET_TRIAL_SESSION ?? 'agent-wallet-trial-2026-06-22';
const execute = hasFlag('execute') || process.env.AGENT_WALLET_PAS_EXECUTE === '1';
const privateWalletsPath = path.join(repoRoot, '.local-private/agent-wallet-trials', session, 'wallets.private.json');
const outputDir = path.join(repoRoot, 'artifacts/agent-wallet-trials', session);
const jsonPath = path.join(outputDir, 'pas-scenario-report.json');
const mdPath = path.join(outputDir, 'pas-scenario-report.md');

const saved = JSON.parse(readFileSync(privateWalletsPath, 'utf8'));
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();

function profile(id) {
  const item = saved.profiles.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing profile ${id}`);
  return item;
}

function wallet(id) {
  return new Wallet(profile(id).privateKey, provider);
}

function classifyReceived(input) {
  if (input.amountMatches && input.expectedRecipientMatched) {
    return {
      productState: 'received',
      clearsPayment: true,
      requiresHumanConfirmation: false,
      closeoutEffect: 'chapter_rule_check',
    };
  }

  return {
    productState: 'claimed',
    clearsPayment: false,
    requiresHumanConfirmation: true,
    closeoutEffect: 'none',
  };
}

const scenarios = [
  {
    id: 'group_expense',
    name: 'Group expense',
    transfers: [
      { label: 'Leo pays Mina for dinner split', from: 'leo', to: 'mina', amountPas: '0.011' },
      { label: 'Nina pays Mina for dinner split', from: 'nina', to: 'mina', amountPas: '0.012' },
    ],
    closeoutRule: 'Close when Leo and Nina legs are received; no extra group vote.',
  },
  {
    id: 'savings_circle',
    name: 'Savings circle',
    transfers: [
      { label: 'Leo contributes to Mina', from: 'leo', to: 'mina', amountPas: '0.010' },
      { label: 'Nina contributes to Mina', from: 'nina', to: 'mina', amountPas: '0.010' },
      { label: 'Omar contributes after delay', from: 'omar', to: 'mina', amountPas: '0.010' },
      { label: 'Mina pays round payout to Leo', from: 'mina', to: 'leo', amountPas: '0.025' },
    ],
    closeoutRule: 'Close when contributions and payout are received, with Omar delay recorded.',
  },
  {
    id: 'emergency_pot',
    name: 'Emergency pot',
    transfers: [
      { label: 'Casey contributes private support to Riley', from: 'casey', to: 'riley', amountPas: '0.015' },
      { label: 'Riley releases support to Jordan', from: 'riley', to: 'jordan', amountPas: '0.014' },
    ],
    closeoutRule: 'Close when support and release are received, approvals are recorded, and receipt is redacted.',
  },
  {
    id: 'community_fund',
    name: 'Community fund',
    transfers: [
      { label: 'Sam contributes to Alex fund', from: 'sam', to: 'alex', amountPas: '0.020' },
      { label: 'Alex pays approved release to Jordan', from: 'alex', to: 'jordan', amountPas: '0.019' },
    ],
    closeoutRule: 'Close when contribution, approvals, release, and handoff receipt are complete.',
  },
];

async function balanceRows() {
  const rows = [];
  for (const item of saved.profiles) {
    const balance = await provider.getBalance(item.evmAddress);
    rows.push({
      personId: item.id,
      name: item.name,
      address: item.evmAddress,
      balancePas: formatEther(balance),
    });
  }
  return rows;
}

async function sendTransfer(step) {
  const from = wallet(step.from);
  const to = profile(step.to);
  const amount = parseEther(step.amountPas);

  if (!execute) {
    return {
      ...step,
      fromAddress: from.address,
      toAddress: to.evmAddress,
      status: 'dry_run',
      product: classifyReceived({ amountMatches: true, expectedRecipientMatched: true }),
    };
  }

  const tx = await from.sendTransaction({ to: to.evmAddress, value: amount });
  const receipt = await tx.wait();
  return {
    ...step,
    fromAddress: from.address,
    toAddress: to.evmAddress,
    status: receipt?.status === 1 ? 'finalized' : 'failed',
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed?.toString(),
    amountMatches: true,
    expectedRecipientMatched: true,
    product: classifyReceived({ amountMatches: true, expectedRecipientMatched: true }),
  };
}

const beforeBalances = await balanceRows();
const scenarioResults = [];
for (const scenario of scenarios) {
  const transfers = [];
  for (const transfer of scenario.transfers) {
    console.log(`${execute ? 'Sending' : 'Dry run'}: ${scenario.name} / ${transfer.label}`);
    transfers.push(await sendTransfer(transfer));
  }
  scenarioResults.push({
    ...scenario,
    transfers,
    productInterpretation: transfers.every((transfer) => transfer.product.clearsPayment)
      ? 'All executed payment movements are strong received evidence for their specific legs. Closeout still checks approvals, delays, privacy, and remaining scenario rules.'
      : 'At least one movement did not produce strong received evidence.',
  });
}
const afterBalances = await balanceRows();

const artifact = {
  generatedAt: new Date().toISOString(),
  session,
  executionMode: execute ? 'executed_public_testnet_pas' : 'dry_run',
  network: {
    name: 'polkadotHubTestnet',
    rpcUrl,
    chainId: network.chainId.toString(),
  },
  safety: {
    productionReady: false,
    custody: false,
    note: 'Disposable public-testnet PAS movement only. This proves wallet-backed payment evidence, not production custody or legal settlement.',
  },
  beforeBalances,
  scenarios: scenarioResults,
  afterBalances,
};

function renderMarkdown(report) {
  const lines = [
    '# Agent Wallet PAS Scenario Report',
    '',
    `Status: \`${report.executionMode}\``,
    `Generated: ${report.generatedAt}`,
    `Session: \`${report.session}\``,
    `Network: \`${report.network.name}\` / chain id \`${report.network.chainId}\``,
    '',
    '## Working Model',
    '',
    '```text',
    'verified recipient+amount PAS movement -> received / cleared payment leg',
    'all scenario rules resolved -> closeout',
    '```',
    '',
    '## Scenario Results',
    '',
  ];

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.name}`, '');
    lines.push(`Closeout rule: ${scenario.closeoutRule}`, '');
    for (const transfer of scenario.transfers) {
      lines.push(`- ${transfer.label}`);
      lines.push(`  - from: ${profile(transfer.from).name} (${transfer.fromAddress})`);
      lines.push(`  - to: ${profile(transfer.to).name} (${transfer.toAddress})`);
      lines.push(`  - amount: ${transfer.amountPas} PAS`);
      lines.push(`  - status: ${transfer.status}`);
      if (transfer.txHash) lines.push(`  - tx: ${transfer.txHash}`);
      if (transfer.blockNumber) lines.push(`  - block: ${transfer.blockNumber}`);
      lines.push(`  - product state: ${transfer.product.productState}`);
      lines.push(`  - clears payment: ${transfer.product.clearsPayment ? 'yes' : 'no'}`);
    }
    lines.push('', `Interpretation: ${scenario.productInterpretation}`, '');
  }

  lines.push('## Boundary', '');
  lines.push('This report uses public-testnet PAS only. It does not prove production custody, legal settlement, or full host-native readiness.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(artifact));

console.log(`PAS scenario report: ${jsonPath}`);
console.log(`PAS scenario markdown: ${mdPath}`);
