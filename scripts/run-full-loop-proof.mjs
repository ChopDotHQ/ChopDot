// Full loop, real UI, real chain.
//
// Mina creates a group, connects a wallet, adds a spend and requests from Leo.
// Leo joins from an invite link on a clean device, connects his own wallet, and
// pays on Polkadot Hub testnet (chain 420420417). His split must end
// `confirmed` — the only path in ChopDot allowed to confirm without the
// receiver acting, and only on an exact payer/receiver/amount match.
//
//   npx vite --host 127.0.0.1 --port 5202 &
//   npm run proof:full-loop
//
// Each browser context gets an injected EIP-1193 provider backed by that
// agent's key from the gitignored .local-private trial store. Keys are never
// printed. Disposable public-testnet PAS only.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Wallet, providers, utils } = require('ethers');

const here = path.dirname(fileURLToPath(import.meta.url));
const mainRepo = path.resolve(here, '../../..');
const SESSION = process.env.AGENT_TRIAL_SESSION || 'agent-wallet-trial-2026-06-22';
const RPC = process.env.POLKADOT_HUB_RPC_URL || 'https://services.polkadothub-rpc.com/testnet';
const BASE = process.env.PROOF_URL || 'http://127.0.0.1:5202/';
const OUT = process.env.PROOF_OUT || path.join(here, '..', 'proof', 'full-loop');
const CHAIN_HEX = '0x190f1b41';

const store = JSON.parse(readFileSync(
  path.join(mainRepo, '.local-private/agent-wallet-trials', SESSION, 'wallets.private.json'), 'utf8'));
const profiles = store.profiles ?? store.wallets ?? [];
const pick = (id) => {
  const p = profiles.find((x) => x.id === id);
  if (!p) throw new Error(`no agent profile for "${id}"`);
  return p;
};

const mina = pick('mina');
const leo = pick('leo');
const TOTAL = '1.845';   // PAS, split three ways
const SHARE = '0.615';   // what Leo owes

const chain = new providers.JsonRpcProvider(RPC);
const log = [];
const say = (m) => { console.log(m); log.push(m); };

const browser = await chromium.launch();

async function device(agent) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const signer = new Wallet(agent.privateKey, chain);

  // Node-side signer, reachable from the page. The page never sees the key.
  await ctx.exposeFunction('__agentWalletRpc', async (method, params) => {
    if (method === 'eth_chainId') return CHAIN_HEX;
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [agent.evmAddress];
    if (method === 'wallet_switchEthereumChain') return null;
    if (method === 'eth_sendTransaction') {
      const [t] = params;
      const tx = await signer.sendTransaction({ to: t.to, value: t.value });
      say(`   ${agent.name} broadcast ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    }
    throw new Error(`unsupported wallet method ${method}`);
  });

  await ctx.addInitScript(() => {
    window.ethereum = { request: ({ method, params }) => window.__agentWalletRpc(method, params ?? []) };
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${agent.name}: ${e.message.slice(0, 160)}`));
  return { agent, ctx, page, errors };
}

const text = async (p) => (await p.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 320);
const shot = async (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });
const stateOf = (p) => p.evaluate(() => {
  const raw = window.localStorage.getItem('chopdot-portable-shell-state-v1');
  return raw ? JSON.parse(raw) : null;
});

mkdirSync(OUT, { recursive: true });

async function guestSetup(d, name) {
  await d.page.goto(BASE, { waitUntil: 'networkidle' });
  await d.page.getByText('Continue as guest').click();
  await d.page.waitForTimeout(500);
  await d.page.locator('input').first().fill(name);
  await d.page.locator('button:visible').last().click();
  await d.page.waitForTimeout(800);
}

async function goTab(d, label) {
  await d.page.getByText(label, { exact: true }).last().click();
  await d.page.waitForTimeout(700);
}

async function connectWallet(d) {
  // Pay tab -> connect. This also switches the app currency to PAS.
  await goTab(d, 'Pay');
  await d.page.waitForTimeout(700);
  const connect = d.page.getByRole('button', { name: /connect/i }).first();
  if (await connect.count()) {
    await connect.click();
    await d.page.waitForTimeout(2500);
  }
  say(`   ${d.agent.name} pay tab: ${await text(d.page)}`);
}

// ---------------- Mina ----------------
say('\n1. Mina sets up and connects a wallet');
const A = await device(mina);
await guestSetup(A, 'Mina');
await connectWallet(A);
await shot(A.page, '01-mina-wallet');

const aState1 = await stateOf(A.page);
say(`   currency=${aState1?.currency}  wallet=${Object.values(aState1?.users ?? {})[0]?.walletAddress ?? 'none'}`);

say('\n2. Mina creates the group and adds a spend');
await goTab(A, 'Home');
await A.page.getByText(/Start with a group|New/).first().click();
await A.page.waitForTimeout(600);
await A.page.locator('input').first().fill('Friday Crew');
for (const f of ['Leo', 'Nina']) {
  const field = A.page.locator('input').nth(1);
  await field.fill(f);
  await field.press('Enter');
  await A.page.waitForTimeout(200);
}
await A.page.locator('button:visible').last().click();
await A.page.waitForTimeout(900);

