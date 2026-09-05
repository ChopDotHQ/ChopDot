const path = require('node:path');
require('@parity/hardhat-polkadot-resolc');

const contractRoot = __dirname;

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: '0.8.28',
  resolc: {
    version: '1.4.0',
    compilerSource: 'npm',
    settings: {
      // Prevent Hardhat's binary downloader from substituting another build;
      // compilation still uses the pinned npm compiler through the plugin.
      resolcPath: path.join(process.cwd(), 'node_modules/.bin/resolc'),
      optimizer: {enabled: true, parameters: 'z', runs: 200},
      contractsToCompile: ['RecoveryHeadIndex.sol'],
    },
  },
  networks: {
    hardhat: {polkadot: true},
  },
  paths: {
    sources: path.join(contractRoot, 'src'),
    tests: path.join(contractRoot, 'test'),
    cache: path.join(process.cwd(), 'node_modules/.cache/chopdot-recovery-head/hardhat-cache'),
    artifacts: path.join(process.cwd(), 'node_modules/.cache/chopdot-recovery-head/hardhat-artifacts'),
  },
};
