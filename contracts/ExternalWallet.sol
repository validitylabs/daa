/**
 * @title The contract that incorporates the logic of the wallet (for external usage)
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./ProposalInterface.sol";

contract ExternalWallet is Ownable {

    using SafeMath for uint256;

    struct ProjectDonation{
        mapping(uint256=>address) donerList;
        mapping(address=>uint256) donationPerDoner;
        uint256 totalDoner;
        uint256 totalDonationForProject;
    }
    
    ProposalInterface public theProposalInterface;
    uint256 public totalBalance;
    mapping(bytes32=>ProjectDonation) public projectDonationList;
    mapping(bytes32=>mapping(address=>uint256)) public withdrawingDonation;  
    // maybe mapping needs to do like bytes32 => address => 
    
    event DepositMoney(address indexed Account, bytes32 indexed ProposalID, uint256 Amount, uint256 Timestamp);

    /**
     *@title Construct the wallet
     *@dev the owner should be later transterred to the address of the Treasury contract
     *@param _proposalInterfaceAddress the address of ProposalManager contract.
     */
    constructor(address _proposalInterfaceAddress) public {
        theProposalInterface = ProposalInterface(_proposalInterfaceAddress);
    }

    /**
     *@title External accounts deposit money for interesting project, via treasury
     *@dev The Treasury forward the payment. Therefore address is passed. 
     *@notice Although the function is public, onlyOwner can successfully transfer the money. Return true upon success.
     *@param _proposalID the reference ID of proposals
     *@param _adr The account (address) that has deposited the money 
     */
    function depositMoney(
        bytes32 _proposalID, 
        address _adr
    ) public payable onlyOwner returns(bool) {
        // If the project accepts external participation and externals are allowed to deposit money.
        require(theProposalInterface.canExternalParticipate(_proposalID) == true);
        require(theProposalInterface.isProposalNotEndYet(_proposalID) == true);

        uint256 _amount = msg.value;
        uint256 _currentDonation = projectDonationList[_proposalID].donationPerDoner[_adr];

        if (_currentDonation == 0) {
            // Doner does not exists
            projectDonationList[_proposalID].donerList[projectDonationList[_proposalID].totalDoner] = _adr;
            projectDonationList[_proposalID].totalDoner++;
        }

        projectDonationList[_proposalID].donationPerDoner[_adr] = _currentDonation.add(_amount);
        projectDonationList[_proposalID].totalDonationForProject = projectDonationList[_proposalID].totalDonationForProject.add(_amount);
        totalBalance = totalBalance.add(_amount);
        emit DepositMoney(_adr, _proposalID, _amount, now);
        return true;
    }

    /**
     *@title External accounts withdraw money when the proposal is not passed, via treasury
     *@dev If proposal is sucessful upon conclusion, the account made the proposal shall retrieve the money;
            Otherwise, is the proposal is not successful, external accounts can ask back their deposit money.
     *@notice Although the function is public, onlyOwner can successfully transfer the money. Return true upon success.
     *@param _proposalID the reference ID of proposals
     *@param _adr The account (address) that has deposited the money 
     */
    function withdrawMoney(
        bytes32 _proposalID, 
        address _adr
    ) public onlyOwner returns(bool) {
        // The proposal is concluded. The requester should be either the destination of the proposal or the contributor.
        require(theProposalInterface.isProposalConcluded(_proposalID) == true);
        require(theProposalInterface.getProposaldestinationAddress(_proposalID) == _adr || projectDonationList[_proposalID].donationPerDoner[_adr] > 0);

        bool successful;
        address initiator;
        uint256 operatingAmount;
        successful = theProposalInterface.getProposalFinalResult(_proposalID);
        initiator = theProposalInterface.getProposaldestinationAddress(_proposalID);

        // transact the amount of money
        if (successful) {
            assert(initiator == _adr);
             // all the external money of this proposal is ready to be withdrawed.
            operatingAmount = projectDonationList[_proposalID].totalDonationForProject;
            withdrawingDonation[_proposalID][_adr] = operatingAmount;
            projectDonationList[_proposalID].totalDonationForProject = 0;
            if (_adr.send(operatingAmount) == true) {
                totalBalance = totalBalance.sub(operatingAmount);
                delete(projectDonationList[_proposalID]);
                withdrawingDonation[_proposalID][_adr] = 0;
                return true;
            } else {
                projectDonationList[_proposalID].totalDonationForProject = operatingAmount;
                withdrawingDonation[_proposalID][_adr] = 0;
                return false;
            }
        } else {
            assert(initiator != _adr);
            // only the address's contribution to this project is ready to be withdrawed.
            operatingAmount = projectDonationList[_proposalID].donationPerDoner[_adr];
            withdrawingDonation[_proposalID][_adr] = operatingAmount;
            projectDonationList[_proposalID].donationPerDoner[_adr] = 0;
            if (_adr.send(operatingAmount) == true) {
                totalBalance = totalBalance.sub(operatingAmount);
                projectDonationList[_proposalID].donationPerDoner[_adr] = 0;
                withdrawingDonation[_proposalID][_adr] = 0;
                return true;
            } else {
                projectDonationList[_proposalID].totalDonationForProject = operatingAmount;
                withdrawingDonation[_proposalID][_adr] = 0;
                return false;
            }
        }
    }

    /**
     *@title When smth happened, change the wallet addres to the new one. 
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
    function getProjectExternalFund(bytes32 _proposalID) public view onlyOwner returns (uint256) {
        return projectDonationList[_proposalID].totalDonationForProject;
    }

}