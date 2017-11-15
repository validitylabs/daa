pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExpelMember is Proposals {

    uint256 private constant voteTime = 1 weeks;

    mapping (uint256 => address) membersToExpel;

    function proposeExpelMember(address member) public onlyMember {
        uint256 proposalId = super.submitProposal(EXPEL_MEMBER, "Expel Member", 0,
            address(0), voteTime);
        membersToExpel[proposalId] = member;
    }

    function voteToExpelMember(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(EXPEL_MEMBER, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeExpel(proposalId);
    }

    function concludeExpel(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        Proposal storage proposal = proposals[EXPEL_MEMBER][proposalId];
        uint256 allVoted = proposal.votesFor.add(proposal.votesAgainst);
        bool res = proposal.votesFor.mul(uint(3)) >= allVoted.mul(uint(2)) &&
            allVoted.mul(uint(10)) >= getAllMembersCount();

        proposal.result = res;
        if (res) {
            address addrs = membersToExpel[proposalId];
            delete members[addrs];
        }
    }

}
