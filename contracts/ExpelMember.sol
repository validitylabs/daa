pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExpelMember is Proposals {

    mapping (uint256 => address) membersToExpel;

    function proposeExpelMember(address member) public onlyMember {
        uint256 proposalId = super.submitProposal("Update Organization", 0, address(0), 1 weeks);
        membersToExpel[proposalId] = member;
    }

    function voteToExpelMember(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        // super.concludeProposal(proposalId);
        proposals[proposalId].concluded = true;
        concludeExpel(proposalId);
    }

    function concludeExpel(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        uint256 allVoted = proposals[proposalId].votesFor + proposals[proposalId].votesAgainst;
        bool res = proposals[proposalId].votesFor * uint(3) >= allVoted * uint(2) &&
            allVoted * uint(10) >= getAllMembersCount();

        proposals[proposalId].result = res;
        if (res) {
            address addrs = membersToExpel[proposalId];
            delete members[addrs];
        }
    }

}
