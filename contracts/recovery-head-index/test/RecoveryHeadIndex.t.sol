// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {RecoveryHeadIndex} from "../src/RecoveryHeadIndex.sol";

contract RecoveryHeadIndexCaller {
    function advance(
        RecoveryHeadIndex index,
        bytes32 stream,
        uint64 expectedSequence,
        bytes32 expectedDigest,
        bytes32 nextDigest
    ) external {
        index.advanceHead(stream, expectedSequence, expectedDigest, nextDigest);
    }
}

/// @dev Dependency-free Solidity tests. Any Solidity test runner that treats a
/// reverting `test*` function as failure can execute these without live chain
/// access or privileged cheatcodes.
contract RecoveryHeadIndexTest {
    bytes32 private constant STREAM_A = keccak256("account-directory-a");
    bytes32 private constant STREAM_B = keccak256("account-directory-b");
    bytes32 private constant DIGEST_1 = keccak256("encrypted-locator-1");
    bytes32 private constant DIGEST_2 = keccak256("encrypted-locator-2");

    function testInitialHeadAndAdvance() external {
        RecoveryHeadIndex index = new RecoveryHeadIndex();
        (uint64 initialSequence, bytes32 initialDigest) = index.readHead(address(this), STREAM_A);
        require(initialSequence == 0, "initial sequence");
        require(initialDigest == bytes32(0), "initial digest");

        index.advanceHead(STREAM_A, 0, bytes32(0), DIGEST_1);
        (uint64 sequence, bytes32 digest) = index.readHead(address(this), STREAM_A);
        require(sequence == 1, "advanced sequence");
        require(digest == DIGEST_1, "advanced digest");
    }

    function testStaleCompareAndSwapFailsClosed() external {
        RecoveryHeadIndex index = new RecoveryHeadIndex();
        index.advanceHead(STREAM_A, 0, bytes32(0), DIGEST_1);

        (bool success,) = address(index).call(
            abi.encodeCall(index.advanceHead, (STREAM_A, 0, bytes32(0), DIGEST_2))
        );
        require(!success, "stale write accepted");

        (uint64 sequence, bytes32 digest) = index.readHead(address(this), STREAM_A);
        require(sequence == 1, "stale changed sequence");
        require(digest == DIGEST_1, "stale changed digest");
    }

    function testOwnersAndStreamsAreIsolated() external {
        RecoveryHeadIndex index = new RecoveryHeadIndex();
        RecoveryHeadIndexCaller other = new RecoveryHeadIndexCaller();
        index.advanceHead(STREAM_A, 0, bytes32(0), DIGEST_1);
        other.advance(index, STREAM_A, 0, bytes32(0), DIGEST_2);
        index.advanceHead(STREAM_B, 0, bytes32(0), DIGEST_2);

        (uint64 ownASequence, bytes32 ownADigest) = index.readHead(address(this), STREAM_A);
        (uint64 ownBSequence, bytes32 ownBDigest) = index.readHead(address(this), STREAM_B);
        (uint64 otherSequence, bytes32 otherDigest) = index.readHead(address(other), STREAM_A);
        require(ownASequence == 1 && ownADigest == DIGEST_1, "own a changed");
        require(ownBSequence == 1 && ownBDigest == DIGEST_2, "own b changed");
        require(otherSequence == 1 && otherDigest == DIGEST_2, "other changed");
    }

    function testEmptyStreamAndNextDigestFailClosed() external {
        RecoveryHeadIndex index = new RecoveryHeadIndex();
        (bool emptyStreamSuccess,) = address(index).call(
            abi.encodeCall(index.advanceHead, (bytes32(0), 0, bytes32(0), DIGEST_1))
        );
        (bool emptyDigestSuccess,) = address(index).call(
            abi.encodeCall(index.advanceHead, (STREAM_A, 0, bytes32(0), bytes32(0)))
        );
        require(!emptyStreamSuccess, "empty stream accepted");
        require(!emptyDigestSuccess, "empty digest accepted");
    }
}
