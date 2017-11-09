pragma solidity ^0.4.15;


import './SimpleProposals.sol';
import './Discharge.sol';
import './DelegateCandidacy.sol';
import './ExpelMember.sol';
import './Dissolution.sol';
import './ChangeStatutes.sol';
import './UpdateOrganization.sol';


contract DAA is SimpleProposals, Discharge, DelegateCandidacy, ExpelMember, Dissolution, ChangeStatutes, UpdateOrganization {



}
