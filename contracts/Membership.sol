pragma solidity ^0.4.15;


import 'zeppelin-solidity/contracts/math/SafeMath.sol';


contract Membership {
    using SafeMath for uint256;

    enum MemberTypes {NOT_MEMBER, EXISTING_MEMBER, DELEGATE, WHITELISTER}

    struct Member {
        MemberTypes memberType;
        uint256 whitelisted;
        mapping(address => bool) whitelistedBy;
        bool paid;
    }

    mapping (address => Member) public members;
    uint256 allMembers;

    // member => (whitelister => time)
    // mapping (address => mapping(address => uint256)) public whitelistMembers;

    function Membership() {
        members[msg.sender] = Member(MemberTypes.DELEGATE, 0, false); // TODO:
        allMembers = 1;
    }

    function() {
        payMembership();
    }

    // delegate, whitelister are also members
    modifier onlyMember() {
        require(members[msg.sender].memberType == MemberTypes.EXISTING_MEMBER
            || members[msg.sender].memberType == MemberTypes.WHITELISTER
            || members[msg.sender].memberType == MemberTypes.DELEGATE);
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

    function whitelistMember(address addrs) public onlyWhitelister {
        Member storage member = members[addrs];
        require(!member.whitelistedBy[msg.sender]);

        member.whitelistedBy[msg.sender] = true;
        member.whitelisted = member.whitelisted.add(1);

        if(member.whitelisted >= 2 && member.paid) {
            concludeJoining(addrs);
        }
    }

    function addWhitelister(address addrs) public onlyDelegate {
        members[addrs] = Member(MemberTypes.WHITELISTER, 0, false);
        allMembers = allMembers.add(1);
    }

    function removeWhitelister(address addrs) public onlyDelegate {
        require(members[addrs].memberType == MemberTypes.WHITELISTER);
        delete members[addrs];
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
        allMembers = allMembers.sub(1);
    }

    function getAllMembersCount() public constant returns (uint256) {
        return allMembers;
    }

    function getMember(address addrs) public constant returns (
        uint256,
        uint256,
        bool
    ) {
        uint256 memberType = uint256(members[addrs].memberType);
        uint256 whitelisted = members[addrs].whitelisted;
        bool paid = members[addrs].paid;

        return (memberType, whitelisted, paid);
    }

    function removeMemberThatDidntPay(address addrs) internal {
        delete members[addrs];
    }

    function concludeJoining(address addrs) private {
        members[addrs].memberType = MemberTypes.EXISTING_MEMBER;
        allMembers = allMembers.add(1);
    }

}
