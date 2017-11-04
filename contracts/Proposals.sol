pragma solidity ^0.4.15;


import './Membership.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';


contract Proposals is Membership {

    using SafeMath for uint256;

    struct Proposal {
        address submitter;
        bytes32 name;
        uint256 amount; // in Wei
        address destinationAddress;
        uint256 startTime;
        uint256 duration;
        uint256 votesFor;
        uint256 votesAgainst;
        // mapping(address => bool) voted;
        bool concluded;
        bool result;
    }

    Proposal[] proposals;

    // Proposal has to be readable by external SC
    function getProposal(uint256 proposalId) external constant returns (
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
        // TODO: Variable is declared as a storage pointer.
        // Use an explicit "storage" keyword to silence this warning.
        Proposal pr = proposals[proposalId];
        return (
            pr.submitter,
            pr.name,
            pr.amount,
            pr.destinationAddress,
            pr.startTime,
            pr.duration,
            pr.votesFor,
            pr.votesAgainst,
            pr.concluded,
            pr.result
        );
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
        require(// duration >= 1 weeks && // TODO: can be 10 mins for Update Organization
            duration <= 60 days);

        proposals.push(Proposal(
            msg.sender,
            name,
            amount,
            destinationAddress,
            now,
            duration,
            0,
            0,
            false,
            false
            )
        );
        return proposals.length - 1;
    }

    function extendProposalDuration(uint256 proposalId, uint256 time) public onlyMember {
        require(proposals[proposalId].submitter == msg.sender);
        require(proposals[proposalId].duration.add(time) <= 60 days);

        proposals[proposalId].duration = proposals[proposalId].duration.add(time);
    }

    function voteForProposal(uint256 proposalId, bool favor) public onlyMember {
        if (proposals[proposalId].startTime.add(proposals[proposalId].duration) < now) {
            if (favor) {
                proposals[proposalId].votesFor += 1;
            } else {
                proposals[proposalId].votesAgainst += 1;
            }
        } else {
            concludeProposal(proposalId);
        }
    }

    function concludeProposal(uint256 proposalId) internal {
        proposals[proposalId].concluded = true;
        proposals[proposalId].result = proposals[proposalId].votesFor > proposals[proposalId].votesAgainst;
    }

}
