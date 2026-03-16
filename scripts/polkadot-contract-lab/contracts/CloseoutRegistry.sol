// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CloseoutRegistry {
    enum LegStatus {
        Pending,
        Paid,
        Proven,
        Acknowledged
    }

    struct SettlementLeg {
        address payer;
        address payee;
        uint256 amount;
        bytes32 settlementTxHash;
        bytes32 proofTxHash;
        LegStatus status;
    }

    struct Closeout {
        bytes32 snapshotHash;
        string asset;
        string metadataHash;
        address creator;
        uint64 createdAt;
        bool completed;
        uint32 settledLegCount;
        uint32 totalLegCount;
    }

    uint256 public nextCloseoutId = 1;

    mapping(uint256 => Closeout) private closeouts;
    mapping(uint256 => mapping(uint32 => SettlementLeg)) private closeoutLegs;

    event CloseoutCreated(
        uint256 indexed closeoutId,
        bytes32 indexed snapshotHash,
        address indexed creator,
        string asset,
        string metadataHash
    );
    event SettlementProofRecorded(
        uint256 indexed closeoutId,
        uint32 indexed legIndex,
        bytes32 settlementTxHash,
        bytes32 proofTxHash,
        LegStatus status
    );
    event CloseoutCompleted(uint256 indexed closeoutId);

    function createCloseout(
        bytes32 snapshotHash,
        string calldata asset,
        string calldata metadataHash,
        address[] calldata payers,
        address[] calldata payees,
        uint256[] calldata amounts
    ) external returns (uint256 closeoutId) {
        require(snapshotHash != bytes32(0), "snapshot required");
        require(bytes(asset).length > 0, "asset required");
        require(
            payers.length == payees.length && payers.length == amounts.length,
            "leg arrays mismatch"
        );
        require(payers.length > 0, "legs required");

        closeoutId = nextCloseoutId++;
        closeouts[closeoutId] = Closeout({
            snapshotHash: snapshotHash,
            asset: asset,
            metadataHash: metadataHash,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            completed: false,
            settledLegCount: 0,
            totalLegCount: uint32(payers.length)
        });

        for (uint32 index = 0; index < payers.length; index++) {
            require(payers[index] != address(0), "payer required");
            require(payees[index] != address(0), "payee required");
            require(amounts[index] > 0, "amount required");

            closeoutLegs[closeoutId][index] = SettlementLeg({
                payer: payers[index],
                payee: payees[index],
                amount: amounts[index],
                settlementTxHash: bytes32(0),
                proofTxHash: bytes32(0),
                status: LegStatus.Pending
            });
        }

        emit CloseoutCreated(closeoutId, snapshotHash, msg.sender, asset, metadataHash);
    }

    function recordSettlementProof(
        uint256 closeoutId,
        uint32 legIndex,
        bytes32 settlementTxHash,
        bytes32 proofTxHash
    ) external {
        Closeout storage closeout = closeouts[closeoutId];
        require(closeout.creator != address(0), "closeout missing");
        require(!closeout.completed, "closeout completed");
        require(settlementTxHash != bytes32(0), "settlement tx required");
        require(proofTxHash != bytes32(0), "proof tx required");
        require(legIndex < closeout.totalLegCount, "invalid leg");

        SettlementLeg storage leg = closeoutLegs[closeoutId][legIndex];
        require(leg.status == LegStatus.Pending || leg.status == LegStatus.Paid, "leg already proven");

        leg.settlementTxHash = settlementTxHash;
        leg.proofTxHash = proofTxHash;
        leg.status = LegStatus.Proven;
        closeout.settledLegCount += 1;

        emit SettlementProofRecorded(
            closeoutId,
            legIndex,
            settlementTxHash,
            proofTxHash,
            LegStatus.Proven
        );

        if (closeout.settledLegCount >= closeout.totalLegCount) {
            closeout.completed = true;
            emit CloseoutCompleted(closeoutId);
        }
    }

    function markLegAcknowledged(uint256 closeoutId, uint32 legIndex) external {
        Closeout storage closeout = closeouts[closeoutId];
        require(closeout.creator != address(0), "closeout missing");
        require(legIndex < closeout.totalLegCount, "invalid leg");

        SettlementLeg storage leg = closeoutLegs[closeoutId][legIndex];
        leg.status = LegStatus.Acknowledged;

        emit SettlementProofRecorded(
            closeoutId,
            legIndex,
            leg.settlementTxHash,
            leg.proofTxHash,
            LegStatus.Acknowledged
        );
    }

    function getCloseout(uint256 closeoutId) external view returns (Closeout memory) {
        return closeouts[closeoutId];
    }

    function getLeg(uint256 closeoutId, uint32 legIndex) external view returns (SettlementLeg memory) {
        return closeoutLegs[closeoutId][legIndex];
    }
}
