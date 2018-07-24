/**
 * @title The interface to check basic proposals
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./TimedLib.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol"; 

contract ProposalInterface is Ownable {
    function isProposalVotable(bytes32 _proposalID) external view returns (bool);
    
    function isProposalConcludable(bytes32 _proposalID) external view returns (bool);
    
    function isProposalConcluded(bytes32 _proposalID) external view returns (bool);

    function isProposalNotEndYet(bytes32 _proposalID) external view returns (bool);

    function getProposalType(bytes32 _proposalID) external view returns (bool);

    function getProposalFinalResult(bytes32 _proposalID) external view returns (bool);
    
    function canExternalParticipate(bytes32 _proposalID) public view returns (bool);

    function getProposaldestinationAddress(bytes32 _proposalID) public view returns (address);

    function getProposalStatute(bytes32 _proposalID) public view returns (bytes32);

    function getProposalAllowance(bytes32 _proposalID) external view returns (uint256);

    function getProposalProposedDate(bytes32 _proposalID) external view returns (uint256);

    function getProposalProposedAdr(bytes32 _proposalID) external view returns (address);
    
    function getProposalProposedWalletAddress(bytes32 _proposalID) external view returns (address, address);
    
    function checkActionIsUpdateWallet(bytes32 _proposalID) public view returns (bool);

    function checkActionIsDissolution(bytes32 _proposalID) public view returns (bool);
    
    function checkActionIsStatute(bytes32 _proposalID) public view returns (bool);

    function checkActionIsSuccessfulGA(bytes32 _proposalID) public view returns (bool);
    
    function checkActionIsExpel(bytes32 _proposalID) public view returns (bool);

    function updateMembershipContractAddress(address _newAccessible) public;
    
    function updateGAContractAddress(address _newGA) public;

    // function updateContractAddress(address _newAccessible, address _newGA) public;

    function linkContract(address _gaManager, address _daa) public;
}