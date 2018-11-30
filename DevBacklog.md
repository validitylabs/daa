## Concerns

### Upgradability and flexibility

Current DAAS hard coded almost all the possible administrative operations (marked as GA proposals), giving little flexibility to the association themselves to design their operations schemes. This aspect needs to be improved under Swiss legislation framework, to make sure that each action the association or the member of such association takes is complied with the Swiss regulation. For instance, the frequency of GA, the limitation of responsibility, etc. This gives us reason to limit certain degree of freedom from the association. However, we shall also bear in mind that the regulation may change when time passes by. These parameters (or even more) need to be adapted accordingly.  

It is necessary to define the scope of potential changes in our case, in order to find the right balance between upgradability and cost optimization. The scope is guided by the current Swiss legal system. Future change in the legal system may happen and there have no view on the speed, nor the direction of such potential pivot. Such incertainty is not included in the archtecture design.  If in any day, a drastic change in the legal system is presented, the DAAS cannot

### Security of the organization

Some possible attack vectors (e.g. double spending, theft, or signature forgery) need to be thoroughly considered during the architecture design of the system. Double spending and theft could be solved with the best practice for dApp architecture design and robust coding logics inherintly. However, the signature forgery needs to be further discussed: There are more than one approach to solve such problem:

- heritage model: Each user could point another user to inherit his property (his role in the association, his )

- Activity model: If a user was not actively participating any voting/initiating voting/paying membership for some time (duration TBD, e.g. 2 years), this account should then be on hold (freeze account). His absence is not counted in the quorum in voting. A whitelisted/ the delegate can freeze the account or release it.

  However, according to the Swiss Civil Code Art. 70 *Membership is neither transferable nor heritable*

### General Assembly

There are two types of General Assembly (GA) available in the DAA. One is the ordinary GA, set by the delegate - ideally once per year aiming at gathering all members; The other one is the extraordinary GA - proposed by any member and set upon a successful proposal. Such proposal could be initiated by any member for (legitim reasons) in case of emergency and voted by all members. 

#### Prevent the spam of GA proposals

The freedom of proposal extraordinary GA leaves potential for malicious members of taking such advantage and spam the association with too many extraordinary GAs and postpone/push the useful extraordinary GA late, providing the proposals are assigned upfront to a particular GA. e.g. When a delegate proposal or change statues proposal is set for the closest GA at the moment of creation (e.g. in one year and a half), if the rules allowed, multiple other GAs could be arranged before such GA happens and other members could propose other changes in statutes   that block the "important" proposal. Or the "important" proposal is very urgent and needs to be voted ASAP but not able to plan forwards.

#### Specific problems

1. Apart from the source of proposal, is there any other difference between these two GAs?
2. What is the minimum time interval (allowed/min/max frequency and length) for such kind of extraordinary GA? 
3. What are the criteria for ordinary (annual) GAs? 
4. Is there any other regulation for the time distance between extra- and ordinary GA? 
5. If there any obligation for delegate to have annual GA? How flexible delegate can be? Exactly one GA per calendar year / elected year? Or only need to have certain GAs during the elected period where on average there is one per year? 
6. For both kinds of GA, is there any limits of timing? e.g. I can plan for max. in two years.
7. Any other additional requirements for the GA?

### GA Proposal

#### Propose a new delegate

1. What if there are several rounds of re-election of delegate candidacy and the total duration exceeds the planned GA?
2. Difference between "step down and propose delegate" and "propose new delegate". The former one implies the current delegate is no longer in charge of the DAO, aka delegate = 0x0. In this case, the association is operating without legal representative, therefore payout is no longer active (There is a need of having a main valve in the Treasury contract for such purpose). The latter one allows an election happening before the current term finishes. 
3. When the new delegate proposal is ready to be initiated. a check on the starting time is needed
   1. In the latter case, since such election is preventive, there is a need to check a minimum time gap between the two similar proposals. 
   2. In the first case, the election is very emergent. If the initiator is the delegate, there is no need to respect the time gap. 
4. Everyone can propose their candidacy at any time, but one can only propose the candidacy for the next election that will happen at the next closest GA. If the next GA is scheduled in one month and the second next is scheduled in 1 year, one cannot propose his delegate candidacy directly for the one in 1 year and skipping the current one. The proposal for candidacy does not need to be during GA, but before the GA.
5. When multiple people want to propose their candidacy, each of their candidacy has their own proposalID. All these proposalIDs are under the category of "delegatecandidacy". Members, during GA, can only vote for one of these open "candidacy proposals".
6. What is the quorum for such delegate candidate proposal? Minimum participant numbers or/and minimum number in favor of the proposal?
7. What if the member who supposed to be elected as new delegate is got expelled via a GA proposal at the same time?
8. Tenure of the delegate position? Regulation of re-election?

#### Vote for proposals at GA

1. Who sets the order of the opening proposals?  (according to the order in the array?) The first one starts its voting slot as long as the clock hits the GA starting time.
2. Whether the member can decide the duration of the extraordinary GA? 
3. All the voting happens during GA lasts for 10 minutes?
4. The quorum: vote yes number is based on the participant number, or it is based on the total number?

