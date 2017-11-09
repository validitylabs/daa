pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract ChangeStatutes is ExtraordinaryGA {

    uint256 private constant voteTimeInMins = 10;

    function setHashOfStatutes(bytes32 hashOfStatutes) public onlyMember onlyDuringGA {
        super.submitProposal(CHANGE_STATUTES, hashOfStatutes, 0, address(0), voteTimeInMins * 1 minutes);
    }

    function voteForChangeStatutes(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(CHANGE_STATUTES, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeVoteForChangeStatutes(proposalId);
    }

    function concludeVoteForChangeStatutes(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        Proposal storage proposal = proposals[CHANGE_STATUTES][proposalId];
        proposal.result = proposal.votesFor * uint(3) >=
            proposal.votesFor.add(proposal.votesAgainst) * uint(2);
    }

}
