pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExtraordinaryGA is Proposals {

    struct GA {
        uint256 date;
        uint256 finished;
        bool annual;
    }

    uint256 private constant voteTime = 14 days;
    uint256 private constant ONE_MONTH = 30 days; // TODO:
    uint256 private constant NINE_MONTHS = 274 days; // TODO:

    GA[] public generalAssemblies;
    uint256 current;

    mapping (uint256 => uint256) datesForVoting;

    function ExtraordinaryGA() {
        current = 0;
        generalAssemblies.push(GA(0, 0, false));
    }

    // TODO:
    modifier onlyDuringGA() {
        require(now >= generalAssemblies[current].date
            && generalAssemblies[current].finished == 0);
        _;
    }

    // TODO:
    modifier onlyDuringAnnualGA() {
        require(generalAssemblies[current].annual
            && now >= generalAssemblies[current].date
            && generalAssemblies[current].finished == 0);
        _;
    }

    // Proposal has to be readable by external SC
    function getGADateProposal(uint256 proposalId) external constant returns (
        address submitter,
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 startTime,
        uint256 duration,
        uint256 votesFor,
        uint256 votesAgainst,
        bool concluded,
        bool result
    )
    {
        return getProposal(GENERAL_ASSEMBLY, proposalId);
    }

    function getDateForVoting(uint256 proposalId) public constant returns (uint256) {
        return datesForVoting[proposalId];
    }

    function getLatestAddedGA() public constant returns (
        uint256,
        uint256,
        bool
    )
    {
        GA storage latestAddedGA = generalAssemblies[generalAssemblies.length - 1];
        return (latestAddedGA.date, latestAddedGA.finished, latestAddedGA.annual);
    }

    function proposeGeneralAssemblyDate(uint256 date) public onlyMember {
        // TODO:
        // require(now < date.sub(ONE_MONTH));

        uint256 proposalId = super.submitProposal(GENERAL_ASSEMBLY,
            "Propose General Assembly Date", 0, address(0), voteTime);
        datesForVoting[proposalId] = date;
    }

    function voteForGeneralAssemblyDate(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(GENERAL_ASSEMBLY, proposalId, favor);
    }

    function setAnnualAssemblyDate(uint256 date) public onlyDelegate {
        // Minimally 1 month before date of GA
        // After date of general assembly 9 months blocked
        require(now < date.sub(ONE_MONTH));
        require(date > generalAssemblies[current].finished.add(NINE_MONTHS));

        generalAssemblies.push(GA(date, 0, true));
        current = generalAssemblies.length - 1;
    }

    function finishCurrentGeneralAssembly() public onlyDelegate {
        require(current < generalAssemblies.length);

        GA storage ga = generalAssemblies[current];
        require(ga.finished == 0);
        require(now > ga.date);
        ga.finished = now;
    }

    function stepDownAndProposeGA(uint256 date) public onlyDelegate {
        // TODO:
        // Even if members vote against GA, the DAA remains active, it just doesnt have a delegate
        // After stepping down until new delegate is elected we do not allow payouts,
        // all other functions remain active. This is required because
        // the GAA is legally not having rights to do business during this period.
    }

    function concludeProposal(uint256 proposalId) internal {
        concludeGeneralAssemblyVote(proposalId);
    }

    function concludeGeneralAssemblyVote(uint256 proposalId) private {
        // ⅕ of all members have to vote yes
        // for * 5 >= (all members) * 1
        Proposal storage proposal = proposals[GENERAL_ASSEMBLY][proposalId];
        bool res = proposal.votesFor.mul(uint256(5)) >= getAllMembersCount();

        proposal.result = res;
        if (res) {
            uint256 date = datesForVoting[proposalId];
            generalAssemblies.push(GA(date, 0, false));
            current = generalAssemblies.length - 1;
        }
    }

}
