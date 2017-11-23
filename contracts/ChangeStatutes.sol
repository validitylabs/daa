pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract ChangeStatutes is ExtraordinaryGA {

    // sha256 hash of the PDF
    bytes32 public currentStatutes;

    mapping (uint256 => bytes32) hashesForVoting;

    uint256 private constant voteTime = 10 minutes;

    // Proposal has to be readable by external SC
    function getChangeStatutesProposal(uint256 proposalId) external constant returns (
        address submitter,
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 startTime,
        uint256 duration,
        uint256 votesFor,
        uint256 votesAgainst,
        bool concluded,
        bool result
    )
    {
        return getProposal(CHANGE_STATUTES, proposalId);
    }

    // TODO: hashesForVoting as public?
    function getHashForVoting(uint256 proposalId) public constant returns (bytes32) {
        return hashesForVoting[proposalId];
    }

    function setHashOfStatutes(bytes32 hashOfStatutes) public onlyMember onlyDuringGA {
        require(hashOfStatutes != 0); // TODO:

        uint256 proposalId = super.submitProposal(CHANGE_STATUTES, "Change Statutes", 0, address(0), voteTime);
        hashesForVoting[proposalId] = hashOfStatutes;
    }

    function voteForChangeStatutes(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(CHANGE_STATUTES, proposalId, favor);
    }

    function concludeProposal(uint256 proposalType, uint256 proposalId) internal {
        if (proposalType == CHANGE_STATUTES) {
            concludeVoteForChangeStatutes(proposalId);
        } else if (proposalType == GENERAL_ASSEMBLY) {
            concludeGeneralAssemblyVote(proposalId);
        }
    }

    function concludeVoteForChangeStatutes(uint256 proposalId) private {
        // ⅔ of all existing members have to vote “yes”
        // for * 3 >= (all members) * 2
        Proposal storage proposal = proposals[CHANGE_STATUTES][proposalId];
        bool res = proposal.votesFor.mul(uint256(3)) >= getAllMembersCount().mul(uint256(2));

        proposal.result = res;
        if (res) {
            currentStatutes = hashesForVoting[proposalId];
        }
    }

}
