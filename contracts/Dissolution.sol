pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Dissolution is ExtraordinaryGA {

    function proposeDissolution() public onlyMember onlyDuringGA {
        super.submitProposal("Dissolution", 0, address(0), 10 minutes);
    }

    function voteForDissolution(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        // super.concludeProposal(proposalId);
        proposals[proposalId].concluded = true;
        concludeVoteForDissolution(proposalId);
    }

    function concludeVoteForDissolution(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        proposals[proposalId].result = proposals[proposalId].votesFor * uint(3) >=
            (proposals[proposalId].votesFor + proposals[proposalId].votesAgainst) * uint(2);
    }

}
