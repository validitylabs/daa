/**
 * @title Library to count and calculate the voting result
 * @dev  The contract should inherate the methods of SafteMath.
 */
pragma solidity ^0.4.21;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol"; 

library TallyClerkLib {

    using SafeMath for uint256;

    enum voteTicket{NotYetParticipated, Abstain, No, Yes}

    struct VotesPerProposal {
        uint256 participantNum;
        uint256 yesNum;
        uint256 abstainNum;
        mapping(address=>voteTicket) participantList;
    }

    struct VotesForDelegate {
        mapping(address=>bytes32) participantList;
        uint256 participantNum;
    }

    // The following structs (1/2) are specifically for GA proposal where a new delegate needs to be selected.
    struct SingleCandidancy {
        address candidate;
        uint256 supportingVoteNum;
    }

    // The following structs (2/2) are specifically for GA proposal where a new delegate needs to be selected.
    struct CandidancyForDelegate {
        mapping(uint256=>SingleCandidancy) list;
        uint256 totalLength;
        bool revoteOrNot;                           // by default = false. However, in the case where two or more candidates received the same votes, then a revote is needed. 
        uint256 potentialRevote;                    // by default = 0. It shows the number of accounts (length) that are needed for the next round revote. To do a revote, this number > 1
        uint256 participantNum;
        mapping(uint256=>uint256) markedPositionForRevote;
    }


    /**
     *@title To refresh and calculate the result.
     *@motice This function should be called, everytime a member votes.
     */
    function refreshResult(VotesPerProposal storage _currentVotes, address _voter, voteTicket _newVote) public {
        if (_currentVotes.participantList[_voter] == voteTicket.NotYetParticipated) {
            // new vote
            _currentVotes.participantNum++;
        } else {
            // change previous vote
            if (_currentVotes.participantList[_voter] == voteTicket.Yes) {
                _currentVotes.yesNum--;
            } else if (_currentVotes.participantList[_voter] == voteTicket.Abstain) {
                _currentVotes.abstainNum--;
            }
        }
        if (_newVote == voteTicket.Yes) {
            _currentVotes.yesNum++;
        } else if (_newVote == voteTicket.Abstain) {
            _currentVotes.abstainNum++;
        }
        _currentVotes.participantList[_voter] = _newVote;
    }

    /**
     *@title Tell whether the result of a voting wins majority or not
     *@notice For even number, the positive votes should exceed half of the received votes.
     */
    function isMajority(uint256 _yesVoteNum, uint256 _totalNum) public pure returns (bool) {
        // e.g. If the total number is odd number, such as 3, then the vote should have yes for more than 1 (at least 2), to win as majority.
        // e.g. If the total number is even number, such as 4, then the vote should have yes for more than 2 (at least 2), to win as majority.
        if (_yesVoteNum > _totalNum.div(2)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     *@title Calculate whether a quorum of voting has reached or not.
     *@dev   simple comparison...
     */
    function calculateQuorum(uint256 _totalNumber, uint256 _quorumNumerator, uint256 _quorumDemoninator) public pure returns (uint256) {
        require(_quorumNumerator <= _quorumDemoninator);
        uint256 _quorum = _totalNumber.mul(_quorumNumerator).div(_quorumDemoninator);
        return _quorum;
    }

    /**
     *@title Function to find who are the candidates who hold the largest votes, in the election for new delegate
     *@dev   This function only tells the position of the candidate(s) with the hightest votes into the front. The mapping is not sorted.
     *@notice If a revote is needed, then the potential candidates are the accountes to which the markedPositionForRevote[0 to potentialRevote-1] points
     */
    function findMostVotes(CandidancyForDelegate storage _allCandidates) public {
        uint256 temp = 0;
        uint256 copies = 0;
        for (uint256 i = 0; i < _allCandidates.totalLength; i++) {
            if (temp < _allCandidates.list[i].supportingVoteNum) {
                temp = _allCandidates.list[i].supportingVoteNum;
                copies = 1;
                _allCandidates.markedPositionForRevote[0] = i;
            } else if (temp == _allCandidates.list[i].supportingVoteNum) {
                _allCandidates.markedPositionForRevote[copies] = i;
                copies++;
            }

            if (copies > 1) {
                _allCandidates.revoteOrNot = true;
                _allCandidates.potentialRevote = copies;
            } else {
                // When there is only one account won
                _allCandidates.revoteOrNot = false;
                _allCandidates.potentialRevote = 1;
            }
        }
    }

    /**
     *@title Function tells whether a revote is needed or not
     *@dev well... A public view function
     */
    function needRevote(CandidancyForDelegate storage _allCandidates) public view returns (bool) {
        if (_allCandidates.potentialRevote > 1 && _allCandidates.revoteOrNot == true) {
            return true;
        } else {
            return false;
        }
    }

}