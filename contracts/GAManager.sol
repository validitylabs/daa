/**
 * @title The contract that manages the creation and voting of the DAA.
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./TimedLib.sol";
import "./TallyClerkLib.sol";
import "./ProposalInterface.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol"; 

contract GAManager is Ownable {

    using TimedLib for uint256;
    using TallyClerkLib for *;
    using SafeMath for uint256;

    struct GAInfo {
        uint256 GAStartTime;
        uint256 GADuration;
        bytes32 hashOfStatutes;
        bool extraordinaryGA;                                    // Note down whether the GA is an annual GA set by delegate (false) or an extraordinary one (true)
    }

    mapping(uint256=>GAInfo) scheduledGA;
    uint256 currentIndex;       // on-going or the lastest finished one.
    uint256 totalScheduledGA;

    Accessible public accessibleGate;
    ProposalInterface public proposalGate;
    bytes32 public currentHashOfStatutes;

    TallyClerkLib.CandidancyForDelegate public potentialCandidateListForCurrentGA;
    mapping(address=>uint256) listOfCandidateAddress;
    uint256 numberOfCandidate;
    address newDelegate;

    uint256 constant TIMESPAN_GA = 104 weeks;               // The delegate can setup the annual GA that happens in max. 2 years
    uint256 constant CLOSEST_FUTURE_GA = 4 weeks;           // The annual GA can only be set in 4 weeks.
    uint256 constant MIN_INTERVAL_GA = 36 weeks;            // There should be min 9 months between two GAs.

    //@TODO Check whether thest special constants are needed or not. If not, all the GA follows the same rule of settlement.
    uint256 constant TIMESPAN_EXTRAGA = 104 weeks;          // Members can propose an extraordinary GA that takes place in max. 2 years.
    uint256 constant CLOSEST_FUTURE_EXTRAGA = 4 weeks;      // The extraordinary GA can be held in 4 weeks, starting from now.
    uint256 constant MIN_INTERVAL_EXTRAGA = 36 weeks;       // There should be minimum 9 months of time between two extraordinary GA. 
    uint256 constant MIN_INTERVAL_GA_EXTRAGA = 8 weeks;     // There should be a minimum amount of time for two GAs to be held (regardless their type)


    uint256 constant STANDARDGA_DURATION = 60 minutes;

    modifier scheduledGAExists {
        require(currentIndex > 0);
        _;
    }

    modifier beforeGAstarts {
        require(scheduledGA[currentIndex].GAStartTime.add(scheduledGA[currentIndex].GADuration).isFinished(now));
        _;
    }

    modifier proposalOnly {
        require(msg.sender == address(proposalGate));
        _;
    }

    modifier shouldInSpan(uint256 _proposedGADate, bool _isExtraGA) {
        if (_isExtraGA) {
            require(_proposedGADate.isInside(now, TIMESPAN_EXTRAGA));
        } else {
            require(_proposedGADate.isInside(now, TIMESPAN_GA));
        }
        _;
    }

    constructor(address _membershipAdr, address _proposalInterfaceAdr, bytes32 _initialHash) public {
        accessibleGate = Accessible(_membershipAdr);
        proposalGate = ProposalInterface(_proposalInterfaceAdr);
        currentHashOfStatutes = _initialHash;
    }

    function updateContractAddress(address _newAccessible, address _newProposal) public onlyOwner {
        require(_newAccessible != 0x0 || _newProposal != 0x0);
        if (_newAccessible != 0x0) {
            accessibleGate = Accessible(_newAccessible);
        }
        if (_newProposal != 0x0) {
            proposalGate = ProposalInterface(_newProposal);
        }
    }

    function addDelegateCandidate(address _adr) beforeGAstarts external proposalOnly {
        require(listOfCandidateAddress[_adr] == 0);
        // list starts from 0
        potentialCandidateListForCurrentGA.list[numberOfCandidate].candidate = _adr;
        potentialCandidateListForCurrentGA.list[numberOfCandidate].supportingVoteNum = 0;
        // listOfCandidateAddress starts from 1
        numberOfCandidate++;
        listOfCandidateAddress[_adr] = numberOfCandidate;
        potentialCandidateListForCurrentGA.totalLength++;
        potentialCandidateListForCurrentGA.revoteOrNot = false;
        potentialCandidateListForCurrentGA.potentialRevote = 0;
    }

    /**
     *@dev check if the GA respects the minimum time gap for GAs. This function may need modification when more regulation is applied.
     *@notice This function currently take both types of GA as identical. They both follow the same set of limitation in timespan and minimum interval.
     */
    function canSetGA(uint256 _time, bool _isExtraGA) public view shouldInSpan(_time, _isExtraGA) returns (bool) {
        uint256 minInterval;
        uint256 closestFuture;
        if (_isExtraGA) {
            minInterval = MIN_INTERVAL_EXTRAGA;
            closestFuture = CLOSEST_FUTURE_EXTRAGA;
        } else {
            minInterval = MIN_INTERVAL_GA;
            closestFuture = CLOSEST_FUTURE_GA;
        }
        if (_time > now.add(closestFuture)) {
            if (totalScheduledGA == 0) {
                return true;
            } else {
                for (uint256 i = currentIndex; i < totalScheduledGA; i++) {
                    if (_time < scheduledGA[i].GAStartTime) {
                        if (scheduledGA[i-1].GAStartTime.add(scheduledGA[i-1].GADuration).add(minInterval) < _time && _time.add(minInterval) < scheduledGA[i].GAStartTime) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
                if (scheduledGA[i-1].GAStartTime.add(scheduledGA[i-1].GADuration).add(minInterval) < _time) {
                    return true;
                }
            }
        }
        
        if (_time > now.add(closestFuture) && scheduledGA[currentIndex].GAStartTime.add(scheduledGA[currentIndex].GADuration).add(minInterval) < _time) {
            if (totalScheduledGA > currentIndex && _time.add(minInterval) <scheduledGA[currentIndex + 1].GAStartTime) {
                return true;
            }
        }
        return false;
    }

    function voteForDelegate(address _adr) public proposalOnly returns (bool) {
        potentialCandidateListForCurrentGA.list[listOfCandidateAddress[_adr]-1].supportingVoteNum++;
        potentialCandidateListForCurrentGA.participantNum++;
        return true;
    }

    /**
     *@dev Return the decision, whether (some) candidate(s) received votes reaches the minimum requirement
     *     whether to revote the candidate or not. 
     *     If non, tell the index where the hightest vote is stored. If yes, tell how many candidates are needed to participate into the next round.
     */
    function calculateCandidateReceivedVoting(uint256 _minParticipant, uint _minYes) public proposalOnly returns (bool, bool, uint256) {
        potentialCandidateListForCurrentGA.findMostVotes();
        // Check if the the participant number reaches minimum
        if (potentialCandidateListForCurrentGA.participantNum > _minParticipant) {
            if (potentialCandidateListForCurrentGA.list[potentialCandidateListForCurrentGA.markedPositionForRevote[0]].supportingVoteNum > _minYes) {
                if (potentialCandidateListForCurrentGA.revoteOrNot == false) {
                    return (true, false, potentialCandidateListForCurrentGA.markedPositionForRevote[0]);
                    // Here shows the final delegate. 
                    // newDelegate = potentialCandidateListForCurrentGA.list[potentialCandidateListForCurrentGA.markedPositionForRevote[0]].candidate;
                } else {
                    // need to create proposal accordingly.
                    return (true, true, potentialCandidateListForCurrentGA.potentialRevote);
                }
            } else {
                return (false, false, 0);
            }
        } else {
            return (false, false, 0);
        }
    }

    function setGATime (uint256 _nextGATime, uint256 _duration) public returns (bool) {
        // either it's from delegate, or it's from GA proposal
        require(accessibleGate.checkIsDelegate(msg.sender));
        require(canSetGA(_nextGATime, false));
        // set the time & date
        for (uint256 i = currentIndex; i < totalScheduledGA; i++) {
            if (_nextGATime < scheduledGA[i].GAStartTime) {
                // add the new GA time and date at place i. All the old elements that were at i -> i+1
                for (uint256 j = totalScheduledGA; j > i; j--) {
                    scheduledGA[j] = scheduledGA[j-1];
                }
                break;
            }
        }
        scheduledGA[i].GAStartTime = _nextGATime;
        scheduledGA[i].GADuration = _duration;
        // if (i == 0) {
        //     scheduledGA[i].hashOfStatutes = initialHashOfStatutes;
        // } else {
        //     scheduledGA[i].hashOfStatutes = scheduledGA[i-1].hashOfStatutes;
        // }
        totalScheduledGA++;
    
    }

    //@TODO if by defaut, it's 60 min
    function setExtraordinaryGA(bytes32 _proposalID) public returns (bool) {
        require(proposalGate.getProposalFinalResult(_proposalID));
        require(proposalGate.checkActionIsSuccessfulGA(_proposalID));
        uint256 _nextGATime = proposalGate.getProposalProposedDate(_proposalID);
        require(canSetGA(_nextGATime, true));
        // set the time & date
        for (uint256 i = currentIndex; i < totalScheduledGA; i++) {
            if (_nextGATime < scheduledGA[i].GAStartTime) {
                // add the new GA time and date at place i. All the old elements that were at i -> i+1
                for (uint256 j = totalScheduledGA; j > i; j--) {
                    scheduledGA[j] = scheduledGA[j-1];
                }
                break;
            }
        }
        scheduledGA[i].GAStartTime = _nextGATime;
        scheduledGA[i].GADuration = STANDARDGA_DURATION;
        totalScheduledGA++;
    }

    function isDuringGA() public view returns (bool) {
        if (now.isInside(scheduledGA[currentIndex + 1].GAStartTime,scheduledGA[currentIndex].GAStartTime.add(scheduledGA[currentIndex].GADuration))) {
            return true;
        } else {
            return false;
        }
    }
    /**
     *@notice Anyone can update this information.
     */
    function updateCurrentGA() public returns (bool) {
        if (now.isInside(scheduledGA[currentIndex + 1].GAStartTime,scheduledGA[currentIndex + 1].GAStartTime.add(scheduledGA[currentIndex + 1].GADuration))) {
            currentIndex++;
            scheduledGA[currentIndex].hashOfStatutes = currentHashOfStatutes;
            return true;
        } else {
            return false;
        }
    }
    /**
     *@dev Upon the success of the correct type of proposal.
     */
    function setNewStatute(bytes32 _proposalID) public returns (bool) {
        // upon proposal success
        require(proposalGate.getProposalFinalResult(_proposalID));
        require(proposalGate.checkActionIsStatute(_proposalID));

        bytes32 _newHash = proposalGate.getProposalStatute(_proposalID);
        currentHashOfStatutes = _newHash;
        scheduledGA[currentIndex].hashOfStatutes = currentHashOfStatutes;
        return true;
    }

}