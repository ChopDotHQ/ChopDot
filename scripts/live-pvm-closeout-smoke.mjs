import fs from "node:fs";
import path from "node:path";
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

const DEFAULT_RPC_URL = "https://services.polkadothub-rpc.com/testnet";
const DEFAULT_CHAIN_ID = 420420417;
const DEFAULT_CHAIN_NAME = "Polkadot Hub Testnet";
const DEFAULT_AMOUNT = "2500000";

const ABI = [
  "event CloseoutCreated(uint256 indexed closeoutId, bytes32 indexed snapshotHash, address indexed creator, string asset, string metadataHash)",
  "function createCloseout(bytes32 snapshotHash, string asset, string metadataHash, address[] payers, address[] payees, uint256[] amounts) returns (uint256 closeoutId)",
  "function recordSettlementProof(uint256 closeoutId, uint32 legIndex, bytes32 settlementTxHash, bytes32 proofTxHash)",
];

const root = path.resolve(new URL("..", import.meta.url).pathname);
const artifactsDir = path.join(root, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function requireEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function toReport(rows) {
  return [
    "# Live PVM Closeout Smoke",
    "",
    ...rows.map(([key, value]) => `- ${key}: ${value}`),
    "",
  ].join("\n");
}

async function main() {
  const rpcUrl = env("PVM_CLOSEOUT_RPC_URL", env("VITE_PVM_CLOSEOUT_RPC_URL", DEFAULT_RPC_URL));
  const contractAddress = env(
    "PVM_CLOSEOUT_CONTRACT_ADDRESS",
    env("VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS"),
  );
  const privateKey = requireEnv("PVM_CLOSEOUT_PRIVATE_KEY");
  const payee = env("PVM_CLOSEOUT_PAYEE", "0x2222222222222222222222222222222222222222");
  const payer = env("PVM_CLOSEOUT_PAYER");
  const amount = BigInt(env("PVM_CLOSEOUT_AMOUNT_UNITS", DEFAULT_AMOUNT));
  const asset = env("PVM_CLOSEOUT_ASSET", "DOT");
  const chainId = Number(env("PVM_CLOSEOUT_CHAIN_ID", String(DEFAULT_CHAIN_ID)));
  const chainName = env("PVM_CLOSEOUT_CHAIN_NAME", DEFAULT_CHAIN_NAME);

  if (!contractAddress) {
    throw new Error("Missing required env: PVM_CLOSEOUT_CONTRACT_ADDRESS or VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS");
  }

  const provider = new JsonRpcProvider(rpcUrl, { chainId, name: chainName });
  const wallet = new Wallet(privateKey, provider);
  const contract = new Contract(contractAddress, ABI, wallet);
  const code = await provider.getCode(contractAddress);

  if (code === "0x") {
    throw new Error(`No contract code found at ${contractAddress}`);
  }

  const payerAddress = payer || wallet.address;
  const snapshotHash = keccak256(toUtf8Bytes(`smoke:snapshot:${Date.now()}:${payerAddress}:${payee}:${amount}`));
  const metadataHash = keccak256(toUtf8Bytes(`smoke:metadata:${Date.now()}:${asset}`));
  const settlementTxHash = keccak256(toUtf8Bytes(`smoke:settlement:${Date.now()}`));
  const proofTxHash = keccak256(toUtf8Bytes(`smoke:proof:${Date.now()}:${settlementTxHash}`));

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  const createTx = await contract.createCloseout(
    snapshotHash,
    asset,
    metadataHash,
    [payerAddress],
    [payee],
    [amount],
  );
  const createReceipt = await createTx.wait();
  const createLog = createReceipt.logs
    .map((entry) => {
      try {
        return contract.interface.parseLog(entry);
      } catch {
        return null;
      }
    })
    .find((entry) => entry?.name === "CloseoutCreated");

  const closeoutId = createLog?.args?.closeoutId?.toString?.();
  if (!closeoutId) {
    throw new Error("createCloseout succeeded but no CloseoutCreated event was parsed");
  }

  const proofTx = await contract.recordSettlementProof(
    BigInt(closeoutId),
    0,
    settlementTxHash,
    proofTxHash,
  );
  const proofReceipt = await proofTx.wait();

  const rows = [
    ["Generated", new Date().toISOString()],
    ["RPC", rpcUrl],
    ["Network", `${network.name} (${network.chainId})`],
    ["Wallet", wallet.address],
    ["Balance (wei)", balance.toString()],
    ["Contract", contractAddress],
    ["Payer", payerAddress],
    ["Payee", payee],
    ["Amount units", amount.toString()],
    ["createCloseout tx", createTx.hash],
    ["Closeout ID", closeoutId],
    ["recordSettlementProof tx", proofTx.hash],
    ["Settlement tx hash", settlementTxHash],
    ["Proof tx hash", proofTxHash],
    ["Result", `PASS (${createReceipt.status}/${proofReceipt.status})`],
  ];

  const reportPath = path.join(artifactsDir, "LIVE_PVM_CLOSEOUT_SMOKE.md");
  fs.writeFileSync(reportPath, toReport(rows));
  process.stdout.write(`${reportPath}\n`);
}

main().catch((error) => {
  const reportPath = path.join(artifactsDir, "LIVE_PVM_CLOSEOUT_SMOKE.md");
  fs.writeFileSync(
    reportPath,
    toReport([
      ["Generated", new Date().toISOString()],
      ["Result", "FAIL"],
      ["Error", error instanceof Error ? error.message : String(error)],
    ]),
  );
  console.error(error);
  process.exit(1);
});
