#!/usr/bin/env node
/**
 * Create a disposable agent-wallet trial packet.
 *
 * By default this is non-writing: it creates wallets, profiles, route links,
 * and a run sheet. Add --fund with POLKADOT_HUB_TESTNET_PRIVATE_KEY to top up
 * the wallets on Polkadot Hub TestNet. These wallets are public-testnet only.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, formatEther, parseEther } from 'ethers';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRpcUrl = 'https://services.polkadothub-rpc.com/testnet';

function argValue(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `agent-wallet-trial-${today()}`;
}

const session = safeSlug(argValue('session') ?? process.env.AGENT_WALLET_TRIAL_SESSION ?? `agent-wallet-trial-${today()}`);
const baseUrl = (argValue('base-url') ?? process.env.AGENT_WALLET_TRIAL_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
const rpcUrl = argValue('rpc-url') ?? process.env.POLKADOT_HUB_RPC_URL ?? defaultRpcUrl;
const shouldFund = hasFlag('fund') || process.env.AGENT_WALLET_TRIAL_FUND === '1';
const topUpPas = argValue('top-up-pas') ?? process.env.AGENT_WALLET_TRIAL_TOP_UP_PAS ?? '0.2';
const minimumPas = argValue('minimum-pas') ?? process.env.AGENT_WALLET_TRIAL_MINIMUM_PAS ?? '0.05';

const publicDir = path.join(repoRoot, 'artifacts/agent-wallet-trials', session);
const privateDir = path.join(repoRoot, '.local-private/agent-wallet-trials', session);
const publicProfilesPath = path.join(publicDir, 'profiles.public.json');
const privateWalletsPath = path.join(privateDir, 'wallets.private.json');
const runSheetPath = path.join(publicDir, 'run-sheet.md');
const fundingPath = path.join(publicDir, 'funding-report.json');

const people = [
  { id: 'mina', name: 'Mina', role: 'organizer / treasurer', scenarios: ['group_expense', 'savings_circle'] },
  { id: 'leo', name: 'Leo', role: 'payer / savings receiver', scenarios: ['group_expense', 'savings_circle'] },
  { id: 'nina', name: 'Nina', role: 'payer / contributor', scenarios: ['group_expense', 'savings_circle'] },
  { id: 'omar', name: 'Omar', role: 'late contributor / release recorder', scenarios: ['savings_circle'] },
  { id: 'casey', name: 'Casey', role: 'emergency contributor', scenarios: ['emergency_pot'] },
  { id: 'riley', name: 'Riley', role: 'emergency organizer / approver', scenarios: ['emergency_pot'] },
  { id: 'taylor', name: 'Taylor', role: 'second emergency approver', scenarios: ['emergency_pot'] },
  { id: 'jordan', name: 'Jordan', role: 'recipient / reviewer', scenarios: ['emergency_pot', 'community_fund'] },
  { id: 'sam', name: 'Sam', role: 'community contributor / payer', scenarios: ['community_fund'] },
  { id: 'alex', name: 'Alex', role: 'community admin / approver', scenarios: ['community_fund'] },
  { id: 'priya', name: 'Priya', role: 'second community approver', scenarios: ['community_fund'] },
];

const scenarios = [
  {
    id: 'group_expense',
    name: 'Group expense',
    people: ['leo', 'nina', 'mina'],
    goal: 'Split one expense, move money, clear received legs, and close one record.',
  },
  {
    id: 'savings_circle',
    name: 'Savings circle',
    people: ['leo', 'nina', 'omar', 'mina'],
    goal: 'Run one round, clear received contributions, record one delay, release payout, and close the round.',
  },
  {
    id: 'emergency_pot',
    name: 'Emergency pot',
    people: ['casey', 'riley', 'taylor', 'jordan'],
    goal: 'Coordinate private support, approval, release, receipt, and redacted closeout.',
  },
  {
    id: 'community_fund',
    name: 'Community fund',
    people: ['sam', 'alex', 'priya', 'jordan'],
    goal: 'Collect contributions, approve spend, record release, verify receipt, and close a handoff record.',
  },
];

function linkFor(scenarioId, personId) {
  const params = new URLSearchParams({
    'chopdot-dot-native': '1',
    person: personId,
    'agent-wallet-trial': session,
    'chopdot-dot-session': `${session}-${scenarioId}`,
    scenario: scenarioId,
  });
  return `${baseUrl}/pots?${params.toString()}`;
}

function createProfiles() {
  return people.map((person) => {
    const wallet = Wallet.createRandom();
    return {
      ...person,
      evmAddress: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
    };
  });
}

async function fundingReport(profiles) {
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  const operatorKey = process.env.POLKADOT_HUB_TESTNET_PRIVATE_KEY;
  const funder = shouldFund && operatorKey ? new Wallet(operatorKey, provider) : undefined;
  const transactions = [];
  const balances = [];
  const minimum = parseEther(minimumPas);
  const topUp = parseEther(topUpPas);

  for (const profile of profiles) {
    const before = await provider.getBalance(profile.evmAddress);
    let txHash;
    let after = before;
    let status = 'checked';

    if (shouldFund && before < minimum) {
      if (!funder) {
        status = 'setup_required_missing_POLKADOT_HUB_TESTNET_PRIVATE_KEY';
      } else {
        const tx = await funder.sendTransaction({ to: profile.evmAddress, value: topUp });
        const receipt = await tx.wait();
        txHash = tx.hash;
        after = await provider.getBalance(profile.evmAddress);
        status = receipt?.status === 1 ? 'funded' : 'fund_failed';
        transactions.push({
          personId: profile.id,
          txHash,
          blockNumber: receipt?.blockNumber,
          amountPas: topUpPas,
        });
      }
    }

    balances.push({
      personId: profile.id,
      address: profile.evmAddress,
      beforePas: formatEther(before),
      afterPas: formatEther(after),
      status,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    network: {
      name: 'polkadotHubTestnet',
      rpcUrl,
      chainId: network.chainId.toString(),
    },
    fundingMode: shouldFund ? 'fund_requested' : 'dry_run_no_funding',
    minimumPas,
    topUpPas,
    faucet: {
      url: 'https://faucet.polkadot.io/',
      note: 'Use the faucet or a funded disposable operator wallet for public testnet PAS. Faucet CAPTCHA/rate limits may require manual funding.',
    },
    balances,
    transactions,
  };
}

function publicProfile(profile) {
  const { privateKey, mnemonic, ...rest } = profile;
  return rest;
}

function renderRunSheet(publicProfiles, funding) {
  const rows = scenarios.flatMap((scenario) =>
    scenario.people.map((personId) => {
      const profile = publicProfiles.find((item) => item.id === personId);
      return `| ${scenario.name} | ${profile?.name ?? personId} | ${profile?.evmAddress ?? ''} | ${linkFor(scenario.id, personId)} |`;
    }),
  );

  return `# ChopDot Agent Wallet Trial

Status: \`${funding.fundingMode === 'fund_requested' ? 'funding-attempted' : 'ready-dry-run'}\`
Generated: ${new Date().toISOString()}
Session: \`${session}\`
Base URL: \`${baseUrl}\`
Network: \`${funding.network.name}\` / chain id \`${funding.network.chainId}\`

## Working Model

\`\`\`text
self reported paid -> claimed
receiver confirms received -> cleared
verified rail recipient+amount received -> cleared
escrow deposited -> held
escrow released to expected recipient+amount -> released/cleared
all mode rules resolved -> close pot or round
\`\`\`

The trial should find product dead ends, not prove production custody. A wallet transaction can clear a payment leg when the recipient and amount are verified. It does not close unrelated approvals, delays, disputes, or open legs.

## Private Wallet File

Private disposable testnet keys were written locally here:

\`\`\`text
${privateWalletsPath}
\`\`\`

Do not commit or paste that file. Public addresses are below.

## Funding

Funding mode: \`${funding.fundingMode}\`

If any row says \`setup_required_missing_POLKADOT_HUB_TESTNET_PRIVATE_KEY\`, either:

- fund the address manually with testnet PAS at https://faucet.polkadot.io/; or
- rerun with \`POLKADOT_HUB_TESTNET_PRIVATE_KEY=<funded-disposable-key> npm run trial:agent-wallets -- --fund\`.

## People

| Person | Role | Public testnet address |
| --- | --- | --- |
${publicProfiles.map((profile) => `| ${profile.name} | ${profile.role} | ${profile.evmAddress} |`).join('\n')}

## Scenario Links

Open each person in a separate browser profile/device.

| Scenario | Person | Wallet | Link |
| --- | --- | --- | --- |
${rows.join('\n')}

## Scenario Goals

${scenarios.map((scenario) => `- **${scenario.name}:** ${scenario.goal}`).join('\n')}

## What To Record

- Did the person understand their next action before clicking?
- Did the wallet transaction reduce friction or create confusion?
- Did strong received evidence clear the right payment leg?
- Did weak evidence stay visible without pretending money arrived?
- Did the pot close only after all scenario rules were satisfied?
- Did emergency/private details stay out of the receipt?
- Did any wrong-person or premature action succeed?

## Pass Standard

A scenario passes only when:

- every role acts from its own profile/device;
- payment movement is represented in the UI;
- received payments clear without extra ceremony;
- open rules still block closeout;
- screenshots and tx hashes are saved;
- the participant can explain what happened in plain English.
`;
}

mkdirSync(publicDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });

const profiles = createProfiles();
const publicProfiles = profiles.map(publicProfile);
const funding = await fundingReport(profiles);

writeFileSync(privateWalletsPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  session,
  warning: 'Disposable public-testnet wallets only. Do not fund with real value.',
  profiles,
}, null, 2)}\n`);
writeFileSync(publicProfilesPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  session,
  profiles: publicProfiles,
}, null, 2)}\n`);
writeFileSync(fundingPath, `${JSON.stringify(funding, null, 2)}\n`);
writeFileSync(runSheetPath, renderRunSheet(publicProfiles, funding));

console.log(`Agent wallet trial: ${session}`);
console.log(`Run sheet: ${runSheetPath}`);
console.log(`Public profiles: ${publicProfilesPath}`);
console.log(`Private wallets: ${privateWalletsPath}`);
console.log(`Funding report: ${fundingPath}`);
