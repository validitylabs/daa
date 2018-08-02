/**
 * Test for Membership management
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import { expectThrow, forwardNDays, getEvents, BigNumber, increaseTimeTo, duration, latestTime } from './helpers/tools';
import { getNegativePatternsAsPositive } from '../../node_modules/fast-glob/out/managers/tasks';
import { request } from 'https';
import { it } from 'mocha';
import { first } from '../../node_modules/rxjs/operator/first';

// const DAOToken = artifacts.require('./DAOToken.sol');˚

const Membership = artifacts.require('./Membership.sol');
const ProposalManager = artifacts.require('./ProposalManager.sol');
const GAManager = artifacts.require('./GAManager.sol');
// const Accessible = artifacts.require('./Accessible.sol');
const Wallet = artifacts.require('./Wallet.sol');
const ExternalWallet = artifacts.require('./ExternalWallet.sol');
const Treasury = artifacts.require('./Treasury.sol');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * IcoToken contract
 * Member contract
 */
contract('Membership Test (without DAO Token)', (accounts) => {

    const initiator     = accounts[0];
    const delegate      = accounts[1];
    const whitelister1  = accounts[2];
    const whitelister2  = accounts[3];
    const requester     = accounts[5];
    const newWhiteLister = accounts[6];
    const newMember     = accounts[7];
    const member2       = accounts[8];
    const others        = accounts[9];

    // Printout useful account addresses for further comparison
    console.log('Initiator:'.blue, initiator);
    console.log('Delegate'.blue, delegate);
    console.log('Whitelister1'.blue, whitelister1);
    console.log('Whitelister2'.blue, whitelister2);
    console.log('NewWhiteLister'.blue, newWhiteLister);
    console.log('Requester'.blue, requester);
    console.log('Others'.blue, others);

    // Provide membershipInstance for every test case

    // let DAOTokenInstance;
    let membershipInstance;
    let TreasuryInstance;
    let WalletInstance;
    let ExternalWalletInstance;
    let ProposalManagerInstance;
    let GAManagerInstance;


    beforeEach(async () => {
        membershipInstance    = await Membership.deployed();
        // const  DAOTokenAddress  = await membershipInstance.nativeToken();
        // // console.log('The deployed token instance is at address: ' + DAOTokenAddress);
        // DAOTokenInstance        = await DAOToken.at(DAOTokenAddress);
        TreasuryInstance = await Treasury.deployed();
        WalletInstance = await Wallet.deployed();
        ExternalWalletInstance = await ExternalWallet.deployed();
        ProposalManagerInstance = await ProposalManager.deployed();
        GAManagerInstance = await GAManager.deployed();
    });

    /**
     * [ Claim period ]
     */

    it('should instantiate the Membership correctly', async () => {
        console.log('[ Start playing with membership contract ]'.yellow);

        const currentDelegate   = await membershipInstance.getDelegate.call();

        assert.equal(delegate, currentDelegate, 'Current delegate does not match with the contract initiator.');
    });
    
    it('should have delegate as membershipStatus.isMember', async()=> {
        const isDelegate = await membershipInstance.checkIsDelegate.call(delegate, {from: others});
        const isMember = await membershipInstance.checkIsMember.call(delegate, {from: initiator});
        
        assert.isTrue(isDelegate, 'Current delegate cannot be checked with checkIsDelegate function');
        assert.isTrue(isMember, 'Current delegate is not a member');
    });
    
    it('should have two whitelister with correct account addresses', async () => {
        // const AccessibleInstance = Accessible.at(membershipInstance.address);
        let whitelister1_account = await membershipInstance.testFuncGetWhitelister.call(0);
        let whitelister2_account = await membershipInstance.testFuncGetWhitelister.call(1);
        assert.equal(whitelister1_account, whitelister1, 'Whitelister 1 is not as expected.');
        assert.equal(whitelister2_account, whitelister2, 'Whitelister 2 is not as expected.');
    });
    
    it('should always have minimum two whitelisters', async () => {
        await expectThrow(membershipInstance.removeWhitelister(newWhiteLister, {from: initiator}));
        await expectThrow(membershipInstance.removeWhitelister(newWhiteLister, {from: whitelister1}));
        await expectThrow(membershipInstance.removeWhitelister(whitelister1, {from: initiator}));
    });
    
    it('should only allow delegate to add new white lister, if the person is not yet a whitelister', async () => {
        await expectThrow(membershipInstance.addWhitelister(whitelister1, {from: initiator}));
        await expectThrow(membershipInstance.addWhitelister(newWhiteLister, {from: whitelister1}));
        
        const tx1 = await membershipInstance.addWhitelister(newWhiteLister, {from: delegate});
        const events1 = getEvents(tx1, 'ChangeInWhitelister');
        assert.isTrue(events1[0].removedOrAdded, 'Failed to add the new user');
        assert.equal(events1[0].concernedWhitelister, newWhiteLister, 'User account mismatch');
        
        let whitelistersNumber = await membershipInstance.testFuncGetWhitelistersLength.call();
        // console.log(whitelistersNumber.toNumber());
        assert.equal(whitelistersNumber, 3, 'The number of whitelisters is not as expected');
    });

    it('should initiate membership request', async () => {
        const tx1 = await membershipInstance.requestMembership({from: requester});
        const events1 = getEvents(tx1, 'ChangeInMembershipStatus');
        assert.equal(events1[0].accountAddress, requester, 'Account address is wrong');
        assert.equal(events1[0].currentStatus, 1, 'The account is now requesting membership');
    });
    
    it('should be approved by the first whitelister, can only be approved by one whitelister once', async() => {
        const tx1 = await membershipInstance.whitelistMember(requester, {from: whitelister1});
        const events1 = getEvents(tx1, 'ChangeInMembershipStatus');
        assert.equal(events1[0].accountAddress, requester, 'Account address is wrong');
        assert.equal(events1[0].currentStatus, 2, 'The requester is not sucessfully approved by the whitelister1');
    });

    it('should reject the approval if the use is not requesting membership',  async () => {
        await expectThrow(membershipInstance.whitelistMember(delegate, {from: whitelister1}));
        await expectThrow(membershipInstance.whitelistMember(others, {from: whitelister2}));
    });
    
    it('should be approved by the second whitelister, this second one cannot be the same as the first one', async() => {
        await expectThrow(membershipInstance.whitelistMember(requester, {from: whitelister1}));

        const tx1 = await membershipInstance.whitelistMember(requester, {from: whitelister2});
        const events1 = getEvents(tx1, 'ChangeInMembershipStatus');
        assert.equal(events1[0].accountAddress, requester, 'Account address is wrong');
        assert.equal(events1[0].currentStatus, 3, 'The requester is currently been whitelisted by two');
        
        let requesterIsWhitelistedByTwo = await membershipInstance.checkIsWhitelistedByTwo.call(requester);
        assert.isTrue(requesterIsWhitelistedByTwo, 'The requester has not yet been whitelisted by two');
    });
    
    it('should successfully pay the membership fee', async () => {
        const payment = web3.toWei(1, 'ether');

        await expectThrow(TreasuryInstance.payNewMembershipFee({
            from: others, 
            value: 10000
        }));
        await expectThrow(TreasuryInstance.payNewMembershipFee({
            from: others, 
            value: payment
        }));
        
        // console.log(payment);
        let paymentReachesDesiredValue = await membershipInstance.reachDesiredValue.call(payment);
        assert.isTrue(paymentReachesDesiredValue, 'The payment is not enough');
        
        // let addMember = await membershipInstance.addNewMember(requester, {from: TreasuryInstance.address});
        // assert.isTrue(addMember, 'The member was not added successfully');
        
        let totalBalanceBaforePayment = await WalletInstance.getTotalBalance.call();
        // console.log(totalBalanceBaforePayment[0].toNumber(), totalBalanceBaforePayment[1].toNumber());
        assert.equal(totalBalanceBaforePayment[0].toNumber(), totalBalanceBaforePayment[1].toNumber(), 'The balance value does not match');
        
        // let treasuryAdrForMembershipContract = await membershipInstance.treasuryAdr();
        // console.log(treasuryAdrForMembershipContract);
        
        const tx2 = await TreasuryInstance.payNewMembershipFee({
            from: requester, 
            value: payment, 
            gas: 700000
        });
        
        let totalBalanceAfterPayment = await WalletInstance.getTotalBalance.call();
        // console.log(totalBalanceAfterPayment[0].toNumber(), totalBalanceAfterPayment[1].toNumber());
        assert.equal(totalBalanceBaforePayment[0].toNumber(), totalBalanceBaforePayment[1].toNumber(), 'The balance value does not match');
        
        let currentStatus = await membershipInstance.getMembershipStatus.call(requester);
        assert.equal(currentStatus, 4, 'The requester is not a member?!');
    });

    it('should add two other members in the system', async () => {
        await membershipInstance.requestMembership({from: newMember});
        await membershipInstance.whitelistMember(newMember, {from: whitelister1});
        await membershipInstance.whitelistMember(newMember, {from: newWhiteLister});
        await TreasuryInstance.payNewMembershipFee({
            from: newMember, 
            value: 10000, 
            gas: 700000
        });

        let currentStatus = await membershipInstance.getMembershipStatus.call(newMember);
        assert.equal(currentStatus, 4, 'The requester is not a member?!');

        await membershipInstance.requestMembership({from: member2});
        await membershipInstance.whitelistMember(member2, {from: whitelister1});
        await membershipInstance.whitelistMember(member2, {from: newWhiteLister});
        await TreasuryInstance.payNewMembershipFee({
            from: member2, 
            value: 10000, 
            gas: 700000
        });

        let currentStatus2 = await membershipInstance.getMembershipStatus.call(member2);
        assert.equal(currentStatus2, 4, 'The requester is not a member?!');
    });

    const firstProposalID = 'FirstID_123';
    // Timestamp is in milliseconds... but time is in seconds
    it('should initiated a proposal', async () => {
        let money = 1; // wei
        // console.log(latestTime(), ' Moment when proposal is set');
        let startingTime = latestTime() + duration.minutes(5); // in seconds
        // console.log(startingTime, ' Time when the proposal should start');
        let proposalDuration = duration.days(7);
        // The minimum duration is at least in 7 days.
        let proposalID = firstProposalID;
        let shortDescription = 'Interesting proposal';
        // Be careful, the description cannot exceed 32 bytes

        assert(latestTime() < startingTime, 'The timing modifier should be passed.');

        const tx1 = await ProposalManagerInstance.createProposal(
            proposalID,
            shortDescription,
            requester,
            money,
            startingTime,
            proposalDuration,
            false,
            {from: requester}            
        );
        const events1 = getEvents(tx1, 'CreateProposal');
        assert.equal(events1[0].DestinationAddress, requester, 'Account address is wrong');
        assert.equal(web3.toUtf8(events1[0].ID), proposalID, 'ID does not match');
    });
    
    it('should let a member vote abstain', async() => {
        // /**
        //  * The following functions are for testing functions waitNDays
        //  */
        // console.log('Current time is ', latestTime());
        // await waitNDays(12);
        // console.log('Current time is ', latestTime(), ' (waitNDays) ');
        // await increaseTimeTo(latestTime() + duration.days(1));
        // console.log('Current time is ', latestTime(), ' (IncreaseTimeTo) ');
        // // check the current timestamp as well as the open interval.

        // fastforward 1 day to jump into the right time interval.
        // console.log(latestTime(), ' Current time is ');
        await forwardNDays(1);
        // console.log(latestTime(), ' Current time is (After time leaping) ');

        let vote = 1;
        const tx1 = await ProposalManagerInstance.voteForProposal(firstProposalID, vote, {from: newMember});
        let actualVote = await ProposalManagerInstance.getVoteForProposal.call(firstProposalID, newMember);
        assert.equal(actualVote.toNumber(), vote, 'The vote is not correct');
        let proposalStatus = await ProposalManagerInstance.votesForEachProposal(firstProposalID);
        assert.equal(proposalStatus[0], 1, 'It is not the first participant?');
        assert.equal(proposalStatus[1], 0, 'The vote is taken as yes');
        assert.equal(proposalStatus[2], 1, 'The vote is taken as abstain');
        // assert.notEqual(proposalStatus[3][newMember])
    });
    
    it('should let member change vote from abstain to yes', async() => {
        let vote = 3; 
        const tx1 = await ProposalManagerInstance.voteForProposal(firstProposalID, vote, {from: newMember});
        let actualVote = await ProposalManagerInstance.getVoteForProposal.call(firstProposalID, newMember);
        assert.equal(actualVote.toNumber(), vote, 'The vote is not correct');
        let proposalStatus = await ProposalManagerInstance.votesForEachProposal(firstProposalID);
        assert.equal(proposalStatus[0], 1, 'It is not the first participant?');
        assert.equal(proposalStatus[1], 1, 'The vote is taken as yes');
        assert.equal(proposalStatus[2], 0, 'The vote is taken as abstain');
    });
    
    it('should let all other members vote', async() => {
        let totalMemberNum = await membershipInstance.headcount();
        console.log(totalMemberNum.toNumber(), ' headcount ');
    });


    // it('should instantiate the Ico token correctly', async () => {
    //     console.log('[ Claim period ]'.yellow);

    //     const isOwnerTreasurer      = await icoTokenInstance.isTreasurer(owner);
    //     const isOwnerAccountZero    = await icoTokenInstance.owner() === owner;

    //     assert.isTrue(isOwnerAccountZero, 'Owner is not the first account: ' + icoTokenInstance.owner());
    //     assert.isTrue(isOwnerTreasurer, 'Owner is not a treasurer');
    // });

    // it('should fail, because we try to transfer on a paused contract', async () => {
    //     await expectThrow(icoTokenInstance.transfer(tokenHolder2, 1, {from: tokenHolder1}));
    // });

    // it('should unpause ICO token correctly', async () => {
    //     await icoTokenInstance.unpause({from: owner});
    //     const paused = await icoTokenInstance.paused();

    //     assert.isFalse(paused);
    // });

    // it('should add treasurer accounts', async () => {
    //     const tx1 = await icoTokenInstance.setTreasurer(activeTreasurer1, true);
    //     const tx2 = await icoTokenInstance.setTreasurer(activeTreasurer2, true);
    //     const tx3 = await icoTokenInstance.setTreasurer(inactiveTreasurer1, false);
    //     const tx4 = await icoTokenInstance.setTreasurer(inactiveTreasurer2, false);

    //     const treasurer1 = await icoTokenInstance.isTreasurer(activeTreasurer1);
    //     const treasurer2 = await icoTokenInstance.isTreasurer(activeTreasurer2);
    //     const treasurer3 = await icoTokenInstance.isTreasurer(inactiveTreasurer1);
    //     const treasurer4 = await icoTokenInstance.isTreasurer(inactiveTreasurer2);

    //     assert.isTrue(treasurer1, 'Treasurer 1 is not active');
    //     assert.isTrue(treasurer2, 'Treasurer 2 is not active');
    //     assert.isFalse(treasurer3, 'Treasurer 3 is not inactive');
    //     assert.isFalse(treasurer4, 'Treasurer 4 is not inactive');

    //     // Testing events
    //     const events1 = getEvents(tx1, 'ChangedTreasurer');
    //     const events2 = getEvents(tx2, 'ChangedTreasurer');
    //     const events3 = getEvents(tx3, 'ChangedTreasurer');
    //     const events4 = getEvents(tx4, 'ChangedTreasurer');

    //     assert.equal(events1[0].treasurer, activeTreasurer1, 'activeTreasurer1 address does not match');
    //     assert.isTrue(events1[0].active, 'activeTreasurer1 expected to be active');

    //     assert.equal(events2[0].treasurer, activeTreasurer2, 'activeTreasurer2 address does not match');
    //     assert.isTrue(events2[0].active, 'activeTreasurer2 expected to be active');

    //     assert.equal(events3[0].treasurer, inactiveTreasurer1, 'inactiveTreasurer1 address does not match');
    //     assert.isFalse(events3[0].active, 'inactiveTreasurer1 expected to be inactive');

    //     assert.equal(events4[0].treasurer, inactiveTreasurer2, 'inactiveTreasurer2 address does not match');
    //     assert.isFalse(events4[0].active, 'inactiveTreasurer2 expected to be inactive');
    // });

    // it('should mint 5 tokens for each token holder', async () => {
    //     let balanceTokenHolder1 = await icoTokenInstance.balanceOf(tokenHolder1);
    //     let balanceTokenHolder2 = await icoTokenInstance.balanceOf(tokenHolder2);
    //     let balanceTokenHolder3 = await icoTokenInstance.balanceOf(tokenHolder3);
    //     let totalSupply         = await icoTokenInstance.totalSupply();

    //     assert.equal(balanceTokenHolder1, 0, 'Wrong token balance of tokenHolder1 (is not 0): ' + balanceTokenHolder1);
    //     assert.equal(balanceTokenHolder2, 0, 'Wrong token balance of tokenHolder2 (is not 0): ' + balanceTokenHolder2);
    //     assert.equal(balanceTokenHolder3, 0, 'Wrong token balance of tokenHolder3 (is not 0): ' + balanceTokenHolder3);
    //     assert.equal(totalSupply, 0, 'Wrong total supply (is not 0): ' + totalSupply);

    //     const tx1 = await icoTokenInstance.mint(tokenHolder1, 5);
    //     const tx2 = await icoTokenInstance.mint(tokenHolder2, 5);
    //     const tx3 = await icoTokenInstance.mint(tokenHolder3, 5);

    //     balanceTokenHolder1 = await icoTokenInstance.balanceOf(tokenHolder1);
    //     balanceTokenHolder2 = await icoTokenInstance.balanceOf(tokenHolder2);
    //     balanceTokenHolder3 = await icoTokenInstance.balanceOf(tokenHolder3);
    //     totalSupply         = await icoTokenInstance.totalSupply();

    //     assert.equal(balanceTokenHolder1, 5, 'Wrong token balance of tokenHolder1 (is not 5): ' + balanceTokenHolder1);
    //     assert.equal(balanceTokenHolder2, 5, 'Wrong token balance of tokenHolder2 (is not 5): ' + balanceTokenHolder2);
    //     assert.equal(balanceTokenHolder3, 5, 'Wrong token balance of tokenHolder3 (is not 5): ' + balanceTokenHolder3);
    //     assert.equal(totalSupply, 15, 'Wrong total supply (is not 15): ' + totalSupply);

    //     // Testing events
    //     const events1 = getEvents(tx1);
    //     const events2 = getEvents(tx2);
    //     const events3 = getEvents(tx3);

    //     events1.Mint[0].amount.should.be.bignumber.equal(5);
    //     events2.Mint[0].amount.should.be.bignumber.equal(5);
    //     events3.Mint[0].amount.should.be.bignumber.equal(5);

    //     assert.equal(events1.Mint[0].to, tokenHolder1, 'Mint event to address doesn\'t match against tokenHolder1 address');
    //     assert.equal(events2.Mint[0].to, tokenHolder2, 'Mint event to address doesn\'t match against tokenHolder2 address');
    //     assert.equal(events3.Mint[0].to, tokenHolder3, 'Mint event to address doesn\'t match against tokenHolder3 address');

    //     events1.Transfer[0].value.should.be.bignumber.equal(5);
    //     events2.Transfer[0].value.should.be.bignumber.equal(5);
    //     events3.Transfer[0].value.should.be.bignumber.equal(5);
    // });

    // it('should start a new dividend round with a balance of 30 eth', async () => {
    //     const expectedBalance = web3.toWei(30, 'ether');

    //     // At this point, the contract should not have any ETH
    //     web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(0, 'ether'));

    //     // Initialize first dividend round with a volume of 30 eth
    //     const tx = await icoTokenInstance.sendTransaction({
    //         from:   activeTreasurer1,
    //         value:  expectedBalance,
    //         gas:    700000
    //     });

    //     const icoBalance    = await icoTokenInstance.currentDividend();
    //     const endTime       = await icoTokenInstance.dividendEndTime();

    //     icoBalance.should.be.bignumber.equal(expectedBalance);
    //     web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(expectedBalance);

    //     assert.isTrue(endTime.gt(0), 'EndTime not properly set: ' + endTime);

    //     // Testing events
    //     const events = getEvents(tx);

    //     events.Payin[0]._value.should.be.bignumber.equal(expectedBalance);
    //     events.Payin[0]._endTime.should.be.bignumber.equal(endTime);
    //     assert.equal(events.Payin[0]._owner, activeTreasurer1, 'Treasurer doesn\'t match against: ' + activeTreasurer1);
    // });

    // it('should fail, because we try to increase the dividend again', async () => {
    //     // At this point, the contract should have 30 ETH
    //     web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(30, 'ether'));

    //     await expectThrow(icoTokenInstance.sendTransaction({
    //         from:   owner,
    //         value:  web3.toWei(1, 'ether'),
    //         gas:    700000
    //     }));
    // });

    // it('should fail, because we try to increase dividend balance with a non treasurer account', async () => {
    //     await expectThrow(icoTokenInstance.sendTransaction({
    //         from:   tokenHolder1,
    //         value:  web3.toWei(1, 'ether'),
    //         gas:    700000
    //     }));
    // });

    // it('should fail, because we try to increase dividend balance with a deactivated treasurer account', async () => {
    //     await expectThrow(icoTokenInstance.sendTransaction({
    //         from:   inactiveTreasurer1,
    //         value:  web3.toWei(1, 'ether'),
    //         gas:    700000
    //     }));
    // });

    // it('should fail, because requestUnclaimed() is called, but the reclaim period has not begun.', async () => {
    //     await expectThrow(icoTokenInstance.requestUnclaimed({from: owner}));
    // });

    // it('should claim dividend (ETH)', async () => {
    //     const fundsTokenBefore      = web3.eth.getBalance(icoTokenInstance.address);
    //     const fundsHolder1Before    = web3.eth.getBalance(tokenHolder1);
    //     const fundsHolder2Before    = web3.eth.getBalance(tokenHolder2);

    //     const tx1 = await icoTokenInstance.claimDividend({from: tokenHolder1});
    //     const tx2 = await icoTokenInstance.claimDividend({from: tokenHolder2});

    //     const unclaimedDividend = await icoTokenInstance.getClaimableDividend(tokenHolder1);

    //     const fundsTokenAfter   = web3.eth.getBalance(icoTokenInstance.address);
    //     const fundsHolder1After = web3.eth.getBalance(tokenHolder1);
    //     const fundsHolder2After = web3.eth.getBalance(tokenHolder2);

    //     assert.equal(unclaimedDividend, 0, 'Unclaimed dividend should be 0, but is: ' + unclaimedDividend);

    //     const gasUsed1         = await web3.eth.getTransactionReceipt(tx1.tx).gasUsed;
    //     const gasPrice1        = await web3.eth.getTransaction(tx1.tx).gasPrice;
    //     const transactionFee1  = gasPrice1.times(gasUsed1);

    //     const gasUsed2         = await web3.eth.getTransactionReceipt(tx2.tx).gasUsed;
    //     const gasPrice2        = await web3.eth.getTransaction(tx2.tx).gasPrice;
    //     const transactionFee2  = gasPrice2.times(gasUsed2);

    //     const gas = transactionFee1.plus(transactionFee2);

    //     (fundsHolder1After.plus(fundsHolder2After))
    //         .minus((fundsHolder1Before.plus(fundsHolder2Before)))
    //         .plus(gas).should.be.bignumber.equal(fundsTokenBefore.minus(fundsTokenAfter));

    //     // Testing events
    //     const events1 = getEvents(tx1);
    //     const events2 = getEvents(tx2);

    //     assert.equal(events1.Payout[0]._tokenHolder, tokenHolder1, 'TokenHolder1 doesn\'t match against Event');
    //     assert.equal(events2.Payout[0]._tokenHolder, tokenHolder2, 'TokenHolder2 doesn\'t match against Event');

    //     (fundsHolder1After.plus(fundsHolder2After))
    //         .minus((fundsHolder1Before.plus(fundsHolder2Before)))
    //         .plus(gas).should.be.bignumber.equal(events1.Payout[0]._value.plus(events1.Payout[0]._value));
    // });

    // it('should transfer token of tokenHolder1 to tokenHolder2 using the transfer method', async () => {
    //     const tokenHolder1Balance1                  = await icoTokenInstance.balanceOf(tokenHolder1);
    //     const tokenHolder2Balance1                  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder1UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder1);
    //     const tokenHolder2UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder2);

    //     const tx = await icoTokenInstance.transfer(tokenHolder2, 5, {from: tokenHolder1});

    //     const tokenHolder2Balance2                  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder1UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder1);
    //     const tokenHolder2UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder2);

    //     tokenHolder1UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder1UnclaimedDividendAfter);
    //     tokenHolder2UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder2UnclaimedDividendAfter);
    //     tokenHolder2Balance1.plus(tokenHolder1Balance1).should.be.bignumber.equal(tokenHolder2Balance2);

    //     // Testing events
    //     const transferEvents = getEvents(tx, 'Transfer');

    //     assert.equal(transferEvents[0].from, tokenHolder1, 'Transfer event from address doesn\'t match against tokenHolder1 address');
    //     assert.equal(transferEvents[0].to, tokenHolder2, 'Transfer event to address doesn\'t match against tokenHolder2 address');
    //     transferEvents[0].value.should.be.bignumber.equal(5);
    // });

    // it('should transfer token of tokenHolder2 back to tokenHolder1 using the transferFrom method', async () => {
    //     const tokenHolder2Balance1  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder3Balance1  = await icoTokenInstance.balanceOf(tokenHolder3);

    //     const allow1 = await icoTokenInstance.allowance(tokenHolder2, tokenHolder1);
    //     allow1.should.be.bignumber.equal(0);

    //     await icoTokenInstance.approve(tokenHolder1, 5, {from: tokenHolder2});

    //     const allow2 = await icoTokenInstance.allowance(tokenHolder2, tokenHolder1);
    //     allow2.should.be.bignumber.equal(5);

    //     const tx = await icoTokenInstance.transferFrom(tokenHolder2, tokenHolder1, 5, {from: tokenHolder1});

    //     const tokenHolder1Balance2  = await icoTokenInstance.balanceOf(tokenHolder1);
    //     const tokenHolder2Balance2  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder3Balance2  = await icoTokenInstance.balanceOf(tokenHolder3);

    //     tokenHolder3Balance1.should.be.bignumber.equal(tokenHolder3Balance2);
    //     tokenHolder1Balance2.should.be.bignumber.equal(allow2);
    //     tokenHolder2Balance2.should.be.bignumber.equal(tokenHolder2Balance1.minus(allow2));

    //     // Testing events
    //     const transferEvents = getEvents(tx, 'Transfer');

    //     assert.equal(transferEvents[0].from, tokenHolder2, 'Transfer event from address doesn\'t match against tokenHolder2 address');
    //     assert.equal(transferEvents[0].to, tokenHolder1, 'Transfer event to address doesn\'t match against tokenHolder1 address');
    //     transferEvents[0].value.should.be.bignumber.equal(5);
    // });

    // /**
    //  * [ Reclaim period ]
    //  */

    // it('should fail, because we try to call claimDividend() after the claim period is over', async () => {
    //     console.log('[ Reclaim period ]'.yellow);
    //     await waitNDays(330);

    //     await expectThrow(icoTokenInstance.claimDividend({from: tokenHolder1}));
    // });

    // it('should payout the unclaimed ETH to owner account.', async () => {
    //     const balance1TokenHolder1  = web3.eth.getBalance(tokenHolder1);
    //     const balance1TokenHolder2  = web3.eth.getBalance(tokenHolder2);
    //     const balance1TokenHolder3  = web3.eth.getBalance(tokenHolder3);

    //     const tx = await icoTokenInstance.requestUnclaimed({from: owner});

    //     const balance2Contract      = web3.eth.getBalance(icoTokenInstance.address);
    //     const balance2TokenHolder1  = web3.eth.getBalance(tokenHolder1);
    //     const balance2TokenHolder2  = web3.eth.getBalance(tokenHolder2);
    //     const balance2TokenHolder3  = web3.eth.getBalance(tokenHolder3);

    //     balance2Contract.should.be.bignumber.equal(0);
    //     balance2TokenHolder1.should.be.bignumber.equal(balance1TokenHolder1);
    //     balance2TokenHolder2.should.be.bignumber.equal(balance1TokenHolder2);
    //     balance2TokenHolder3.should.be.bignumber.equal(balance1TokenHolder3);

    //     // Testig events
    //     const events = getEvents(tx, 'Reclaimed');

    //     events[0].remainingBalance.should.be.bignumber.equal(web3.eth.getBalance(icoTokenInstance.address));
    //     events[0]._now.should.be.bignumber.gte(events[0]._endTime.sub(60 * 60 * 24 * 30));
    // });

    // /**
    //  * [ First dividend cycle is over, second claim period is running ]
    //  */

    // it('should start a second dividend round with a balance of 15 eth', async () => {
    //     console.log('[ First dividend cycle is over, second is started ]'.yellow);
    //     await waitNDays(20);

    //     const expectedBalance = web3.toWei(15, 'ether');

    //     // At this point, the contract should not have any ETH
    //     web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(0, 'ether'));

    //     // Initialize first dividend round with a volume of 15 eth
    //     const tx = await icoTokenInstance.sendTransaction({
    //         from:   owner,
    //         value:  expectedBalance,
    //         gas:    700000
    //     });

    //     const icoBalance        = await icoTokenInstance.currentDividend();
    //     const endTime           = await icoTokenInstance.dividendEndTime();

    //     icoBalance.should.be.bignumber.equal(expectedBalance);
    //     web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(expectedBalance);
    //     assert.isTrue(endTime.gt(0), 'EndTime not properly set: ' + endTime);

    //     // Testing events
    //     const events = getEvents(tx);

    //     events.Payin[0]._value.should.be.bignumber.equal(expectedBalance);
    //     events.Payin[0]._endTime.should.be.bignumber.equal(endTime);
    //     assert.equal(events.Payin[0]._owner, owner, 'Treasurer doesn\'t match against owner: ' + owner);
    // });

    // it('should claim dividend (ETH) again', async () => {
    //     const fundsTokenBefore      = web3.eth.getBalance(icoTokenInstance.address);
    //     const fundsHolder3Before    = web3.eth.getBalance(tokenHolder3);
    //     const fundsHolder2Before    = web3.eth.getBalance(tokenHolder2);

    //     const tx1 = await icoTokenInstance.claimDividend({from: tokenHolder3});
    //     const tx2 = await icoTokenInstance.claimDividend({from: tokenHolder2});

    //     const unclaimedDividend = await icoTokenInstance.getClaimableDividend(tokenHolder3);

    //     const fundsTokenAfter   = web3.eth.getBalance(icoTokenInstance.address);
    //     const fundsHolder3After = web3.eth.getBalance(tokenHolder3);
    //     const fundsHolder2After = web3.eth.getBalance(tokenHolder2);

    //     assert.equal(unclaimedDividend, 0, 'Unclaimed dividend should be 0, but is: ' + unclaimedDividend);

    //     const gasUsed1         = await web3.eth.getTransactionReceipt(tx1.tx).gasUsed;
    //     const gasPrice1        = await web3.eth.getTransaction(tx1.tx).gasPrice;
    //     const transactionFee1  = gasPrice1.times(gasUsed1);

    //     const gasUsed2         = await web3.eth.getTransactionReceipt(tx2.tx).gasUsed;
    //     const gasPrice2        = await web3.eth.getTransaction(tx2.tx).gasPrice;
    //     const transactionFee2  = gasPrice2.times(gasUsed2);

    //     const gas = transactionFee1.plus(transactionFee2);

    //     (fundsHolder3After.plus(fundsHolder2After))
    //         .minus((fundsHolder3Before.plus(fundsHolder2Before)))
    //         .plus(gas).should.be.bignumber.equal(fundsTokenBefore.minus(fundsTokenAfter));
    // });

    // it('should transfer tokens from tokenHolder1 to tokenHolder2 and check, if dividend is transferred as well', async () => {
    //     const tokenHolder1Balance1                  = await icoTokenInstance.balanceOf(tokenHolder1);
    //     const tokenHolder2Balance1                  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder1UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder1);

    //     await icoTokenInstance.transfer(tokenHolder2, 2, {from: tokenHolder1});

    //     const tokenHolder1Balance2                  = await icoTokenInstance.balanceOf(tokenHolder1);
    //     const tokenHolder2Balance2                  = await icoTokenInstance.balanceOf(tokenHolder2);
    //     const tokenHolder1UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder1);
    //     const tokenHolder2UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder2);

    //     tokenHolder1UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder1UnclaimedDividendAfter.plus(tokenHolder2UnclaimedDividendAfter));
    //     tokenHolder1Balance1.plus(tokenHolder2Balance1).should.be.bignumber.equal(tokenHolder1Balance2.plus(tokenHolder2Balance2));
    // });

    // it('should increase the owner\'s balance, because token balance is not 0 while doing a Payin. Token balance should be the same as the Payin afterwards', async () => {
    //     const endTime       = await icoTokenInstance.dividendEndTime();
    //     const newTime       = endTime + 1;
    //     await increaseTimeTo(newTime);
    //     // Dividends were not claimed by the holders
    //     // nor reclaimed by the owner
    //     const ownerBalanceBefore = await web3.eth.getBalance(owner);
    //     const payIn = web3.toWei(30, 'ether');

    //     await icoTokenInstance.sendTransaction({
    //         from:   activeTreasurer1,
    //         value:  payIn,
    //         gas:    700000
    //     });

    //     const ownerBalanceAfter = await web3.eth.getBalance(owner);
    //     assert.isTrue(ownerBalanceAfter.gt(ownerBalanceBefore));

    //     const newTokenBalance = await web3.eth.getBalance(icoTokenInstance.address);
    //     newTokenBalance.should.be.bignumber.equal(payIn);
    // });
    // it('should transfer ownership to tokenHolder1', async () => {
    //     const ownerBefore = await icoTokenInstance.owner();
    //     assert.equal(ownerBefore, accounts[0]);

    //     await icoTokenInstance.transferOwnership(accounts[1], { from: accounts[0] });
    //     const ownerAfter = await icoTokenInstance.owner();
    //     assert.equal(ownerAfter, accounts[1]);

    //     await icoTokenInstance.transferOwnership(accounts[2], { from: accounts[1] });
    //     const ownerAfter2 = await icoTokenInstance.owner();
    //     assert.equal(ownerAfter2, accounts[2]);
    // });
});
