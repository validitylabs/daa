/**
 * @title Basic Votable Proposal 
 * @notice This contract will be heritated and instantiated by GA proposal or other proposals
 * @dev  The contract contains the basic information of . 
 */
pragma solidity ^0.4.21;

//@TODO The interface where two wallets are linked.
// import "./WalletInterface.sol";
import "./BasicVotableProposal.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 

contract Proposal is BasicVotableProposal {

    using SafeMath for uint256;

    address public destinationAddress;
    uint256 public targetAmount;

    event CreateProposal(bytes32 indexed ID, bytes32 ShortDescription, address indexed DestinationAddress, uint256 StartingTime, uint256 EndingTime);

    constructor (
        bytes32 _proposalID,
        bytes32 _shortDescription,
        address _destinationAddress, 
        uint256 _targetAmount, 
        uint256 _startingTime, 
        uint256 _duration
    ) public
    // memberOnly
    validProposalTime(_duration) {
        proposalID = _proposalID;
        shortDescription = _shortDescription;
        startingTime = _startingTime;
        endingTime = _startingTime.add(_duration);
        destinationAddress = _destinationAddress;
        targetAmount = _targetAmount;
        
        emit CreateProposal(proposalID,shortDescription,destinationAddress,startingTime,endingTime);
    }

    function concludeProposal() concludable returns (bool) {
        //@TODO Codes for conclduing proposal....
    }

    function action() internal isConcluded returns (bool) {
        //@TODO Codes that allows transfer money to from wallet to the destination address;
        //@TODO Call....
    }
}