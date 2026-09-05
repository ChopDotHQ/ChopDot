// Real-money-shaped proof: an agent wallet pays another on Polkadot Hub testnet
// (chain 420420417), and the portable shell's own verifier decides whether that
// transfer may confirm a split.
//
// This exercises the invariant that matters: only an exact match on payer,
// receiver and amount may self-confirm. Everything else must stay `claimed`.
//
//   node scripts/run-agent-settlement-proof.mjs
//
// Keys come from the gitignored .local-private agent trial store and are never
// printed. Disposable public-testnet PAS only — no custody, no production funds.
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
const OUT = process.env.PROOF_OUT || path.join(here, '..', 'proof', 'agent-settlement');

const walletsPath = path.join(mainRepo, '.local-private/agent-wallet-trials', SESSION, 'wallets.private.json');
const store = JSON.parse(readFileSync(walletsPath, 'utf8'));
const profiles = store.profiles ?? store.wallets ?? [];

const pick = (id) => {
  const p = profiles.find((x) => x.id === id);
  if (!p) throw new Error(`no agent profile for "${id}"`);
  return p;
};

const payer = pick(process.env.PAYER_ID || 'leo');
const receiver = pick(process.env.RECEIVER_ID || 'mina');
const amountPas = process.env.AMOUNT_PAS || '0.615';

const provider = new providers.JsonRpcProvider(RPC);
const net = await provider.getNetwork();
console.log(`network        chainId ${net.chainId}`);
console.log(`payer          ${payer.name} ${payer.evmAddress}`);
console.log(`receiver       ${receiver.name} ${receiver.evmAddress}`);
console.log(`amount         ${amountPas} PAS\n`);

const before = {
  payer: utils.formatEther(await provider.getBalance(payer.evmAddress)),
  receiver: utils.formatEther(await provider.getBalance(receiver.evmAddress)),
};
console.log(`balances before  payer ${before.payer}  receiver ${before.receiver}`);

const signer = new Wallet(payer.privateKey, provider);
const tx = await signer.sendTransaction({
  to: receiver.evmAddress,
  value: utils.parseEther(amountPas),
});
console.log(`\nsubmitted      ${tx.hash}`);
const receipt = await tx.wait();
console.log(`included       block ${receipt.blockNumber}  status ${receipt.status}`);

const after = {
  payer: utils.formatEther(await provider.getBalance(payer.evmAddress)),
  receiver: utils.formatEther(await provider.getBalance(receiver.evmAddress)),
};
console.log(`balances after   payer ${after.payer}  receiver ${after.receiver}`);

// ---- now ask the shell's own verifier -----------------------------------------
const { verifyMatchingPasPayment } = await import('../src/payments/pasWallet.ts');

// The verifier rejects by throwing, so a rejection is a caught error.
const attempt = async (label, args) => {
  try {
    const r = await verifyMatchingPasPayment({ rpcUrl: RPC, ...args });
    return { label, confirmed: Boolean(r), reason: null };
  } catch (e) {
    return { label, confirmed: false, reason: e.message };
  }
};

const exact = await attempt('exact match', {
  txHash: tx.hash, from: payer.evmAddress, to: receiver.evmAddress, amount: Number(amountPas),
});
const wrongAmount = await attempt('wrong amount', {
  txHash: tx.hash, from: payer.evmAddress, to: receiver.evmAddress, amount: Number(amountPas) + 1,
});
const wrongReceiver = await attempt('wrong receiver', {
  txHash: tx.hash, from: payer.evmAddress, to: pick('nina').evmAddress, amount: Number(amountPas),
});
const wrongPayer = await attempt('wrong payer', {
  txHash: tx.hash, from: pick('nina').evmAddress, to: receiver.evmAddress, amount: Number(amountPas),
});

console.log('');
for (const r of [exact, wrongAmount, wrongReceiver, wrongPayer]) {
  const verdict = r.confirmed ? 'CONFIRMS' : `rejected — ${r.reason}`;
  console.log(`${r.label.padEnd(16)} ${verdict}`);
}

const invariantHeld = exact.confirmed && !wrongAmount.confirmed
  && !wrongReceiver.confirmed && !wrongPayer.confirmed;
console.log(`\nRESULT: ${invariantHeld ? 'PASS — only the exact match confirms' : 'FAIL'}`);

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  network: { rpcUrl: RPC, chainId: net.chainId },
  payer: { id: payer.id, name: payer.name, address: payer.evmAddress },
  receiver: { id: receiver.id, name: receiver.name, address: receiver.evmAddress },
  amountPas,
  txHash: tx.hash,
  blockNumber: receipt.blockNumber,
  balances: { before, after },
  verifier: {
    exactMatchConfirms: exact.confirmed,
    wrongAmountRejected: !wrongAmount.confirmed,
    wrongReceiverRejected: !wrongReceiver.confirmed,
    wrongPayerRejected: !wrongPayer.confirmed,
  },
  invariantHeld,
}, null, 2)}\n`);
console.log(`report → ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}`);
process.exit(invariantHeld ? 0 : 1);
