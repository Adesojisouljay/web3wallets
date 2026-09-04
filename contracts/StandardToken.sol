// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StandardToken is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsValue
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimalsValue;
        _mint(msg.sender, initialSupply * 10 ** decimalsValue);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
