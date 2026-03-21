const defaultRpc = "https://services.polkadothub-rpc.com/testnet";
const rpcUrl = process.env.POLKADOT_HUB_RPC_URL || defaultRpc;

async function rpc(method, params = []) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }

  return payload.result;
}

function hexToNumber(hexValue) {
  return Number(BigInt(hexValue));
}

async function main() {
  console.log(`Checking Polkadot Hub EVM RPC at ${rpcUrl}`);

  const [chainIdHex, blockHex, gasPriceHex, clientVersion] = await Promise.all([
    rpc("eth_chainId"),
    rpc("eth_blockNumber"),
    rpc("eth_gasPrice"),
    rpc("web3_clientVersion"),
  ]);

  console.log(`chainId: ${hexToNumber(chainIdHex)} (${chainIdHex})`);
  console.log(`latest block: ${hexToNumber(blockHex)} (${blockHex})`);
  console.log(`gas price (wei): ${BigInt(gasPriceHex).toString()}`);
  console.log(`client: ${clientVersion}`);
}

main().catch((error) => {
  console.error("RPC health check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
