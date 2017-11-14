pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Discharge is ExtraordinaryGA {

    uint256 private constant VOTE_TIME_IN_MINS = 10;

    function proposeDischarge() public onlyDelegate onlyDuringAnnualGA {
        super.submitProposal(DISCHARGE, "Propose Discharge", 0, address(0),
            VOTE_TIME_IN_MINS.mul(1 minutes));
    }

    function voteForDischarge(uint256 proposalId, bool favor) public onlyMember onlyDuringAnnualGA {
        super.voteForProposal(DISCHARGE, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeVoteForDischarge(proposalId);
    }

    function concludeVoteForDischarge(uint256 proposalId) private {
        Proposal storage proposal = proposals[DISCHARGE][proposalId];
        proposal.result = proposal.votesFor > proposal.votesAgainst;
    }

}
