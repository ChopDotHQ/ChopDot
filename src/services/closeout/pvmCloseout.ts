import type { Pot } from "../../schema/pot";
import type {
  CloseoutAsset,
  CloseoutLeg,
  CloseoutRecord,
} from "../../types/app";
import { stableStringify } from "../../utils/stableStringify";
import { computeBalances, suggestSettlements } from "../settlement/calc";

type CreateCloseoutDraftArgs = {
  pot: Pot;
  createdByMemberId: string;
};

type AnchorCloseoutResult = Pick<
  CloseoutRecord,
  "closeoutId" | "contractAddress" | "contractTxHash" | "metadataHash" | "status"
>;

type RecordSettlementProofArgs = {
  closeoutId: string;
  legIndex: number;
  settlementTxHash: string;
};

type RecordSettlementProofResult = {
  proofTxHash: string;
  proofStatus: "completed";
  proofContract: string;
};

export type CloseoutReadinessItem = {
  id:
    | "feature_flag"
    | "supported_asset"
    | "contract_address"
    | "settlement_legs"
    | "member_evm_addresses"
    | "wallet_provider"
    | "wallet_network";
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

type SimulatedReceipt = {
  hash: string;
  wait: () => Promise<{
    logs: Array<{
      simulatedEvent?: "CloseoutCreated" | "SettlementProofRecorded";
      args: Record<string, unknown>;
    }>;
  }>;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const FALLBACK_CONTRACT_ADDRESS = "0x00000000000000000000000000000000C10Se017";
const DEFAULT_CHAIN_ID = 420420417;
const DEFAULT_CHAIN_NAME = "Polkadot Hub Testnet";
const DEFAULT_RPC_URL = "https://services.polkadothub-rpc.com/testnet";
const DEFAULT_BLOCK_EXPLORER_URL = "https://blockscout-passet-hub.parity-testnet.parity.io/";

const CLOSEOUT_REGISTRY_ABI = [
  "event CloseoutCreated(uint256 indexed closeoutId, bytes32 indexed snapshotHash, address indexed creator, string asset, string metadataHash)",
  "event SettlementProofRecorded(uint256 indexed closeoutId, uint32 indexed legIndex, bytes32 settlementTxHash, bytes32 proofTxHash, uint8 status)",
  "function createCloseout(bytes32 snapshotHash, string asset, string metadataHash, address[] payers, address[] payees, uint256[] amounts) returns (uint256 closeoutId)",
  "function recordSettlementProof(uint256 closeoutId, uint32 legIndex, bytes32 settlementTxHash, bytes32 proofTxHash)",
] as const;

const randomId = (prefix: string) => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

function shouldSimulatePvmCloseout(): boolean {
  return import.meta.env.VITE_SIMULATE_PVM_CLOSEOUT === "1";
}

const toHex = (input: Uint8Array) =>
  Array.from(input)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return `0x${toHex(new Uint8Array(digest))}`;
  }

  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, "0").slice(0, 64)}`;
}

function getCloseoutAsset(baseCurrency: string): CloseoutAsset | null {
  if (baseCurrency === "DOT" || baseCurrency === "USDC") {
    return baseCurrency;
  }
  return null;
}

function normalizeCloseoutMemberAddress(address?: string | null): string {
  return (address || "").trim() || "unassigned";
}

function getContractAddress(): string {
  return (
    (import.meta.env.VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS as string | undefined)?.trim() ||
    FALLBACK_CONTRACT_ADDRESS
  );
}

function getChainId(): number {
  const raw = (import.meta.env.VITE_PVM_CLOSEOUT_CHAIN_ID as string | undefined)?.trim();
  if (!raw) return DEFAULT_CHAIN_ID;
  const parsed = raw.startsWith("0x") ? parseInt(raw, 16) : parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_CHAIN_ID;
}

function getChainHexId(): string {
  return `0x${getChainId().toString(16)}`;
}

function getChainName(): string {
  return (
    (import.meta.env.VITE_PVM_CLOSEOUT_CHAIN_NAME as string | undefined)?.trim() ||
    DEFAULT_CHAIN_NAME
  );
}

function getRpcUrl(): string {
  return (
    (import.meta.env.VITE_PVM_CLOSEOUT_RPC_URL as string | undefined)?.trim() ||
    DEFAULT_RPC_URL
  );
}

function getBlockExplorerUrl(): string {
  return (
    (import.meta.env.VITE_PVM_CLOSEOUT_BLOCK_EXPLORER_URL as string | undefined)?.trim() ||
    DEFAULT_BLOCK_EXPLORER_URL
  );
}

function getCloseoutExplorerBaseUrl(): string {
  return (
    (import.meta.env.VITE_PVM_CLOSEOUT_EXPLORER_BASE_URL as string | undefined)?.trim() ||
    `${getBlockExplorerUrl().replace(/\/$/, "")}/tx/`
  );
}

function getInjectedEthereum(): Eip1193Provider {
  const provider =
    typeof window !== "undefined"
      ? (window.ethereum as Eip1193Provider | undefined)
      : undefined;
  if (!provider) {
    throw new Error("MetaMask or another EVM wallet is required for onchain closeout.");
  }
  return provider;
}

async function getCurrentEthereumChainId(provider: Eip1193Provider): Promise<string | null> {
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return typeof chainId === "string" ? chainId : null;
  } catch {
    return null;
  }
}

function createSimulatedReceipt(
  hash: string,
  event: "CloseoutCreated" | "SettlementProofRecorded",
  args: Record<string, unknown>,
): SimulatedReceipt {
  return {
    hash,
    wait: async () => ({
      logs: [{ simulatedEvent: event, args }],
    }),
  };
}

async function getCloseoutContract() {
  if (shouldSimulatePvmCloseout()) {
    return {
      contract: {
        interface: {
          parseLog(entry: { simulatedEvent?: string; args: Record<string, unknown> }) {
            if (!entry.simulatedEvent) {
              throw new Error("Unknown simulated log");
            }
            return {
              name: entry.simulatedEvent,
              args: entry.args,
            };
          },
        },
        async createCloseout() {
          const closeoutId = BigInt(Date.now());
          return createSimulatedReceipt(
            `0xsimcloseout${Date.now().toString(16).padStart(52, "0")}`,
            "CloseoutCreated",
            { closeoutId },
          );
        },
        async recordSettlementProof(closeoutId: bigint, legIndex: number, settlementTxHash: string, proofTxHash: string) {
          return createSimulatedReceipt(
            `0xsimproof${Date.now().toString(16).padStart(55, "0")}`,
            "SettlementProofRecorded",
            { closeoutId, legIndex, settlementTxHash, proofTxHash },
          );
        },
      },
    };
  }

  const provider = getInjectedEthereum();
  await provider.request({ method: "eth_requestAccounts" });

  const { BrowserProvider, Contract } = await import("ethers");
  const browserProvider = new BrowserProvider(provider as any);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: getChainHexId() }],
    });
  } catch (switchError: any) {
    const code = switchError?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: getChainHexId(),
            chainName: getChainName(),
            nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
            rpcUrls: [getRpcUrl()],
            blockExplorerUrls: [getBlockExplorerUrl()],
          },
        ],
      });
    } else if (code !== 4001) {
      throw switchError;
    } else {
      throw new Error("Wallet network switch was rejected.");
    }
  }

  const signer = await browserProvider.getSigner();
  const contract: any = new Contract(getContractAddress(), CLOSEOUT_REGISTRY_ABI, signer);
  return { contract };
}

function toEvmAddress(value: string): string {
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return value;
  }
  throw new Error(`Closeout participants need EVM addresses for contract writes: ${value}`);
}

function toBytes32Hash(value: string): string {
  if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
    return value;
  }
  throw new Error(`Expected bytes32 hash, received: ${value}`);
}

export function isPvmCloseoutEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_PVM_CLOSEOUT === "1";
}

export function getPvmCloseoutExplorerBaseUrl(): string {
  return getCloseoutExplorerBaseUrl();
}

export function canCreatePvmCloseout(pot: Pot): boolean {
  const asset = getCloseoutAsset(pot.baseCurrency);
  if (!asset || pot.type !== "expense") {
    return false;
  }

  const suggestions = suggestSettlements(computeBalances(pot));
  if (suggestions.length === 0) {
    return false;
  }

  return suggestions.every((suggestion) => {
    const fromMember = pot.members.find((member) => member.id === suggestion.from);
    const toMember = pot.members.find((member) => member.id === suggestion.to);
    return Boolean(fromMember?.evmAddress && toMember?.evmAddress);
  });
}

export async function getCloseoutReadiness(pot: Pot): Promise<CloseoutReadinessItem[]> {
  const asset = getCloseoutAsset(pot.baseCurrency);
  const suggestions = asset ? suggestSettlements(computeBalances(pot)) : [];
  const missingMemberIds = suggestions.flatMap((suggestion) => {
    const missing: string[] = [];
    const fromMember = pot.members.find((member) => member.id === suggestion.from);
    const toMember = pot.members.find((member) => member.id === suggestion.to);
    if (!fromMember?.evmAddress) missing.push(suggestion.from);
    if (!toMember?.evmAddress) missing.push(suggestion.to);
    return missing;
  });

  const items: CloseoutReadinessItem[] = [
    {
      id: "feature_flag",
      label: "PVM closeout feature flag",
      status: isPvmCloseoutEnabled() ? "pass" : "fail",
      detail: isPvmCloseoutEnabled()
        ? "Enabled"
        : "Set VITE_ENABLE_PVM_CLOSEOUT=1 before the demo.",
    },
    {
      id: "supported_asset",
      label: "Supported asset",
      status: asset ? "pass" : "fail",
      detail: asset
        ? `${asset} closeout supported`
        : "Only DOT and USDC pots can be anchored onchain.",
    },
    {
      id: "contract_address",
      label: "Contract address configured",
      status: import.meta.env.VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS ? "pass" : "warn",
      detail: import.meta.env.VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS
        ? getContractAddress()
        : "Using fallback placeholder. Set VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS to the deployed registry.",
    },
    {
      id: "settlement_legs",
      label: "Settlement legs available",
      status: suggestions.length > 0 ? "pass" : "fail",
      detail: suggestions.length > 0
        ? `${suggestions.length} leg${suggestions.length === 1 ? "" : "s"} ready`
        : "No non-zero settlement legs were found for this pot.",
    },
    {
      id: "member_evm_addresses",
      label: "Member EVM addresses",
      status: missingMemberIds.length === 0 ? "pass" : "fail",
      detail:
        missingMemberIds.length === 0
          ? "Every settlement participant has a 0x address."
          : `Missing EVM address for member id${missingMemberIds.length === 1 ? "" : "s"}: ${[...new Set(missingMemberIds)].join(", ")}`,
    },
  ];
  if (shouldSimulatePvmCloseout()) {
    items.push({
      id: "wallet_provider",
      label: "Injected EVM wallet",
      status: "pass",
      detail: "Simulation mode enabled for PVM closeout.",
    });
    items.push({
      id: "wallet_network",
      label: "Wallet network",
      status: "pass",
      detail: `Simulation mode targeting ${getChainName()} (${getChainHexId()}).`,
    });
    return items;
  }

  const provider = typeof window !== "undefined"
    ? (window.ethereum as Eip1193Provider | undefined)
    : undefined;
  if (!provider) {
    items.push({
      id: "wallet_provider",
      label: "Injected EVM wallet",
      status: "fail",
      detail: "MetaMask or another injected EVM wallet is not available in this browser.",
    });
    items.push({
      id: "wallet_network",
      label: "Wallet network",
      status: "warn",
      detail: `Target chain is ${getChainName()} (${getChainHexId()}). Connect a wallet to verify network.`,
    });
    return items;
  }

  items.push({
    id: "wallet_provider",
    label: "Injected EVM wallet",
    status: "pass",
    detail: "Detected browser wallet provider.",
  });

  const currentChainId = await getCurrentEthereumChainId(provider);
  const targetChainId = getChainHexId().toLowerCase();
  items.push({
    id: "wallet_network",
    label: "Wallet network",
    status: currentChainId?.toLowerCase() === targetChainId ? "pass" : "warn",
    detail:
      currentChainId?.toLowerCase() === targetChainId
        ? `${getChainName()} selected`
        : `Wallet is on ${currentChainId || "unknown"}; target is ${targetChainId}. The app will prompt a switch during anchor/proof.`,
  });

  return items;
}

export function findLatestCloseout(pot?: Pick<Pot, "closeouts"> | null): CloseoutRecord | undefined {
  const closeouts = pot?.closeouts ?? [];
  return [...closeouts].sort((left, right) => right.createdAt - left.createdAt)[0];
}

export function findCloseoutLegForMembers(
  closeout: CloseoutRecord | undefined,
  fromMemberId: string,
  toMemberId: string,
): CloseoutLeg | undefined {
  return closeout?.legs.find(
    (leg) => leg.fromMemberId === fromMemberId && leg.toMemberId === toMemberId,
  );
}

export async function createCloseoutDraft({
  pot,
  createdByMemberId,
}: CreateCloseoutDraftArgs): Promise<CloseoutRecord> {
  const asset = getCloseoutAsset(pot.baseCurrency);
  if (!asset) {
    throw new Error("PVM closeout supports DOT and USDC pots only.");
  }

  const balances = computeBalances(pot);
  const suggestions = suggestSettlements(balances);
  if (suggestions.length === 0) {
    throw new Error("No settlement legs available for closeout.");
  }

  const legs = suggestions.map((suggestion, index) => {
    const fromMember = pot.members.find((member) => member.id === suggestion.from);
    const toMember = pot.members.find((member) => member.id === suggestion.to);

    if (!fromMember?.evmAddress || !toMember?.evmAddress) {
      throw new Error("All participants need EVM wallet addresses before anchoring a closeout.");
    }

    return {
      index,
      fromMemberId: suggestion.from,
      toMemberId: suggestion.to,
      fromAddress: normalizeCloseoutMemberAddress(fromMember.evmAddress),
      toAddress: normalizeCloseoutMemberAddress(toMember.evmAddress),
      amount: suggestion.amount.toFixed(asset === "USDC" ? 6 : 6),
      asset,
      status: "pending" as const,
    };
  });

  const snapshot = {
    potId: pot.id,
    asset,
    members: pot.members.map((member) => ({
      id: member.id,
      address: normalizeCloseoutMemberAddress(member.evmAddress),
      verified: Boolean(member.verified),
    })),
    expenses: pot.expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      paidBy: expense.paidBy,
      date: expense.date ?? "",
      split: expense.split ?? [],
    })),
    legs,
  };
  const snapshotHash = await sha256Hex(stableStringify(snapshot));

  return {
    id: randomId("closeout"),
    potId: pot.id,
    asset,
    snapshotHash,
    status: "draft",
    createdByMemberId,
    createdAt: Date.now(),
    participantMemberIds: [...new Set(legs.flatMap((leg) => [leg.fromMemberId, leg.toMemberId]))],
    participantAddresses: [...new Set(legs.flatMap((leg) => [leg.fromAddress, leg.toAddress]))],
    settledLegCount: 0,
    totalLegCount: legs.length,
    legs,
  };
}

export async function anchorCloseoutDraft(closeout: CloseoutRecord): Promise<AnchorCloseoutResult> {
  const metadataHash = await sha256Hex(
    stableStringify({
      closeoutId: closeout.id,
      potId: closeout.potId,
      snapshotHash: closeout.snapshotHash,
      legs: closeout.legs.map((leg) => ({
        index: leg.index,
        fromAddress: leg.fromAddress,
        toAddress: leg.toAddress,
        amount: leg.amount,
        asset: leg.asset,
      })),
    }),
  );

  if (shouldSimulatePvmCloseout()) {
    const closeoutId = `${Date.now()}`;
    const contractTxHash = `0x${Date.now().toString(16).padStart(64, "0")}`;
    return {
      closeoutId,
      contractAddress: getContractAddress(),
      contractTxHash,
      metadataHash,
      status: "active",
    };
  }

  const { contract } = await getCloseoutContract();
  const tx = await contract.createCloseout(
    toBytes32Hash(closeout.snapshotHash),
    closeout.asset,
    metadataHash,
    closeout.legs.map((leg) => toEvmAddress(leg.fromAddress)),
    closeout.legs.map((leg) => toEvmAddress(leg.toAddress)),
    closeout.legs.map((leg) => BigInt(leg.amount.replace(".", ""))),
  );
  const receipt = await tx.wait();
  const log = receipt?.logs
    ?.map((entry: any) => {
      try {
        return contract.interface.parseLog(entry);
      } catch {
        return null;
      }
    })
    .find((entry: any) => entry?.name === "CloseoutCreated");

  const emittedCloseoutId = log?.args?.closeoutId?.toString?.();
  if (!emittedCloseoutId) {
    throw new Error("Closeout transaction succeeded but no CloseoutCreated event was found.");
  }

  return {
    closeoutId: emittedCloseoutId,
    contractAddress: getContractAddress(),
    contractTxHash: tx.hash,
    metadataHash,
    status: "active",
  };
}

export async function buildProofTxHash(
  closeoutId: string,
  legIndex: number,
  settlementTxHash: string,
): Promise<string> {
  return sha256Hex(`${closeoutId}:${legIndex}:${settlementTxHash}`);
}

export async function recordSettlementProof({
  closeoutId,
  legIndex,
  settlementTxHash,
}: RecordSettlementProofArgs): Promise<RecordSettlementProofResult> {
  const proofTxHash = await buildProofTxHash(closeoutId, legIndex, settlementTxHash);

  if (shouldSimulatePvmCloseout()) {
    return {
      proofTxHash: `0x${(Date.now() + legIndex).toString(16).padStart(64, "0")}`,
      proofStatus: "completed",
      proofContract: getContractAddress(),
    };
  }

  const { contract } = await getCloseoutContract();
  const tx = await contract.recordSettlementProof(
    BigInt(closeoutId),
    legIndex,
    toBytes32Hash(settlementTxHash),
    toBytes32Hash(proofTxHash),
  );
  await tx.wait();

  return {
    proofTxHash: tx.hash,
    proofStatus: "completed",
    proofContract: getContractAddress(),
  };
}
