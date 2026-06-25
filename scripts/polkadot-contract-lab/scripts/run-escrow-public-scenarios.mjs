import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  ZeroAddress,
  encodeBytes32String,
  formatUnits,
  id,
  parseEther,
  parseUnits,
} from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(labRoot, '../..');
const rpcUrl = process.env.POLKADOT_HUB_RPC_URL ?? 'https://services.polkadothub-rpc.com/testnet';

const publicHardhatKeys = {
  mina: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  leo: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  nina: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  omar: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
};

if (process.env.CHOPDOT_USE_PUBLIC_HARDHAT_TEST_KEYS !== '1') {
  console.error('Set CHOPDOT_USE_PUBLIC_HARDHAT_TEST_KEYS=1 to use public testnet-only Hardhat dev keys.');
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function latestDeployArtifact() {
  const artifactDir = path.join(repoRoot, 'artifacts/polkadot-native');
  const candidates = fs.readdirSync(artifactDir)
    .filter((name) => /^escrow-direct-deploy-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort();
  if (!candidates.length) {
    throw new Error('No escrow direct deploy artifact found.');
  }
  return path.join(artifactDir, candidates[candidates.length - 1]);
}

async function wait(tx, label) {
  const receipt = await tx.wait();
  console.log(`${label}: ${tx.hash} @ block ${receipt?.blockNumber}`);
  return {
    label,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed?.toString(),
  };
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

async function recordTransaction(label, send) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await wait(await send(), label);
    } catch (error) {
      if (attempt === 5 || !isRetryableRpcError(error)) {
        throw error;
      }

      const delayMs = attempt * 5_000;
      console.warn(`${label}: retrying after transient RPC rejection (${attempt}/5)`);
      await sleep(delayMs);
    }
  }
  throw new Error(`Unable to submit ${label}`);
}

