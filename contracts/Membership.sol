pragma solidity ^0.4.15;


contract Membership {

    enum MemberTypes {NOT_MEMBER, EXISTING_MEMBER, DELEGATE, WHITELISTER}

    struct Member {
        MemberTypes memberType;
        uint256 whitelisted;
        bool paid;
    }

    mapping (address => Member) public members;

    // member => (whitelister => time)
    // mapping (address => mapping(address => uint256)) public whitelistMembers;


    modifier onlyMember() {
        require(members[msg.sender].memberType == MemberTypes.EXISTING_MEMBER
            || members[msg.sender].memberType == MemberTypes.WHITELISTER
            || members[msg.sender].memberType == MemberTypes.DELEGATE); // TODO: ?
        _;
    }

    modifier onlyDelegate() {
        require(members[msg.sender].memberType == MemberTypes.DELEGATE);
        _;
    }

    modifier onlyWhitelister() {
        require(members[msg.sender].memberType == MemberTypes.WHITELISTER);
        _;
    }


    function requestMembership() public {
        members[msg.sender] = Member(MemberTypes.NOT_MEMBER, 0, false);
    }

    function whitelistMember(address member) public onlyWhitelister {
        // TODO: prevent duplication
        members[member].whitelisted += 1;

        if(members[member].whitelisted >= 2 && members[member].paid) {
            concludeJoining(member);
        }
    }

    function payMembership() public payable {
        // TODO: check msg.value
        members[msg.sender].paid = true;
        if(members[msg.sender].whitelisted >= 2) {
            concludeJoining(msg.sender);
        }
    }

    function leaveDAA() public {
        if (members[msg.sender].memberType == MemberTypes.DELEGATE) {
            // TODO: For delegate that should only be possible when also proposing new GA date
        }

        delete members[msg.sender];
    }

    function concludeJoining(address member) private {
        members[member].memberType = MemberTypes.EXISTING_MEMBER;
    }

    function removeMemberThatDidntPay(address member) internal {
        delete members[member];
    }

}
