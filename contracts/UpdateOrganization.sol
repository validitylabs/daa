pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract UpdateOrganization is ExtraordinaryGA {

    // TODO: args
    function proposeUpdate() public onlyMember onlyDuringGA {
        super.submitProposal("Update Organization", 0, address(0), 10 minutes);
    }

    function voteForUpdate(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        // super.concludeProposal(proposalId);
        proposals[proposalId].concluded = true;
        concludeVoteForUpdate(proposalId);
    }

    function concludeVoteForUpdate(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        proposals[proposalId].result = proposals[proposalId].votesFor * uint(3) >=
            (proposals[proposalId].votesFor + proposals[proposalId].votesAgainst) * uint(2);
    }

}
