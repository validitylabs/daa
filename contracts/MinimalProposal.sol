/**
 * @title The interface to check basic proposals
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./TimedLib.sol";
// import "./ProposalInterface.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 

contract MinimalProposal {

    using TimedLib for uint256;

    struct BasicProposal {
        bytes32 proposalID;          // This attribute needs to be replaced by the incremental proposalID (uint256)
        // uint256 proposalID;
        bytes32 shortDescription;    // This allows members to quickly check the proposal before participating in the vote.
        uint256 startingTime;        // Blocktime of the start of the voting for proposal
        uint256 endingTime;          // Blocktime of the end of the voting
        bool concludeStatus;         // Whether the purposal is concluded by someone
        bool finalResult;            // The concluded result of the proposal. Only valid after the concludeStatus == true;
        bool proposalType;           // False for normal proposal; True for GA proposal;
        // There is no need for the proposalType when the actionType is expanded with one additional element for non GA proposals
    }

    // uint256 public currentProposalID;   // This takes care of the counter for the next new proposal. 
                                        // Noted, there is a chance that when the proposal manager get updated, this variable is set by default to 0 and mess up with the wallet system.
    mapping(bytes32=>BasicProposal) public proposalList;

    modifier votable(bytes32 _proposalID) {
        require(block.timestamp.isInside(proposalList[_proposalID].startingTime,proposalList[_proposalID].endingTime));
        _;
    }

    modifier concludable(bytes32 _proposalID) {
        require(block.timestamp.isFinished(proposalList[_proposalID].endingTime));
        _;
    }

    modifier concluded(bytes32 _proposalID) {
        require(proposalList[_proposalID].concludeStatus == true);
        _;
    }

    modifier correctProposalType(bytes32 _proposalID, bool _typeShouldBe) {
        require(proposalList[_proposalID].proposalType == _typeShouldBe);
        _;
    }

    //@TODO Check if this function is useful or not
    modifier shouldLastNoLongerThan(uint256 _proposedDuration, uint256 _maxDuration) {
        require(_proposedDuration.isInside(0, _maxDuration));
        _;
    }

    modifier canTakeAction(bytes32 _proposalID) {
        require(proposalList[_proposalID].concludeStatus == true && proposalList[_proposalID].finalResult == true);
        _;
    }

    // ----- Functions -----

    function isProposalVotable(bytes32 _proposalID) external view returns (bool) {
        return block.timestamp.isInside(proposalList[_proposalID].startingTime,proposalList[_proposalID].endingTime);
    }
    
    function isProposalConcludable(bytes32 _proposalID) external view returns (bool) {
        return block.timestamp.isFinished(proposalList[_proposalID].endingTime);
    }
    
    function isProposalConcluded(bytes32 _proposalID) external view returns (bool) {
        return proposalList[_proposalID].concludeStatus;
    }

    function isProposalNotEndYet(bytes32 _proposalID) external view returns (bool) {
        return block.timestamp.isInside(0,proposalList[_proposalID].endingTime);
    }

    /**
     *@dev Return the type of proposal: If it is a normal proposal then return false; If it's a GA proposal, return true;
     */
    function getProposalType(bytes32 _proposalID) external view returns (bool) {
        return proposalList[_proposalID].proposalType;
    }

    function getProposalFinalResult(bytes32 _proposalID) external view returns (bool) {
        require(proposalList[_proposalID].concludeStatus == true);
        return proposalList[_proposalID].finalResult;
    }
}