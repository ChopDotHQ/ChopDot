const path = require('node:path');

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {hardhat: {chainId: 31337}},
  paths: {
    sources: path.join(__dirname, 'src'),
    tests: path.join(__dirname, 'test'),
    cache: path.join(process.cwd(), 'node_modules/.cache/chopdot-recovery-head/behavior-cache'),
    artifacts: path.join(process.cwd(), 'node_modules/.cache/chopdot-recovery-head/behavior-artifacts'),
  },
};
