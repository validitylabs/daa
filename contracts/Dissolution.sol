pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Dissolution is ExtraordinaryGA {

    uint256 private constant voteTime = 10 minutes;

    // Proposal has to be readable by external SC
    function getDissolutionProposal(uint256 proposalId) external constant returns (
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
        return getProposal(DISSOLUTION, proposalId);
    }

    function proposeDissolution(address beneficiary) public onlyMember onlyDuringGA {
        require(beneficiary != address(0));
        super.submitProposal(DISSOLUTION, "Dissolution", 0, beneficiary, voteTime);
    }

    function voteForDissolution(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(DISSOLUTION, proposalId, favor);
    }

    function concludeProposal(uint256 proposalType, uint256 proposalId) internal {
        if (proposalType == DISSOLUTION) {
            concludeVoteForDissolution(proposalId);
        } else if (proposalType == GENERAL_ASSEMBLY) {
            concludeGeneralAssemblyVote(proposalId);
        }
    }

    function concludeVoteForDissolution(uint256 proposalId) private {
        // require(proposalId < proposals[DISSOLUTION].length);

        // ⅔ of all existing members have to vote “yes”
        // for * 3 >= (all members) * 2
        Proposal storage proposal = proposals[DISSOLUTION][proposalId];
        bool res = proposal.votesFor.mul(uint256(3)) >= getAllMembersCount().mul(uint256(2));

        proposal.result = res;
        if (res) {
            selfdestruct(proposal.destinationAddress);
        }
    }

}
