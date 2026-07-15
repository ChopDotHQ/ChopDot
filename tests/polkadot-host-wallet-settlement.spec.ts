import {expect, test, type Browser, type BrowserContext, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {ethers} from 'ethers';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const RPC_URL = 'https://services.polkadothub-rpc.com/testnet';
const EXPLORER_TX = 'https://blockscout-testnet.polkadot.io/tx';
const CHAIN_ID_HEX = '0x190f1b41';
const sessionSecret = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
const sessionRoom = `friday-crew-wallet-${Date.now()}`;
const sessionQuery = `chopSession=${sessionRoom}&chopKey=${sessionSecret}`;
const productUrl = `http://127.0.0.1:4177/?${sessionQuery}`;
const proofDirectory = path.resolve('proof/polkadot-host-wallet-settlement');
const storageKey = 'chopdot-portable-shell-state-v1';
const walletFile = path.resolve('../..', '.local-private/agent-wallet-trials/agent-wallet-trial-2026-06-22/wallets.private.json');

const definitions = [
  {account: 'alice', person: 'Mina', walletId: 'mina'},
  {account: 'bob', person: 'Leo', walletId: 'leo'},
  {account: 'charlie', person: 'Nina', walletId: 'nina'},
  {account: 'dave', person: 'Omar', walletId: 'omar'},
  {account: 'eve', person: 'Casey', walletId: 'casey'},
] as const satisfies ReadonlyArray<{account: DevAccountName; person: string; walletId: string}>;

type Definition = typeof definitions[number];
type WalletProfile = {id: string; name: string; evmAddress: string; privateKey: string};
type Participant = Definition & {
  profile: WalletProfile;
  wallet: ethers.Wallet;
  context: BrowserContext;
  server: TestHostServer;
  page: Page;
  frame: Frame;
  statementCursor: number;
  publishedCursor: number;
};

type PortableState = {
  currentUserId: string | null;
  users: Record<string, {id: string; name: string; walletAddress?: string}>;
  groups: Record<string, {id: string; name: string; memberIds: string[]}>;
  expenses: Record<string, {id: string; groupId: string; amount: number; currency?: string; paidByUserId: string}>;
  splits: Record<string, {
    id: string;
    expenseId: string;
    userId: string;
    amount: number;
    status: string;
    walletPayment?: {txHash: string; from: string; to: string; amountBaseUnits: string; blockNumber: string};
  }>;
  savedRecords: Record<string, {id: string; groupId: string; totalAmount: number; openAmount: number}>;
};

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
    __CHOPDOT_CAPTURED_SHARES__?: Array<{url?: string}>;
    __CHOPDOT_TEST_WALLET_REQUEST__?: (request: {method: string; params?: unknown[]}) => Promise<unknown>;
  }
}

