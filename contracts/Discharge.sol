pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Discharge is ExtraordinaryGA {

    function proposeDischarge() public onlyDelegate onlyDuringAnnualGA {
        super.submitProposal("Propose Discharge", 0, address(0), 10 minutes);
    }

    function voteForDischarge(uint256 proposalId, bool favor) public onlyMember onlyDuringAnnualGA {
        super.voteForProposal(proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        // super.concludeProposal(proposalId);
        proposals[proposalId].concluded = true;
        concludeVoteForDischarge(proposalId);
    }

    function concludeVoteForDischarge(uint256 proposalId) private {
        // TODO:
    }

}
