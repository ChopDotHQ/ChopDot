// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ChopDotPotManager {
    struct Pot {
        uint256 id;
        address owner;
        string name;
        string baseCurrency;
        uint256 createdAt;
        bool active;
    }

    struct Settlement {
        uint256 potId;
        address from;
        address to;
        uint256 amount;
        string currency;
        string note;
        uint256 createdAt;
    }

    uint256 public nextPotId = 1;
    mapping(uint256 => Pot) public pots;
    mapping(uint256 => Settlement[]) private settlementsByPot;
    mapping(uint256 => mapping(address => bool)) public members;

    event PotCreated(uint256 indexed potId, address indexed owner, string name, string baseCurrency);
    event MemberAdded(uint256 indexed potId, address indexed member);
    event SettlementRecorded(
        uint256 indexed potId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string currency,
        string note
    );

    modifier onlyPotOwner(uint256 potId) {
        require(pots[potId].owner == msg.sender, "Not pot owner");
        _;
    }

    modifier onlyPotMember(uint256 potId) {
        require(members[potId][msg.sender], "Not pot member");
        _;
    }

    function createPot(string calldata name, string calldata baseCurrency) external returns (uint256 potId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(baseCurrency).length > 0, "Currency required");

        potId = nextPotId++;
        pots[potId] = Pot({
            id: potId,
            owner: msg.sender,
            name: name,
            baseCurrency: baseCurrency,
            createdAt: block.timestamp,
            active: true
        });
        members[potId][msg.sender] = true;

        emit PotCreated(potId, msg.sender, name, baseCurrency);
    }

    function addMember(uint256 potId, address member) external onlyPotOwner(potId) {
        require(member != address(0), "Invalid member");
        require(pots[potId].active, "Pot inactive");
        members[potId][member] = true;
        emit MemberAdded(potId, member);
    }

    function recordSettlement(
        uint256 potId,
        address to,
        uint256 amount,
        string calldata currency,
        string calldata note
    ) external onlyPotMember(potId) {
        require(pots[potId].active, "Pot inactive");
        require(members[potId][to], "Recipient must be member");
        require(amount > 0, "Amount required");
        require(bytes(currency).length > 0, "Currency required");

        settlementsByPot[potId].push(
            Settlement({
                potId: potId,
                from: msg.sender,
                to: to,
                amount: amount,
                currency: currency,
                note: note,
                createdAt: block.timestamp
            })
        );

        emit SettlementRecorded(potId, msg.sender, to, amount, currency, note);
    }

    function getSettlements(uint256 potId) external view returns (Settlement[] memory) {
        return settlementsByPot[potId];
    }
}

