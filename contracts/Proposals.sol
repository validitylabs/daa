pragma solidity ^0.4.15;


import './Membership.sol';


contract Proposals is Membership {

    // enum ProposalType {SIMPLE_PROPOSAL, EXPEL_MEMBER, DELEGATE_CANDIDACY, DISCHARGE,
    //    GENERAL_ASSEMBLY, DISSOLUTION, CHANGE_STATUTES, UPDATE_ORGANIZATION}

    uint256 constant SIMPLE_PROPOSAL = 0;
    uint256 constant EXPEL_MEMBER = 1;
    uint256 constant DELEGATE_CANDIDACY = 2;
    uint256 constant DISCHARGE = 3;
    uint256 constant GENERAL_ASSEMBLY = 4;
    uint256 constant DISSOLUTION = 5;
    uint256 constant CHANGE_STATUTES = 6;
    uint256 constant UPDATE_ORGANIZATION = 7;

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

    uint256 private constant voteTime = 60 days;

    mapping(uint256 => Proposal[]) proposals;

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
            duration <= voteTime);

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
        require(proposal.duration.add(time) <= voteTime);

        proposal.duration = proposal.duration.add(time);
    }

    // submitter can vote for proposal
    function voteForProposal(uint256 proposalType, uint256 proposalId, bool favor)
        internal onlyMember returns (bool)
    {
        Proposal storage proposal = proposals[proposalType][proposalId];
        require(!proposal.concluded);
        require(!proposal.voted[msg.sender]);

        if (now < proposal.startTime.add(proposal.duration)) {
            proposal.voted[msg.sender] = true;
            if (favor) {
                proposal.votesFor = proposal.votesFor.add(1);
            } else {
                proposal.votesAgainst = proposal.votesAgainst.add(1);
            }
            return true;
        } else {
            return false;
        }
    }

    function concludeProposal(uint256 proposalType, uint256 proposalId) internal {
        require(proposalId < proposals[proposalType].length);

        Proposal storage proposal = proposals[proposalType][proposalId];
        require(now > proposal.startTime.add(proposal.duration));
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
