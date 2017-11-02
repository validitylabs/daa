pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract Dissolution is ExtraordinaryGA {

    function proposeDissolution() public onlyDuringGA onlyMember {

    }

    function voteForDissolution(bool favor) public onlyMember {

    }

    function concludeVoteForDissolution() internal {

    }

}
