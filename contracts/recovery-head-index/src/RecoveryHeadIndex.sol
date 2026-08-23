// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Account-owned compare-and-swap heads for encrypted recovery streams.
/// @dev The stored digest is only a locator integrity boundary. It cannot grant
/// membership, change money state, or replace ChopDot's signed event history.
contract RecoveryHeadIndex {
    struct Head {
        uint64 sequence;
        bytes32 digest;
    }

    mapping(address => mapping(bytes32 => Head)) private heads;

    error EmptyStream();
    error EmptyDigest();
    error HeadMismatch(uint64 actualSequence, bytes32 actualDigest);
    error SequenceExhausted();

    event HeadAdvanced(
        address indexed owner,
        bytes32 indexed stream,
        uint64 sequence,
        bytes32 digest
    );

    function readHead(address owner, bytes32 stream)
        external
        view
        returns (uint64 sequence, bytes32 digest)
    {
        if (stream == bytes32(0)) revert EmptyStream();
        Head storage head = heads[owner][stream];
        return (head.sequence, head.digest);
    }

    function advanceHead(
        bytes32 stream,
        uint64 expectedSequence,
        bytes32 expectedDigest,
        bytes32 nextDigest
    ) external {
        if (stream == bytes32(0)) revert EmptyStream();
        if (nextDigest == bytes32(0)) revert EmptyDigest();

        Head storage head = heads[msg.sender][stream];
        if (head.sequence != expectedSequence || head.digest != expectedDigest) {
            revert HeadMismatch(head.sequence, head.digest);
        }
        if (expectedSequence == type(uint64).max) revert SequenceExhausted();

        uint64 nextSequence = expectedSequence + 1;
        head.sequence = nextSequence;
        head.digest = nextDigest;

        emit HeadAdvanced(msg.sender, stream, nextSequence, nextDigest);
    }
}
