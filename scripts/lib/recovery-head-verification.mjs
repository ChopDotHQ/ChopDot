export async function assertStaleRejectedForOwner({
  contract,
  owner,
  stream,
  sequence,
  digest,
  nextDigest,
  errorMessage,
}) {
  if (!/^0x[0-9a-f]{40}$/iu.test(owner ?? '')) {
    throw new Error('Recovery-head stale verification owner is invalid.');
  }
  let staleRejected = false;
  try {
    await contract.callStatic.advanceHead(stream, sequence, digest, nextDigest, {from: owner});
  } catch {
    staleRejected = true;
  }
  if (!staleRejected) throw new Error(errorMessage);
}

export function assertCanonicalReceipt(receipt, expected) {
  if (
    !receipt
    || receipt.status !== 1
    || receipt.transactionHash?.toLowerCase() !== expected.transactionHash.toLowerCase()
    || receipt.blockNumber !== expected.blockNumber
    || receipt.blockHash?.toLowerCase() !== expected.blockHash.toLowerCase()
  ) {
    throw new Error('Live PVM transaction receipt is no longer canonical after finality.');
  }
}
