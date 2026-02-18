// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/SettlementEscrow.sol";

contract EscrowActor {
    receive() external payable {}

    function fundEscrow(SettlementEscrow escrow, address recipient) external payable returns (uint256 paymentId) {
        paymentId = escrow.fundEscrow{value: msg.value}(recipient);
    }

    function release(SettlementEscrow escrow, uint256 paymentId) external {
        escrow.release(paymentId);
    }

    function refund(SettlementEscrow escrow, uint256 paymentId) external {
        escrow.refund(paymentId);
    }

    function tryRelease(SettlementEscrow escrow, uint256 paymentId) external returns (bool ok) {
        (ok,) = address(escrow).call(abi.encodeWithSignature("release(uint256)", paymentId));
    }

    function tryRefund(SettlementEscrow escrow, uint256 paymentId) external returns (bool ok) {
        (ok,) = address(escrow).call(abi.encodeWithSignature("refund(uint256)", paymentId));
    }
}

contract SettlementEscrowTest {
    SettlementEscrow private escrow;

    function setUp() public {
        escrow = new SettlementEscrow();
    }

    function testFundAndReleaseSettlement() public {
        EscrowActor payer = new EscrowActor();
        EscrowActor recipient = new EscrowActor();

        uint256 recipientBalanceBefore = address(recipient).balance;
        uint256 paymentId = payer.fundEscrow{value: 1 ether}(escrow, address(recipient));

        (, address paymentPayer, address paymentRecipient, uint256 paymentAmount, bool paymentReleased,) =
            escrow.escrowPayments(paymentId);
        require(paymentPayer == address(payer), "payer wrong");
        require(paymentRecipient == address(recipient), "recipient wrong");
        require(paymentAmount == 1 ether, "amount wrong");
        require(!paymentReleased, "should start unreleased");

        payer.release(escrow, paymentId);

        (, , , , paymentReleased,) = escrow.escrowPayments(paymentId);
        require(paymentReleased, "should be released");
        require(address(recipient).balance == recipientBalanceBefore + 1 ether, "recipient not paid");
    }

    function testPayerCanRefund() public {
        EscrowActor payer = new EscrowActor();
        EscrowActor recipient = new EscrowActor();

        uint256 paymentId = payer.fundEscrow{value: 0.2 ether}(escrow, address(recipient));

        payer.refund(escrow, paymentId);

        (, , , , bool paymentReleased,) = escrow.escrowPayments(paymentId);
        require(paymentReleased, "refund should release");
        require(address(payer).balance == 0.2 ether, "payer should receive refund");
    }

    function testUnauthorizedCannotReleaseOrRefund() public {
        EscrowActor payer = new EscrowActor();
        EscrowActor recipient = new EscrowActor();
        EscrowActor stranger = new EscrowActor();

        uint256 paymentId = payer.fundEscrow{value: 0.1 ether}(escrow, address(recipient));

        bool canRelease = stranger.tryRelease(escrow, paymentId);
        bool canRefund = stranger.tryRefund(escrow, paymentId);
        require(!canRelease, "stranger release should fail");
        require(!canRefund, "stranger refund should fail");
    }

    function testCannotSettleTwice() public {
        EscrowActor payer = new EscrowActor();
        EscrowActor recipient = new EscrowActor();

        uint256 paymentId = payer.fundEscrow{value: 0.1 ether}(escrow, address(recipient));
        recipient.release(escrow, paymentId);

        bool secondRelease = payer.tryRelease(escrow, paymentId);
        bool refundAfterRelease = payer.tryRefund(escrow, paymentId);
        require(!secondRelease, "second release should fail");
        require(!refundAfterRelease, "refund after release should fail");
    }
}