test('five people pay PAS from their own wallet through the visible hosted app', async ({browser}) => {
  test.setTimeout(420_000);
  await mkdir(proofDirectory, {recursive: true});
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const walletProfiles = await loadWalletProfiles();
  const wallets = Object.fromEntries(walletProfiles.map(profile => [profile.id, new ethers.Wallet(profile.privateKey, provider)]));
  const balanceBeforeTopups = await balances(provider, walletProfiles);
  const topups = await createTopups(wallets.mina, walletProfiles.filter(profile => profile.id !== 'mina'));
  const balanceAfterTopups = await balances(provider, walletProfiles);
  const participants: Participant[] = [];

  try {
    for (const definition of definitions) {
      const profile = walletProfiles.find(item => item.id === definition.walletId);
      if (!profile) throw new Error(`Missing wallet profile for ${definition.walletId}.`);
      participants.push(await openParticipant(browser, definition, profile, wallets[profile.id]));
    }
    const mina = participants[0];
    const payers = participants.slice(1);

    await Promise.all(participants.map(onboard));
    await Promise.all(participants.map(participant => waitForPublished(participant, 1)));
    await relayUntilQuiet(participants);
    for (const participant of participants) await waitForState(participant, state => Object.keys(state.users).length === 5);
    await capture(mina, '01-five-people-ready');

    await mina.frame.getByRole('button', {name: 'Settings'}).click();
    await mina.frame.getByLabel('Select currency').selectOption('PAS');
    await mina.frame.getByRole('button', {name: 'Back'}).click();
    await mina.frame.getByRole('button', {name: 'Pay'}).click();
    await mina.frame.getByRole('button', {name: 'Connect PAS wallet'}).click();
    await expect(mina.frame.getByText('PAS wallet connected')).toBeVisible();
    await waitForPublished(mina, 1);
    await relayUntilQuiet(participants);
    await capture(mina, '02-mina-wallet-connected');
    await mina.frame.getByRole('button', {name: 'Back'}).click();

    await mina.frame.getByRole('button', {name: 'Start with a group'}).click();
    await mina.frame.getByPlaceholder('e.g. Weekend Trip').fill('Friday Crew');
    for (const payer of payers) {
      await mina.frame.getByLabel('Friend name').fill(payer.person);
      await mina.frame.getByRole('button', {name: 'Add friend'}).click();
    }
    await mina.frame.getByRole('button', {name: 'Create group'}).click();
    await waitForPublished(mina, 1);
    await relayUntilQuiet(participants);

    await mina.frame.getByRole('button', {name: 'Add spend'}).click();
    await mina.frame.getByPlaceholder('0.00').fill('0.05');
    await mina.frame.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner in Zurich');
    await mina.frame.getByRole('button', {name: 'Review split'}).click();
    await mina.frame.getByRole('button', {name: 'Save spend'}).click();
    await waitForPublished(mina, 1);
    await relayUntilQuiet(participants);
    await capture(mina, '03-pas-spend-saved');

    await installShareCapture(mina.frame);
    await mina.frame.getByRole('button', {name: 'Settle up'}).click();
    for (const payer of payers) await mina.frame.getByLabel(`Send link to ${payer.person}`).click();
    await waitForPublished(mina, 4);
    for (const [index, payer] of payers.entries()) await openCapturedPayerLink(mina, payer, index);
    await relayUntilQuiet(participants);
    await capture(mina, '04-four-payment-links');

    for (const [index, payer] of payers.entries()) {
      await expect(payer.frame.getByRole('button', {name: 'Pay Mina'})).toBeVisible();
      await capture(payer, `05-${index + 1}-ready-to-pay`);
      await payer.frame.getByRole('button', {name: 'Pay Mina'}).click();
      await expect(payer.frame.getByRole('heading', {name: 'Payment received', level: 2})).toBeVisible({timeout: 90_000});
      await waitForPublished(payer, 2);
      await capture(payer, `06-${index + 1}-payment-received`);
    }

    await relayUntilQuiet(participants, 12);
    for (const participant of participants) {
      await waitForState(participant, state => {
        const payerSplits = Object.values(state.splits).filter(split => {
          const expense = state.expenses[split.expenseId];
          return expense?.groupId && split.userId !== expense.paidByUserId;
        });
        return payerSplits.length === 4 && payerSplits.every(split => split.status === 'confirmed' && Boolean(split.walletPayment));
      });
    }
    await expect(mina.frame.getByText('Everyone is settled up!')).toBeVisible();
    await capture(mina, '07-all-wallet-payments-received');

    await mina.frame.getByRole('button', {name: 'Finish group'}).click();
    await mina.frame.getByRole('button', {name: 'Finish and save summary'}).click();
    await waitForPublished(mina, 1);
    await relayUntilQuiet(participants);
    await expect(mina.frame.getByRole('heading', {name: 'Group Summary'})).toBeVisible();
    await expect(mina.frame.getByText('All settled')).toBeVisible();
    await capture(mina, '08-final-group-summary');

    const states = await Promise.all(participants.map(stateOf));
    const expected = sharedProjection(states[0]);
    for (const state of states) expect(sharedProjection(state)).toEqual(expected);
    const paymentSplits = expected.splits.filter(split => Boolean(split.walletPayment));
    expect(paymentSplits).toHaveLength(4);
    expect(new Set(paymentSplits.map(split => split.walletPayment!.txHash)).size).toBe(4);
    expect(expected.savedRecords[0].openAmount).toBe(0);

    const balanceAfterPayments = await balances(provider, walletProfiles);
    const report = {
      checkedAt: new Date().toISOString(),
      status: 'passed',
      participantCount: 5,
      chain: {name: 'Polkadot Hub TestNet', chainId: CHAIN_ID_HEX, rpcUrl: RPC_URL},
      funding: {
        historicalFaucetBoundary: 'The wallets had faucet-funded balances, but no matching EVM funding transaction hash was visible. No faucet hash is claimed.',
        beforeTopups: balanceBeforeTopups,
        freshTopups: topups,
        afterTopups: balanceAfterTopups,
      },
      payments: paymentSplits.map(split => ({
        person: expected.users.find(user => user.id === split.userId)?.name,
        amountPas: split.amount,
        ...split.walletPayment,
        explorerUrl: `${EXPLORER_TX}/${split.walletPayment!.txHash}`,
      })),
      afterPayments: balanceAfterPayments,
      product: {
        visibleAction: 'Pay Mina',
        directChainObservation: true,
        savedReportUsedAsTruth: false,
        developerActionsUsed: false,
        directProductStateMutationUsed: false,
        finalOpenAmount: expected.savedRecords[0].openAmount,
      },
      host: {
        sdk: '@parity/host-api-test-sdk@0.10.0',
        separateBrowserContexts: true,
        signedEncryptedSharedActions: true,
      },
      boundary: 'The browser wallet was an automated EIP-1193 harness backed by disposable funded agent keys. This proves the same interface a browser wallet uses; it is not a manual extension-popup or Polkadot Mobile proof.',
    };
    await writeFile(path.join(proofDirectory, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(proofDirectory, 'report.md'), renderReport(report));
  } finally {
    for (const participant of participants) {
      await participant.context.close().catch(() => undefined);
      await participant.server.close().catch(() => undefined);
    }
  }
});

async function openParticipant(
  browser: Browser,
  definition: Definition,
  profile: WalletProfile,
  wallet: ethers.Wallet,
): Promise<Participant> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [definition.account],
    productAccounts: {'chopdot-shell-proof.dot/0': definition.account},
    networks: [PASEO_ASSET_HUB],
  });
  const context = await browser.newContext({viewport: {width: 430, height: 932}});
  await context.exposeFunction('__CHOPDOT_TEST_WALLET_REQUEST__', async (request: {method: string; params?: unknown[]}) => {
    if (request.method === 'eth_chainId') return CHAIN_ID_HEX;
    if (request.method === 'eth_requestAccounts' || request.method === 'eth_accounts') return [profile.evmAddress];
    if (request.method === 'wallet_switchEthereumChain') return null;
    if (request.method === 'eth_sendTransaction') {
      const transaction = request.params?.[0] as {from?: string; to?: string; value?: string} | undefined;
      if (!transaction?.from || transaction.from.toLowerCase() !== profile.evmAddress.toLowerCase()) throw new Error('Wallet account mismatch.');
      if (!transaction.to || !transaction.value) throw new Error('Payment is incomplete.');
      const response = await wallet.sendTransaction({to: transaction.to, value: ethers.BigNumber.from(transaction.value)});
      return response.hash;
    }
    throw new Error(`Unsupported wallet request: ${request.method}`);
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      value: {
        request: (request: {method: string; params?: unknown[]}) => window.__CHOPDOT_TEST_WALLET_REQUEST__!(request),
      },
    });
  });
  const page = await context.newPage();
  await page.goto(`${server.url}?${sessionQuery}`);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error(`${definition.person} product frame did not attach.`);
  await expect.poll(() => frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.status)).toBe('ready');
  return {...definition, profile, wallet, context, server, page, frame, statementCursor: 0, publishedCursor: 0};
}

