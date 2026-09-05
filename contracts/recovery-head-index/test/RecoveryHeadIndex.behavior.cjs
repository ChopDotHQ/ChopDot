const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ethers} = require('ethers');
const hre = require('hardhat');
const solc = require('solc');

const sourcePath = path.join(__dirname, '../src/RecoveryHeadIndex.sol');
const source = fs.readFileSync(sourcePath, 'utf8');
const input = {
  language: 'Solidity',
  sources: {'RecoveryHeadIndex.sol': {content: source}},
  settings: {
    optimizer: {enabled: true, runs: 200},
    outputSelection: {'*': {'*': ['abi', 'evm.bytecode.object']}},
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((entry) => entry.severity === 'error');
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'));
const compiled = output.contracts['RecoveryHeadIndex.sol'].RecoveryHeadIndex;
const STREAM_A = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('account-directory-a'));
const STREAM_B = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('account-directory-b'));
const DIGEST_1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('encrypted-locator-1'));
const DIGEST_2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('encrypted-locator-2'));
const ZERO = ethers.constants.HashZero;

describe('RecoveryHeadIndex executable Solidity behavior', function () {
  let provider;
  let owner;
  let other;
  let index;

  beforeEach(async function () {
    provider = new ethers.providers.Web3Provider(hre.network.provider);
    owner = provider.getSigner(0);
    other = provider.getSigner(1);
    const factory = new ethers.ContractFactory(compiled.abi, `0x${compiled.evm.bytecode.object}`, owner);
    index = await factory.deploy();
    await index.deployed();
  });

  it('starts empty and advances exactly once', async function () {
    const ownerAddress = await owner.getAddress();
    assert.deepEqual((await index.readHead(ownerAddress, STREAM_A)).map(String), ['0', ZERO]);
    await (await index.advanceHead(STREAM_A, 0, ZERO, DIGEST_1)).wait();
    assert.deepEqual((await index.readHead(ownerAddress, STREAM_A)).map(String), ['1', DIGEST_1]);
  });

  it('rejects a stale compare-and-swap without changing the head', async function () {
    const ownerAddress = await owner.getAddress();
    await (await index.advanceHead(STREAM_A, 0, ZERO, DIGEST_1)).wait();
    await assert.rejects(index.advanceHead(STREAM_A, 0, ZERO, DIGEST_2));
    assert.deepEqual((await index.readHead(ownerAddress, STREAM_A)).map(String), ['1', DIGEST_1]);
  });

  it('isolates owners and streams', async function () {
    const ownerAddress = await owner.getAddress();
    const otherAddress = await other.getAddress();
    await (await index.advanceHead(STREAM_A, 0, ZERO, DIGEST_1)).wait();
    await (await index.connect(other).advanceHead(STREAM_A, 0, ZERO, DIGEST_2)).wait();
    await (await index.advanceHead(STREAM_B, 0, ZERO, DIGEST_2)).wait();
    assert.deepEqual((await index.readHead(ownerAddress, STREAM_A)).map(String), ['1', DIGEST_1]);
    assert.deepEqual((await index.readHead(ownerAddress, STREAM_B)).map(String), ['1', DIGEST_2]);
    assert.deepEqual((await index.readHead(otherAddress, STREAM_A)).map(String), ['1', DIGEST_2]);
  });

  it('rejects empty stream and next digest inputs', async function () {
    await assert.rejects(index.advanceHead(ZERO, 0, ZERO, DIGEST_1));
    await assert.rejects(index.advanceHead(STREAM_A, 0, ZERO, ZERO));
  });
});
