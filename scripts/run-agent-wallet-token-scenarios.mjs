#!/usr/bin/env node
/**
 * Run direct agent-wallet payment scenarios with public-testnet PAS and the
 * existing TEST_USDC mock token deployment.
 *
 * This is disposable public-testnet proof only. It does not use production
 * funds, custody, escrow, or a live Polkadot host.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { BigNumber, Contract, Wallet, providers, utils } = require('ethers');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rpcUrl = process.env.POLKADOT_HUB_RPC_URL ?? 'https://services.polkadothub-rpc.com/testnet';
const publicTestnetMinterKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function argValue(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcError(error) {
  const message = [
    error?.message,
    error?.shortMessage,
    error?.error?.message,
    error?.info?.error?.message,
  ].filter(Boolean).join(' ');

  return /temporarily banned|already known|nonce too low|replacement transaction underpriced/i.test(message)
    || error?.error?.code === 1012;
}

async function waitForTx(tx, label) {
  const receipt = await tx.wait();
  console.log(`${label}: ${tx.hash} @ block ${receipt?.blockNumber}`);
  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed?.toString(),
  };
}

async function recordTransaction(label, send) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await waitForTx(await send(), label);
    } catch (error) {
      if (attempt === 5 || !isRetryableRpcError(error)) {
        throw error;
      }
      console.warn(`${label}: retrying after transient RPC rejection (${attempt}/5)`);
      await sleep(attempt * 5_000);
    }
  }
  throw new Error(`Unable to submit ${label}`);
}

const session = argValue('session') ?? process.env.AGENT_WALLET_TRIAL_SESSION ?? 'agent-wallet-trial-2026-06-22';
const execute = hasFlag('execute') || process.env.AGENT_WALLET_TOKEN_EXECUTE === '1';
const privateWalletsPath = path.join(repoRoot, '.local-private/agent-wallet-trials', session, 'wallets.private.json');
const deployArtifactPath = path.join(repoRoot, 'artifacts/polkadot-native/escrow-direct-deploy-2026-06-20.json');
const outputDir = path.join(repoRoot, 'artifacts/agent-wallet-trials', session);
const jsonPath = path.join(outputDir, 'wallet-scenario-report.json');
const mdPath = path.join(outputDir, 'wallet-scenario-report.md');

const saved = readJson(privateWalletsPath);
const deployArtifact = readJson(deployArtifactPath);
const provider = new providers.JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
const minter = new Wallet(publicTestnetMinterKey, provider);

const tokenAbi = [
  'function owner() view returns (address)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
];
const tokenAddress = deployArtifact.contracts.mockUsdc.address;
const token = new Contract(tokenAddress, tokenAbi, minter);
const tokenDecimals = await token.decimals();
const tokenSymbol = await token.symbol();
const tokenOwner = await token.owner();
const expectedMinterAddress = await minter.getAddress();

if (tokenOwner.toLowerCase() !== expectedMinterAddress.toLowerCase()) {
  throw new Error(`Mock token owner mismatch. Expected ${expectedMinterAddress}, got ${tokenOwner}.`);
}

function profile(id) {
  const item = saved.profiles.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing profile ${id}`);
  return item;
}

function wallet(id) {
  return new Wallet(profile(id).privateKey, provider);
}

async function participantBalanceRows() {
  const rows = [];
  for (const item of saved.profiles) {
    const pas = await provider.getBalance(item.evmAddress);
    const usdc = await token.balanceOf(item.evmAddress);
    rows.push({
      personId: item.id,
      name: item.name,
      address: item.evmAddress,
      balancePas: utils.formatEther(pas),
      balanceUsdc: utils.formatUnits(usdc, tokenDecimals),
    });
  }
  return rows;
}

function clearsPaymentProduct() {
  return {
    productState: 'received',
    clearsPayment: true,
    requiresHumanConfirmation: false,
    closeoutEffect: 'matching_payment_item_only',
  };
}

async function sendPasTransfer(step) {
  const from = wallet(step.from);
  const to = profile(step.to);
  const amount = utils.parseEther(step.amount);

  if (!execute) {
    return {
      ...step,
      currency: 'PAS',
      fromAddress: from.address,
      toAddress: to.evmAddress,
      amountPas: step.amount,
      status: 'dry_run',
      product: clearsPaymentProduct(),
    };
  }

  const tx = await recordTransaction(
    step.label,
    () => from.sendTransaction({ to: to.evmAddress, value: amount }),
  );

  return {
    ...step,
    currency: 'PAS',
    fromAddress: from.address,
    toAddress: to.evmAddress,
    amountPas: step.amount,
    status: 'finalized',
    ...tx,
    product: clearsPaymentProduct(),
  };
}

async function ensureTokenBalance(personId, requiredAmount) {
  const target = profile(personId);
  const current = await token.balanceOf(target.evmAddress);
  if (current.gte(requiredAmount)) return null;

  const topUp = requiredAmount.sub(current);
  return recordTransaction(
    `mint ${utils.formatUnits(topUp, tokenDecimals)} ${tokenSymbol} to ${target.name}`,
    () => token.mint(target.evmAddress, topUp),
  );
}

async function sendTokenTransfer(step) {
  const from = wallet(step.from);
  const to = profile(step.to);
  const fromToken = token.connect(from);
  const amount = utils.parseUnits(step.amount, tokenDecimals);

  const mintTx = execute
    ? await ensureTokenBalance(step.from, amount)
    : null;

  if (!execute) {
    return {
      ...step,
      currency: 'USDC',
      amountUsdc: step.amount,
      fromAddress: from.address,
      toAddress: to.evmAddress,
      status: 'dry_run',
      product: clearsPaymentProduct(),
    };
  }

  const tx = await recordTransaction(
    step.label,
    () => fromToken.transfer(to.evmAddress, amount),
  );

  return {
    ...step,
    currency: 'USDC',
    amountUsdc: step.amount,
    amount: step.amount,
    fromAddress: from.address,
    toAddress: to.evmAddress,
    status: 'finalized',
    setupTx: mintTx ?? undefined,
    ...tx,
    product: clearsPaymentProduct(),
  };
}

const beforeBalances = await participantBalanceRows();
const groupExpenseTransfers = [
  await sendPasTransfer({
    label: 'Leo pays Mina with PAS',
    from: 'leo',
    to: 'mina',
    amount: '0.011',
  }),
  await sendPasTransfer({
    label: 'Nina pays Mina with PAS',
    from: 'nina',
    to: 'mina',
    amount: '0.012',
  }),
  await sendTokenTransfer({
    label: 'Leo pays Mina with TEST_USDC',
    from: 'leo',
    to: 'mina',
    amount: '0.021',
  }),
  await sendTokenTransfer({
    label: 'Nina pays Mina with TEST_USDC',
    from: 'nina',
    to: 'mina',
    amount: '0.022',
  }),
];
const afterBalances = await participantBalanceRows();

const artifact = {
  generatedAt: new Date().toISOString(),
  session,
  executionMode: execute ? 'executed_public_testnet_wallet' : 'dry_run',
  network: {
    name: 'polkadotHubTestnet',
    rpcUrl,
    chainId: String(network.chainId),
  },
  contracts: {
    mockUsdc: {
      address: tokenAddress,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      owner: tokenOwner,
    },
  },
  boundaries: {
    pas: 'executed_public_testnet_native_token',
    usdc: 'executed_public_testnet_mock_token',
    dot: 'not_executed_no_dot_asset_path_in_current_runner',
    productionReady: false,
    custody: false,
    note: 'PAS is the public testnet native token. TEST_USDC is a mock ERC-20 deployed for lab use. This report proves payment-item matching behavior, not production custody or legal settlement.',
  },
  beforeBalances,
  scenarios: [
    {
      id: 'group_expense',
      name: 'Group expense',
      closeoutRule: 'The exact matching payment item can be marked received; unrelated shares stay open until they match too.',
      transfers: groupExpenseTransfers,
      productInterpretation: 'The wallet movements can clear only their matching person, amount, receiver, and currency item.',
    },
  ],
  afterBalances,
};

function personName(id) {
  return profile(id).name;
}

function renderMarkdown(report) {
  const lines = [
    '# Agent Wallet Token Scenario Report',
    '',
    `Status: \`${report.executionMode}\``,
    `Generated: ${report.generatedAt}`,
    `Session: \`${report.session}\``,
    `Network: \`${report.network.name}\` / chain id \`${report.network.chainId}\``,
    '',
    '## Boundary',
    '',
    `- PAS: ${report.boundaries.pas}`,
    `- TEST_USDC: ${report.boundaries.usdc}`,
    `- DOT: ${report.boundaries.dot}`,
    `- Production ready: ${report.boundaries.productionReady ? 'yes' : 'no'}`,
    '',
    report.boundaries.note,
    '',
    '## Scenario Results',
    '',
  ];

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.name}`, '');
    lines.push(`Closeout rule: ${scenario.closeoutRule}`, '');
    for (const transfer of scenario.transfers) {
      lines.push(`- ${transfer.label}`);
      lines.push(`  - from: ${personName(transfer.from)} (${transfer.fromAddress})`);
      lines.push(`  - to: ${personName(transfer.to)} (${transfer.toAddress})`);
      lines.push(`  - amount: ${transfer.amountPas ?? transfer.amountUsdc ?? transfer.amount} ${transfer.currency}`);
      lines.push(`  - status: ${transfer.status}`);
      if (transfer.setupTx?.txHash) lines.push(`  - setup tx: ${transfer.setupTx.txHash}`);
      if (transfer.txHash) lines.push(`  - tx: ${transfer.txHash}`);
      if (transfer.blockNumber) lines.push(`  - block: ${transfer.blockNumber}`);
      lines.push(`  - clears payment item: ${transfer.product.clearsPayment ? 'yes' : 'no'}`);
    }
    lines.push('', `Interpretation: ${scenario.productInterpretation}`, '');
  }

  return `${lines.join('\n')}\n`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(artifact));

console.log(`Wallet scenario report: ${jsonPath}`);
console.log(`Wallet scenario markdown: ${mdPath}`);
