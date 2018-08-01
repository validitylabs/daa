/**
 * @title Membership 
 * @notice This contract stores basic modifiers which control the membership
 * @dev  The contract consists of the functionality of crowdsale-like token generation and basic functions of user management. 
 */
pragma solidity ^0.4.21;

import "./Accessible.sol";
import "./ProposalInterface.sol";
//@TODO To introduce the feature of DAOToken later. This feature and the feature of reputation, along with the rewarding system can be introduced later. 
// import "./DAOToken.sol";
//@TODO The SafeMath contract is used for calculating membership contribution.
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol"; 

//@TODO Other wallet or addresses to be imported in the contract...

contract Membership is Accessible, Ownable {

    using SafeMath for uint256;
    // using SafeERC20 for DAOToken;
    
    ProposalInterface proposalGate;
    // DAOToken public nativeToken;

    address public treasuryAdr;
    address public gaManagerAdr;
    uint256 public headcount = 1;
    uint256 private lastNoDelegateTime = 0;
    uint256 public constant personalContribution = 10000 wei;        // The contribution (in wei) that each person needs to pay
    mapping(address=>uint256) internal memberContribution; // This is sepecially used when a minimum contribution is needed but not restrict to this value.
    mapping(address=>uint256) internal voteWeight;
    mapping(address=>address) internal firstWhiteLister;

    /**
     *@param concernedWhitelister The account of the whitelister.
     *@param removedOrAdded If a whitelister is newly added, true; If removed, false
     */
    event ChangeInWhitelister(address indexed concernedWhitelister, bool removedOrAdded);
    event ChangeInMembershipStatus(address indexed accountAddress, uint currentStatus);
    event ChangeInDelegate(address indexed concernedDelegate, bool removedOrAdded);

    modifier treasuryOnly {
        require(msg.sender == treasuryAdr);
        _;
    }

    /**
     *@title The constructor of the contract
     *@notice By default, the contract deployer is the delegate (holds the admin right, at the very first beginning)
     *@dev Whitelisters need to be provided upon construction.
     *@param _nativeToken the voting token used in the DAAS. However, at the current stage, no token is needed.
     *                    Token can then be introduced later when a staking mechanism is introduced.
     *@param _whitelisterOne the account address of the first whitelister
     *@param _whitelisterTwo the account address of the second whitelister
     */
    constructor (address _delegate, address _whitelisterOne, address _whitelisterTwo) public {
        delegate = _delegate;
        // nativeToken = _nativeToken;
        //@TODO linked the token. mint token and later transfer the ownership of the token to this contact address.
        whitelisterList[0] = _whitelisterOne;
        whitelisterList[1] = _whitelisterTwo;
        // whitelisterList.push(_whitelisterOne);
        // whitelisterList.push(_whitelisterTwo);
        membershipList[_delegate] = membershipStatus.isMember;     // By default, the delegate is also a member.
        emit ChangeInDelegate(delegate, true);
        emit ChangeInWhitelister(_whitelisterOne, true);
        emit ChangeInWhitelister(_whitelisterTwo, true);
        emit ChangeInMembershipStatus(delegate, uint(membershipStatus.isMember));
    }
    // new function for update proposals
    function updateProposalContractAddress(address _newProposal) public onlyOwner {
        require(_newProposal != 0x0);
        proposalGate = ProposalInterface(_newProposal);
    }

    function updateTreasuryAddress(address _newTreasury) public onlyOwner {
        require(_newTreasury != 0x0);
        treasuryAdr = _newTreasury;
    }

    function updateGAContractAddress(address _newGA) public onlyOwner {
        require(_newGA != 0x0);
        gaManagerAdr = _newGA;
    }

    // // // separate the update contract function into two small ones 
    // function updateContractAddress(address _newProposal, address _newTreasury) public onlyOwner {
    //     require(_newProposal != 0x0 || _newTreasury != 0x0);

    //     if (_newProposal != 0x0) {
    //         proposalGate = ProposalInterface(_newProposal);
    //     }

    //     if (_newTreasury != 0x0) {
    //         treasuryAdr = _newTreasury;
    //     }
    // }


    /**
     *@title A non-member requests the membership from the DAAS.
     *@notice Set the status of the member into requesting if the particular account has not yet done the request. 
     */
    function requestMembership() public returns (bool) {
        require(membershipList[msg.sender] == membershipStatus.nonMember);
        membershipList[msg.sender] = membershipStatus.requesting;
        emit ChangeInMembershipStatus(msg.sender, uint(membershipStatus.requesting));
        return true;
    }

    /**
     *@title Check the status of membership status: requesting or not
     *@dev  Check whether this should be implemented as a modifier
     *@param _adr The address of the to-be-verified account
     */
    function isRequestingMembership(address _adr) private view returns (bool) {
        if (membershipList[_adr] == membershipStatus.requesting) {
            return true;
        } else {
            return false;
        }
     }

     /**
      *@title Check the status of membership status: whitelisted or not
      *@dev Check whether this should be implemented as a modifier
      *@param _adr The address of the to-be-verified account
      */
    function isWhitelisted(address _adr) private view returns (bool) {
        if (membershipList[_adr] == membershipStatus.whitelistedByOne || membershipList[_adr] == membershipStatus.whitelistedByTwo) {
            return true;
        } else {
            return false;
        }
    }

    /**
     *@notice Set up the status of the member into the desired one.
     *@dev Can only be called internally by other functions.
     *@param _adr Account address that needs to be set into another status
     *@param _status The corresponding membershipStatus, as per defined in the Accessible.sol
     */
    function setMembershipStatus(address _adr, uint _status) private returns (bool) {
    //@TODO Need to compare the gas cost with hard-coded lines.
        membershipList[_adr] = membershipStatus(_status);
        emit ChangeInMembershipStatus(msg.sender, _status);
        return true;
    }

    /**
     *@title Add another whitelister. 
     *@dev   Only delegate has the right to add another whitelister.
     *@notice The new whitelister does not need to be a member of the DAAS. Theoretically, delegate can also take over the role of whitelister.
     *@param _adr The address of the new whitelister
     */
    function addWhitelister(address _adr) public delegateOnly returns (bool) {
        require(isWhitelister(_adr) == false);
        whitelisterList[whitelisterListLength] = _adr;
        whitelisterListLength++;
        // whitelisterList.push(_adr);
        emit ChangeInWhitelister(_adr,true);
        return true;
    }

    /**
     *@title Remove whitelister
     *@notice This action can only be called by delegate. Firstly, check the length of the whitelister's list.
     */
    function removeWhitelister(address _adr) public delegateOnly returns (bool) {
        require(isWhitelister(_adr) == true);
        require(whitelisterListLength > MINIMUM_WHITELISTER);

        for (uint i = 0; i < whitelisterListLength-1; i++) {
            if (whitelisterList[i] == _adr) {
                break;
            }
        }
        if (i != whitelisterListLength-1) {
            whitelisterList[i] = whitelisterList[whitelisterListLength-1];
        }
        whitelisterListLength--;
        emit ChangeInWhitelister(_adr,false);
        return true;
    }

    /**
     *@notice Whitelisters can give their approvals regarding the application of new members
     *@dev Check whether add a modifier, if isRequesting is implemented as modifier
     */
    function whitelistMember(address _adr) public whitelisterOnly returns (bool) {
        require(membershipList[_adr] == membershipStatus.requesting || (membershipList[_adr] == membershipStatus.whitelistedByOne && firstWhiteLister[_adr] != msg.sender));
        if (membershipList[_adr] == membershipStatus.requesting) {
            membershipList[_adr] = membershipStatus.whitelistedByOne;
            firstWhiteLister[_adr] = msg.sender;
            emit ChangeInMembershipStatus(_adr, uint(membershipStatus.whitelistedByOne));
        } else {
            membershipList[_adr] = membershipStatus.whitelistedByTwo;
            emit ChangeInMembershipStatus(_adr, uint(membershipStatus.whitelistedByTwo));
        }
        return true;
    }

    // /**
    //  *@notice To pay membership if needed. If the person is not a member the transaction cannot pass through.
    //  *@dev Evaluate how to define the membership unit price. Whether hardcoded or not / In which form: identical price for all or depending on the membershipStatus.
    //  *     Link to the fallback function. 
    //  *     When the person or entity is a member or ready to be a member, it is allowed to deposit money in to the contract. Then contract transfer money to the wallet address.
    //  */
    // function payMembership() public payable returns (bool) {
    //     require(msg.value >= personalContribution);

    //     // call function of treasuryInterface and forward the money.
    // }

    function addNewMember(address _newMember) public returns (bool) {   //treasuryOnly
        require(msg.sender == treasuryAdr);
        require(membershipList[_newMember] == membershipStatus.whitelistedByTwo);
        membershipList[_newMember] = membershipStatus.isMember;
        headcount++;
    }
    
    // /**
    //  *@notice Whether need to move to the wallet contract
    //  */
    // function enablePayout() public returns (bool) {
    // //@TODO Should be called by proposal contract when the proposal is passed with success.
    // }

    /**
     *@title To remove a member from the association
     *@notice Can only be triggered by a valid proposal or also possible for delegate to expel a member?
     */
    function removeMember(address _adr) public returns (bool) {
        require(membershipList[_adr] == membershipStatus.isMember);
    //@TODO require(verify msg.sender == purposal address) Also need to make sure that the purposal contract is actuallly pertinent to the removal of a member.
    //@TODO refund its membership contribution?
        membershipList[_adr] = membershipStatus.nonMember;
        headcount--;
        emit ChangeInMembershipStatus(_adr, uint(membershipStatus.nonMember));
    }

    /**
     *@title Set the account address of the delegate.
     *@dev This can only be successfully called by the GA purposal (upon sucess of voting..) 
     */
    function setDelegate(address _adr) public returns (bool) {
        require(msg.sender == gaManagerAdr);
    //@TODO require(verify msg.sender == GA purposal address)
        require(membershipList[_adr] == membershipStatus.isMember);
        emit ChangeInDelegate(delegate, true);
    }

    /**
     *@notice To see the membership status of a particular address
     *@param _adr The address of the to-be-checked account
     */
    function getMembershipStatus(address _adr) public view returns (uint) {
        return uint256(membershipList[_adr]);
    }

    function expelMember(bytes32 _proposalID) public returns (bool) {
        // upon proposal success
        require(proposalGate.getProposalFinalResult(_proposalID));
        // request is dissolve
        require(proposalGate.checkActionIsExpel(_proposalID));
        address _expelledMember;
        _expelledMember = proposalGate.getProposalProposedAdr(_proposalID);
        // Cannot expel delegate
        require(_expelledMember != delegate);
        membershipList[_expelledMember] = membershipStatus.nonMember;
        return true;
    }

    /**
     *@notice Get important information.
     */
    function getDelegate() public view returns (address) {
        return delegate;
    }

    function checkIsMember(address _adr) external view returns (bool) {
        return (membershipList[_adr] == membershipStatus.isMember);
    }

    function checkIsDelegate(address _adr) external view returns (bool) {
        return (delegate == _adr);
    }

    function checkIsWhitelistedByTwo(address _adr) external view returns (bool) {
        return (membershipList[_adr] == membershipStatus.whitelistedByTwo);
    }

    function reachDesiredValue(uint256 _value) external view returns (bool) {
        if (_value < personalContribution) {
            return false;
        } else {
            return true;
        }
    }

    function hasDelegate() external view returns (bool) {
        return (delegate != 0x0);
    }
    
    function getWhitelisterNumber() public view returns (uint256) {
        return whitelisterListLength;
    }

    function getTotalMemberNumber() public view returns (uint256) {
        return headcount;
    }
}