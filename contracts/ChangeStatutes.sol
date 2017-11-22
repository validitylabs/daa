pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract ChangeStatutes is ExtraordinaryGA {

    // sha256 hash of the PDF
    bytes32 public currentStatutes;

    mapping (uint256 => bytes32) hashesForVoting;

    uint256 private constant voteTime = 10 minutes;

    function setHashOfStatutes(bytes32 hashOfStatutes) public onlyMember onlyDuringGA {
        uint256 proposalId = super.submitProposal(CHANGE_STATUTES, "Change Statutes", 0, address(0), voteTime);
        hashesForVoting[proposalId] = hashOfStatutes;
    }

    function voteForChangeStatutes(uint256 proposalId, bool favor) public onlyMember onlyDuringGA {
        super.voteForProposal(CHANGE_STATUTES, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeVoteForChangeStatutes(proposalId);
    }

    function concludeVoteForChangeStatutes(uint256 proposalId) private {
        // ⅔ have to vote “yes”
        // for * 3 >= (for + against) * 2
        Proposal storage proposal = proposals[CHANGE_STATUTES][proposalId];
        bool res = proposal.votesFor.mul(uint256(3)) >=
            proposal.votesFor.add(proposal.votesAgainst).mul(uint256(2));

        proposal.result = res;
        if (res) {
            currentStatutes = hashesForVoting[proposalId];
        }
    }

}