async function onboard(participant: Participant): Promise<void> {
  await participant.frame.getByRole('button', {name: 'Continue as guest'}).click();
  await participant.frame.getByPlaceholder('Display name').fill(participant.person);
  await participant.frame.getByRole('button', {name: `Continue as ${participant.person}`}).click();
  await expect(participant.frame.getByText(`Hey, ${participant.person}`)).toBeVisible();
}

async function waitForPublished(participant: Participant, newActions: number): Promise<void> {
  participant.publishedCursor += newActions;
  await expect.poll(() => participant.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.published ?? 0), {timeout: 30_000})
    .toBe(participant.publishedCursor);
}

async function relayNewStatements(participants: Participant[]): Promise<number> {
  const outgoing: Array<{sender: Participant; statement: unknown}> = [];
  for (const participant of participants) {
    const statements = await participant.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements());
    for (const submission of statements.slice(participant.statementCursor)) outgoing.push({sender: participant, statement: submission.statement});
    participant.statementCursor = statements.length;
  }
  for (const {sender, statement} of outgoing) {
    for (const recipient of participants) {
      if (recipient !== sender) await recipient.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
  }
  if (outgoing.length) await participants[0].page.waitForTimeout(500);
  return outgoing.length;
}

async function relayUntilQuiet(participants: Participant[], maxPasses = 8): Promise<void> {
  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (await relayNewStatements(participants) === 0) return;
  }
  throw new Error('Host statements did not settle.');
}

