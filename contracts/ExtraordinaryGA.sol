pragma solidity ^0.4.15;


import './Proposals.sol';


contract ExtraordinaryGA is Proposals {

    struct GA {
        uint256 date;
        uint256 started;
        uint256 finished;
        bool annual;
        bool stepDown;
    }

    uint256 private constant voteTime = 14 days;
    uint256 private constant ONE_MONTH = 30 days; // TODO:
    uint256 private constant NINE_MONTHS = 274 days; // TODO:

    GA[] public generalAssemblies;
    uint256 current; // TODO: Setter

    mapping (uint256 => GA) datesForVoting; // uint256 => uint256
    mapping (address => bool) proposalMade;

    function ExtraordinaryGA() {
        // current = 0;
        // generalAssemblies.push(GA(0, 0, 0, false, false));
    }

    // TODO:
    modifier onlyDuringGA() {
        require(generalAssemblies[current].started > 0 // now >= generalAssemblies[current].date
            && generalAssemblies[current].finished == 0);
        _;
    }

    // TODO:
    modifier onlyDuringAnnualGA() {
        require(generalAssemblies[current].annual
            && generalAssemblies[current].started > 0 // now >= generalAssemblies[current].date
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
        return datesForVoting[proposalId].date;
    }

    function getLatestAddedGA() public constant returns (
        uint256,
        uint256,
        uint256,
        bool,
        bool
    )
    {
        GA storage latestAddedGA = generalAssemblies[generalAssemblies.length - 1];
        return (latestAddedGA.date, latestAddedGA.started, latestAddedGA.finished,
            latestAddedGA.annual, latestAddedGA.stepDown);
    }

    function getCurrentGA() public constant returns (
        uint256,
        uint256,
        uint256,
        bool,
        bool
    )
    {
        GA storage currentGA = generalAssemblies[current];
        return (currentGA.date, currentGA.started, currentGA.finished,
            currentGA.annual, currentGA.stepDown);
    }

    function getCurrentGADate() public constant returns (uint256) {
        GA storage currentGA = generalAssemblies[current];
        return currentGA.date;
    }

    function proposeGeneralAssemblyDate(uint256 date) public onlyMember {
        proposeGeneralAssemblyDate(date, false);
    }

    function voteForGeneralAssemblyDate(uint256 proposalId, bool favor) public onlyMember {
        super.voteForProposal(GENERAL_ASSEMBLY, proposalId, favor);
    }

    function setAnnualAssemblyDate(uint256 date) public onlyDelegate {
        // Minimally 1 month before date of GA
        // After date of general assembly 9 months blocked
        require(date > now.add(ONE_MONTH));
        require(generalAssemblies.length == 0 ||
            date > generalAssemblies[current].finished.add(NINE_MONTHS));

        generalAssemblies.push(GA(date, 0, 0, true, false));
        // current = generalAssemblies.length - 1;
    }

    function startGeneralAssembly(uint256 id) public onlyDelegate {
        require(id < generalAssemblies.length);

        GA storage ga = generalAssemblies[current];
        require(ga.finished == 0);
        require(now >= ga.date);

        ga.started = now;
        current = id;
    }

    function finishCurrentGeneralAssembly() public onlyDelegate {
        require(current < generalAssemblies.length);

        GA storage ga = generalAssemblies[current];
        require(ga.finished == 0);
        require(now >= ga.date);
        ga.finished = now;
    }

    function stepDownAndProposeGA(uint256 date) public onlyDelegate {
        // Even if members vote against GA, the DAA remains active, it just doesnt have a delegate
        // After stepping down until new delegate is elected we do not allow payouts,
        // all other functions remain active. This is required because
        // the GAA is legally not having rights to do business during this period.

        if (proposalMade[msg.sender]) {
            proposalMade[msg.sender] = false;
        }
        proposeGeneralAssemblyDate(date, true);
    }

    function concludeGeneralAssemblyVote(uint256 proposalId) public onlyMember {
        super.concludeProposal(GENERAL_ASSEMBLY, proposalId);

        // ⅕ of all members have to vote yes
        // for * 5 >= (all members) * 1
        Proposal storage proposal = proposals[GENERAL_ASSEMBLY][proposalId];
        bool res = proposal.votesFor.mul(uint256(5)) >= getAllMembersCount();

        proposal.result = res;
        proposal.concluded = true;

        if (datesForVoting[proposalId].stepDown) {
            removeDelegate();
        }

        if (res) {
            // uint256 date = datesForVoting[proposalId];
            generalAssemblies.push(datesForVoting[proposalId]); // GA(date, 0, 0, false, false));
            // current = generalAssemblies.length - 1;
        }
    }

    function proposeGeneralAssemblyDate(uint256 date, bool stepDown) private {
        // only one proposal for a general assembly can be made per user at any time
        require(!proposalMade[msg.sender]);
        // proposal has to be at least in the future by at least one voting duration
        require(date > now.add(voteTime));

        uint256 proposalId = super.submitProposal(GENERAL_ASSEMBLY,
            "Propose General Assembly Date", 0, address(0), voteTime);
        proposalMade[msg.sender] = true;

        datesForVoting[proposalId] = GA(date, 0, 0, false, stepDown);
    }


}
