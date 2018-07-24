/**
 * @title The contract that incorporates the logic of the wallet (for internal usage)
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Wallet.sol";
import "./ExternalWallet.sol";
import "./Accessible.sol";
import "./ProposalInterface.sol";
import "./DAA.sol";

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol"; 

contract Treasury is Ownable{

    Wallet public daoWallet;
    ExternalWallet public daoExternalWallet; 
    Accessible public accessibleGate;
    ProposalInterface public proposalGate;
    DAA public daa;
    mapping(bytes32=>bool) public cleared;

    constructor(address _walletAdr, address _extWalletAdr, address _membershipAdr, address _proposalInterfaceAdr) public {
        daoWallet = Wallet(_walletAdr);
        daoExternalWallet = ExternalWallet(_extWalletAdr);
        accessibleGate = Accessible(_membershipAdr);
        proposalGate = ProposalInterface(_proposalInterfaceAdr);
    }

    modifier uponProposalSuccess(bytes32 _proposalID) {
        require(proposalGate.getProposalFinalResult(_proposalID));
        _;
    }

    modifier expectProposalType(bytes32 _proposalID, bool _isGAProposal) {
        require(proposalGate.getProposalType(_proposalID) == _isGAProposal);
        _;
    }

    modifier memberOnly {
        require(accessibleGate.checkIsMember(msg.sender));
        _;
    }

    /**
     *@dev When the delegate stepped down, no one can drain money from the internal wallet. 
     *     GA proposals can be concluded. Deposit in the external wallet can be reclaimed and withdrawed.
     *     Normal proposals can be conlcluded, but no money can be withdrawed at the moment until the new delegate is in place.
     */
    modifier allowPayout {
        require(accessibleGate.hasDelegate());
        _;
    }

    // new functions 
    function updateMembershipContractAddress(address _newAccessible) public onlyOwner {
        require(_newAccessible != 0x0);
        accessibleGate = Accessible(_newAccessible);
    }

    function updateProposalContractAddress(address _newProposal) public onlyOwner {
        require(_newProposal != 0x0);
        proposalGate = ProposalInterface(_newProposal);
    }
    // // old function
    // function updateContractAddress(address _newAccessible, address _newProposal) public onlyOwner {
    //     require(_newAccessible != 0x0 || _newProposal != 0x0);
    //     if (_newAccessible != 0x0) {
    //         accessibleGate = Accessible(_newAccessible);
    //     }
    //     if (_newProposal != 0x0) {
    //         proposalGate = ProposalInterface(_newProposal);
    //     }
    // }


    function startClearing(bytes32 _proposalID) uponProposalSuccess(_proposalID) expectProposalType(_proposalID, false) public returns (bool) {
        address _destination = proposalGate.getProposaldestinationAddress(_proposalID);
        uint256 _amount = proposalGate.getProposalAllowance(_proposalID);
        if (daoWallet.increaseAllowance(_destination, _amount)) {
            cleared[_proposalID] = true;
            return true;
        } else {
            return false;
        }
    }
    
    function payContribution() public payable memberOnly returns(bool) {
        return daoWallet.payContribution.value(msg.value)(msg.sender);
    }

    function payNewMembershipFee() public payable returns (bool) {
        require(accessibleGate.checkIsWhitelistedByTwo(msg.sender));
        require(accessibleGate.reachDesiredValue(msg.value));

        accessibleGate.addNewMember(msg.sender);
        daoWallet.payContribution.value(msg.value)(msg.sender);
    }
    
    function withdrawMoneyFromInternalWallet() public allowPayout returns(bool) {
        return daoWallet.withdrawMoney(msg.sender);
    }

    function withdrawMoneyFromExternalWallet(bytes32 _proposalID) public returns (bool) {
        return daoExternalWallet.withdrawMoney(_proposalID, msg.sender);
    }

    /**
     *@dev When the proposal is successful, anyone can trigger this action.
     */
    function changeWalletAddress(
        bytes32 _proposalID
    ) public uponProposalSuccess(_proposalID) returns (bool) {
        require(proposalGate.checkActionIsUpdateWallet(_proposalID));
        address _newInternalWalletAdr;
        address _newExternalWalletAdr;
        (_newInternalWalletAdr, _newExternalWalletAdr) = proposalGate.getProposalProposedWalletAddress(_proposalID);
        // require(msg.sender == address(proposalGate));
        require(_newInternalWalletAdr != 0x0 || _newExternalWalletAdr != 0x0);
        // This function can only be called by the proposalManager (upon )
        // only upon success of GA proposal. If one address is 0x0 then that wallet doesn't change.
        if (_newInternalWalletAdr != 0x0) {
            daoWallet = Wallet(_newInternalWalletAdr);
            daoWallet.changeWalletAddress(_newInternalWalletAdr);
            daa.updateInternalWallet(_newInternalWalletAdr);
        }
        if (_newExternalWalletAdr != 0x0) {
            daoExternalWallet = ExternalWallet(_newExternalWalletAdr);
            daoExternalWallet.changeWalletAddress(_newExternalWalletAdr);
            daa.updateExternalWallet(_newExternalWalletAdr);
        }
        return true;
    }
    
    function getIndividualContribution(address _adr) public view returns (uint256) {
        return daoWallet.getIndividualContribution(_adr);
    }

    function getProjectExternalFund(bytes32 _proposalID) public view returns (uint256) {
        return daoExternalWallet.getProjectExternalFund(_proposalID);
    }
    
    //@TODO payable to wallet
    function() public {}
}