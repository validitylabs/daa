/**
 * @title The contract that manages the creation and voting of the DAA.
 * @notice This contract is used when proposals are stored as structs but not created as individual contract by the factory.
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./TallyClerkLib.sol";
import "./TimedLib.sol";
import "./ProposalInterface.sol";
import "./MinimalProposal.sol";
import "./GAManager.sol";
import "./DAAInterface.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol"; 


//@TODO     upgradable: put the enum struct into a library together with other methods
contract ProposalManager is MinimalProposal, Ownable {   // Accessible

    using TallyClerkLib for *;
    using TimedLib for uint256;
    using SafeMath for uint256;
    // using ActionLib for *;

    Accessible public accessibleGate;
    GAManager public gaManager;
    DAAInterface public daaGate;

    enum ActionType {
        notGAproposal,
        proposeDelegateCandidancy,
        proposeGADate,
        proposeDissolution,
        proposeUpdateStatute,
        proposeUpdateWallet,
        proposeExpelMember
    }

    //@TODO Consider move this part into another contract inheriting from the minimal proposal...
    struct ProposalAdditionals{
        address destinationAddress;
        uint256 targetAmount;
        bool allowExternalDeposition;
    }

    //@ATTENTION Not all the properties below are necessary for each and every GA.
    struct GAProposalAdditionals {
        // TallyClerkLib.CandidancyForDelegate candidateList;
        // An alternative is to use the following lines, which seperates this action into two steps.
        //      1. Save the addresses into a list, as well as the number of the registered candidates.
        //      2. Translate this infomation into the global variable "candidateList"
        // mapping(uint256=>address) listOfCandidateAddress;
        // uint256 numberOfCandidate;
        ActionType actionType;
        address candidate;
        uint256 proposedGADate;
        bytes32 proposedStatute;
        address internalWallet;
        address externalWallet;
    }

    struct Quorum {
        bool dependency;                    // If dependent (true), the supporting number is based on the voting number. If not, the yes number is based on the total number.
        uint256 participantNumerator;       // defines the minimum participant number comparing to the total member numbers.
        uint256 participantDenominator;     // same as above
        uint256 supporterNumerator;         // defines the minimum number of "yes" vote, among all participants
        uint256 supporterDenominator;       // same as above
    }

    uint256 constant EXPELMEMBER_DURATION = 1 weeks; 
    uint256 constant VOTINGTIMEGAP_BETWEENPROPOSALS_GA = 3 minutes;
    uint256 constant VOTINGDURITION_PROPOSAL_GA = 10 minutes;
    uint256 constant ANSWER_OPTIONS = 4;

    // replace the bytes32 _proposalID by the uint256 _proposalID
    uint256 public numTotalProposals;
    mapping(bytes32=>TallyClerkLib.VotesPerProposal) public votesForEachProposal;
    mapping(uint256=>uint256) public limitedVotingTime;                     // mapping from ActionType to maximum period of time
    mapping(uint256=>Quorum) public actionQuorum;
    mapping(bytes32=>ProposalAdditionals) public proposalAdditionalsList;
    mapping(bytes32=>GAProposalAdditionals) public gaProposalAdditionalsList;
   
    //@TODO The candidacyForDeligate is stored separately...(cause Solidity does not allow this one)
    //      WHAT IF! There are several ongoing GA prooposal that is proposed for the newdelegate...
    //      The solution may be: using this mapping that links structs into this public variable... which is in parallel to the gaProposalAdditionalsList.
    TallyClerkLib.VotesForDelegate public votesForDelegateProposal;
    // mapping(bytes32=>TallyClerkLib.CandidancyForDelegate) public potentialCandidateListForParticularGA;
    mapping(address=>uint256) listOfCandidateAddress;
    uint256 numberOfCandidate;

    // bytes32[] public proposalsForNextGA; // This array is replaced by the following mapping due to the change of process. 
    // The first mapping maps from the proposalID to bool (true if the proposal is available to be set to the next GA).
    mapping(bytes32=>bool) proposalsCanBeSetForNextGA;
    // bytes32[] public proposalsForDelegateForNextGA;


    event CreateProposal(bytes32 indexed ID, address indexed DestinationAddress, uint256 Amount, uint256 StartingTime, uint256 EndingTime);
    event CreateGAProposal(bytes32 indexed ID, ActionType indexed Action);
    event ConcludeProposal(bytes32 indexed ID, address indexed Concluder, uint256 AtTime, bool FinalResult);
    

    modifier memberOnly {
        require(accessibleGate.checkIsMember(msg.sender));
        _;
    }

    modifier proposalNotYetExists(bytes32 _proposalID) {
        require(proposalList[_proposalID].proposalID == "");
        _;
    }

    /**
     *@notice min duration 7 days, max duration 60 days.
     */
    modifier shouldVoteInTime(uint256 _proposedDuration) {
        require(_proposedDuration.isInside(7 days, 60 days));
        _;
    }


    //@TODO What if hard-code all the time limits and/or quorum??
    constructor(address _membershipAdr, 
        //uint256 timeLimit_DelegateCandidancy, 
        uint256 timeLimit_GAGDate, 
        //uint256 timeLimit_Dissolution, 
        //uint256 timeLimit_Update, 
        uint256 timeLimit_ExpelMember
    ) public {
        accessibleGate = Accessible(_membershipAdr);
        
        // limitedVotingTime[uint256(ActionType.proposeDelegateCandidancy)] = timeLimit_DelegateCandidancy;    // 10 minutes, not sure, but during GA
        limitedVotingTime[uint256(ActionType.proposeGADate)] = timeLimit_GAGDate;           // 2 weeks
        // limitedVotingTime[uint256(ActionType.proposeDissolution)] = timeLimit_Dissolution;  // 10 minutes
        // limitedVotingTime[uint256(ActionType.proposeUpdateStatute)] = timeLimit_Update;  // 10 minutes
        // limitedVotingTime[uint256(ActionType.proposeUpdateWallet)] = timeLimit_Update;      // 10 minutes
        limitedVotingTime[uint256(ActionType.proposeExpelMember)] = timeLimit_ExpelMember;  // 1 week
        // conventional proposal: simple majority, no quorum.
        actionQuorum[uint256(ActionType.notGAproposal)] = Quorum(true, 0, 2, 1, 2);
        actionQuorum[uint256(ActionType.proposeDelegateCandidancy)] = Quorum(false, 1, 2, 0, 1);   // majority?
        actionQuorum[uint256(ActionType.proposeGADate)] = Quorum(false, 1, 5, 1, 5);
        actionQuorum[uint256(ActionType.proposeDissolution)] = Quorum(true, 2, 3, 2, 3);
        actionQuorum[uint256(ActionType.proposeUpdateStatute)] = Quorum(true, 2, 3, 2, 3);
        actionQuorum[uint256(ActionType.proposeUpdateWallet)] = Quorum(true, 2, 3, 2, 3);
        actionQuorum[uint256(ActionType.proposeExpelMember)] = Quorum(true, 1, 10, 2, 3);
    }

    function linkContract(address _gaManager, address _daa) public onlyOwner {
        gaManager = GAManager(_gaManager);
        daaGate = DAAInterface(_daa);
    }

    function updateMembershipContractAddress(address _newAccessible) public onlyOwner {
        require(_newAccessible != 0x0);
        accessibleGate = Accessible(_newAccessible);
    }

    function updateGAContractAddress(address _newGA) public onlyOwner {
        require(_newGA != 0x0);
        gaManager = GAManager(_newGA);
    }
    // // old functions 
    // function updateContractAddress(address _newAccessible, address _newGA) public onlyOwner {
    //     require(_newAccessible != 0x0 || _newGA != 0x0);
    //     if (_newAccessible != 0x0) {
    //         accessibleGate = Accessible(_newAccessible);
    //     }
    //     if (_newGA != 0x0) {
    //         gaManager = GAManager(_newGA);
    //     }
    // }

    /**
     *@title Create a normal proposal
     *@dev   The infomation is stored in two mapping, one is inside the minimal proposal, the additionals are stored in the additionals mappings for the normal proposal.
     */
    function createProposal(
        bytes32 _proposalID,
        bytes32 _shortDescription,
        address _destinationAddress,
        uint256 _targetAmount,
        uint256 _startingTime,
        uint256 _duration,
        bool _externalHelp
    ) 
        public 
        memberOnly 
        shouldVoteInTime(_duration) 
    returns (bool) {
        require(_startingTime > block.timestamp);

        uint256 _endingTime = _startingTime.add(_duration);

        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, _startingTime, _endingTime, false, false, false);
        proposalAdditionalsList[_proposalID] = ProposalAdditionals(_destinationAddress, _targetAmount, _externalHelp);

        emit CreateProposal(_proposalID, _destinationAddress, _targetAmount, _startingTime, _endingTime);

    }


    //======================================================================================
    // The following functions create GA proposals (administrative proposals)
    // Alternative is to merge these functions together and user if to select by action type.
    //======================================================================================

    /**
     *@title Propose their own candidacy for the next (replacing) delegate
     *@notice People can propose outside GA but only during GA can one vote.
     */
    function createDelegateCandidancyProposal (
        bytes32 _proposalID,
        bytes32 _shortDescription
    ) public memberOnly returns (bool) {
        // require(_duration.isInside(0, limitedVotingTime[uint256(ActionType.proposeDelegateCandidancy)]));

        // BasicProposal memory tempBasic = BasicProposal(_proposalID, _shortDescription, 0, 0, false, false, true);
        // GAProposalAdditionals memory tempAdditional = GAProposalAdditionals(ActionType.proposeDelegateCandidancy, msg.sender, 0, "", 0x0, 0x0);
        // proposalList[_proposalID] = tempBasic;
        // gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals;

        // proposalsForDelegateForNextGA.push(_proposalID);
        proposalsCanBeSetForNextGA[_proposalID] = true;

        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, 0, 0, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeDelegateCandidancy, msg.sender, 0, "", 0x0, 0x0);
        emit CreateGAProposal(_proposalID, ActionType.proposeDelegateCandidancy);

        gaManager.addDelegateCandidate(msg.sender);
    }

    /**
     *@title To propose a new GA. This proposal is generated by members. 
     */
    function createGADateProposal(
        bytes32 _proposalID
        ,bytes32 _shortDescription
        ,uint256 _proposedTime
        ,uint256 _votingStarts
        // ,uint256 _votingDuration
    ) public memberOnly returns (bool) {
        // require(_votingDuration.isInside(0, limitedVotingTime[uint256(ActionType.proposeGADate)]));
        require(gaManager.canSetGA(_proposedTime, true));   // propose an extraordinary GA
        uint256 _votingEnds = _votingStarts.add(limitedVotingTime[uint256(ActionType.proposeGADate)]);
        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, _votingStarts, _votingEnds, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeGADate, 0x0, _proposedTime, "", 0x0, 0x0);
        emit CreateGAProposal(_proposalID, ActionType.proposeGADate);
    }

    /**
     *@title Propose dissolve DAAS.
     *@dev   The precise starting date/time is subject to the next GA date/time
     */
    function createDissolutionProposal(
        bytes32 _proposalID,
        bytes32 _shortDescription
    ) public memberOnly returns (bool) {
        
        // proposalsForNextGA.push(_proposalID);
        proposalsCanBeSetForNextGA[_proposalID] = true;

        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, 0, 0, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeDissolution, 0x0, 0, "", 0x0, 0x0);
        emit CreateGAProposal(_proposalID, ActionType.proposeDissolution);
    }

    /**
     *@title Update the constitute hash.
     */
    function createUpdateStatuteProposal(
        bytes32 _proposalID,
        bytes32 _shortDescription,
        bytes32 _newHash
    ) public memberOnly returns (bool) {
        // proposalsForNextGA.push(_proposalID);
        proposalsCanBeSetForNextGA[_proposalID] = true;

        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, 0, 0, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeUpdateStatute, 0x0, 0, _newHash, 0x0, 0x0);
        emit CreateGAProposal(_proposalID, ActionType.proposeUpdateStatute);
    }

    /**
     *@notice We cannot directly expel a delegate. If the member happens to be a whitelister, there must be at least more than two, to be able to delete one.
     *@dev    Now we check whether this member is a whitelister. Later, when the proposal concludes, another check is needed.
     */
    function createExpelMemberProposal(
        bytes32 _proposalID
        ,bytes32 _shortDescription
        ,address _targetMember
        ,uint256 _startingTime
    ) public memberOnly returns (bool) {
        require(accessibleGate.checkIsMember(_targetMember));
        require(accessibleGate.checkIsDelegate(_targetMember) == false);
        // require(accessibleGate.isWhitelister(_targetMember) == false || (accessibleGate.isWhitelister(_targetMember) && accessibleGate.getWhitelisterNumber() > 2));
        // This account should be either a ordinary member / a member with whitelister's role and there are more than 2 whitelisters.
        // Acutally it doesn't matter, because a whitelister can be a non-member. But whether it is possible to expel his whitelister's role?
        uint256 _endingTime = _startingTime.add(EXPELMEMBER_DURATION);
        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, _startingTime, _endingTime, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeExpelMember, _targetMember, 0, "", 0x0, 0x0);
        emit CreateGAProposal(_proposalID, ActionType.proposeUpdateWallet);
    }

    /**
     *@title Create a proposal (can only be voted during GA). To update the wallet address.
     */
    function createUpdateWalletProposal(
        bytes32 _proposalID,
        bytes32 _shortDescription,
        address _internalWallet,
        address _externalWallet
    ) public memberOnly returns (bool) {
        require(_internalWallet != 0x0 || _externalWallet != 0x0);

        // The real starting time and ending time needs to be later filled according to the latest GA.
        proposalList[_proposalID] = BasicProposal(_proposalID, _shortDescription, 0, 0, false, false, true);
        gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals(ActionType.proposeUpdateWallet, 0x0, 0, "", _internalWallet, _externalWallet);

        // proposalsForNextGA.push(_proposalID);
        proposalsCanBeSetForNextGA[_proposalID] = true;


        emit CreateGAProposal(_proposalID, ActionType.proposeUpdateWallet);
    }

    /**
     *@notice All the proposals except the vote for delegate can use this function.
     */
    function voteForProposal(
        bytes32 _proposalID, 
        uint256 _answer
    ) 
        public 
        memberOnly 
        votable(_proposalID) 
        returns (bool) 
    {
        require(_answer < ANSWER_OPTIONS);   //TallyClerk.voteTicket{Abstain, No, Yes}
        require(gaProposalAdditionalsList[_proposalID].actionType != ActionType.proposeDelegateCandidancy);
        votesForEachProposal[_proposalID].refreshResult(msg.sender, TallyClerkLib.voteTicket(_answer));
        // votesForEachProposal[_proposalID].participantList[msg.sender] = TallyClerkLib.voteTicket(_answer);
        // votesForEachProposal[_proposalID].participantNum++;
        // if (uint(_answer) == 0) {
        //     votesForEachProposal[_proposalID].abstainNum++;
        // } else if (uint(_answer) == 1) {
        //     votesForEachProposal[_proposalID].yesNum++;
        // }
        return true;
    }

    /**
     *@title Vote for new delegate proposal.
     *@notice There is/are (multiple) proposal(s) for the delegate position. One has only one vote for such proposal that happens at the same time.
     */
     //@TODO When someone wants to change the vote....
    function voteForDelegate(bytes32 _proposalID, TallyClerkLib.voteTicket _answer) public memberOnly returns (bool) {
        require(gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeDelegateCandidancy);
        address preferredCandidate = gaProposalAdditionalsList[_proposalID].candidate;
        require(gaManager.canVoteForDelegate(preferredCandidate));

        if (_answer == TallyClerkLib.voteTicket.Yes) {
            votesForDelegateProposal.participantList[msg.sender] = _proposalID;
            if (votesForDelegateProposal.participantList[msg.sender] == "") {
                gaManager.voteForDelegate(gaProposalAdditionalsList[_proposalID].candidate);
            }
        }
        return true;
    }

    // /**
    //  *@title  Set order (statingTime etc) for GA proposals to be open automatically at GA.
    //  *@dev  This function can be called by anyone, when GA starts.
    //  */
    //  //@TODO Change this function into assigning proposals to GA.
    // function prepareForGA() public returns (bool) {
    //     require(gaManager.isDuringGA());
    //     require(proposalsForNextGA.length > 0 || proposalsForDelegateForNextGA.length > 0);
    //     uint256 _scheduledStartingTime = now.add(VOTINGTIMEGAP_BETWEENPROPOSALS_GA);
    //     if (proposalsForDelegateForNextGA.length > 0) {
    //         uint256 _scheduledEndingTime = _scheduledStartingTime.add(VOTINGDURITION_PROPOSAL_GA);
    //         for (uint256 j = 0; j < proposalsForDelegateForNextGA.length; j++) {
    //             proposalList[proposalsForDelegateForNextGA[i]].startingTime = _scheduledStartingTime;
    //             proposalList[proposalsForNextGA[i]].endingTime = _scheduledEndingTime;
    //         }
    //         delete(proposalsForDelegateForNextGA);
    //     }
    //     for (uint256 i = 0; i < proposalsForNextGA.length; i++) {
    //         _scheduledStartingTime = _scheduledStartingTime.add(VOTINGTIMEGAP_BETWEENPROPOSALS_GA);
    //         proposalList[proposalsForNextGA[i]].startingTime = _scheduledStartingTime;
    //         _scheduledStartingTime = _scheduledStartingTime.add(VOTINGDURITION_PROPOSAL_GA);
    //         proposalList[proposalsForNextGA[i]].endingTime = _scheduledStartingTime;
    //     }
    //     delete(proposalsForNextGA);
    //     return true;
    // }

    /**
     *@title New method of allocating a GA proposal (except for the delegate election) to a scheduled GA
     *@dev   Need to make sure that the current GA proposal has not yet be assigned.
     *@notice Delegate candidacy related proposals cannot be set via such function but another one. 
     *@param _proposalID The reference ID of proposals.
     *@param _gaIndex The index of the addressed GA.
     */
    function setProposalToGA(bytes32 _proposalID, uint256 _gaIndex) public memberOnly returns (bool) {
        require(proposalsCanBeSetForNextGA[_proposalID] == true);
        require(gaProposalAdditionalsList[_proposalID].actionType != ActionType.proposeDelegateCandidancy);
        uint256 _startingTime = gaManager.getTimeIfNextGAExistsAndNotYetFullyBooked(_gaIndex);
        require(_startingTime != 0);
        uint256 _newEndTime = _startingTime.add(VOTINGDURITION_PROPOSAL_GA);
        proposalList[_proposalID].startingTime = _startingTime;
        proposalList[_proposalID].endingTime = _newEndTime;
        // _newEndTime = _newEndTime.add(VOTINGTIMEGAP_BETWEENPROPOSALS_GA);
        proposalsCanBeSetForNextGA[_proposalID] = false;
        // setGAcurrentEndTime(_gaIndex, _newEndTime);
        return true; 
    }

    /**
     *@title Conclude the current concludable proposal
     *@dev Conclude delegate candidacy is implemented in a separate function.
     *@notice This function shall be called by anyone, even non-members.
     */
    //@TODO Implement the proposeDelegateCandidancy!!!
    function concludeProposal(bytes32 _proposalID) concludable(_proposalID) public returns (bool) {
        // calculate the quorum at the moment of conclusion. 
        require(gaProposalAdditionalsList[_proposalID].actionType != ActionType.proposeDelegateCandidancy);
        uint256 _totalMemberNum = accessibleGate.getTotalMemberNumber();
        Quorum memory _actionTypeEnumToUint = actionQuorum[uint256(gaProposalAdditionalsList[_proposalID].actionType)];
        uint256 _minParticipantNum = _totalMemberNum.calculateQuorum(_actionTypeEnumToUint.participantNumerator, _actionTypeEnumToUint.participantDenominator);
        uint256 _minYesNum = _totalMemberNum.calculateQuorum(_actionTypeEnumToUint.supporterNumerator, _actionTypeEnumToUint.supporterDenominator);

        if (votesForEachProposal[_proposalID].participantNum >= _minParticipantNum && votesForEachProposal[_proposalID].yesNum >= _minYesNum) {
            proposalList[_proposalID].concludeStatus = true;
            proposalList[_proposalID].finalResult = true;
        } else {
            proposalList[_proposalID].concludeStatus = true;
            proposalList[_proposalID].finalResult = false;
            return true;
        }
        emit ConcludeProposal(_proposalID, msg.sender, now, proposalList[_proposalID].finalResult);
        // should emit one event.
        // Actions are taken separately by other concluders.

        return true;
    }

    function getVoteForProposal(bytes32 _proposalID, address _adr) public view returns (uint256) {
        return uint256(votesForEachProposal[_proposalID].participantList[_adr]);
    }

    function canExternalParticipate(bytes32 _proposalID) public view returns (bool) {
        return proposalAdditionalsList[_proposalID].allowExternalDeposition;
    }

    function getProposaldestinationAddress(bytes32 _proposalID) public view returns (address) {
        return proposalAdditionalsList[_proposalID].destinationAddress;
    }

    function getProposalStatute(bytes32 _proposalID) public view returns (bytes32) {
        return gaProposalAdditionalsList[_proposalID].proposedStatute;
    }

    function getProposalAllowance(bytes32 _proposalID) external view returns (uint256) {
        return proposalAdditionalsList[_proposalID].targetAmount;
    }

    function getProposalProposedWalletAddress(bytes32 _proposalID) external view returns (address, address) {
        return (gaProposalAdditionalsList[_proposalID].internalWallet,gaProposalAdditionalsList[_proposalID].externalWallet);
    }

    function getProposalProposedDate(bytes32 _proposalID) external view returns (uint256) {
        return (gaProposalAdditionalsList[_proposalID].proposedGADate);
    }

    function getProposalProposedAdr(bytes32 _proposalID) external view returns (address) {
        return (gaProposalAdditionalsList[_proposalID].candidate);
    }

    function checkActionIsUpdateWallet(bytes32 _proposalID) public view returns (bool) {
        if (gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeUpdateWallet) {
            return true;
        } else {
            return false;
        }
    }

    function checkActionIsDissolution(bytes32 _proposalID) public view returns (bool) {
        if (gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeDissolution) {
            return true;
        } else {
            return false;
        }
    }

    function checkActionIsStatute(bytes32 _proposalID) public view returns (bool) {
        if (gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeUpdateStatute) {
            return true;
        } else {
            return false;
        }
    }

    function checkActionIsSuccessfulGA(bytes32 _proposalID) public view returns (bool) {
        if (gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeGADate) {
            return true;
        } else {
            return false;
        }
    }
    
    function checkActionIsExpel(bytes32 _proposalID) public view returns (bool) {
        if (gaProposalAdditionalsList[_proposalID].actionType == ActionType.proposeExpelMember) {
            return true;
        } else {
            return false;
        }
    }

    // function clearGAProposalsAfterGA() public returns (bool) {
    //     require(msg.sender == address (gaManager));
    //     // set all the GAproposal's ending time to now.
    //     for (uint256 i = 0; i < proposalsForNextGA.length; i++) {
    //         proposalList[proposalsForNextGA[i]].endingTime = now - 10;
    //     }
    //     // delete the queue
    //     delete(proposalsForNextGA);
    // }
    
    // /**
    //  *@title Destruct the proposal, if the proposal is already concluded and (executed or invalid), 
    //  *@notice This function shall be called by anyone, even non-members.
    //  */
    //  //@TODO Whether this function is allowed to be called while the proposal is still open ? 
    //  //      Nope... Otherwise, the proposal initiator may destroy the proposal when he realised it is not favorable for him.
    // function destructProposal() public returns (bool) {
    //     // require(proposal.isConcluded);
    //     //@TODO check whether this proposal is already concluded.
    // }

    // /**
    //  *@title Create a GA specific proposal
    //  *@dev   The function needs to re-direct to action functional code that is hard-coded inside. 
    //  */
    // function createGAProposal(
    //     bytes32 _proposalID,
    //     bytes32 _shortDescription,
    //     uint256 _startingTime,
    //     uint256 _duration,
    //     ActionType _proposedActionType,
    //     bytes32 _proposedStatute,
    // ) public memberOnly shouldVoteInTime(_duration) returns (bool) {
    //     require(_duration.isInside(0, limitedVotingTime[uint256(_proposedActionType)]));
    //     if (_proposedActionType == ActionType.proposeDelegateCandidancy) {
    //         // No matter what value one puts here, the startingTime is set to be right now. In reality, when some one wants to vote for such proposal, they should 
    //         uint256 _symbolicStartingTime = now;
    //         uint256 _symbolicEndingTime = now;
    //         BasicProposal memory tempBasic = BasicProposal(_proposalID, _shortDescription, _symbolicstartingTime, _symbolicEndingTime, false, false, false);
    //         GAProposalAdditionals memory tempAdditional = GAProposalAdditionals(msg.sender, ActionType.proposeDelegateCandidancy, 0, "");

    //         proposalsForNextGA.push(_proposalID);
    //     } else if (_proposedActionType == ActionType.proposeGADate) {
    //         // require(_duration.isInside(0, limitedVotingTime[uint256(ActionType.proposeGADate)]));
    //         // GA date is stored in the _startingTime parameter.
    //         require(_startingTime > now);
    //         // check if the protential GA date respects the time gap with scheduled GAs.
    //         require(gaManager.canSetGA(_startingTime));

    //         uint256 _symbolicStartingTime = now;
    //         uint256 _symbolicEndingTime = _duration;
    //         BasicProposal memory tempBasic = BasicProposal(_proposalID, _shortDescription, _symbolicstartingTime, _symbolicEndingTime, false, false, false);
    //         GAProposalAdditionals memory tempAdditional = GAProposalAdditionals(0x0, ActionType.proposeGADate, _startingTime, "");

    //     } else if (_proposedActionType == ActionType.proposeDissolution) {
    //         // require(_duration.isInside(0, limitedVotingTime[uint256(ActionType.proposeDissolution)]));
    //         // _startingTime is the time delay, upon the GA's approval of dissolution
    //         require(_startingTime > now);

    //         uint256 _symbolicStartingTime = now;
    //         uint256 _symbolicEndingTime = now;
    //         BasicProposal memory tempBasic = BasicProposal(_proposalID, _shortDescription, _symbolicstartingTime, _symbolicEndingTime, false, false, false);
    //         GAProposalAdditionals memory tempAdditional = GAProposalAdditionals(0x0, ActionType.proposeDissolution, _startingTime, "");
   
    //         proposalsForNextGA.push(_proposalID);
    //     } else if (_proposedActionType == ActionType.proposeUpdateStatute) {
    //     } else if (_proposedActionType == ActionType.proposeUpdateWallet) {
    //     } else if (_proposedActionType == ActionType.proposeExpelMember) {
    //     } else {
    //         revert();
    //     }

    //     proposalList[_proposalID] = tempBasic;
    //     gaProposalAdditionalsList[_proposalID] = GAProposalAdditionals;
    //     emit CreateGAProposal(_proposalID, _shortDescription, _proposedActionType, _startingTime, _proposedStatute);
    // }
}