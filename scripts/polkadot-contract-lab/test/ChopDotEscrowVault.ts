import { expect } from 'chai';
import hre from 'hardhat';

const { ethers, network } = hre;

const ZERO_TOKEN = ethers.ZeroAddress;

function id(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function mode(label: string): string {
  return ethers.encodeBytes32String(label);
}

describe('ChopDotEscrowVault', function () {
  async function deployFixture() {
    const [creator, leo, nina, omar, mina, riley, taylor, jordan, outsider] = await ethers.getSigners();
    const vaultFactory = await ethers.getContractFactory('ChopDotEscrowVault');
    const vault = await vaultFactory.deploy();
    await vault.waitForDeployment();

    const tokenFactory = await ethers.getContractFactory('ChopDotMockToken');
    const token = await tokenFactory.deploy('ChopDot Mock USDC', 'TEST_USDC', 6);
    await token.waitForDeployment();

    return {
      vault,
      token,
      creator,
      leo,
      nina,
      omar,
      mina,
      riley,
      taylor,
      jordan,
      outsider,
    };
  }

  async function createNativeCase(input?: Partial<{
    modeName: string;
    requiredApprovalCount: bigint;
    releaseRecipient: string;
    participants: string[];
    participantIds: string[];
    amounts: bigint[];
    approvers: string[];
    deadline: bigint;
  }>) {
    const fixture = await deployFixture();
    const amount = ethers.parseEther('1');
    const participants = input?.participants ?? [
      fixture.leo.address,
      fixture.nina.address,
      fixture.omar.address,
    ];
    const participantIds = input?.participantIds ?? [id('leo'), id('nina'), id('omar')];
    const amounts = input?.amounts ?? [amount, amount, amount];
    const approvers = input?.approvers ?? [fixture.mina.address];

    await fixture.vault.connect(fixture.mina).createCase(
      mode(input?.modeName ?? 'shared_expense'),
      ZERO_TOKEN,
      input?.requiredApprovalCount ?? 1n,
      input?.releaseRecipient ?? fixture.mina.address,
      participants,
      participantIds,
      amounts,
      approvers,
      id('rules'),
      input?.deadline ?? 0n,
    );

    return {
      ...fixture,
      caseId: 1n,
      amount,
      participants,
      participantIds,
      amounts,
    };
  }

  it('runs a group expense native-token happy path without treating deposits as closeout', async function () {
    const { vault, leo, nina, omar, mina, caseId, amount } = await createNativeCase();

    await expect(vault.connect(leo).deposit(caseId, id('leo'), amount, { value: amount }))
      .to.emit(vault, 'Deposited');
    await vault.connect(nina).deposit(caseId, id('nina'), amount, { value: amount });
    await vault.connect(omar).deposit(caseId, id('omar'), amount, { value: amount });
    await expect(vault.connect(mina).approveRelease(caseId)).to.emit(vault, 'ReleaseApproved');
    await expect(vault.connect(mina).release(caseId)).to.emit(vault, 'Released');

    const escrowCase = await vault.getCase(caseId);
    expect(escrowCase.state).to.equal(1n);
    expect(escrowCase.totalDeposited).to.equal(amount * 3n);
  });

  it('blocks duplicate deposit and early release attempts', async function () {
    const { vault, leo, nina, outsider, mina, caseId, amount } = await createNativeCase();

    await vault.connect(leo).deposit(caseId, id('leo'), amount, { value: amount });

    await expect(
      vault.connect(leo).deposit(caseId, id('leo'), amount, { value: amount }),
    ).to.be.revertedWith('already deposited');
    await expect(vault.connect(outsider).release(caseId)).to.be.revertedWith('not release actor');
    await expect(vault.connect(mina).release(caseId)).to.be.revertedWith('deposits incomplete');
    await expect(
      vault.connect(nina).deposit(caseId, id('wrong-person'), amount, { value: amount }),
    ).to.be.revertedWith('participant id mismatch');
  });

  it('keeps savings circle payout blocked until all required deposits and approval exist', async function () {
    const { vault, leo, nina, omar, mina, caseId, amount } = await createNativeCase({
      modeName: 'savings_circle',
    });

    const recipientCase = await vault.getCase(caseId);
    expect(recipientCase.mode).to.equal(mode('savings_circle'));

    await vault.connect(leo).deposit(caseId, id('leo'), amount, { value: amount });
    await vault.connect(nina).deposit(caseId, id('nina'), amount, { value: amount });
    await expect(vault.connect(mina).release(caseId)).to.be.revertedWith('deposits incomplete');

    await vault.connect(omar).deposit(caseId, id('omar'), amount, { value: amount });
    await expect(vault.connect(mina).release(caseId)).to.be.revertedWith('approvals incomplete');

    await vault.connect(mina).approveRelease(caseId);
    await expect(vault.connect(mina).release(caseId)).to.emit(vault, 'Released');
  });

  it('requires two emergency approvers before release', async function () {
    const fixture = await deployFixture();
    const amount = ethers.parseEther('0.5');

    await fixture.vault.connect(fixture.riley).createCase(
      mode('emergency_pot'),
      ZERO_TOKEN,
      2n,
      fixture.jordan.address,
      [fixture.leo.address, fixture.nina.address],
      [id('casey'), id('morgan')],
      [amount, amount],
      [fixture.riley.address, fixture.taylor.address],
      id('redacted-rules'),
      0n,
    );

    await fixture.vault.connect(fixture.leo).deposit(1n, id('casey'), amount, { value: amount });
    await fixture.vault.connect(fixture.nina).deposit(1n, id('morgan'), amount, { value: amount });
    await fixture.vault.connect(fixture.riley).approveRelease(1n);
    await expect(fixture.vault.connect(fixture.riley).release(1n)).to.be.revertedWith('approvals incomplete');
    await fixture.vault.connect(fixture.taylor).approveRelease(1n);
    await expect(fixture.vault.connect(fixture.riley).release(1n)).to.emit(fixture.vault, 'Released');
  });

  it('runs a community pot mock-token release and blocks pre-policy refund', async function () {
    const { vault, token, leo, nina, mina, jordan, caseId } = await (async () => {
      const fixture = await deployFixture();
      const amount = 100_000000n;
      await fixture.token.mint(fixture.leo.address, amount);
      await fixture.token.mint(fixture.nina.address, amount);
      await fixture.vault.connect(fixture.mina).createCase(
        mode('community_pot'),
        await fixture.token.getAddress(),
        1n,
        fixture.jordan.address,
        [fixture.leo.address, fixture.nina.address],
        [id('sam'), id('noor')],
        [amount, amount],
        [fixture.mina.address],
        id('community-policy'),
        BigInt((await ethers.provider.getBlock('latest'))!.timestamp + 3600),
      );
      return { ...fixture, caseId: 1n };
    })();

    await token.connect(leo).approve(await vault.getAddress(), 100_000000n);
    await token.connect(nina).approve(await vault.getAddress(), 100_000000n);
    await vault.connect(leo).deposit(caseId, id('sam'), 100_000000n);
    await vault.connect(nina).deposit(caseId, id('noor'), 100_000000n);
    await expect(vault.connect(leo).refund(caseId)).to.be.revertedWith('refund unavailable');
    await vault.connect(mina).approveRelease(caseId);
    await expect(vault.connect(mina).release(caseId)).to.emit(vault, 'Released');
    expect(await token.balanceOf(jordan.address)).to.equal(200_000000n);
  });

  it('allows refund only after deadline', async function () {
    const fixture = await deployFixture();
    const amount = ethers.parseEther('1');
    const deadline = BigInt((await ethers.provider.getBlock('latest'))!.timestamp + 10);
    await fixture.vault.connect(fixture.mina).createCase(
      mode('savings_circle'),
      ZERO_TOKEN,
      0n,
      fixture.leo.address,
      [fixture.leo.address, fixture.nina.address],
      [id('leo'), id('nina')],
      [amount, amount],
      [],
      id('deadline-policy'),
      deadline,
    );
    const { vault, leo, outsider, mina } = fixture;
    const caseId = 1n;

    await vault.connect(leo).deposit(caseId, id('leo'), amount, { value: amount });
    await network.provider.send('evm_increaseTime', [11]);
    await network.provider.send('evm_mine');
    await expect(vault.connect(leo).refund(caseId)).to.emit(vault, 'Refunded');
  });

  it('allows void only by creator while the case is open', async function () {
    const { vault, outsider, mina } = await createNativeCase({ modeName: 'emergency_pot' });

    await expect(vault.connect(outsider).voidCase(1n, id('void'))).to.be.revertedWith('only creator');
    await expect(vault.connect(mina).voidCase(1n, id('void'))).to.emit(vault, 'Voided');
  });
});