await A.page.getByText('Add spend').first().click();
await A.page.waitForTimeout(600);
await A.page.locator('#capture-amount').fill(TOTAL);
await A.page.locator('#capture-title').fill('Dinner at La Cabrera');
for (let i = 0; i < 4; i++) {
  const b = A.page.locator('button:visible').last();
  if (await b.isEnabled().catch(() => false)) { await b.click(); await A.page.waitForTimeout(700); }
  if ((await A.page.getByText('Total spend').count()) > 0) break;
}
say(`   ${await text(A.page)}`);
await shot(A.page, '02-mina-group');

say('\n3. Mina sends Leo a payment request');
await A.page.getByText('Settle up').first().click();
await A.page.waitForTimeout(900);
const sendLink = A.page.getByRole('button', { name: /Send (updated )?link to Leo/i }).first();
await sendLink.click();
await A.page.waitForTimeout(1200);
say(`   ${await text(A.page)}`);
await shot(A.page, '02b-mina-requested');

say('\n4. Mina shares the invite');
const inviteUrl = await A.page.evaluate(async () => {
  const mod = await import('/src/requestLinks.ts');
  const s = JSON.parse(window.localStorage.getItem('chopdot-portable-shell-state-v1'));
  const group = Object.values(s.groups)[0];
  const r = mod.buildGroupInviteUrl(
    { group, users: s.users, expenses: s.expenses, splits: s.splits, currency: s.currency },
    s.currentUserId);
  return r.ok ? r.url : null;
});
if (!inviteUrl) { say('   FAILED to build invite'); await browser.close(); process.exit(1); }
say(`   invite ${inviteUrl.length} chars`);

// ---------------- Leo ----------------
say('\n5. Leo joins from the invite on a clean device');
const B = await device(leo);
await B.page.goto(inviteUrl, { waitUntil: 'networkidle' });
await B.page.waitForTimeout(600);
if (await B.page.getByText('Continue as guest').count()) {
  await B.page.getByText('Continue as guest').click();
  await B.page.waitForTimeout(500);
  await B.page.locator('input').first().fill('Leo');
  await B.page.locator('button:visible').last().click();
  await B.page.waitForTimeout(1400);
}
say(`   ${await text(B.page)}`);
await shot(B.page, '03-leo-joined');

say('\n6. Leo connects his own wallet');
// Leo lands on group detail, which has no bottom nav — step back first.
const back = B.page.getByRole('button', { name: /back/i }).first();
if (await back.count()) { await back.click(); await B.page.waitForTimeout(700); }
await connectWallet(B);
await shot(B.page, '04-leo-wallet');

say('\n7. Leo opens the request and pays on chain');
const before = utils.formatEther(await chain.getBalance(mina.evmAddress));
// Reach the group, then settle up -> pay with wallet.
// PayerView is reached from a payment request link, not from group detail.
const payerUrl = await B.page.evaluate(async () => {
  const mod = await import('/src/requestLinks.ts');
  const s = JSON.parse(window.localStorage.getItem('chopdot-portable-shell-state-v1'));
  const group = Object.values(s.groups)[0];
  return mod.buildPayerRequestUrl(group.id, s.currentUserId);
});
await B.page.goto(payerUrl, { waitUntil: 'networkidle' });
await B.page.waitForTimeout(1200);
say(`   ${await text(B.page)}`);
await shot(B.page, '05-leo-settle');

// The wallet action is labelled "Pay <requester>"; the manual fallback is
// "I paid <requester>". Only the first is the on-chain path.
const walletBtn = B.page.getByRole('button', { name: /^Pay Mina/ }).first();
if (!(await walletBtn.count())) {
  say('   no wallet payment button — PayerView fell back to manual');
} else {
  await walletBtn.click();
  // broadcast -> inclusion -> verifier poll
  for (let i = 0; i < 24; i++) {
    await B.page.waitForTimeout(2500);
    const st = await stateOf(B.page);
    const sp = Object.values(st?.splits ?? {}).find((x) => st.users[x.userId]?.name === 'Leo');
    if (sp?.status === 'confirmed') break;
  }
}
say(`   ${await text(B.page)}`);
await shot(B.page, '06-leo-paid');

const after = utils.formatEther(await chain.getBalance(mina.evmAddress));
const bState = await stateOf(B.page);
const splits = Object.values(bState?.splits ?? {});
const leoSplit = splits.find((s) => bState.users[s.userId]?.name === 'Leo');

say(`\n   Mina balance ${before} -> ${after}`);
say(`   Leo's split status: ${leoSplit?.status ?? 'not found'}`);
say(`   walletPayment tx: ${leoSplit?.walletPayment?.txHash ?? 'none'}`);

const confirmedByChain = leoSplit?.status === 'confirmed' && Boolean(leoSplit?.walletPayment?.txHash);
say(`\nRESULT: ${confirmedByChain
  ? 'PASS — an on-chain payment confirmed the split, no receiver action'
  : 'INCOMPLETE — see screenshots'}`);

const errors = [...A.errors, ...B.errors];
if (errors.length) say(`\nerrors:\n${errors.join('\n')}`);

writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  network: { rpcUrl: RPC, chainId: 420420417 },
  participants: { mina: mina.evmAddress, leo: leo.evmAddress },
  amounts: { total: TOTAL, leoShare: SHARE },
  inviteLength: inviteUrl.length,
  minaBalance: { before, after },
  leoSplit: leoSplit ?? null,
  confirmedByChain,
  errors,
  transcript: log,
}, null, 2)}\n`);
say(`report → ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}`);

await browser.close();
process.exit(confirmedByChain ? 0 : 1);
