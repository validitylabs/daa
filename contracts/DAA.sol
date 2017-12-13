pragma solidity ^0.4.15;


import './SimpleProposals.sol';
import './Discharge.sol';
import './DelegateCandidacy.sol';
import './ExpelMember.sol';
import './Dissolution.sol';
import './ChangeStatutes.sol';
import './UpdateOrganization.sol';


contract DAA is SimpleProposals, Discharge, DelegateCandidacy, ExpelMember, Dissolution, ChangeStatutes, UpdateOrganization {

    function DAA(uint256 _fee, address _whitelister1, address _whitelister2)
        UpdateOrganization(_fee, _whitelister1, _whitelister2) { // TODO:

    }

}