async function waitUntilTimestamp(provider, targetTimestamp) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const block = await provider.getBlock('latest');
    if (block && block.timestamp >= targetTimestamp) return block.timestamp;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Timed out waiting for chain timestamp ${targetTimestamp}`);
}

const deployArtifact = readJson(latestDeployArtifact());
const escrowArtifact = readJson(path.join(labRoot, 'artifacts/contracts/ChopDotEscrowVault.sol/ChopDotEscrowVault.json'));
const tokenArtifact = readJson(path.join(labRoot, 'artifacts/contracts/ChopDotMockToken.sol/ChopDotMockToken.json'));
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();

const mina = new Wallet(publicHardhatKeys.mina, provider);
const useFreshRoleWallets = process.env.CHOPDOT_USE_FIXED_ROLE_KEYS !== '1';
const leo = useFreshRoleWallets ? Wallet.createRandom().connect(provider) : new Wallet(publicHardhatKeys.leo, provider);
const nina = useFreshRoleWallets ? Wallet.createRandom().connect(provider) : new Wallet(publicHardhatKeys.nina, provider);
const omar = useFreshRoleWallets ? Wallet.createRandom().connect(provider) : new Wallet(publicHardhatKeys.omar, provider);
const roleKeySource = useFreshRoleWallets
  ? 'fresh ephemeral role wallets funded by Mina for this public testnet run'
  : 'fixed public Hardhat dev role keys enabled by CHOPDOT_USE_FIXED_ROLE_KEYS=1';

const escrow = new Contract(deployArtifact.contracts.escrow.address, escrowArtifact.abi, mina);
const token = new Contract(deployArtifact.contracts.mockUsdc.address, tokenArtifact.abi, mina);
const escrowAddress = await escrow.getAddress();
const tokenAddress = await token.getAddress();
const tokenForLeo = token.connect(leo);
const tokenForNina = token.connect(nina);
const tokenForOmar = token.connect(omar);
const escrowForLeo = escrow.connect(leo);
const escrowForNina = escrow.connect(nina);
const escrowForOmar = escrow.connect(omar);

const txs = [];
async function ensureNativeBalance(name, wallet, minimum = parseEther('0.5'), topUp = parseEther('1')) {
  const balance = await provider.getBalance(wallet.address);
  if (balance >= minimum) {
    return;
  }

  txs.push(await recordTransaction(
    `top up ${name} native PAS`,
    () => mina.sendTransaction({ to: wallet.address, value: topUp }),
  ));
}

const amountLeo = parseUnits('10', 6);
const amountNina = parseUnits('11', 6);
const amountOmar = parseUnits('12', 6);
const savingsAmountLeo = parseUnits('7', 6);
const savingsAmountNina = parseUnits('8', 6);
const savingsAmountOmar = parseUnits('9', 6);
const emergencyAmountLeo = parseUnits('6', 6);
const emergencyAmountNina = parseUnits('6', 6);
const nativePasAmountLeo = parseEther('0.01');
const nativePasAmountNina = parseEther('0.01');
const refundAmount = parseUnits('5', 6);

console.log(`Network chainId: ${network.chainId.toString()}`);
console.log(`Escrow: ${escrowAddress}`);
console.log(`Mock TEST_USDC: ${tokenAddress}`);

await ensureNativeBalance('Leo', leo);
await ensureNativeBalance('Nina', nina);
await ensureNativeBalance('Omar', omar);

txs.push(await recordTransaction('mint Leo TEST_USDC', () => token.mint(leo.address, amountLeo + refundAmount)));
txs.push(await recordTransaction('mint Nina TEST_USDC', () => token.mint(nina.address, amountNina)));
txs.push(await recordTransaction('mint Omar TEST_USDC', () => token.mint(omar.address, amountOmar)));

const releaseCaseId = await escrow.nextCaseId();
txs.push(await recordTransaction(`create release case ${releaseCaseId.toString()}`, () => escrow.createCase(
  encodeBytes32String('shared_expense'),
  tokenAddress,
  1,
  mina.address,
  [leo.address, nina.address, omar.address],
  [encodeBytes32String('leo'), encodeBytes32String('nina'), encodeBytes32String('omar')],
  [amountLeo, amountNina, amountOmar],
  [mina.address],
  id('chopdot-public-testnet-release-rules-v1'),
  0,
)));

txs.push(await recordTransaction('Leo approve release case', () => tokenForLeo.approve(escrowAddress, amountLeo)));
txs.push(await recordTransaction('Nina approve release case', () => tokenForNina.approve(escrowAddress, amountNina)));
txs.push(await recordTransaction('Omar approve release case', () => tokenForOmar.approve(escrowAddress, amountOmar)));
txs.push(await recordTransaction('Leo deposit release case', () => escrowForLeo.deposit(releaseCaseId, encodeBytes32String('leo'), amountLeo)));
txs.push(await recordTransaction('Nina deposit release case', () => escrowForNina.deposit(releaseCaseId, encodeBytes32String('nina'), amountNina)));
txs.push(await recordTransaction('Omar deposit release case', () => escrowForOmar.deposit(releaseCaseId, encodeBytes32String('omar'), amountOmar)));
txs.push(await recordTransaction('Mina approve release case', () => escrow.approveRelease(releaseCaseId)));
txs.push(await recordTransaction('release shared expense case', () => escrow.release(releaseCaseId)));

txs.push(await recordTransaction('mint Leo savings TEST_USDC', () => token.mint(leo.address, savingsAmountLeo)));
txs.push(await recordTransaction('mint Nina savings TEST_USDC', () => token.mint(nina.address, savingsAmountNina)));
txs.push(await recordTransaction('mint Omar savings TEST_USDC', () => token.mint(omar.address, savingsAmountOmar)));

const savingsCaseId = await escrow.nextCaseId();
txs.push(await recordTransaction(`create savings circle case ${savingsCaseId.toString()}`, () => escrow.createCase(
  encodeBytes32String('savings_circle'),
  tokenAddress,
  1,
  leo.address,
  [leo.address, nina.address, omar.address],
  [encodeBytes32String('leo'), encodeBytes32String('nina'), encodeBytes32String('omar')],
  [savingsAmountLeo, savingsAmountNina, savingsAmountOmar],
  [mina.address],
  id('chopdot-public-testnet-savings-circle-rules-v1'),
  0,
)));
txs.push(await recordTransaction('Leo approve savings case', () => tokenForLeo.approve(escrowAddress, savingsAmountLeo)));
txs.push(await recordTransaction('Nina approve savings case', () => tokenForNina.approve(escrowAddress, savingsAmountNina)));
txs.push(await recordTransaction('Omar approve savings case', () => tokenForOmar.approve(escrowAddress, savingsAmountOmar)));
txs.push(await recordTransaction('Leo deposit savings case', () => escrowForLeo.deposit(savingsCaseId, encodeBytes32String('leo'), savingsAmountLeo)));
txs.push(await recordTransaction('Nina deposit savings case', () => escrowForNina.deposit(savingsCaseId, encodeBytes32String('nina'), savingsAmountNina)));
txs.push(await recordTransaction('Omar deposit savings case', () => escrowForOmar.deposit(savingsCaseId, encodeBytes32String('omar'), savingsAmountOmar)));
txs.push(await recordTransaction('Mina approve savings case', () => escrow.approveRelease(savingsCaseId)));
txs.push(await recordTransaction('release savings circle case', () => escrow.release(savingsCaseId)));

txs.push(await recordTransaction('mint Leo emergency TEST_USDC', () => token.mint(leo.address, emergencyAmountLeo)));
txs.push(await recordTransaction('mint Nina emergency TEST_USDC', () => token.mint(nina.address, emergencyAmountNina)));

const emergencyCaseId = await escrow.nextCaseId();
txs.push(await recordTransaction(`create emergency pot case ${emergencyCaseId.toString()}`, () => escrow.createCase(
  encodeBytes32String('emergency_pot'),
  tokenAddress,
  2,
  omar.address,
  [leo.address, nina.address],
  [encodeBytes32String('leo'), encodeBytes32String('nina')],
  [emergencyAmountLeo, emergencyAmountNina],
  [mina.address, omar.address],
  id('chopdot-public-testnet-emergency-pot-rules-v1'),
  0,
)));
txs.push(await recordTransaction('Leo approve emergency case', () => tokenForLeo.approve(escrowAddress, emergencyAmountLeo)));
txs.push(await recordTransaction('Nina approve emergency case', () => tokenForNina.approve(escrowAddress, emergencyAmountNina)));
txs.push(await recordTransaction('Leo deposit emergency case', () => escrowForLeo.deposit(emergencyCaseId, encodeBytes32String('leo'), emergencyAmountLeo)));
txs.push(await recordTransaction('Nina deposit emergency case', () => escrowForNina.deposit(emergencyCaseId, encodeBytes32String('nina'), emergencyAmountNina)));
txs.push(await recordTransaction('Mina approve emergency case', () => escrow.approveRelease(emergencyCaseId)));
txs.push(await recordTransaction('Omar approve emergency case', () => escrowForOmar.approveRelease(emergencyCaseId)));
txs.push(await recordTransaction('release emergency pot case', () => escrow.release(emergencyCaseId)));

const nativePasCaseId = await escrow.nextCaseId();
txs.push(await recordTransaction(`create native PAS case ${nativePasCaseId.toString()}`, () => escrow.createCase(
  encodeBytes32String('shared_expense'),
  ZeroAddress,
  1,
  mina.address,
  [leo.address, nina.address],
  [encodeBytes32String('leo'), encodeBytes32String('nina')],
  [nativePasAmountLeo, nativePasAmountNina],
  [mina.address],
  id('chopdot-public-testnet-native-pas-rules-v1'),
  0,
)));
txs.push(await recordTransaction('Leo deposit native PAS case', () => escrowForLeo.deposit(nativePasCaseId, encodeBytes32String('leo'), nativePasAmountLeo, { value: nativePasAmountLeo })));
txs.push(await recordTransaction('Nina deposit native PAS case', () => escrowForNina.deposit(nativePasCaseId, encodeBytes32String('nina'), nativePasAmountNina, { value: nativePasAmountNina })));
txs.push(await recordTransaction('Mina approve native PAS case', () => escrow.approveRelease(nativePasCaseId)));
txs.push(await recordTransaction('release native PAS case', () => escrow.release(nativePasCaseId)));

const latestBlock = await provider.getBlock('latest');
const refundDeadline = BigInt((latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)) + 8);
const refundCaseId = await escrow.nextCaseId();
txs.push(await recordTransaction(`create refund case ${refundCaseId.toString()}`, () => escrow.createCase(
  encodeBytes32String('community_fund'),
  tokenAddress,
  1,
  mina.address,
  [leo.address],
  [encodeBytes32String('leo')],
  [refundAmount],
  [mina.address],
  id('chopdot-public-testnet-refund-rules-v1'),
  refundDeadline,
)));
txs.push(await recordTransaction('Leo approve refund case', () => tokenForLeo.approve(escrowAddress, refundAmount)));
txs.push(await recordTransaction('Leo deposit refund case', () => escrowForLeo.deposit(refundCaseId, encodeBytes32String('leo'), refundAmount)));
await waitUntilTimestamp(provider, Number(refundDeadline));
txs.push(await recordTransaction('Leo refund expired case', () => escrowForLeo.refund(refundCaseId)));

const releaseCase = await escrow.getCase(releaseCaseId);
const savingsCase = await escrow.getCase(savingsCaseId);
const emergencyCase = await escrow.getCase(emergencyCaseId);
const nativePasCase = await escrow.getCase(nativePasCaseId);
const refundCase = await escrow.getCase(refundCaseId);
const balances = {
  mockUsdc: {
    mina: formatUnits(await token.balanceOf(mina.address), 6),
    leo: formatUnits(await token.balanceOf(leo.address), 6),
    nina: formatUnits(await token.balanceOf(nina.address), 6),
    omar: formatUnits(await token.balanceOf(omar.address), 6),
    escrow: formatUnits(await token.balanceOf(escrowAddress), 6),
  },
  nativePas: {
    mina: formatUnits(await provider.getBalance(mina.address), 18),
    leo: formatUnits(await provider.getBalance(leo.address), 18),
    nina: formatUnits(await provider.getBalance(nina.address), 18),
    omar: formatUnits(await provider.getBalance(omar.address), 18),
    escrow: formatUnits(await provider.getBalance(escrowAddress), 18),
  },
};

const artifact = {
  generatedAt: new Date().toISOString(),
  network: {
    name: 'polkadotHubTestnet',
    rpcUrl,
    chainId: network.chainId.toString(),
  },
  contracts: {
    escrow: escrowAddress,
    mockUsdc: tokenAddress,
  },
  participants: {
    mina: mina.address,
    leo: leo.address,
    nina: nina.address,
    omar: omar.address,
  },
  cases: {
    release: {
      caseId: releaseCaseId.toString(),
      mode: 'shared_expense',
      state: releaseCase.state.toString(),
      totalRequired: releaseCase.totalRequired.toString(),
      totalDeposited: releaseCase.totalDeposited.toString(),
      approvalCount: releaseCase.approvalCount.toString(),
    },
    savingsCircle: {
      caseId: savingsCaseId.toString(),
      mode: 'savings_circle',
      state: savingsCase.state.toString(),
      totalRequired: savingsCase.totalRequired.toString(),
      totalDeposited: savingsCase.totalDeposited.toString(),
      approvalCount: savingsCase.approvalCount.toString(),
    },
    emergencyPot: {
      caseId: emergencyCaseId.toString(),
      mode: 'emergency_pot',
      state: emergencyCase.state.toString(),
      totalRequired: emergencyCase.totalRequired.toString(),
      totalDeposited: emergencyCase.totalDeposited.toString(),
      approvalCount: emergencyCase.approvalCount.toString(),
    },
    nativePas: {
      caseId: nativePasCaseId.toString(),
      mode: 'shared_expense',
      asset: 'native PAS',
      state: nativePasCase.state.toString(),
      totalRequired: nativePasCase.totalRequired.toString(),
      totalDeposited: nativePasCase.totalDeposited.toString(),
      approvalCount: nativePasCase.approvalCount.toString(),
    },
    refund: {
      caseId: refundCaseId.toString(),
      mode: 'community_fund',
      state: refundCase.state.toString(),
      totalRequired: refundCase.totalRequired.toString(),
      totalDeposited: refundCase.totalDeposited.toString(),
      approvalCount: refundCase.approvalCount.toString(),
      deadline: refundDeadline.toString(),
    },
  },
  balances,
  transactions: txs,
  safety: {
    keySource: `Mina uses the public Hardhat deployer key; Leo/Nina/Omar use ${roleKeySource}.`,
    productionReady: false,
    note: 'Public testnet scenario only. The public dev keys and mock token have no production custody value.',
  },
};

const outputDir = path.join(repoRoot, 'artifacts/polkadot-native');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `escrow-public-scenarios-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Artifact: ${outputPath}`);
