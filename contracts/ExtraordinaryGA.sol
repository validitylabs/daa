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

    mapping (uint256 => uint256) datesForVoting;

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
        uint256 proposalId = super.submitProposal("Propose General Assembly Date", 0, address(0), 2 weeks);
        datesForVoting[proposalId] = date;
    }

    function voteForGeneralAssemblyDate(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(proposalId, favor);
    }

    function setAnnualAssemblyDate(uint256 date) public onlyDelegate {
        // TODO:
        // Minimally 1 month before date of GA
        // After date of general assembly 9 months blocked
    }

    function stepDownAndProposeGA(uint256 date) public onlyDelegate {
        // TODO:
        // Even if members vote against GA, the DAA remains active, it just doesnt have a delegate
        // After stepping down until new delegate is elected we do not allow payouts,
        // all other functions remain active. This is required because
        // the GAA is legally not having rights to do business during this period.
    }

    function concludeProposal(uint256 proposalId) internal {
        // super.concludeProposal(proposalId);
        proposals[proposalId].concluded = true;
        concludeGeneralAssemblyVote(proposalId);
    }

    function concludeGeneralAssemblyVote(uint256 proposalId) private {
        // ⅕ of all members have to vote yes
        // for * 5 >= (all members) * 1
        bool res = proposals[proposalId].votesFor * uint(5) >= getAllMembersCount();

        proposals[proposalId].result = res;
        if (res) {
            uint256 date = datesForVoting[proposalId];
            generalAssemblies.push(GA(date, false, false));
        }
    }

}
