/**
 * @title The contract that manages the creation and voting of the DAA.
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Membership.sol";
// import "./ProposalManager.sol";
import "./ProposalInterface.sol";
import "./GAManager.sol";
import "./Treasury.sol";
// import "./ExternalDepositWallet.sol";
// import "./Wallet.sol";
import "./DAAInterface.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 

contract DAA {

    Membership public membershipContract;
    // ProposalManager public proposalManagerContract;
    ProposalInterface public proposalManagerContract;
    GAManager public gaManagerContract;
    Treasury public treasuryContract;
    address public walletAddress;
    address public externalWalletAddress;
    bool public alreadyBeCalledOnce;
    bool public active;

    /**
     *@title Form a DAA with contracts that manages groups of functionalities.
     *@param _membership The address of Membership contract
     *@param _proposalManager The address of the proposal manager contract
     *@param _GA The address of the GA contract
     *@param _wallet The address of the internal wallet contract
     *@param _externalWallet The address of the external wallet contract
     */
    constructor(address _membership, address _proposalManager, address _GA, address _treasury, address _wallet, address _externalWallet) public {
        membershipContract = Membership(_membership);
        // proposalManagerContract = ProposalManager(_proposalManager);
        proposalManagerContract = ProposalInterface(_proposalManager);
        gaManagerContract = GAManager(_GA);
        treasuryContract = Treasury(_treasury);
        walletAddress = _wallet;
        externalWalletAddress = _externalWallet;
        active = true;
    }

    modifier proposalOnly {
        require(msg.sender == address(proposalManagerContract));
        _;
    }

    modifier treasuryOnly {
        require(msg.sender == address(treasuryContract));
        _;
    }

    // new function that updates one address per time
    function updateMembershipAddress(address _newAdr) proposalOnly external {
        membershipContract = Membership(_newAdr);
        // start to change other contracts, including treasury and gaManager
        gaManagerContract.updateMembershipContractAddress(_newAdr);
        treasuryContract.updateMembershipContractAddress(_newAdr);
        proposalManagerContract.updateMembershipContractAddress(_newAdr);
        // gaManagerContract.updateContractAddress(_newAdr,0x0);
        // treasuryContract.updateContractAddress(_newAdr,0x0);
        // membershipContract.updateContractAddress(0x0, _newAdr);
    }

    function updateProposalAddress(address _newAdr) proposalOnly external {
        proposalManagerContract = ProposalInterface(_newAdr);
        membershipContract.updateProposalContractAddress(_newAdr);
        gaManagerContract.updateProposalContractAddress(_newAdr);
        treasuryContract.updateProposalContractAddress(_newAdr);
    }

    function updateTreasuryAddreess(address _newAdr) proposalOnly external {
        membershipContract.updateTreasuryAddress(_newAdr);
    }

    function updateGAAddress(address _newAdr) proposalOnly external {
        gaManagerContract = GAManager(_newAdr);
        // start to change contract addresses, including proposalManager
        proposalManagerContract.updateGAContractAddress(_newAdr);
        membershipContract.updateGAContractAddress(_newAdr);
    }

    function updateInternalWallet(address _newAdr) external treasuryOnly {
        // require(msg.sender == address(treasuryContract));
        walletAddress = _newAdr;
    }

    function updateExternalWallet(address _newAdr) external treasuryOnly {
        // require(msg.sender == address(treasuryContract));
        externalWalletAddress = _newAdr;
    }

    // // old functions - need to be replaced by the new one that separates the update functions 
    // function updateMembershipAddress(address _newAdr) proposalOnly external {
    //     membershipContract = Membership(_newAdr);
    //     // start to change other contracts, including treasury and gaManager
    //     gaManagerContract.updateContractAddress(_newAdr,0x0);
    //     treasuryContract.updateContractAddress(_newAdr,0x0);
    //     // membershipContract.updateContractAddress(0x0, _newAdr);
    // }

    // function updateProposalManagerAddress(address _newAdr) proposalOnly external {
    //     // proposalManagerContract = ProposalManager(_newAdr);
    //     proposalManagerContract = ProposalInterface(_newAdr);
    //     // start to change other contracts, including proposalManager, gaManager, and treasury
    //     gaManagerContract.updateContractAddress(0x0, _newAdr);
    //     // proposalManagerContract.updateContractAddress(_newAdr,0x0);
    //     treasuryContract.updateContractAddress(0x0,_newAdr);
    //     // membershipContract.updateContractAddress(_newAdr, 0x0);
    // }

    function finishDeployment() public {
        require(alreadyBeCalledOnce == false);
        alreadyBeCalledOnce = true;
        proposalManagerContract.linkContract(address(gaManagerContract), address(this));
        membershipContract.updateProposalContractAddress(address(proposalManagerContract));
        membershipContract.updateTreasuryAddress(address(treasuryContract));
    }

    //@TODO More things may happen in case of dissolution?
    function dissolveDAA(bytes32 _proposalID) public {
        // upon proposal success
        require(proposalManagerContract.getProposalFinalResult(_proposalID));
        // request is dissolve
        require(proposalManagerContract.checkActionIsDissolution(_proposalID));
        active = false;
    }

}