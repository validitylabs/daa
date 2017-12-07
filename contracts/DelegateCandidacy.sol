pragma solidity ^0.4.15;


import './ExtraordinaryGA.sol';


contract DelegateCandidacy is ExtraordinaryGA {

    struct Conclusion {
        uint256 proposalId;
        address candidate;
        uint256 votesFor;
    }

    // by date
    mapping(uint256 => uint256) latestProposal;
    // by date
    mapping (uint256 => address[]) voted;
    // by date
    mapping(uint256 => Conclusion[]) concluded;

    uint256 private constant voteTime = 10 minutes;

    // Proposal has to be readable by external SC
    function getDelegateCandidacyProposal(uint256 proposalId) external constant returns (
        address submitter,
        bytes32 name,
        uint256 amount,
        address destinationAddress,
        uint256 startTime,
        uint256 duration,
        uint256 votesFor,
        uint256 votesAgainst,
        bool concluded,
        bool result
    )
    {
        return getProposal(DELEGATE_CANDIDACY, proposalId);
    }

    function proposeDelegateCandidacy() public onlyMember onlyDuringGA {
        proposeDelegateCandidacy(msg.sender);
    }

    // can not vote against
    function voteForDelegate(uint256 proposalId) public onlyMember {
        // Any member can vote for exactly one candidate (or not vote at all)
        uint256 date = getCurrentGADate();
        require(!isVoted(date, msg.sender));

        super.voteForProposal(DELEGATE_CANDIDACY, proposalId, true);
        voted[date].push(msg.sender);
    }

    function concludeVoteForDelegate(uint256 proposalId) public onlyMember {
        super.concludeProposal(DELEGATE_CANDIDACY, proposalId);

        // TODO: Candidate with most votes in favor is new candidate
        // If 2 or more candidates have same and most number of votes, re-vote on only those
        uint256 date = getCurrentGADate();

        Proposal storage proposal = proposals[DELEGATE_CANDIDACY][proposalId];
        concluded[date].push(Conclusion(
            proposalId,
            proposal.destinationAddress,
            proposal.votesFor
        ));

        // ! proposal.result = res;
        proposal.concluded = true;
    }

    function calculateAllVotesForDelegate() public onlyMember {
        var (date, started, finished, annual, stepDown) = getCurrentGA();
        require(finished > 0);

        // wait the latest voting
        uint256 proposalId = latestProposal[date];
        Proposal storage proposal = proposals[DELEGATE_CANDIDACY][proposalId];
        require(proposal.concluded);

        Conclusion[] storage concl = concluded[date];

        uint256 maxVotes = 0;
        uint256 count = 0;
        uint256[] indexArray;

        uint256 i;
        for (i = 0; i < concl.length; i++) {
            if (concl[i].votesFor > maxVotes) {
                maxVotes = concl[i].votesFor;
                count = 0;

                // https://ethereum.stackexchange.com/a/3377
                if (count == indexArray.length) {
                    indexArray.length += 1;
                }
                indexArray[count++] = i;

            } else if (concl[i].votesFor == maxVotes) {
                if (count == indexArray.length) {
                    indexArray.length += 1;
                }
                indexArray[count++] = i;
            }
        }

        if (maxVotes > 0) {
            if (count == 1) {
                address newDelegate = concl[indexArray[0]].candidate;
                setDelegate(newDelegate);
            } else {
                // re-vote

                for (i = 0; i < voted[date].length; i++) {
                    delete voted[date][i];
                }

                for (i = 0; i < count; i++) {
                    proposeDelegateCandidacy(concl[indexArray[i]].candidate);
                }

                for (i = 0; i < concl.length; i++) {
                    delete concluded[date][i];
                }
            }
        } else {
            // TODO:
            // all votes are 0
        }
    }

    function isVoted(uint256 date, address addrs) private constant returns (bool) {
        require(addrs != address(0));
        for (uint256 i = 0; i < voted[date].length; i++) {
            if (voted[date][i] == addrs) {
                return true;
            }
        }
        return false;
    }

    function proposeDelegateCandidacy(address candidate) private {
        require(candidate != address(0));

        uint256 proposalId = super.submitProposal(
            DELEGATE_CANDIDACY,
            "Propose Delegate Candidacy",
            0,
            candidate, // address(0),
            voteTime
        );

        latestProposal[getCurrentGADate()] = proposalId;
    }


}
