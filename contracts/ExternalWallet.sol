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

    ProposalInterface theProposalInterface;

    struct ProjectDonation{
        mapping(uint256=>address) donerList;
        mapping(address=>uint256) donationPerDoner;
        uint256 totalDoner;
        uint256 totalDonationForProject;
    }
    
    mapping(bytes32=>ProjectDonation) projectDonationList;
    mapping(bytes32=>mapping(address=>uint256)) withdrawingDonation;  // maybe mapping needs to do like bytes32 => address => uint256
    uint256 public totalBalance;


    constructor(address _proposalInterfaceAddress) public {
        // treasuryContract = msg.sender;
        theProposalInterface = ProposalInterface(_proposalInterfaceAddress);
    }

    /**
     *@dev The Treasury forward the payment. Therefore address is passed.
     */
    function depositMoney(bytes32 _proposalID, address _adr) public payable onlyOwner returns(bool) {
        
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
        return true;
    }

    //@dev 
    //@notice If proposal is sucessful upon conclusion, the account made the proposal shall retrieve the money;
    //        Otherwise, is the proposal is not successful, external accounts can ask back their deposit money.
    function withdrawMoney(bytes32 _proposalID, address _adr) public onlyOwner returns(bool) {
        
        // The proposal is concluded. The requester should be either the destination of the proposal or the contributor.
        require(theProposalInterface.isProposalConcluded(_proposalID) == true);
        require(theProposalInterface.getProposaldestinationAddress(_proposalID) == _adr || projectDonationList[_proposalID].donationPerDoner[_adr] > 0);

        bool successful;
        successful = theProposalInterface.getProposalFinalResult(_proposalID);
        address initiator;
        initiator = theProposalInterface.getProposaldestinationAddress(_proposalID);
        uint256 operatingAmount;

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

    //@dev By calling this function, all the ledger and logic in the contract are lost. Only money is transferred to another address.
    function changeWalletAddress(address _newAdr) public onlyOwner returns (bool) {
        selfdestruct(_newAdr);
        return true;
    }

    //@title Getter for the individual contribution.
    function getProjectExternalFund(bytes32 _proposalID) public view onlyOwner returns (uint256) {
        return projectDonationList[_proposalID].totalDonationForProject;
    }

    function() public {}
}