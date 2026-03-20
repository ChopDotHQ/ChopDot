import type { ProofDetailRecord } from "../nav";

const formatAmount = (record: ProofDetailRecord) => {
  if (record.currency === "DOT" || record.method === "dot") {
    return `${record.amount.toFixed(6)} DOT`;
  }
  if (record.currency === "USDC" || record.method === "usdc") {
    return `${record.amount.toFixed(6)} USDC`;
  }
  return `$${record.amount.toFixed(2)}`;
};

export function buildCloseoutReceiptText(record: ProofDetailRecord): string {
  const lines = [
    "ChopDot Closeout Receipt",
    "",
    `Counterparty: ${record.counterpartyName}`,
    `Amount: ${formatAmount(record)}`,
    `Method: ${record.method.toUpperCase()}`,
    `Recorded at: ${new Date(record.at).toLocaleString("en-AU")}`,
  ];

  if (record.potNames?.length) {
    lines.push(`Pots: ${record.potNames.join(", ")}`);
  }

  if (record.closeoutId) {
    lines.push(`Closeout onchain: ${record.closeoutId}`);
  }

  if (typeof record.closeoutLegIndex === "number") {
    lines.push(`Settlement leg: ${record.closeoutLegIndex + 1}`);
  }

  if (record.txHash) {
    lines.push(`Payment tx: ${record.txHash}`);
  }

  lines.push(`Settlement proof: ${record.proofStatus || "anchored"}`);

  if (record.proofTxHash) {
    lines.push(`Proof tx: ${record.proofTxHash}`);
  }

  if (record.proofContract) {
    lines.push(`Proof contract: ${record.proofContract}`);
  }

  return lines.join("\n");
}
