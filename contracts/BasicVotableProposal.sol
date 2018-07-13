/**
 * @title Basic Votable Proposal 
 * @notice This contract will be heritated and instantiated by GA proposal or other proposals
 * @dev  The contract contains the basic information of . 
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./TallyClerkLib.sol";
import "./TimedLib.sol";

contract BasicVotableProposal is Accessible {

    using TallyClerkLib for *;
    using TimedLib for uint256;
 
    bytes32 public proposalID;
    bytes32 public shortDescription;    // This allows members to quickly check the proposal before participating in the vote.
    uint256 public startingTime;        // Blocktime of the start of the voting for proposal
    uint256 public endingTime;          // Blocktime of the end of the voting
    bool public concludeStatus;         // Whether the purposal is concluded by someone
    bool public finalResult;            // The concluded result of the proposal. Only valid after the concludeStatus == true;

    TallyClerkLib.VotesPerProposal votesForEachProposal;

    //@TODO This modifier needs to be modified when the "Timed" library is programmed.
    //@TODO Need to check which one is the standard duration for such functionality
    modifier validProposalTime(uint256 _duration) {
        require(_duration.isInside(0,10 minutes));
        _;
    }

    modifier concludable {
        require(block.timestamp.isFinished(endingTime));
        _;
    }

    modifier votable {
        require(block.timestamp.isInside(startingTime,endingTime));
        _;
    }

    modifier isConcluded {
        require(concludeStatus == true);
        _;
    }

    function voteForProposal(uint256 _answer) public memberOnly votable returns (bool) {
        require(_answer < 3);   //TallyClerk.voteTicket{Abstain, No, Yes}
        votesForEachProposal.participantList[msg.sender] = TallyClerkLib.voteTicket(_answer);
        votesForEachProposal.participantNum++;
        if (_answer == 0) {
            votesForEachProposal.abstainNum++;
        } else if (_answer == 1) {
            votesForEachProposal.yesNum++;
        }
        return true;
    }

    /**
     *@title Conclude the current concludable proposal
     *@notice This function shall be called by anyone, even non-members.
     */
    function concludeProposal() concludable public returns (bool) {
    //@TODO Execute proposal directly within the contract. 
    }

    /**
     *@title Destruct the proposal, if the proposal is already concluded and (executed or invalid), 
     *@notice This function shall be called by anyone, even non-members.
     */
     //@TODO Whether this function is allowed to be called while the proposal is still open ? 
     //      Nope... Otherwise, the proposal initiator may destroy the proposal when he realised it is not favorable for him.
    function destructProposal() isConcluded public returns (bool) {
    }

    /**
     *@title Conclude the current concludable proposal
     */
    function isProposalOpen() public view returns (bool) {
        return block.timestamp.isInside(startingTime,endingTime);
    }
}