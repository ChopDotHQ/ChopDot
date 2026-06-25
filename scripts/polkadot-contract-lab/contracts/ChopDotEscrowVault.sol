// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ChopDotEscrowVault {
    enum CaseState {
        Open,
        Released,
        Refunded,
        Voided
    }

    struct Requirement {
        bytes32 participantId;
        uint256 amount;
        uint256 deposited;
        bool exists;
        bool complete;
        bool refunded;
    }

    struct EscrowCase {
        bytes32 mode;
        address token;
        address creator;
        address releaseRecipient;
        bytes32 rulesHash;
        uint64 deadline;
        uint256 totalRequired;
        uint256 totalDeposited;
        uint256 requiredApprovalCount;
        uint256 approvalCount;
        uint32 participantCount;
        CaseState state;
    }

    uint256 public nextCaseId = 1;

    mapping(uint256 => EscrowCase) private cases;
    mapping(uint256 => mapping(address => Requirement)) private requirements;
    mapping(uint256 => mapping(address => bool)) private approvers;
    mapping(uint256 => mapping(address => bool)) private approved;
    mapping(uint256 => address[]) private participantAddresses;

    event CaseCreated(
        uint256 indexed caseId,
        bytes32 indexed mode,
        address indexed creator,
        address token,
        uint256 totalRequired
    );
    event Deposited(
        uint256 indexed caseId,
        address indexed participant,
        bytes32 indexed participantId,
        address token,
        uint256 amount
    );
    event ReleaseApproved(uint256 indexed caseId, address indexed approver, uint256 approvalCount);
    event Released(uint256 indexed caseId, address indexed recipient, address token, uint256 amount);
    event Refunded(uint256 indexed caseId, address indexed participant, address token, uint256 amount);
    event Voided(uint256 indexed caseId, bytes32 indexed reasonHash);

    modifier caseExists(uint256 caseId) {
        require(cases[caseId].creator != address(0), "case missing");
        _;
    }

    modifier onlyOpen(uint256 caseId) {
        require(cases[caseId].state == CaseState.Open, "case not open");
        _;
    }

    function createCase(
        bytes32 mode,
        address token,
        uint256 requiredApprovalCount,
        address releaseRecipient,
        address[] calldata participants,
        bytes32[] calldata participantIds,
        uint256[] calldata amounts,
        address[] calldata approvalAddresses,
        bytes32 rulesHash,
        uint64 deadline
    ) external returns (uint256 caseId) {
        require(mode != bytes32(0), "mode required");
        require(releaseRecipient != address(0), "recipient required");
        require(participants.length > 0, "participants required");
        require(
            participants.length == participantIds.length && participants.length == amounts.length,
            "participant arrays mismatch"
        );
        require(requiredApprovalCount <= approvalAddresses.length, "approval threshold invalid");
        require(deadline == 0 || deadline > block.timestamp, "deadline must be future");

        caseId = nextCaseId++;
        EscrowCase storage escrowCase = cases[caseId];
        escrowCase.mode = mode;
        escrowCase.token = token;
        escrowCase.creator = msg.sender;
        escrowCase.releaseRecipient = releaseRecipient;
        escrowCase.rulesHash = rulesHash;
        escrowCase.deadline = deadline;
        escrowCase.requiredApprovalCount = requiredApprovalCount;
        escrowCase.participantCount = uint32(participants.length);
        escrowCase.state = CaseState.Open;

        for (uint32 index = 0; index < participants.length; index++) {
            address participant = participants[index];
            require(participant != address(0), "participant required");
            require(participantIds[index] != bytes32(0), "participant id required");
            require(amounts[index] > 0, "amount required");
            require(!requirements[caseId][participant].exists, "duplicate participant");

            requirements[caseId][participant] = Requirement({
                participantId: participantIds[index],
                amount: amounts[index],
                deposited: 0,
                exists: true,
                complete: false,
                refunded: false
            });
            participantAddresses[caseId].push(participant);
            escrowCase.totalRequired += amounts[index];
        }

        for (uint32 index = 0; index < approvalAddresses.length; index++) {
            address approver = approvalAddresses[index];
            require(approver != address(0), "approver required");
            require(!approvers[caseId][approver], "duplicate approver");
            approvers[caseId][approver] = true;
        }

        emit CaseCreated(
            caseId,
            escrowCase.mode,
            msg.sender,
            escrowCase.token,
            escrowCase.totalRequired
        );
    }

    function deposit(
        uint256 caseId,
        bytes32 participantId,
        uint256 amount
    ) external payable caseExists(caseId) onlyOpen(caseId) {
        EscrowCase storage escrowCase = cases[caseId];
        Requirement storage requirement = requirements[caseId][msg.sender];
        require(requirement.exists, "not participant");
        require(!requirement.complete, "already deposited");
        require(requirement.participantId == participantId, "participant id mismatch");
        require(amount == requirement.amount, "amount mismatch");

        if (escrowCase.token == address(0)) {
            require(msg.value == amount, "native amount mismatch");
        } else {
            require(msg.value == 0, "unexpected native value");
            _safeTransferFrom(escrowCase.token, msg.sender, address(this), amount);
        }

        requirement.deposited = amount;
        requirement.complete = true;
        escrowCase.totalDeposited += amount;

        emit Deposited(caseId, msg.sender, participantId, escrowCase.token, amount);
    }

    function approveRelease(uint256 caseId) external caseExists(caseId) onlyOpen(caseId) {
        EscrowCase storage escrowCase = cases[caseId];
        require(approvers[caseId][msg.sender], "not approver");
        require(!approved[caseId][msg.sender], "already approved");

        approved[caseId][msg.sender] = true;
        escrowCase.approvalCount += 1;

        emit ReleaseApproved(caseId, msg.sender, escrowCase.approvalCount);
    }

    function release(uint256 caseId) external caseExists(caseId) onlyOpen(caseId) {
        EscrowCase storage escrowCase = cases[caseId];
        require(msg.sender == escrowCase.creator || approvers[caseId][msg.sender], "not release actor");
        require(escrowCase.totalDeposited == escrowCase.totalRequired, "deposits incomplete");
        require(escrowCase.approvalCount >= escrowCase.requiredApprovalCount, "approvals incomplete");

        escrowCase.state = CaseState.Released;
        uint256 amount = escrowCase.totalDeposited;

        if (escrowCase.token == address(0)) {
            (bool sent, ) = payable(escrowCase.releaseRecipient).call{value: amount}("");
            require(sent, "native release failed");
        } else {
            _safeTransfer(escrowCase.token, escrowCase.releaseRecipient, amount);
        }

        emit Released(caseId, escrowCase.releaseRecipient, escrowCase.token, amount);
    }

    function refund(uint256 caseId) external caseExists(caseId) onlyOpen(caseId) {
        EscrowCase storage escrowCase = cases[caseId];
        require(escrowCase.deadline > 0 && block.timestamp >= escrowCase.deadline, "refund unavailable");

        Requirement storage requirement = requirements[caseId][msg.sender];
        require(requirement.exists, "not participant");
        require(requirement.complete, "nothing deposited");
        require(!requirement.refunded, "already refunded");

        requirement.refunded = true;
        uint256 amount = requirement.deposited;
        escrowCase.totalDeposited -= amount;

        if (escrowCase.token == address(0)) {
            (bool sent, ) = payable(msg.sender).call{value: amount}("");
            require(sent, "native refund failed");
        } else {
            _safeTransfer(escrowCase.token, msg.sender, amount);
        }

        emit Refunded(caseId, msg.sender, escrowCase.token, amount);

        if (escrowCase.totalDeposited == 0) {
            escrowCase.state = CaseState.Refunded;
        }
    }

    function voidCase(uint256 caseId, bytes32 reasonHash) external caseExists(caseId) onlyOpen(caseId) {
        EscrowCase storage escrowCase = cases[caseId];
        require(msg.sender == escrowCase.creator, "only creator");
        require(reasonHash != bytes32(0), "reason required");

        escrowCase.state = CaseState.Voided;
        emit Voided(caseId, reasonHash);
    }

    function getCase(uint256 caseId) external view returns (EscrowCase memory) {
        return cases[caseId];
    }

    function getRequirement(uint256 caseId, address participant) external view returns (Requirement memory) {
        return requirements[caseId][participant];
    }

    function getParticipant(uint256 caseId, uint32 index) external view returns (address) {
        return participantAddresses[caseId][index];
    }

    function isApprover(uint256 caseId, address actor) external view returns (bool) {
        return approvers[caseId][actor];
    }

    function hasApproved(uint256 caseId, address actor) external view returns (bool) {
        return approved[caseId][actor];
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        bool ok = IERC20Minimal(token).transfer(to, amount);
        require(ok, "token transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        bool ok = IERC20Minimal(token).transferFrom(from, to, amount);
        require(ok, "token transferFrom failed");
    }
}
