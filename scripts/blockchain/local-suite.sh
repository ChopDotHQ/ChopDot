#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/blockchain/docker-compose.local-chain.yml"

echo "[blockchain] starting local chains (anvil + polkadot profile)..."
docker compose -f "$COMPOSE_FILE" --profile polkadot up -d

echo "[blockchain] waiting for anvil RPC..."
for _ in $(seq 1 30); do
  if node -e "const { ethers } = require('ethers'); (async()=>{ const p=new ethers.JsonRpcProvider('http://127.0.0.1:8545'); await p.getBlockNumber(); process.exit(0); })().catch(()=>process.exit(1));"; then
    break
  fi
  sleep 1
done

echo "[blockchain] waiting for polkadot WS..."
for _ in $(seq 1 30); do
  if node -e "const { ApiPromise, WsProvider } = require('@polkadot/api'); (async()=>{ const ws=new WsProvider('ws://127.0.0.1:9944'); const api=await ApiPromise.create({ provider: ws }); await api.rpc.system.health(); await api.disconnect(); process.exit(0); })().catch(()=>process.exit(1));"; then
    break
  fi
  sleep 1
done

echo "[blockchain] copying workspace contracts/tests into anvil container..."
docker cp "$ROOT_DIR/blockchain/." chopdot-anvil:/tmp/chopdot-blockchain

echo "[blockchain] running solidity tests..."
docker exec chopdot-anvil sh -lc 'cd /tmp/chopdot-blockchain && forge test -vv --out /tmp/chopdot-out --cache-path /tmp/chopdot-cache'

echo "[blockchain] running settle-up smoke (fund + release)..."
docker exec chopdot-anvil sh -lc '
set -e
cd /tmp/chopdot-blockchain
DEPLOY_OUT=$(forge create contracts/SettlementEscrow.sol:SettlementEscrow --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --out /tmp/chopdot-out --cache-path /tmp/chopdot-cache)
ADDR=$(echo "$DEPLOY_OUT" | sed -n "s/^Deployed to: //p" | tail -n 1)
cast send "$ADDR" "fundEscrow(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --value 0.05ether --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 >/dev/null
cast send "$ADDR" "release(uint256)" 1 --rpc-url http://127.0.0.1:8545 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d >/dev/null
BAL=$(cast balance "$ADDR" --rpc-url http://127.0.0.1:8545)
if [ "$BAL" != "0" ]; then
  echo "settle smoke failed: escrow balance expected 0, got $BAL"
  exit 1
fi
'

echo "[blockchain] local suite passed."
