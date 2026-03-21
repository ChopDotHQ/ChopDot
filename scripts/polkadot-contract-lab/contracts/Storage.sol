// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Storage {
    uint256 private value;

    event ValueChanged(uint256 previousValue, uint256 newValue, address indexed updater);

    constructor(uint256 initialValue) {
        value = initialValue;
        emit ValueChanged(0, initialValue, msg.sender);
    }

    function read() external view returns (uint256) {
        return value;
    }

    function write(uint256 newValue) external {
        uint256 previousValue = value;
        value = newValue;
        emit ValueChanged(previousValue, newValue, msg.sender);
    }

    function double() external {
        uint256 previousValue = value;
        uint256 newValue = previousValue * 2;
        value = newValue;
        emit ValueChanged(previousValue, newValue, msg.sender);
    }
}
