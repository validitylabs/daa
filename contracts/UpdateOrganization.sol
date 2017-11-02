pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract UpdateOrganization is ExtraordinaryGA {

    // TODO: args
    function proposeUpdate() public onlyMember onlyDuringGA {

    }

    function voteForUpdate(bool favor) public onlyMember {

    }

    function concludeVoteForUpdate() internal {

    }

}
