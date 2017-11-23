pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract UpdateOrganization is ExtraordinaryGA {

    uint256 private constant voteTime = 10 minutes;

    // Proposal has to be readable by external SC
    function getUpdOrganizationProposal(uint256 proposalId) external constant returns (
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
        return getProposal(UPDATE_ORGANIZATION, proposalId);
    }

    function proposeUpdate(address newDAO) public onlyMember onlyDuringGA {
        require(newDAO != address(0));
        super.submitProposal(UPDATE_ORGANIZATION, "Update Organization", 0,
            newDAO, voteTime);
    }

    function voteForUpdate(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(UPDATE_ORGANIZATION, proposalId, favor);
    }

    function concludeProposal(uint256 proposalType, uint256 proposalId) internal {
        if (proposalType == UPDATE_ORGANIZATION) {
            concludeVoteForUpdate(proposalId);
        } else if (proposalType == GENERAL_ASSEMBLY) {
            concludeGeneralAssemblyVote(proposalId);
        }
    }

    function concludeVoteForUpdate(uint256 proposalId) private {
        // require(proposalId < proposals[UPDATE_ORGANIZATION].length);

        // ⅔ of all existing members have to vote “yes”
        // for * 3 >= (all members) * 2
        Proposal storage proposal = proposals[UPDATE_ORGANIZATION][proposalId];
        bool res = proposal.votesFor.mul(uint256(3)) >= getAllMembersCount().mul(uint256(2));

        proposal.result = res;
        if (res) {
            selfdestruct(proposal.destinationAddress);
        }
    }

}
