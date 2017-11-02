pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract ChangeStatutes is ExtraordinaryGA {

    function setHashOfStatutes(bytes32 hash) public onlyMember onlyDuringGA {

    }

    function voteForChangeStatutes(bool favor) public onlyMember {

    }

    function concludeVoteForChangeStatutes() internal {

    }

}
