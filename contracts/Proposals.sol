pragma solidity ^0.4.15;


import './Membership.sol';


contract Proposals is Membership {

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
    }

    Proposal[] public proposals;

    // TODO: return index of the proposal
    function submitProposal(
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 duration
    )
        public
        onlyMember
    {
        require(duration >= 1 weeks && duration <= 60 days);

        proposals.push(Proposal(
            msg.sender,
            name,
            amount,
            destinationAddress,
            now,
            duration,
            0,
            0,
            false
            )
        );
    }

    function extendProposalDuration(uint256 proposal, uint256 time) public onlyMember {
        require(proposals[proposal].submitter == msg.sender);
        require(proposals[proposal].duration + time <= 60 days);

        proposals[proposal].duration += time;
    }

    function voteForProposal(uint256 proposal, bool favor) public onlyMember {
        require(proposals[proposal].startTime + proposals[proposal].duration < now);

        if (favor) {
            proposals[proposal].votesFor += 1;
        } else {
            proposals[proposal].votesAgainst += 1;
        }
    }

    function concludeProposal(uint256 proposal) internal {
        proposals[proposal].concluded = true;
    }

}
