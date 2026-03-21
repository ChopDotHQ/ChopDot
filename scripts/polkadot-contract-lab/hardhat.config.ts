import type { HardhatUserConfig } from 'hardhat/config.js';
import { vars } from 'hardhat/config.js';
import '@nomicfoundation/hardhat-toolbox';
import '@parity/hardhat-polkadot';

const rawPrivateKey = vars.has("PRIVATE_KEY") ? vars.get("PRIVATE_KEY") : "";
const normalizedPrivateKey = rawPrivateKey
  ? rawPrivateKey.startsWith("0x")
    ? rawPrivateKey
    : `0x${rawPrivateKey}`
  : "";
const accounts = normalizedPrivateKey ? [normalizedPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  resolc: {
    version: '0.3.0',
    compilerSource: "npm",
  },
  networks: {
    hardhat: {},
    polkadotHubTestnet: {
      chainId: 420420417,
      url: "https://services.polkadothub-rpc.com/testnet",
      accounts,
    },
    polkadotHubMainnet: {
      chainId: 420420419,
      url: "https://services.polkadothub-rpc.com/mainnet",
      accounts,
    },
  },
};

export default config;
