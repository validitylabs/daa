pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Discharge is ExtraordinaryGA {

    uint256 private constant voteTime = 10 minutes;

    function Discharge(uint256 _fee, address _whitelister1, address _whitelister2)
        ExtraordinaryGA(_fee, _whitelister1, _whitelister2) {

    }

    // Proposal has to be readable by external SC
    function getDischargeProposal(uint256 proposalId) external constant returns (
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
        return getProposal(DISCHARGE, proposalId);
    }

    function proposeDischarge() public onlyDelegate onlyDuringAnnualGA {
        super.submitProposal(DISCHARGE, "Propose Discharge", 0, address(0), voteTime);
    }

    function voteForDischarge(uint256 proposalId, bool favor) public onlyMember onlyDuringAnnualGA {
        super.voteForProposal(DISCHARGE, proposalId, favor);
    }

    function concludeVoteForDischarge(uint256 proposalId) public onlyMember {
        super.concludeProposal(DISCHARGE, proposalId);

        // We need simple majority in favor of discharge. A resulting event will be logged.
        // This has no influence on DAA, is only required for legal reasons
        // (the delegate might be legally responsible).
        Proposal storage proposal = proposals[DISCHARGE][proposalId];
        proposal.result = proposal.votesFor > proposal.votesAgainst;
        proposal.concluded = true;
    }

}
