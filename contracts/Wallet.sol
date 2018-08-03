/**
 * @title The contract that incorporates the logic of the wallet (for internal usage)
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Wallet is Ownable {

    using SafeMath for uint256;

    uint256 public totalBalance;
    uint256 public totalAllowance;
    // mapping(address=>uint256) public lastPaidYear;
    mapping(address=>uint256) public individualContribution;     // This mapping can be made from a hashed address to the amount (in order to hide sensitive information)
    mapping(address=>uint256) public allowance;
    mapping(address=>uint256) public withdrawingAllowance;


    event IncreaseAllowance(address indexed Account, uint256 Amount, uint256 Timestamp);
    event AcceptPayment(address indexed Account, uint256 Amount, uint256 Timestamp);
    event WithdrawMoney(address indexed Account, uint256 Amount, uint256 Timestamp);

    constructor() public {}

    /**
     *@title fallback when receving money for unknown reason
     *@dev If some extra money received. Well, thank you.
     */
    function() public payable {
        totalBalance = totalBalance.add(msg.value);
        individualContribution[msg.sender] = individualContribution[msg.sender].add(msg.value);
    }
    /**
     *@title Increase the allowance of the account to withdraw
     *@dev This function is called when the proposal is successful, therefore it allows certain account to withdraw money from this wallet (via treasury account)
     */
    function increaseAllowance(address _adr, uint256 _amount) public onlyOwner returns (bool) {
        require(totalAllowance.add(_amount) <= totalBalance);
        allowance[_adr] = allowance[_adr].add(_amount);
        totalAllowance = totalAllowance.add(_amount);
        emit IncreaseAllowance(_adr, _amount, block.timestamp);
        return true;
    }

    //@dev This function actually accepts users to pay for another one. Therefore, we use an explicit destination address, instead of tx.origin
    /**
     *@title Accept the member to pay their membership fee, via Treasury
     *@dev
     */
    function payContribution(address _adr) public payable onlyOwner returns(bool) {
        uint256 _amount = msg.value;
        totalBalance = totalBalance.add(_amount);
        individualContribution[_adr] = individualContribution[_adr].add(_amount);
        emit AcceptPayment(_adr, _amount, block.timestamp);
        return true;
    }

    /**
     *@title Let beneficiary withdraw money, if the proposal is successful
     *@dev When the account asks for money, the wallet gives all that is allowed.
     *@notice We create a sandbox where stores a snapshot of ready-to-withdraw money. 
        The amount can be reverted back to main balance sheet if needed.
     */
    function withdrawMoney(address _adr) public onlyOwner returns(bool) {
        require(allowance[_adr] > 0);

        uint256 operatingAmount = allowance[_adr];
        withdrawingAllowance[_adr] = operatingAmount;
        allowance[_adr] = allowance[_adr].sub(operatingAmount);

        if (_adr.send(withdrawingAllowance[_adr]) == true) {
            totalAllowance = totalAllowance.sub(withdrawingAllowance[_adr]);
            totalBalance = totalBalance.sub(withdrawingAllowance[_adr]);
            withdrawingAllowance[_adr] = 0;
            emit WithdrawMoney(_adr, totalAllowance, block.timestamp);
            return true;
        } else {
            allowance[_adr] = allowance[_adr].add(withdrawingAllowance[_adr]);
            withdrawingAllowance[_adr] = 0;
            return false;
        }
    }

    /**
     *@title When smth happened, change the external wallet addres to the new one. 
     *@dev This is owner-only, which is DAA only
     *@notice By calling this function, all the ledger and logic in the contract are lost. 
     Only money is transferred to another address.
     */
    function changeWalletAddress(address _newAdr) public onlyOwner returns (bool) {
        selfdestruct(_newAdr);
        return true;
    }

    /**
     *@title Getter for the individual contribution.
     *@param _proposalID the reference ID of proposals
     */
    function getIndividualContribution(address _adr) public view onlyOwner returns (uint256) {
        return individualContribution[_adr];
    }

    /**
     *@title Getter for current balance
     */
    function getTotalBalance() public view returns (uint256, uint256) {
        return (totalBalance, address(this).balance);
    }
}