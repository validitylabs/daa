pragma solidity ^0.4.15;


import './Proposals.sol';


contract SimpleProposals is Proposals {

    // Proposal has to be readable by external SC
    function getSimpleProposal(uint256 proposalId) external constant returns (
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
        return getProposal(SIMPLE_PROPOSAL, proposalId);
    }

    function submitProposal(
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 duration
    )
        public
        onlyMember
        returns (uint256)
    {
        return submitProposal(SIMPLE_PROPOSAL, name, amount, destinationAddress, duration);
    }

    function extendProposalDuration(uint256 proposalId, uint256 time) public onlyMember {
        extendProposalDuration(SIMPLE_PROPOSAL, proposalId, time);
    }

    function voteForProposal(uint256 proposalId, bool favor) public onlyMember {
        voteForProposal(SIMPLE_PROPOSAL, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        Proposal storage proposal = proposals[SIMPLE_PROPOSAL][proposalId];
        proposal.result = proposal.votesFor > proposal.votesAgainst;
    }

}
