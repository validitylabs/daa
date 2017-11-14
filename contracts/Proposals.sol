pragma solidity ^0.4.15;


import './Membership.sol';


contract Proposals is Membership {

    // enum ProposalType {SIMPLE_PROPOSAL, EXPEL_MEMBER, DELEGATE_CANDIDACY, DISCHARGE,
    //    GENERAL_ASSEMBLY, DISSOLUTION, CHANGE_STATUTES, UPDATE_ORGANIZATION}

    uint constant SIMPLE_PROPOSAL = 0;
    uint constant EXPEL_MEMBER = 1;
    uint constant DELEGATE_CANDIDACY = 2;
    uint constant DISCHARGE = 3;
    uint constant GENERAL_ASSEMBLY = 4;
    uint constant DISSOLUTION = 5;
    uint constant CHANGE_STATUTES = 6;
    uint constant UPDATE_ORGANIZATION = 7;

    struct Proposal {
        address submitter;
        bytes32 name;
        uint256 amount; // in Wei
        address destinationAddress;
        uint256 startTime;
        uint256 duration;
        uint256 votesFor;
        uint256 votesAgainst;
        mapping(address => bool) voted;
        bool concluded;
        bool result;
    }

    // event ProposalAdded(uint256 proposalType, uint256 id);

    uint256 private constant VOTE_TIME_IN_DAYS = 60;

    mapping(uint256 => Proposal[]) proposals;

    function concludeProposal(uint256 proposalId) internal;

    function submitProposal(
        uint256 proposalType,
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 duration
    )
        internal
        onlyMember
        returns (uint256)
    {
        require(// duration >= 1 weeks && // TODO: can be 10 mins for Update Organization
            duration <= VOTE_TIME_IN_DAYS.mul(1 days));

        proposals[proposalType].push(Proposal(
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
        uint256 id = proposals[proposalType].length.sub(1);
        // ProposalAdded(proposalType, id);
        return id;
    }

    function extendProposalDuration(uint256 proposalType, uint256 proposalId, uint256 time) internal onlyMember {
        Proposal storage proposal = proposals[proposalType][proposalId];
        require(proposal.submitter == msg.sender);
        require(proposal.duration.add(time) <= VOTE_TIME_IN_DAYS.mul(1 days));

        proposal.duration = proposal.duration.add(time);
    }

    function voteForProposal(uint256 proposalType, uint256 proposalId, bool favor) internal onlyMember {
        Proposal storage proposal = proposals[proposalType][proposalId];
        require(!proposal.voted[msg.sender]);

        if (now < proposal.startTime.add(proposal.duration)) {
            proposal.voted[msg.sender] = true;
            if (favor) {
                proposal.votesFor = proposal.votesFor.add(1);
            } else {
                proposal.votesAgainst = proposal.votesAgainst.add(1);
            }
        } else {
            proposal.concluded = true;
            concludeProposal(proposalId);
        }
    }

    function getProposal(uint256 proposalType, uint256 proposalId) internal constant returns (
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
        Proposal storage pr = proposals[proposalType][proposalId];
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

}
