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

    // /**
    //  *@param WalletType True when the wallet is internal; False when external
    //  *@param PayorDraw True when the account pays to the wallet; Otherwise, false
    //  */
    // event WalletActivity(address indexed Account, bool indexed WalletType, bool indexed PayOrDraw, uint256 Amount, uint256 timeStamp);
    
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

    /**
     *@dev Check if an adress is not empty.
     */
    modifier notEmpty(address _adr) {
        require(_adr != 0x0);
        _;
    }

    /**
     *@title contructor of the treasury
     *@dev The treasury operates the two wallets, therefore their addresses are needed.
     *     Treasury also needs to double check with the status of each member.
     *     Treasury needs to check the status of proposals with the proposal manager.
     *@param _walletAdr The address of the DAO wallet
     *@param _extWalletAdr The address of the wallet where external organisations can deposit money
     *@param _membershipAdr The address of the Membership contract
     *@param _proposalInterfaceAdr The address of the proposal Manager (interface)
     */
    constructor(address _walletAdr, address _extWalletAdr, address _membershipAdr, address _proposalInterfaceAdr) public {
        daoWallet = Wallet(_walletAdr);
        daoExternalWallet = ExternalWallet(_extWalletAdr);
        accessibleGate = Accessible(_membershipAdr);
        proposalGate = ProposalInterface(_proposalInterfaceAdr);
    }

    /**
     *@title Update the address of the membership contract
     *@dev This function can only be called by the DAA, eventually trigged by a successful proposal
     *@param _newAccessible The address of the new membership contract.
     */
    function updateMembershipContractAddress(address _newAccessible) public onlyOwner notEmpty(_newAccessible) {
        // require(_newAccessible != 0x0);
        accessibleGate = Accessible(_newAccessible);
    }

    /**
     *@title Update address of the proposal manager contract
     *@dev This function can only be called by the DAA, eventually trigged by a successful proposal
     *@param _newProposal The address of the new proposal manager contract.
     */
    function updateProposalContractAddress(address _newProposal) public onlyOwner notEmpty(_newProposal) {
        // require(_newProposal != 0x0);
        proposalGate = ProposalInterface(_newProposal);
    }

    /**
     *@title After a normal proposal is concluded, the beneficiary can trigger this function and
     *       let the treasury to prepare for the allowance accordingly.
     *@dev Anyone can call this function to let the tresury increase allowance of 
     *       the beneficiary after the conclusion of proposals.
     *@param _proposalID the reference ID of proposals.
     */
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

    /**
     *@title Member pay annual membership fee with this function
     *@dev Transfer the money to the wallet.
     */
    function payContribution() public payable memberOnly returns(bool) {
        return daoWallet.payContribution.value(msg.value)(msg.sender);
    }
    
    /**
     *@title Pay the fee when the membership is granted (whitelisted by two)
     *@dev Transfer the money to the wallet only when the value is higher than needed.
     */
    function payNewMembershipFee() public payable returns (bool) {
        require(accessibleGate.checkIsWhitelistedByTwo(msg.sender));
        require(accessibleGate.reachDesiredValue(msg.value));

        accessibleGate.addNewMember(msg.sender);
        daoWallet.payContribution.value(msg.value)(msg.sender);

        // emit WalletActivity(msg.sender, true, true, msg.value, block.timestamp);
    }
    
    /**
     *@title The beneficiary can request payment when proposal is successful and properly concluded.
     *@dev This action can only be taken when there's a delegate of the DAAS.
     */
    function withdrawMoneyFromInternalWallet() public allowPayout returns(bool) {
        return daoWallet.withdrawMoney(msg.sender);
    }

    /**
     *@title The beneficiary can also withdraw money from the external wallet if possible
     *@dev This action can take place even the delegate is not in charge (no modifier of "allowPayout")
     *@param _proposalID the reference ID of proposals.
     */
    function withdrawMoneyFromExternalWallet(bytes32 _proposalID) public returns (bool) {
        return daoExternalWallet.withdrawMoney(_proposalID, msg.sender);
    }

    /**
     *@title Change the address of wallets, upon success of proposal
     *@dev When the proposal is successful, anyone can trigger this action.
     *@notice Anyone can call this function.
     *@param _proposalID the reference ID of proposals.
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
    
    /**
     *@title Getter of member's contribution (membership fee/donation)
     *@param _adr the address of account
     */
    function getIndividualContribution(address _adr) public view returns (uint256) {
        return daoWallet.getIndividualContribution(_adr);
    }

    /**
     *@title Getter of external funding of each external funds
     *@param _proposalID the reference ID of proposals.
     */
    function getProjectExternalFund(bytes32 _proposalID) public view returns (uint256) {
        return daoExternalWallet.getProjectExternalFund(_proposalID);
    }
}