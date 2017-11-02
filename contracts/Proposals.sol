pragma solidity ^0.4.15;


import './Membership.sol';


contract Proposals is Membership {

    struct Proposal {
        bytes32 name;
        uint256 amount; // in Wei
        address destinationAddress;
        uint256 votesFor;
        uint256 votesAgainst;
        mapping(address => bool) voted;
        bool concluded;
    }

    Proposal[] public proposals;

    // TODO: return index of the proposal
    function submitProposal(bytes32 name, uint256 amount, address destinationAddress) public onlyMember {

    }

    function voteForProposal(uint256 proposal, bool favor) public onlyMember {

    }

    function concludeProposal(uint256 proposal) internal {

    }

}
