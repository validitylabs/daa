pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExtraordinaryGA is Proposals {

    struct GA {
        uint256 date;
        bool annual;
        bool finished;
    }

    GA[] public generalAssemblies;
    uint256 current;

    // TODO:
    modifier onlyDuringGA() {
        require(now >= generalAssemblies[current].date
            && !generalAssemblies[current].finished);
        _;
    }

    // TODO:
    modifier onlyDuringAnnualGA() {
        require(generalAssemblies[current].annual
            && now >= generalAssemblies[current].date
            && !generalAssemblies[current].finished);
        _;
    }

    function proposeGeneralAssemblyDate(uint256 date) public onlyMember {

    }

    function voteForGeneralAssemblyDate(bool favor) public onlyMember {

    }

    function setAnnualAssemblyDate(uint256 date) public onlyDelegate {

    }

    function concludeGeneralAssemblyVote() internal {

    }

}