#### Proposal for extraordinary GA and GA

Although an emergent GA can be initiated and set by the DAA members, there's a standard time for such extraordinary GA. Limited to 60 minutes? 

#### Dissolution

What will happen exactly when dissolution??

#### Update

1. When changing the statute, is changed during one GA, is it effective directly?
2. To which extent is changing the quorum / voting procedure / logics possible? If the association has completely the freedom to take these actions, it makes even more sense to disassemble the structure even more (c.f. DAOstack)

#### Expel member

1. What if the expelled member has several on-going proposals? (to become delegate or to withdraw certain amount of money)
2. Will the membership contribution also be refunded?
3. Right now we allow to expel whitelister because if the whitelister can also be a member. If the whitelister is 
4. Delegate cannot be expelled directly. If one wants delegate be out of the association, there are some options:

- Propose candidate delegate and got selected
- Step down voluntarily (and propose GA)

1. What's the difference between "step down" and "discharge"??
2. Whether to implement the resignation (cf. Art. 70) *All members have a legal right to resign subject to six months' notice expiring at the end of the calendar year or, if an administrative period is provided for, at the end of such period.*

#### Membership fee

Annual fee? When to check? If the fee is delayed then what will happen exactly?

Is the membership compulsory or voluntary? Do we allow voluntary contribution (with extra amount)? Does the amount depend on the position or strictly same fee or there is a minimum contribution then the more it donates?

Further steps, to introduce the stake/token, the heavier the stake/vote weight it has.

Is it refundable? Nope... but a proposal is possible for payback the accidental extra payment

voluntary donation is welcomed?

### Ordinary proposal

Is it possible to be destructed before it’s concluded by the owner?

External donation can only be accepted when the proposal is created (open and before it becomes concludable nor concluded). No need to be votable.

At the moment, the proposal initiator is not automatically voting "yes".

The payout function for external funds is frozen or not during the GA?

## Procedure

### Steps for deployment

1. Finished deployment for all the concrete contracts.
   1. Membership 
   2. (TalleyClerk LIbrary)
   3. ProposalManager
   4. GAManager
   5. Wallet
   6. ExternalWallet
   7. Treasury
2. Transfer ownership of Wallet and ExternalWallet from deployer to Treasury.
3. Transfer ownership from deployer to DAA contract.
4. Finished deployment for DAA
5. Call finishDeployment function in DAA contract.

### Steps to set up a GA

1. The setting function is open to all members. What if there is a malicious one, trying to postpone the important discussion and thus schedule all the trivial ones to the top?
2. The proposals cannot be re-scheduled to another GA or cancelled once it is been set up.

## Ongoing Development

- [ ] proposal discharge? = step down and propose GA?

- [x] check whether implemented: at the absence of delegate, disable payout.

- [ ] Fix the setup of quorum

- [x] check the magic constant across all contracts

- [ ] Add necessary events to be emitted.

- [ ] Check the ProposalManager. If moving some structs and quorum calculation to TallyClerkLib and ActionLib is reasonable?

- [ ] Hash important information for function inputs and outputs.

- [ ] Currently there's no punishment for members who do not pay their membership fee on time. Some possible action could be: disable the account until the accumulated missing fee is paid.

- [ ] **Fix the proposeDelegatecandidacy: ProposalManager.sol (line 369)**

- [ ] Fix the conclusion of delegate candidate proposal. When getting the result the initial voting (or the second round of the revoting) setting up the proposals to be revoted 

  1. Auto-calculation of the number of proposals to be revote (When calling the conclusion). Jump out if the number is only 1; Otherwise, keep following the steps.

  2. Delete the previous array of proposals (maybe it's already done at the moment of GA voting)

  3. Loop-call (think of the gas) of creating the new proposals (and of course clean up the unnecesaary counters)

     `function calculateCandidateReceivedVoting(uint256 _minParticipant, uint _minYes) public proposalOnly returns (bool, bool, uint256) {`

  4. Seperate call for the proposal preparation (make sure that this voting won't go to the next GA)

  5. (Boardcast the new potential proposals and voting opening)

  6. Start from the step 1

- [ ] Second round extension for revoting 

- [ ] Voting mechanism - to revise

- [ ] Changed the way of allocating the GA proposal to a certain GA. Now, a GA can be proposed first and allocate to an existing GA (one after the other). It is not yet possible to remove it if such proposal is already in queue for one GA. At the same time , there is a risk that someone just puts junk GA proposals and allocates them to one GA until it been filled up -> make one GA unavailable. 

  - [ ] Possible solution: cost for creating a GA proposal
  - [ ] Possible soluiton: limited number of GA proposal per member

- [ ] Set GA proposal to GA is located in ProposalManager.sol but set delegate candidacy proposal is located in GAManager.sol

- [ ] Before concluding the candidacy proposals -> new proposals are not taken into account ... LOL


## Testing

1. Gas of DAA contract constructor