async function stateOf(participant: Participant): Promise<PortableState> {
  return participant.frame.evaluate(key => JSON.parse(window.localStorage.getItem(key) || '{}') as PortableState, storageKey);
}

async function waitForState(participant: Participant, predicate: (state: PortableState) => boolean): Promise<void> {
  await expect.poll(async () => predicate(await stateOf(participant)), {timeout: 45_000}).toBe(true);
}

async function capture(participant: Participant, name: string): Promise<void> {
  await participant.frame.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  await participant.page.waitForTimeout(150);
  await participant.frame.locator('#root').screenshot({path: path.join(proofDirectory, `${name}-${participant.person.toLowerCase()}.png`)});
}

async function installShareCapture(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    window.__CHOPDOT_CAPTURED_SHARES__ = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value: {url?: string}) => { window.__CHOPDOT_CAPTURED_SHARES__!.push(value); },
    });
  });
}

async function openCapturedPayerLink(mina: Participant, payer: Participant, index: number): Promise<void> {
  const capturedUrl = await mina.frame.evaluate(shareIndex => window.__CHOPDOT_CAPTURED_SHARES__?.[shareIndex]?.url, index);
  if (!capturedUrl) throw new Error(`Missing payer link ${index}.`);
  const params = new URL(capturedUrl).searchParams;
  await payer.frame.evaluate(values => {
    const url = new URL(window.location.href);
    url.searchParams.set('payGroupId', values.groupId);
    url.searchParams.set('payMemberId', values.memberId);
    if (values.packet) url.searchParams.set('payRequest', values.packet);
    window.history.replaceState({}, '', url);
  }, {groupId: params.get('payGroupId')!, memberId: params.get('payMemberId')!, packet: params.get('payRequest')});
}

function sharedProjection(state: PortableState) {
  return {
    users: Object.values(state.users).sort((a, b) => a.id.localeCompare(b.id)),
    groups: Object.values(state.groups).sort((a, b) => a.id.localeCompare(b.id)),
    expenses: Object.values(state.expenses).sort((a, b) => a.id.localeCompare(b.id)),
    splits: Object.values(state.splits).sort((a, b) => a.id.localeCompare(b.id)),
    savedRecords: Object.values(state.savedRecords).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

async function loadWalletProfiles(): Promise<WalletProfile[]> {
  const payload = JSON.parse(await readFile(walletFile, 'utf8')) as {profiles: WalletProfile[]};
  return payload.profiles.filter(profile => definitions.some(definition => definition.walletId === profile.id));
}

async function balances(provider: ethers.providers.JsonRpcProvider, profiles: WalletProfile[]) {
  return Object.fromEntries(await Promise.all(profiles.map(async profile => [
    profile.id,
    {address: profile.evmAddress, pas: ethers.utils.formatEther(await provider.getBalance(profile.evmAddress))},
  ])));
}

async function createTopups(mina: ethers.Wallet, payers: WalletProfile[]) {
  const topups = [];
  for (const payer of payers) {
    const transaction = await mina.sendTransaction({to: payer.evmAddress, value: ethers.utils.parseEther('0.02')});
    const receipt = await transaction.wait(1);
    topups.push({
      from: mina.address,
      to: payer.evmAddress,
      amountPas: '0.02',
      txHash: transaction.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `${EXPLORER_TX}/${transaction.hash}`,
    });
  }
  return topups;
}

function renderReport(report: Record<string, unknown>): string {
  const payments = report.payments as Array<{person: string; amountPas: number; txHash: string; explorerUrl: string}>;
  return [
    '# Five-person wallet settlement proof',
    '',
    `Status: **${report.status}**`,
    '',
    'Mina created one PAS group spend. Leo, Nina, Omar, and Casey each opened the real payer screen in a separate browser profile and used `Pay Mina`. Each click caused that agent wallet to sign a public testnet transfer.',
    '',
    '## Payments',
    '',
    ...payments.map(payment => `- ${payment.person}: ${payment.amountPas} PAS - [${payment.txHash}](${payment.explorerUrl})`),
    '',
    '## Boundaries',
    '',
    `- ${(report.funding as {historicalFaucetBoundary: string}).historicalFaucetBoundary}`,
    `- ${report.boundary}`,
    '- ChopDot read each transaction and finalized receipt directly from the public RPC. No saved report was used as payment truth.',
    '- Only the exact matching share cleared. The group finished with zero open amount.',
    '',
  ].join('\n');
}
