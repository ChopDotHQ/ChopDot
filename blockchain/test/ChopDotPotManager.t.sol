// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/ChopDotPotManager.sol";

contract PotActor {
    function recordSettlement(
        ChopDotPotManager manager,
        uint256 potId,
        address to,
        uint256 amount,
        string calldata currency,
        string calldata note
    ) external {
        manager.recordSettlement(potId, to, amount, currency, note);
    }

    function tryAddMember(ChopDotPotManager manager, uint256 potId, address member) external returns (bool ok) {
        (ok,) = address(manager).call(abi.encodeWithSignature("addMember(uint256,address)", potId, member));
    }

    function tryRecordSettlement(
        ChopDotPotManager manager,
        uint256 potId,
        address to,
        uint256 amount,
        string calldata currency,
        string calldata note
    ) external returns (bool ok) {
        (ok,) = address(manager).call(
            abi.encodeWithSignature(
                "recordSettlement(uint256,address,uint256,string,string)",
                potId,
                to,
                amount,
                currency,
                note
            )
        );
    }
}

contract ChopDotPotManagerTest {
    ChopDotPotManager private manager;

    function setUp() public {
        manager = new ChopDotPotManager();
    }

    function testCreatePotAndRecordSettlement() public {
        uint256 potId = manager.createPot("Trip", "USD");
        require(potId == 1, "pot id mismatch");
        require(manager.members(potId, address(this)), "owner not member");

        PotActor alice = new PotActor();
        PotActor bob = new PotActor();

        manager.addMember(potId, address(alice));
        manager.addMember(potId, address(bob));

        alice.recordSettlement(manager, potId, address(bob), 2500, "USD", "Dinner split");

        ChopDotPotManager.Settlement[] memory settlements = manager.getSettlements(potId);
        require(settlements.length == 1, "expected one settlement");
        require(settlements[0].potId == potId, "pot id wrong");
        require(settlements[0].from == address(alice), "sender wrong");
        require(settlements[0].to == address(bob), "recipient wrong");
        require(settlements[0].amount == 2500, "amount wrong");
        require(
            keccak256(bytes(settlements[0].currency)) == keccak256(bytes("USD")),
            "currency wrong"
        );
        require(
            keccak256(bytes(settlements[0].note)) == keccak256(bytes("Dinner split")),
            "note wrong"
        );
    }

    function testNonOwnerCannotAddMemberAndNonMemberCannotSettle() public {
        uint256 potId = manager.createPot("House", "CHF");

        PotActor outsider = new PotActor();
        bool addOk = outsider.tryAddMember(manager, potId, address(0xBEEF));
        require(!addOk, "non-owner addMember should fail");

        bool settleOk = outsider.tryRecordSettlement(manager, potId, address(this), 100, "CHF", "Invalid");
        require(!settleOk, "non-member settlement should fail");
    }

    function testRecipientMustBeMember() public {
        uint256 potId = manager.createPot("Weekend", "EUR");
        PotActor member = new PotActor();
        manager.addMember(potId, address(member));

        bool ok = member.tryRecordSettlement(manager, potId, address(0xCAFE), 42, "EUR", "Recipient missing");
        require(!ok, "recipient member check failed");
    }
}
