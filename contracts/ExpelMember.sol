pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExpelMember is Proposals {

    uint256 private constant voteTime = 1 weeks;

    mapping (uint256 => address) membersToExpel;

    function ExpelMember(uint256 _fee, address _whitelister1, address _whitelister2)
        Proposals(_fee, _whitelister1, _whitelister2) {

    }

    // Proposal has to be readable by external SC
    function getExpelMemberProposal(uint256 proposalId) external constant returns (
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
        return getProposal(EXPEL_MEMBER, proposalId);
    }

    // TODO: membersToExpel as public?
    function getMemberToExpel(uint256 proposalId) public constant returns (address) {
        return membersToExpel[proposalId];
    }

    function proposeExpelMember(address member) public onlyMember {
        require(member != address(0));

        uint256 proposalId = super.submitProposal(EXPEL_MEMBER, "Expel Member", 0,
            address(0), voteTime);
        membersToExpel[proposalId] = member;
    }

    // can not vote against ?
    function voteToExpelMember(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(EXPEL_MEMBER, proposalId, favor);
    }

    function concludeExpel(uint256 proposalId) public onlyMember {
        super.concludeProposal(EXPEL_MEMBER, proposalId);

        // 10 % of all members have voted AND ⅔ of those voters were in favor
        // for * 3 >= (for + against) * 2
        Proposal storage proposal = proposals[EXPEL_MEMBER][proposalId];
        uint256 allVoted = proposal.votesFor.add(proposal.votesAgainst);
        bool res = allVoted.mul(uint256(10)) >= getAllMembersCount() &&
            proposal.votesFor.mul(uint256(3)) >= allVoted.mul(uint256(2));

        proposal.result = res;
        proposal.concluded = true;
        if (res) {
            address addrs = membersToExpel[proposalId];
            delete members[addrs];
        }
    }

}
