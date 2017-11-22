pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract DelegateCandidacy is ExtraordinaryGA {

    mapping (uint256 => address) candidacies;

    uint256 private constant voteTime = 10 minutes;

    function proposeDelegateCandidacy() public onlyMember onlyDuringGA {
        uint256 proposalId = super.submitProposal(DELEGATE_CANDIDACY, "Propose Delegate Candidacy",
            0, address(0), voteTime);
        candidacies[proposalId] = msg.sender;
    }

    function voteForDelegate(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(DELEGATE_CANDIDACY, proposalId, favor);
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeVoteForDelegate(proposalId);
    }

    function concludeVoteForDelegate(uint256 proposalId) private {
        // TODO: Candidate with most votes in favor is new candidate
        // If 2 or more candidates have same and most number of votes, re-vote on only those

    }
}
