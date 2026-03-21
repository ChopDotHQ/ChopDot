import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

describe('CloseoutRegistry', function () {
  async function deployFixture() {
    const [creator, payer, payee, outsider] = await ethers.getSigners();
    const registryFactory = await ethers.getContractFactory('CloseoutRegistry');
    const registry = await registryFactory.deploy();
    await registry.waitForDeployment();

    await registry.connect(creator).createCloseout(
      ethers.keccak256(ethers.toUtf8Bytes('snapshot')),
      'DOT',
      'metadata',
      [payer.address],
      [payee.address],
      [123n],
    );

    return {
      registry,
      creator,
      payer,
      payee,
      outsider,
      closeoutId: 1n,
      settlementTxHash: ethers.keccak256(ethers.toUtf8Bytes('settlement')),
      proofTxHash: ethers.keccak256(ethers.toUtf8Bytes('proof')),
    };
  }

  it('rejects proof writes from unrelated addresses', async function () {
    const { registry, outsider, closeoutId, settlementTxHash, proofTxHash } = await deployFixture();

    await expect(
      registry.connect(outsider).recordSettlementProof(closeoutId, 0, settlementTxHash, proofTxHash),
    ).to.be.revertedWith('not authorized for leg');
  });

  it('allows payer, payee, or creator to record proof', async function () {
    const { registry, payer, closeoutId, settlementTxHash, proofTxHash } = await deployFixture();

    await expect(
      registry.connect(payer).recordSettlementProof(closeoutId, 0, settlementTxHash, proofTxHash),
    ).to.not.be.reverted;
  });

  it('rejects acknowledgement before proof exists', async function () {
    const { registry, payee, closeoutId } = await deployFixture();

    await expect(
      registry.connect(payee).markLegAcknowledged(closeoutId, 0),
    ).to.be.revertedWith('leg not proven');
  });

  it('rejects acknowledgement writes from unrelated addresses', async function () {
    const { registry, creator, outsider, closeoutId, settlementTxHash, proofTxHash } = await deployFixture();

    await registry.connect(creator).recordSettlementProof(closeoutId, 0, settlementTxHash, proofTxHash);

    await expect(
      registry.connect(outsider).markLegAcknowledged(closeoutId, 0),
    ).to.be.revertedWith('not authorized for leg');
  });

  it('allows the payee to acknowledge a proven leg', async function () {
    const { registry, creator, payee, closeoutId, settlementTxHash, proofTxHash } = await deployFixture();

    await registry.connect(creator).recordSettlementProof(closeoutId, 0, settlementTxHash, proofTxHash);
    await expect(
      registry.connect(payee).markLegAcknowledged(closeoutId, 0),
    ).to.not.be.reverted;

    const leg = await registry.getLeg(closeoutId, 0);
    expect(leg.status).to.equal(3n);
  });
});
