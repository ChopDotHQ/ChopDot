import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet, formatEther } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(labRoot, '../..');
const rpcUrl = process.env.POLKADOT_HUB_RPC_URL ?? 'https://services.polkadothub-rpc.com/testnet';
const privateKey = process.env.POLKADOT_HUB_TESTNET_PRIVATE_KEY;

if (!privateKey) {
  console.error('Missing POLKADOT_HUB_TESTNET_PRIVATE_KEY. Use a disposable funded testnet key only.');
  process.exit(1);
}

function readArtifact(relativePath) {
  const artifact = JSON.parse(fs.readFileSync(path.join(labRoot, relativePath), 'utf8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.startsWith('0x') ? artifact.bytecode : `0x${artifact.bytecode}`,
  };
}

async function deployContract(wallet, name, artifactPath, args = []) {
  const artifact = readArtifact(artifactPath);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(...args);
  const tx = contract.deploymentTransaction();
  const receipt = await contract.waitForDeployment().then(() => tx?.wait());
  const address = await contract.getAddress();
  return {
    name,
    address,
    txHash: tx?.hash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed?.toString(),
  };
}

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`, provider);
const network = await provider.getNetwork();
const startingBalance = await provider.getBalance(wallet.address);

console.log(`Network chainId: ${network.chainId.toString()}`);
console.log(`Deployer: ${wallet.address}`);
console.log(`Starting balance: ${formatEther(startingBalance)}`);

const escrow = await deployContract(
  wallet,
  'ChopDotEscrowVault',
  'artifacts/contracts/ChopDotEscrowVault.sol/ChopDotEscrowVault.json',
);
console.log(`Escrow: ${escrow.address} (${escrow.txHash})`);

const mockUsdc = await deployContract(
  wallet,
  'ChopDotMockToken',
  'artifacts/contracts/ChopDotMockToken.sol/ChopDotMockToken.json',
  ['ChopDot TEST USDC', 'TEST_USDC', 6],
);
console.log(`Mock TEST_USDC: ${mockUsdc.address} (${mockUsdc.txHash})`);

const endingBalance = await provider.getBalance(wallet.address);
const artifact = {
  generatedAt: new Date().toISOString(),
  network: {
    name: 'polkadotHubTestnet',
    rpcUrl,
    chainId: network.chainId.toString(),
  },
  deployer: {
    address: wallet.address,
    startingBalance: formatEther(startingBalance),
    endingBalance: formatEther(endingBalance),
  },
  contracts: {
    escrow,
    mockUsdc,
  },
  safety: {
    keySource: 'POLKADOT_HUB_TESTNET_PRIVATE_KEY env var',
    productionReady: false,
    note: 'Public testnet lab deployment only. Do not use this as production custody infrastructure.',
  },
};

const outputDir = path.join(repoRoot, 'artifacts/polkadot-native');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `escrow-direct-deploy-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Artifact: ${outputPath}`);
