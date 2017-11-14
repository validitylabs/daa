pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract UpdateOrganization is ExtraordinaryGA {

    uint256 private constant VOTE_TIME_IN_MINS = 10;

    // TODO: args
    function proposeUpdate() public onlyMember onlyDuringGA {
        super.submitProposal(UPDATE_ORGANIZATION, "Update Organization", 0,
            address(0), VOTE_TIME_IN_MINS.mul(1 minutes));
    }

    function voteForUpdate(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(UPDATE_ORGANIZATION, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeVoteForUpdate(proposalId);
    }

    function concludeVoteForUpdate(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        Proposal storage proposal = proposals[UPDATE_ORGANIZATION][proposalId];
        proposal.result = proposal.votesFor.mul(uint(3)) >=
            proposal.votesFor.add(proposal.votesAgainst).mul(uint(2));
    }

}
