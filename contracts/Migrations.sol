pragma solidity ^0.4.15;


import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


/**
@title Migrations
@dev This is a truffle contract, needed for truffle integration.
Inherits from contract Ownable
*/
contract Migrations is Ownable {
    uint256 public lastCompletedMigration;

    /**
    @dev Sets the last time that a migration was completed
    @param completed Time
    */
    function setCompleted(uint256 completed) onlyOwner public {
        lastCompletedMigration = completed;
    }

    /**
    @dev Creates a new instance of the contract at the passed address
    @param newAddress A new address of the contract
    */
    function upgrade(address newAddress) onlyOwner public {
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(lastCompletedMigration);
    }
}
