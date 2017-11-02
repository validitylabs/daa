pragma solidity ^0.4.15;


contract Membership {

    enum MemberTypes {NOT_MEMBER, EXISTING_MEMBER, DELEGATE, WHITELISTER}

    mapping (address => MemberTypes) public members;
    mapping (address => uint256) public whitelistMembers;


    modifier onlyMember() {
        require(members[msg.sender] == MemberTypes.EXISTING_MEMBER
            || members[msg.sender] == MemberTypes.WHITELISTER
            || members[msg.sender] == MemberTypes.DELEGATE); // TODO: ?
        _;
    }

    modifier onlyDelegate() {
        require(members[msg.sender] == MemberTypes.DELEGATE);
        _;
    }

    modifier onlyWhitelister() {
        require(members[msg.sender] == MemberTypes.WHITELISTER);
        _;
    }


    function requestMembership() public {
        // msg.sender
    }

    function whitelistMember(address member) public onlyWhitelister {

    }

    function payMembership() public payable {
        // msg.sender, msg.value
    }

    function leaveDAA() public {
        // msg.sender
    }

    function concludeJoining(address member) internal {

    }

    function removeMemberThatDidntPay(address member) internal {

    }

}
