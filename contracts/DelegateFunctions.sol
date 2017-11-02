pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract DelegateFunctions is ExtraordinaryGA {

    function addWhitelister() public onlyDelegate {

    }

    function removeWhitelister() public onlyDelegate {

    }

    function proposeDelegateCandidacy() public onlyMember {
        // msg.sender
    }

    function voteForDelegate(address member) public onlyMember {

    }

    function stepDownAndProposeGA() public onlyDelegate {

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
