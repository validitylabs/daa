pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract DelegateFunctions is ExtraordinaryGA {

    function addWhitelister(address member) public onlyDelegate {
        members[member] = Member(MemberTypes.WHITELISTER, 0, false);
    }

    function removeWhitelister(address member) public onlyDelegate {
        require(members[member].memberType == MemberTypes.WHITELISTER);
        delete members[member];
    }

    function proposeDelegateCandidacy() public onlyMember {
        // msg.sender
    }

    function voteForDelegate(address member) public onlyMember {

    }

    function stepDownAndProposeGA(uint256 date) public onlyDelegate {

    }

    function proposeDischarge() public onlyDelegate onlyDuringAnnualGA {

    }

    function voteForDischarge() public onlyDelegate {

    }

    function concludeVoteForDelegate(address member) internal {

    }

    function concludeVoteForDischarge() internal {

    }

}
