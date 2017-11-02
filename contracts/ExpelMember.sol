pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExpelMember is Proposals {

    function proposeExpelMember(address member) public onlyMember {

    }

    function voteToExpelMember(address member, bool favor) public onlyMember {

    }

    function concludeExpel(address member) internal {

    }

}
