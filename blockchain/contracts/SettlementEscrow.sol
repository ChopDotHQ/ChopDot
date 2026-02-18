// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SettlementEscrow {
    struct EscrowPayment {
        uint256 id;
        address payer;
        address recipient;
        uint256 amount;
        bool released;
        uint256 createdAt;
    }

    uint256 public nextPaymentId = 1;
    mapping(uint256 => EscrowPayment) public escrowPayments;

    event EscrowFunded(uint256 indexed paymentId, address indexed payer, address indexed recipient, uint256 amount);
    event EscrowReleased(uint256 indexed paymentId, address indexed recipient, uint256 amount);
    event EscrowRefunded(uint256 indexed paymentId, address indexed payer, uint256 amount);

    function fundEscrow(address recipient) external payable returns (uint256 paymentId) {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "Amount required");

        paymentId = nextPaymentId++;
        escrowPayments[paymentId] = EscrowPayment({
            id: paymentId,
            payer: msg.sender,
            recipient: recipient,
            amount: msg.value,
            released: false,
            createdAt: block.timestamp
        });

        emit EscrowFunded(paymentId, msg.sender, recipient, msg.value);
    }

    function release(uint256 paymentId) external {
        EscrowPayment storage payment = escrowPayments[paymentId];
        require(payment.id != 0, "Payment not found");
        require(!payment.released, "Already settled");
        require(msg.sender == payment.payer || msg.sender == payment.recipient, "Unauthorized");

        payment.released = true;
        (bool sent, ) = payment.recipient.call{value: payment.amount}("");
        require(sent, "Transfer failed");

        emit EscrowReleased(paymentId, payment.recipient, payment.amount);
    }

    function refund(uint256 paymentId) external {
        EscrowPayment storage payment = escrowPayments[paymentId];
        require(payment.id != 0, "Payment not found");
        require(!payment.released, "Already settled");
        require(msg.sender == payment.payer, "Only payer");

        payment.released = true;
        (bool sent, ) = payment.payer.call{value: payment.amount}("");
        require(sent, "Refund failed");

        emit EscrowRefunded(paymentId, payment.payer, payment.amount);
    }
}

